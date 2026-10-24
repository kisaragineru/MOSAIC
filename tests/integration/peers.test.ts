import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { answerQuestion } from "@/server/services/discovery";
import { buildExport } from "@/server/services/export";
import { answerPeer, askPeer, cancelPeer, declinePeer, johari, myPeerRequests, peerResults, withdrawPeerAnswer } from "@/server/services/peers";
import { createShare, openComparison, revokeComparison } from "@/server/services/sharing";
import { withUser } from "@/server/db/tx";
import { makeUser } from "../helpers/factory";

async function connect(ownerId: string, otherId: string) {
  const s = await createShare(ownerId);
  return openComparison(otherId, s.token);
}
const all = (v: 1 | 0 | -1) => ({ planning: v, social_energy: v, calm: v });

describe("asking how others see you", () => {
  it("named answers reach the owner with the name; the responder keeps their own copy", async () => {
    const owner = await makeUser("Hana");
    const friend = await makeUser("Sora");
    const session = await connect(owner.userId, friend.userId);
    const id = await askPeer(owner.userId, session);
    expect(await askPeer(owner.userId, session)).toBe(id); // one pending request per pair

    const forFriend = (await myPeerRequests(friend.userId)).find((r) => r.id === id)!;
    expect(forFriend).toMatchObject({ role: "responder", otherName: "Hana", status: "pending" });
    await answerPeer(friend.userId, id, { anonymous: false, answers: { planning: 1, calm: -1 }, comment: "Always has a plan" });

    const ownerView = (await myPeerRequests(owner.userId)).find((r) => r.id === id)!;
    expect(ownerView).toMatchObject({ role: "owner", otherName: "Sora", status: "answered", anonymous: null, answers: null, comment: null });
    const res = await peerResults(owner.userId);
    expect(res.named).toEqual([expect.objectContaining({ name: "Sora", answers: { planning: 1, calm: -1 }, comment: "Always has a plan" })]);
    expect((await myPeerRequests(friend.userId)).find((r) => r.id === id)).toMatchObject({ anonymous: false, answers: { planning: 1, calm: -1 } });
  });

  it("keeps anonymous answers hidden until three, then shows only counts and unsigned comments", async () => {
    const owner = await makeUser("Hana");
    const friends = await Promise.all([makeUser("A1"), makeUser("A2"), makeUser("A3"), makeUser("Named")]);
    const ids: string[] = [];
    for (const f of friends) ids.push(await askPeer(owner.userId, await connect(owner.userId, f.userId)));

    await answerPeer(friends[0]!.userId, ids[0]!, { anonymous: true, answers: all(1), comment: "ANON-ONE" });
    await answerPeer(friends[3]!.userId, ids[3]!, { anonymous: false, answers: all(-1) });
    await answerPeer(friends[1]!.userId, ids[1]!, { anonymous: true, answers: all(1) });
    let res = await peerResults(owner.userId);
    expect(res.anonymous).toEqual({ n: 2, counts: null, comments: [] });
    expect(res.named.map((n) => n.name)).toEqual(["Named"]);
    expect(JSON.stringify(res)).not.toContain("ANON-ONE");

    await answerPeer(friends[2]!.userId, ids[2]!, { anonymous: true, answers: { planning: -1, social_energy: 0 }, comment: "ANON-THREE" });
    res = await peerResults(owner.userId);
    expect(res.anonymous.n).toBe(3);
    expect(res.anonymous.counts!.planning).toEqual([2, 0, 1]);
    expect(res.anonymous.counts!.social_energy).toEqual([2, 1, 0]);
    expect(res.anonymous.comments.sort()).toEqual(["ANON-ONE", "ANON-THREE"]);
    expect(JSON.stringify(res)).not.toMatch(/A1|A2|A3/);
    expect(res.responders).toBe(4);
  });

  it("places each axis in a Johari window against the owner's own answers", async () => {
    const owner = await makeUser("Hana");
    const friend = await makeUser("Sora");
    const id = await askPeer(owner.userId, await connect(owner.userId, friend.userId));
    for (const [q, c] of [["p.weekend_plan", "plan"], ["ax.plan_pack", "packed_list"], ["ax.plan_deadline", "early"]] as const)
      await answerQuestion(owner.userId, { questionId: q, questionVersion: 1, answer: { choice: c } });
    await answerPeer(friend.userId, id, { anonymous: false, answers: { planning: 1, calm: 1, social_energy: 0 } });
    const { axes } = await johari(owner.userId);
    expect(axes.find((a) => a.key === "planning")).toMatchObject({ self: 1, window: "open" });
    expect(axes.find((a) => a.key === "calm")).toMatchObject({ self: 0, window: "blind" });
    expect(axes.find((a) => a.key === "social_energy")!.window).toBe("unknown");
  });

  it("only the people in a live connection can ask or answer", async () => {
    const owner = await makeUser();
    const friend = await makeUser();
    const stranger = await makeUser();
    const session = await connect(owner.userId, friend.userId);
    await expect(askPeer(stranger.userId, session)).rejects.toMatchObject({ code: "not_found" });
    const id = await askPeer(owner.userId, session);
    await expect(answerPeer(stranger.userId, id, { anonymous: false, answers: all(1) })).rejects.toMatchObject({ code: "not_found" });
    await expect(answerPeer(owner.userId, id, { anonymous: false, answers: all(1) })).rejects.toMatchObject({ code: "not_found" });
    await revokeComparison(friend.userId, session);
    await expect(answerPeer(friend.userId, id, { anonymous: false, answers: all(1) })).rejects.toMatchObject({ code: "connection_ended" });
    expect((await myPeerRequests(owner.userId)).find((r) => r.id === id)!.status).toBe("cancelled");
    await expect(askPeer(owner.userId, session)).rejects.toMatchObject({ code: "connection_ended" });
  });

  it("rejects malformed answers, in the app and in the database", async () => {
    const owner = await makeUser();
    const friend = await makeUser();
    const id = await askPeer(owner.userId, await connect(owner.userId, friend.userId));
    await expect(answerPeer(friend.userId, id, { anonymous: true, answers: {} })).rejects.toThrow();
    await expect(answerPeer(friend.userId, id, { anonymous: true, answers: { planning: 2 } })).rejects.toThrow();
    await expect(answerPeer(friend.userId, id, { anonymous: true, answers: { not_an_axis: 1 } })).rejects.toThrow();
    for (const bad of ['{"planning": 2}', '{"nope": 1}', "{}", "[1]"]) {
      await expect(
        withUser(friend.userId, (tx) => tx.execute(sql`select peer_request_answer(${id}, true, ${bad}::jsonb, null)`)),
      ).rejects.toThrow();
    }
  });

  it("supports declining, cancelling, withdrawing, and counts each person's latest answer once", async () => {
    const owner = await makeUser();
    const friend = await makeUser("Sora");
    const session = await connect(owner.userId, friend.userId);
    const a = await askPeer(owner.userId, session);
    await declinePeer(friend.userId, a);
    await expect(answerPeer(friend.userId, a, { anonymous: false, answers: all(1) })).rejects.toMatchObject({ code: "not_pending" });
    const b = await askPeer(owner.userId, session);
    await cancelPeer(owner.userId, b);
    const c = await askPeer(owner.userId, session);
    await answerPeer(friend.userId, c, { anonymous: false, answers: all(1) });
    const d = await askPeer(owner.userId, session);
    await answerPeer(friend.userId, d, { anonymous: false, answers: all(-1) });
    let res = await peerResults(owner.userId);
    expect(res.named).toHaveLength(1);
    expect(res.named[0]!.answers.planning).toBe(-1);
    await withdrawPeerAnswer(friend.userId, d);
    res = await peerResults(owner.userId);
    expect(res.named[0]!.answers.planning).toBe(1); // the earlier answer stands until withdrawn too
    await withdrawPeerAnswer(friend.userId, c);
    expect((await peerResults(owner.userId)).named).toHaveLength(0);
  });

  it("gives the app role no direct access to the tables, and exports only what the app shows", async () => {
    const owner = await makeUser();
    const friends = await Promise.all([makeUser("X1"), makeUser("X2")]);
    for (const f of friends) {
      const id = await askPeer(owner.userId, await connect(owner.userId, f.userId));
      await answerPeer(f.userId, id, { anonymous: true, answers: all(1), comment: `SECRET-${f.userId}` });
    }
    await expect(withUser(owner.userId, (tx) => tx.execute(sql`select * from peer_responses`))).rejects.toThrow();
    await expect(withUser(owner.userId, (tx) => tx.execute(sql`select * from peer_requests`))).rejects.toThrow();
    const doc = JSON.parse((await buildExport(owner.userId)).json);
    expect(doc.peerRequests).toHaveLength(2);
    expect(JSON.stringify(doc)).not.toContain("SECRET-");
  });
});
