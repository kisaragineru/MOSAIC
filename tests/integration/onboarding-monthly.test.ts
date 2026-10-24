import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { withUser } from "@/server/db/tx";
import { answerQuestion, setChangeKind } from "@/server/services/discovery";
import { createMemory, listMemories } from "@/server/services/memories";
import { activeMonths, lookBackDue, lookBackSections, monthReport, parseMonth, saveLookBack, shiftMonth, thisMonth } from "@/server/services/monthly";
import { finishOnboarding, onboardingState, SEED_QUESTIONS } from "@/server/services/onboarding";
import { makeUser } from "../helpers/factory";

describe("first-run guide", () => {
  it("counts down the three seed questions to a first tile, then remembers it was finished", async () => {
    const u = await makeUser();
    let s = await onboardingState(u.userId);
    expect(s).toMatchObject({ done: false, left: [...SEED_QUESTIONS], tile: null });
    await answerQuestion(u.userId, { questionId: "p.weekend_plan", questionVersion: 1, answer: { choice: "plan" } });
    await answerQuestion(u.userId, { questionId: "ax.plan_pack", questionVersion: 1, answer: { choice: "packed_list" } });
    s = await onboardingState(u.userId);
    expect(s.left).toEqual(["ax.plan_deadline"]);
    await answerQuestion(u.userId, { questionId: "ax.plan_deadline", questionVersion: 1, answer: { choice: "early" } });
    s = await onboardingState(u.userId);
    expect(s).toMatchObject({ left: [], tile: { direction: 1, state: "consistent" } });
    await finishOnboarding(u.userId);
    expect((await onboardingState(u.userId)).done).toBe(true);
  });
});

describe("monthly look back", () => {
  it("parses and steps months", () => {
    expect(parseMonth("2026-10")).toEqual({ year: 2026, month: 10 });
    expect(parseMonth("2026-13")).toBeNull();
    expect(parseMonth("x")).toBeNull();
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
  });

  it("sums up a month: answers, records, highlights, first answers and changes, against the month before", async () => {
    const u = await makeUser();
    const now = await thisMonth(u.userId);
    const key = `${now.year}-${String(now.month).padStart(2, "0")}`;
    await answerQuestion(u.userId, { questionId: "p.weekend_plan", questionVersion: 1, answer: { choice: "plan" } });
    const second = await answerQuestion(u.userId, { questionId: "p.weekend_plan", questionVersion: 1, answer: { choice: "see" } });
    await setChangeKind(u.userId, second.responseId, "changed_mind");
    await createMemory(u.userId, { kind: "achievement", title: "合格", body: "やった", occurredOn: `${key}-01` });
    await createMemory(u.userId, { kind: "feeling", body: "少し疲れた", occurredOn: `${key}-01` });
    await createMemory(u.userId, { kind: "thought", body: "前の月", occurredOn: `${shiftMonth(now, -1).year}-${String(shiftMonth(now, -1).month).padStart(2, "0")}-15` });

    const r = await monthReport(u.userId, now, "ja");
    expect(r).toMatchObject({ current: true, answers: 2, records: 2, pieces: 4, days: 1, previousPieces: 1 });
    expect(r.highlights.map((h) => h.title ?? h.body)).toEqual(expect.arrayContaining(["合格", "少し疲れた"]));
    // One entry per question: answered for the first time this month, so not "changed".
    expect(r.answered).toHaveLength(1);
    expect(r.answered[0]).toMatchObject({ questionId: "p.weekend_plan", how: "first", before: null });
    expect((await activeMonths(u.userId)).map((m) => m.month)).toEqual(expect.arrayContaining([now.month, shiftMonth(now, -1).month]));
  });

  it("is due in the first week of a month, for a month with something in it", async () => {
    const u = await makeUser();
    await withUser(u.userId, (tx) => tx.execute(sql`update profiles set time_zone = 'Asia/Tokyo' where user_id = ${u.userId}`));
    await createMemory(u.userId, { body: "九月のこと", occurredOn: "2026-09-20" });
    expect(await lookBackDue(u.userId, new Date("2026-10-03T03:00:00Z"))).toEqual({ year: 2026, month: 9 });
    expect(await lookBackDue(u.userId, new Date("2026-10-12T03:00:00Z"))).toBeNull();
    expect(await lookBackDue(u.userId, new Date("2026-11-03T03:00:00Z"))).toBeNull(); // nothing in October
    // In Tokyo it is already 1 November at 16:00 UTC on 31 October.
    await createMemory(u.userId, { body: "十月のこと", occurredOn: "2026-10-20" });
    expect(await lookBackDue(u.userId, new Date("2026-10-31T16:00:00Z"))).toEqual({ year: 2026, month: 10 });
  });

  it("saves the look back as a tagged record dated in that month", async () => {
    const u = await makeUser();
    await saveLookBack(u.userId, { year: 2026, month: 9 }, ["Q1", "Q2", "Q3"], ["A1", "", "A3"], "2026年9月のあなた", "月の振り返り");
    const [m] = await listMemories(u.userId, { tag: "月の振り返り" });
    expect(m).toMatchObject({ kind: "thought", title: "2026年9月のあなた", occurredOn: "2026-09-30", tags: ["月の振り返り"] });
    expect(m!.body).toBe("■ Q1\nA1\n\n■ Q3\nA3");
    // The month's page shows it back, apart from the month's other records.
    const r = await monthReport(u.userId, { year: 2026, month: 9 }, "ja");
    expect(r.lookBacks).toHaveLength(1);
    expect(r.lookBacks[0]!.sections).toEqual([{ prompt: "Q1", answer: "A1" }, { prompt: "Q3", answer: "A3" }]);
    expect(r.highlights).toEqual([]);
  });

  it("reads a look back back into its parts, even after it was edited", () => {
    expect(lookBackSections("■ Q1\nline 1\n\nline 2\n\n■ Q2\nA2")).toEqual([{ prompt: "Q1", answer: "line 1\n\nline 2" }, { prompt: "Q2", answer: "A2" }]);
    expect(lookBackSections("rewritten freely")).toEqual([{ prompt: "", answer: "rewritten freely" }]);
  });

  it("lists each question answered in the month once, with what it was before", async () => {
    const u = await makeUser();
    const now = await thisMonth(u.userId);
    await answerQuestion(u.userId, { questionId: "p.weekend_plan", questionVersion: 1, answer: { choice: "plan" } });
    await answerQuestion(u.userId, { questionId: "p.weekend_plan", questionVersion: 1, answer: { choice: "see" } });
    const r = await monthReport(u.userId, now, "ja");
    expect(r.answered).toHaveLength(1);
    expect(r.answered[0]).toMatchObject({ chapter: "self", how: "first", before: null });
    // Answered in an earlier month, changed now: shown with the answer before.
    await withUser(u.userId, (tx) => tx.execute(sql`update question_responses set answered_at = answered_at - interval '62 days' where user_id = ${u.userId}`));
    const third = await answerQuestion(u.userId, { questionId: "p.weekend_plan", questionVersion: 1, answer: { choice: "plan" }, note: "最近は予定を立てたい" });
    await setChangeKind(u.userId, third.responseId, "changed_mind");
    const [a] = (await monthReport(u.userId, now, "ja")).answered;
    expect(a).toMatchObject({ how: "changed", note: "最近は予定を立てたい" });
    expect(a!.before).toBeTruthy();
    expect(a!.before).not.toBe(a!.answer);
  });
});
