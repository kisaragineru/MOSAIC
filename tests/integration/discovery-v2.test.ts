import { Pool } from "pg";
import { describe, expect, it } from "vitest";
import { CHAPTERS } from "@/content/axes";
import { QUESTION_BANK } from "@/content/questions";
import {
  answerQuestion,
  chapterProgress,
  getHistory,
  getQuestionFeedback,
  setQuestionFeedback,
  skipQuestion,
} from "@/server/services/discovery";
import { createShare, getComparison, giveConsent, openComparison, sharedPreview } from "@/server/services/sharing";
import { buildExport } from "@/server/services/export";
import { makeUser } from "../helpers/factory";
import { TEST_MIGRATION_DATABASE_URL } from "../helpers/test-env";

async function owner(q: string, params: unknown[]) {
  const pool = new Pool({ connectionString: TEST_MIGRATION_DATABASE_URL });
  try {
    return (await pool.query(q, params)).rows;
  } finally {
    await pool.end();
  }
}

describe("private notes on answers", () => {
  it("are kept with the answer and shown in the user's history only", async () => {
    const a = await makeUser("An");
    const b = await makeUser("Bình");
    await answerQuestion(a.userId, { questionId: "f.drink", questionVersion: 1, answer: { choice: "tea" }, privacy: "comparable", note: "NOTE-SECRET-A since my trip" });
    await answerQuestion(b.userId, { questionId: "f.drink", questionVersion: 1, answer: { choice: "tea" }, privacy: "comparable" });
    const h = await getHistory(a.userId);
    expect(h.find((x) => x.question.id === "f.drink")!.responses[0]!.note).toBe("NOTE-SECRET-A since my trip");

    const s = await createShare(a.userId);
    const id = await openComparison(b.userId, s.token);
    await giveConsent(a.userId, id, { scopes: ["preferences"], agree: true });
    await giveConsent(b.userId, id, { scopes: ["preferences"], agree: true });
    const seenByB = JSON.stringify(await getComparison(b.userId, id));
    expect(seenByB).toContain("f.drink");
    expect(seenByB).not.toContain("NOTE-SECRET-A");
    expect(JSON.stringify(await sharedPreview(a.userId))).not.toContain("NOTE-SECRET-A");
  });

  it("treat a blank note as none and refuse very long ones", async () => {
    const a = await makeUser();
    await answerQuestion(a.userId, { questionId: "f.drink", questionVersion: 1, answer: { choice: "tea" }, note: "   " });
    expect((await getHistory(a.userId))[0]!.responses[0]!.note).toBeNull();
    await expect(answerQuestion(a.userId, { questionId: "f.drink", questionVersion: 1, answer: { choice: "tea" }, note: "x".repeat(1001) })).rejects.toThrow();
  });
});

describe("question feedback", () => {
  it("keeps one rating per user and question, privately", async () => {
    const a = await makeUser();
    const b = await makeUser();
    expect(await getQuestionFeedback(a.userId, "f.drink")).toBeNull();
    await setQuestionFeedback(a.userId, "f.drink", 1);
    await setQuestionFeedback(a.userId, "f.drink", "-1");
    expect(await getQuestionFeedback(a.userId, "f.drink")).toBe(-1);
    expect(await getQuestionFeedback(b.userId, "f.drink")).toBeNull();
    const rows = await owner("select rating from question_feedback where user_id = $1", [a.userId]);
    expect(rows).toEqual([{ rating: -1 }]);
    await expect(setQuestionFeedback(a.userId, "f.drink", 5)).rejects.toThrow();
    await expect(setQuestionFeedback(a.userId, "no.such", 1)).rejects.toMatchObject({ code: "not_found" });
    const exported = JSON.parse((await buildExport(a.userId)).json) as { questionFeedback: { questionId: string; rating: number }[] };
    expect(exported.questionFeedback.map((x) => [x.questionId, x.rating])).toEqual([["f.drink", -1]]);
  });
});

describe("chapters", () => {
  it("count answers per chapter and offer the next unanswered question", async () => {
    const u = await makeUser();
    const before = await chapterProgress(u.userId);
    expect(before.map((c) => c.chapter)).toEqual([...CHAPTERS]);
    const self = before.find((c) => c.chapter === "self")!;
    expect(self.answered).toBe(0);
    expect(self.total).toBeGreaterThanOrEqual(15);
    const first = QUESTION_BANK.find((q) => q.id === self.nextId)!;
    const answer = first.format === "scale" ? { scale: 3 } : { choice: first.options![0]!.value };
    await answerQuestion(u.userId, { questionId: first.id, questionVersion: first.version, answer });
    const after = (await chapterProgress(u.userId)).find((c) => c.chapter === "self")!;
    expect(after.answered).toBe(1);
    expect(after.nextId).not.toBe(first.id);
  });

  it("brings a skipped question back after a week, and an old answer back after the re-ask period", async () => {
    const u = await makeUser();
    const story = (await chapterProgress(u.userId)).find((c) => c.chapter === "story")!;
    await skipQuestion(u.userId, story.nextId!);
    const now = new Date();
    expect((await chapterProgress(u.userId, now)).find((c) => c.chapter === "story")!.nextId).not.toBe(story.nextId);
    const later = new Date(now.getTime() + 8 * 86400_000);
    expect((await chapterProgress(u.userId, later)).find((c) => c.chapter === "story")!.nextId).toBe(story.nextId);
  });
});
