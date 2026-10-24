import { afterEach, describe, expect, it } from "vitest";
import { companionAnswersAsks, companionAsks, companionAsksOwner, companionConnected, companionPending, companionWrites, createCompanion, deleteCompanion, enrichCompanion, listCompanions, reconnectCompanion } from "@/server/services/dev-companion";
import { getAccount } from "@/server/services/account";
import { answerQuestion } from "@/server/services/discovery";
import { askPeer, myPeerRequests, peerResults } from "@/server/services/peers";
import { portrait } from "@/server/services/mosaic";
import { connectionFeed, shareTargets } from "@/server/services/memory-share";
import { getComparison, giveConsent, listComparisons, revokeComparison } from "@/server/services/sharing";
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
    // She shares every record but the one kept private to check that.
    const feed = await connectionFeed(u.userId, { limit: 100 });
    expect(feed).toHaveLength(11);
    expect(feed.some((x) => x.body.includes("自分だけの記録"))).toBe(false);
    // Filling again adds nothing twice.
    await enrichCompanion(u.userId, id);
    expect(await connectionFeed(u.userId, { limit: 100 })).toHaveLength(11);
    await companionWrites(u.userId, id);
    expect(await connectionFeed(u.userId, { limit: 100 })).toHaveLength(12);
    // She agreed to every scope; her chart shows once the owner agrees to Tử Vi too.
    const sid = (await listComparisons(u.userId)).find((c) => c.status === "active")!.id;
    expect((await getComparison(u.userId, sid))!.result!.tuviDetail).toBeNull();
    await giveConsent(u.userId, sid, { scopes: ["tuvi", "tuvi_detail", "preferences", "values"], agree: true });
    const r = (await getComparison(u.userId, sid))!.result!;
    expect(r.agreedScopes).toEqual(expect.arrayContaining(["tuvi", "tuvi_detail", "preferences", "values"]));
    expect(r.tuviDetail?.a ?? r.tuviDetail?.b).toBeTruthy();
    // Not someone else's companion.
    await expect(companionWrites(other.userId, id)).rejects.toMatchObject({ code: "not_found" });
    await expect(deleteCompanion(other.userId, id)).rejects.toMatchObject({ code: "not_found" });
    // "How do you see me?": she answers by name, with a few words.
    await askPeer(u.userId, (await listComparisons(u.userId)).find((c) => c.status === "active")!.id);
    expect(await companionAsks(id)).toHaveLength(1);
    await companionAnswersAsks(u.userId, id);
    expect(await companionAsks(id)).toHaveLength(0);
    const seen = await peerResults(u.userId);
    expect(seen.named[0]).toMatchObject({ name: "ミナ（テスト）" });
    expect(seen.named[0]!.comment).toMatch(/たまには頼ってね/);
    expect(Object.keys(seen.named[0]!.answers).length).toBeGreaterThan(5);

    // She asks the owner in turn; it reaches the owner as a pending request.
    await companionAsksOwner(u.userId, id);
    const mine = (await myPeerRequests(u.userId)).filter((r) => r.role === "responder" && r.status === "pending");
    expect(mine).toHaveLength(1);
    expect(mine[0]!.otherName).toBe("ミナ（テスト）");

    // Ended by the owner, then connected again: same person entry, records visible again.
    const before = (await listComparisons(u.userId)).find((c) => c.status === "active")!;
    await revokeComparison(u.userId, before.id);
    expect(await companionConnected(id)).toBe(false);
    expect(await connectionFeed(u.userId)).toEqual([]);
    await reconnectCompanion(u.userId, id);
    expect(await companionConnected(id)).toBe(true);
    const now = (await listComparisons(u.userId)).find((c) => c.status === "active")!;
    expect(now.personId).toBe(before.personId);
    expect(await connectionFeed(u.userId, { limit: 100 })).toHaveLength(12);
    await deleteCompanion(u.userId, id);
    expect(await listCompanions(u.userId)).toEqual([]);
    expect(await connectionFeed(u.userId)).toEqual([]);
  });
});
