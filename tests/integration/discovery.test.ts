import { Pool } from "pg";
import { describe, expect, it } from "vitest";
import {
  answerQuestion,
  deleteResponse,
  getDaily,
  getHistory,
  requestAnotherQuestion,
  setChangeKind,
  setResponsePrivacy,
  setResponsesPrivacy,
  skipQuestion,
} from "@/server/services/discovery";
import { listTendencies, setTendencyFeedback } from "@/server/services/tendencies";
import { makeUser } from "../helpers/factory";
import { TEST_MIGRATION_DATABASE_URL } from "../helpers/test-env";

const day1 = new Date("2026-10-20T03:00:00Z");

describe("Daily Discovery", () => {
  it("assigns one question per local day, stable across calls", async () => {
    const u = await makeUser();
    const a = await getDaily(u.userId, day1);
    const b = await getDaily(u.userId, day1);
    expect(a.slots).toHaveLength(1);
    expect(a.slots[0]!.question.id).toBe(b.slots[0]!.question.id);
    expect(a.canRequestMore).toBe(false); // must answer/skip the daily one first
    expect(a.day).toBe("2026-10-20"); // Asia/Ho_Chi_Minh default
  });

  it("allows skipping, then optionally up to 2 more questions, never duplicates", async () => {
    const u = await makeUser();
    const d = await getDaily(u.userId, day1);
    await skipQuestion(u.userId, d.slots[0]!.question.id);
    const d2 = await getDaily(u.userId, day1);
    expect(d2.slots[0]!.doneToday).toBe(true);
    expect(d2.canRequestMore).toBe(true);
    await requestAnotherQuestion(u.userId, day1);
    const d3 = await getDaily(u.userId, day1);
    expect(d3.slots).toHaveLength(2);
    expect(new Set(d3.slots.map((s) => s.question.id)).size).toBe(2);
    await skipQuestion(u.userId, d3.slots[1]!.question.id);
    await requestAnotherQuestion(u.userId, day1);
    await expect(requestAnotherQuestion(u.userId, day1)).rejects.toMatchObject({ code: "daily_limit_reached" });
  });

  it("keeps the full answer history; a changed answer asks why and never overwrites", async () => {
    const u = await makeUser();
    const first = await answerQuestion(u.userId, { questionId: "f.drink", questionVersion: 1, answer: { choice: "coffee" } });
    expect(first.changedFromPrevious).toBe(false);
    const same = await answerQuestion(u.userId, { questionId: "f.drink", questionVersion: 1, answer: { choice: "coffee" } });
    expect(same.changedFromPrevious).toBe(false);
    const changed = await answerQuestion(u.userId, { questionId: "f.drink", questionVersion: 1, answer: { choice: "tea" } });
    expect(changed).toMatchObject({ changedFromPrevious: true, previousAnswer: { choice: "coffee" } });
    await setChangeKind(u.userId, changed.responseId, "changed_mind");
    const hist = await getHistory(u.userId);
    const drink = hist.find((h) => h.question.id === "f.drink")!;
    expect(drink.responses.map((r) => [r.answer, r.changeKind])).toEqual([
      [{ choice: "tea" }, "changed_mind"],
      [{ choice: "coffee" }, "reanswer"],
      [{ choice: "coffee" }, "first"],
    ]);
    expect(drink.responses.every((r) => r.questionVersion === 1)).toBe(true);
  });

  it("records corrections explicitly", async () => {
    const u = await makeUser();
    await answerQuestion(u.userId, { questionId: "h.pets", questionVersion: 1, answer: { choice: "cats" } });
    const r = await answerQuestion(u.userId, { questionId: "h.pets", questionVersion: 1, answer: { choice: "dogs" }, changeKind: "correction" });
    const h = (await getHistory(u.userId)).find((x) => x.question.id === "h.pets")!;
    expect(h.responses[0]).toMatchObject({ id: r.responseId, changeKind: "correction" });
    expect(h.responses).toHaveLength(2);
  });

  it("validates answers against the question version", async () => {
    const u = await makeUser();
    await expect(answerQuestion(u.userId, { questionId: "f.drink", questionVersion: 1, answer: { choice: "beer" } })).rejects.toMatchObject({ code: "invalid_choice" });
    await expect(answerQuestion(u.userId, { questionId: "v.top_values", questionVersion: 1, answer: { choices: ["family", "freedom", "fun", "growth"] } })).rejects.toMatchObject({ code: "too_many_choices" });
    await expect(answerQuestion(u.userId, { questionId: "f.drink", questionVersion: 99, answer: { choice: "tea" } })).rejects.toMatchObject({ code: "not_found" });
    await expect(answerQuestion(u.userId, { questionId: "v.believe", questionVersion: 1, answer: { text: "x" }, privacy: "comparable" })).rejects.toMatchObject({ code: "not_comparable" });
  });

  it("unlocks conditional follow-up questions", async () => {
    const u = await makeUser();
    const r = await answerQuestion(u.userId, { questionId: "c.changed_mind", questionVersion: 1, answer: { choice: "yes" } });
    expect(r.followUpQuestionId).toBe("c.changed_mind_what");
    const d = await getDaily(u.userId);
    expect(d.followUp?.id).toBe("c.changed_mind_what");
    await answerQuestion(u.userId, { questionId: "c.changed_mind_what", questionVersion: 1, answer: { text: "I value rest now." } });
    expect((await getDaily(u.userId)).followUp).toBeNull();
  });

  it("stores privacy and purpose per response; privacy can be changed later", async () => {
    const u = await makeUser();
    const r = await answerQuestion(u.userId, { questionId: "f.spicy", questionVersion: 1, answer: { scale: 4 } });
    const owner = new Pool({ connectionString: TEST_MIGRATION_DATABASE_URL });
    const row = async () => (await owner.query("select privacy, purpose from question_responses where id=$1", [r.responseId])).rows[0];
    expect(await row()).toEqual({ privacy: "private", purpose: "self_understanding" });
    await setResponsePrivacy(u.userId, r.responseId, "comparable");
    expect((await row()).privacy).toBe("comparable");
    await owner.end();
    const other = await makeUser();
    await expect(setResponsePrivacy(other.userId, r.responseId, "private")).rejects.toMatchObject({ code: "not_found" });
  });

  it("several answers shown or kept to oneself at once; only comparable ones can be shown, only one's own", async () => {
    const u = await makeUser();
    const a = (await answerQuestion(u.userId, { questionId: "f.spicy", questionVersion: 1, answer: { scale: 4 } })).responseId;
    const b = (await answerQuestion(u.userId, { questionId: "f.drink", questionVersion: 1, answer: { choice: "tea" } })).responseId;
    const c = (await answerQuestion(u.userId, { questionId: "c.mood_week", questionVersion: 1, answer: { scale: 3 } })).responseId;
    const owner = new Pool({ connectionString: TEST_MIGRATION_DATABASE_URL });
    const privacy = async () => Object.fromEntries((await owner.query("select id, privacy from question_responses where id = any($1)", [[a, b, c]])).rows.map((x) => [x.id, x.privacy]));
    expect(await setResponsesPrivacy(u.userId, [a, b, a], "comparable")).toBe(2);
    expect(await privacy()).toEqual({ [a]: "comparable", [b]: "comparable", [c]: "private" });
    // Keeping to oneself works for any answer; showing one that can't be compared refuses the batch.
    await expect(setResponsesPrivacy(u.userId, [a, c], "private")).resolves.toBe(2);
    await expect(setResponsesPrivacy(u.userId, [b, c], "comparable")).rejects.toMatchObject({ code: "not_comparable" });
    expect((await privacy())[b]).toBe("comparable");
    // Someone else's answer among them: refused as a whole.
    const other = await makeUser();
    await expect(setResponsesPrivacy(other.userId, [b], "private")).rejects.toMatchObject({ code: "not_found" });
    expect((await privacy())[b]).toBe("comparable");
    await expect(setResponsesPrivacy(u.userId, [], "private")).rejects.toThrow();
    await owner.end();
  });
});

