import { describe, expect, it } from "vitest";
import { chapterOf } from "@/content/axes";
import { QUESTION_BANK } from "@/content/questions";
import { allProgress, answerQuestion, chapterProgress, skipQuestion } from "@/server/services/discovery";
import { makeUser } from "../helpers/factory";

const IN_CHAPTERS = QUESTION_BANK.filter((q) => !q.followUpOnly && q.active !== false);

function answerFor(id: string) {
  const q = QUESTION_BANK.find((x) => x.id === id)!;
  if (q.format === "single") return { choice: q.options![0]!.value };
  if (q.format === "multi") return { choices: [q.options![0]!.value] };
  if (q.format === "scale") return { scale: q.scale!.min };
  return { text: "テスト" };
}

describe("answer them all", () => {
  it("counts every chapter question and offers one at once", async () => {
    const u = await makeUser();
    const p = await allProgress(u.userId);
    expect(p).toMatchObject({ total: IN_CHAPTERS.length, answered: 0, left: IN_CHAPTERS.length });
    expect(p.next).not.toBeNull();
  });

  it("walks through every question, with no daily limit, until none is left", async () => {
    const u = await makeUser();
    const seen = new Set<string>();
    for (let i = 0; i < IN_CHAPTERS.length + 5; i++) {
      const p = await allProgress(u.userId);
      if (!p.next) break;
      expect(seen.has(p.next.id), `offered twice: ${p.next.id}`).toBe(false);
      seen.add(p.next.id);
      await answerQuestion(u.userId, { questionId: p.next.id, questionVersion: QUESTION_BANK.find((q) => q.id === p.next!.id)!.version, answer: answerFor(p.next.id) });
    }
    const end = await allProgress(u.userId);
    expect(end).toMatchObject({ answered: IN_CHAPTERS.length, left: 0, next: null });
    expect(seen.size).toBe(IN_CHAPTERS.length);
  }, 120_000);

  it("spreads questions across chapters instead of draining one", async () => {
    const u = await makeUser();
    const chapters: string[] = [];
    for (let i = 0; i < 6; i++) {
      const p = await allProgress(u.userId);
      chapters.push(p.next!.chapter);
      expect(chapterOf(QUESTION_BANK.find((q) => q.id === p.next!.id)!)).toBe(p.next!.chapter);
      await answerQuestion(u.userId, { questionId: p.next!.id, questionVersion: 1, answer: answerFor(p.next!.id) });
    }
    expect(new Set(chapters).size).toBe(6);
  });

  it("moves past a skipped question and counts it as left only once it comes back", async () => {
    const u = await makeUser();
    const first = (await allProgress(u.userId)).next!;
    await skipQuestion(u.userId, first.id);
    const p = await allProgress(u.userId);
    expect(p.next!.id).not.toBe(first.id);
    expect(p.left).toBe(IN_CHAPTERS.length - 1);
    const ch = (await chapterProgress(u.userId)).find((c) => c.chapter === first.chapter)!;
    expect(ch.freshId).not.toBe(first.id);
    // A week later it is offered again.
    const later = await allProgress(u.userId, new Date(Date.now() + 8 * 86400_000));
    expect(later.left).toBe(IN_CHAPTERS.length);
  });
});
