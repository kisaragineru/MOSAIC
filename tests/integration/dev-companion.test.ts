import { afterEach, describe, expect, it } from "vitest";
import { companionPending, companionWrites, createCompanion, deleteCompanion, enrichCompanion, listCompanions } from "@/server/services/dev-companion";
import { getAccount } from "@/server/services/account";
import { portrait } from "@/server/services/mosaic";
import { connectionFeed, shareTargets } from "@/server/services/memory-share";
import { listComparisons } from "@/server/services/sharing";
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
    await deleteCompanion(u.userId, id);
    expect(await listCompanions(u.userId)).toEqual([]);
    expect(await connectionFeed(u.userId)).toEqual([]);
  });
});