describe("tendency model in the database", () => {
  async function plannerAnswers(userId: string) {
    const ids = [];
    ids.push((await answerQuestion(userId, { questionId: "p.weekend_plan", questionVersion: 1, answer: { choice: "plan" } })).responseId);
    ids.push((await answerQuestion(userId, { questionId: "p.lists", questionVersion: 1, answer: { scale: 5 } })).responseId);
    ids.push((await answerQuestion(userId, { questionId: "t.itinerary", questionVersion: 1, answer: { choice: "detailed" } })).responseId);
    return ids;
  }

  it("tracks evidence ids, needs 3 signals, and is separate from the answers", async () => {
    const u = await makeUser();
    await answerQuestion(u.userId, { questionId: "p.weekend_plan", questionVersion: 1, answer: { choice: "plan" } });
    let claims = await listTendencies(u.userId);
    expect(claims.find((c) => c.claimKey === "planning")).toMatchObject({ state: "insufficient", evidenceCount: 1 });
    const ids = await plannerAnswers(u.userId);
    claims = await listTendencies(u.userId);
    const planning = claims.find((c) => c.claimKey === "planning")!;
    expect(planning).toMatchObject({ direction: 1, evidenceCount: 3, supportCount: 3, contradictCount: 0, userStatus: "proposed" });
    expect(["emerging", "consistent"]).toContain(planning.state);
    expect(planning.evidence.map((e) => e.responseId).sort()).toEqual([...ids].sort());
    expect(planning.confidence).toBeLessThan(1);
  });

  it("keeps contradicting answers visible and marks mixed patterns", async () => {
    const u = await makeUser();
    await plannerAnswers(u.userId);
    await answerQuestion(u.userId, { questionId: "p.weekend_plan", questionVersion: 1, answer: { choice: "see" } });
    await answerQuestion(u.userId, { questionId: "t.itinerary", questionVersion: 1, answer: { choice: "none" } });
    const planning = (await listTendencies(u.userId)).find((c) => c.claimKey === "planning")!;
    // Latest answers: weekend=see(-), lists=5(+), itinerary=none(-) → 2 vs 1 for "spontaneous".
    expect(planning).toMatchObject({ direction: -1, supportCount: 2, contradictCount: 1 });
    // Older answers remain in history.
    const h = (await getHistory(u.userId)).find((x) => x.question.id === "p.weekend_plan")!;
    expect(h.responses).toHaveLength(2);
  });

  it("user feedback is stored; a rejected claim stays rejected unless it flips", async () => {
    const u = await makeUser();
    await plannerAnswers(u.userId);
    const c = (await listTendencies(u.userId)).find((x) => x.claimKey === "planning")!;
    await setTendencyFeedback(u.userId, c.id, { status: "rejected", note: "Only at work." });
    await answerQuestion(u.userId, { questionId: "p.lists", questionVersion: 1, answer: { scale: 4 } });
    expect((await listTendencies(u.userId)).find((x) => x.claimKey === "planning")).toMatchObject({ userStatus: "rejected", userNote: "Only at work." });
    const other = await makeUser();
    await expect(setTendencyFeedback(other.userId, c.id, { status: "confirmed" })).rejects.toMatchObject({ code: "not_found" });
  });

  it("deleting or skipping evidence removes it from the claim immediately", async () => {
    const u = await makeUser();
    const ids = await plannerAnswers(u.userId);
    await deleteResponse(u.userId, ids[0]!);
    let planning = (await listTendencies(u.userId)).find((c) => c.claimKey === "planning")!;
    expect(planning.evidence.map((e) => e.responseId)).not.toContain(ids[0]);
    expect(planning).toMatchObject({ evidenceCount: 2, state: "insufficient" });
    await skipQuestion(u.userId, "p.lists"); // latest response becomes a skip → no current answer
    planning = (await listTendencies(u.userId)).find((c) => c.claimKey === "planning")!;
    expect(planning.evidenceCount).toBe(1);
    expect(planning.evidence.map((e) => e.responseId)).toEqual([ids[2]]);
  });
});
