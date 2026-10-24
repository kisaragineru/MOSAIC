import { afterEach, describe, expect, it } from "vitest";
import { companionConnected, companionPending, companionWrites, createCompanion, deleteCompanion, enrichCompanion, listCompanions, reconnectCompanion } from "@/server/services/dev-companion";
import { getAccount } from "@/server/services/account";
import { answerQuestion } from "@/server/services/discovery";
import { portrait } from "@/server/services/mosaic";
import { connectionFeed, shareTargets } from "@/server/services/memory-share";
import { listComparisons, revokeComparison } from "@/server/services/sharing";
import { makeUser } from "../helpers/factory";

afterEach(() => {
  delete process.env.DEV_TOOLS;
});

describe("development test companion", () => {
  it("is refused unless DEV_TOOLS=on", async () => {
    const u = await makeUser();
    await expect(createCompanion(u.userId, "friend")).rejects.toMatchObject({ code: "forbidden" });
    expect(await listCompanions(u.userId)).toEqual([]);
  });

  it("connects to the owner and shares records by audience; it can write more and be removed", async () => {
    process.env.DEV_TOOLS = "on";
    const u = await makeUser("Owner");
    const other = await makeUser();
    const id = await createCompanion(u.userId, "family");
    const [c] = await listCompanions(u.userId);
    expect(c).toMatchObject({ id, name: "ミナ（テスト）" });
    expect((await listComparisons(u.userId))[0]).toMatchObject({ status: "active", otherName: "ミナ（テスト）" });
    expect((await shareTargets(u.userId))[0]!.circle).toBe("family");
    // A made-up woman in her sixties: bio, intro, a chart, answers to everything, months of records.
    // An answer left over from an older persona is corrected on the next fill.
    await answerQuestion(id, { questionId: "p.weekend_plan", questionVersion: 1, answer: { choice: "see" }, changeKind: "correction" });
    expect(await companionPending(id)).toBeGreaterThan(0);
    // Answers come in time-boxed batches; keep filling until none are left.
    for (let i = 0; i < 10 && (await companionPending(id)) > 0; i++) await enrichCompanion(u.userId, id);
    expect(await companionPending(id)).toBe(0);
    const acc = await getAccount(id);
    expect(acc.profile.bio).toMatch(/小学校の先生/);
    expect(acc.profile.intro).toMatch(/段取り/);
    const p = await portrait(id);
    expect(p.revealed).toBeGreaterThanOrEqual(17);
    // She files the owner as family: everything but her private records reaches them.
    const feed = await connectionFeed(u.userId, { limit: 100 });
    expect(feed).toHaveLength(10);
    expect(feed.some((x) => x.body.includes("自分だけの記録") || x.body.includes("運動会"))).toBe(false);
    // Filling again adds nothing twice.
    await enrichCompanion(u.userId, id);
    expect(await connectionFeed(u.userId, { limit: 100 })).toHaveLength(10);
    await companionWrites(u.userId, id);
    expect(await connectionFeed(u.userId, { limit: 100 })).toHaveLength(11);
    // Not someone else's companion.
    await expect(companionWrites(other.userId, id)).rejects.toMatchObject({ code: "not_found" });
    await expect(deleteCompanion(other.userId, id)).rejects.toMatchObject({ code: "not_found" });
    // Ended by the owner, then connected again: same person entry, records visible again.
    const before = (await listComparisons(u.userId)).find((c) => c.status === "active")!;
    await revokeComparison(u.userId, before.id);
    expect(await companionConnected(id)).toBe(false);
    expect(await connectionFeed(u.userId)).toEqual([]);
    await reconnectCompanion(u.userId, id);
    expect(await companionConnected(id)).toBe(true);
    const now = (await listComparisons(u.userId)).find((c) => c.status === "active")!;
    expect(now.personId).toBe(before.personId);
    expect(await connectionFeed(u.userId, { limit: 100 })).toHaveLength(11);
    await deleteCompanion(u.userId, id);
    expect(await listCompanions(u.userId)).toEqual([]);
    expect(await connectionFeed(u.userId)).toEqual([]);
  });
});
