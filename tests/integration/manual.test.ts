import { describe, expect, it } from "vitest";
import { AXES } from "@/content/axes";
import { MANUAL } from "@/content/manual-axes";
import { QUESTION_BANK, type QuestionDef } from "@/content/questions";
import { answerQuestion } from "@/server/services/discovery";
import { buildManual } from "@/server/services/manual";
import { createMemory } from "@/server/services/memories";
import { saveBirthProfile } from "@/server/services/tuvi";
import { makeUser } from "../helpers/factory";

/** The answer that supports the positive pole of the question's first axis. */
function positiveAnswer(q: QuestionDef) {
  const s = q.signals!.find((x) => x.claimKey === q.signals![0]!.claimKey && x.direction === 1);
  if (!s) return null;
  if (s.whenValue) return q.format === "multi" ? { choices: [s.whenValue] } : { choice: s.whenValue };
  if (s.whenScaleAtLeast !== undefined) return { scale: q.scale!.max };
  return null;
}

async function answerEverything(userId: string) {
  for (const q of QUESTION_BANK) {
    if (!q.signals?.length || q.followUpOnly) continue;
    const answer = positiveAnswer(q);
    if (answer) await answerQuestion(userId, { questionId: q.id, questionVersion: q.version, answer });
  }
}

describe("self manual", () => {
  it("is a short, honest guide for a new user", async () => {
    const u = await makeUser();
    const m = await buildManual(u.userId, "ja");
    expect(m.stats).toMatchObject({ answers: 0, memories: 0, axesKnown: 0, responders: 0 });
    expect(m.sections.find((s) => s.id === "self")!.blocks.some((b) => b.t === "note")).toBe(true);
    expect(m.chars).toBeLessThan(2000);
  });

  it("grows into a long read once the questions are answered", async () => {
    const u = await makeUser();
    await answerEverything(u.userId);
    await answerQuestion(u.userId, { questionId: "s.proud_recent", questionVersion: 1, answer: { text: "初めてフルマラソンを完走した" } });
    await createMemory(u.userId, { kind: "achievement", title: "資格に合格", body: "半年かけて勉強した。", occurredOn: "2026-03-01" });
    await createMemory(u.userId, { kind: "letter_to_future", title: "5年後の私へ", body: "ひみつの中身", revealOn: "2031-01-01" });
    await saveBirthProfile(u.userId, { calendarInput: "solar", solarDate: "1990-06-07", timeKnown: true, birthTime: "06:30", timeZone: "Asia/Ho_Chi_Minh", sex: "male" });

    const m = await buildManual(u.userId, "ja");
    expect(m.stats.axesKnown).toBeGreaterThanOrEqual(12);
    expect(m.chars).toBeGreaterThanOrEqual(5000);
    expect(m.chars).toBeLessThanOrEqual(12000);
    const cards = m.sections.flatMap((s) => s.blocks).filter((b) => b.t === "axis");
    expect(cards.length).toBe(m.stats.axesKnown + cards.filter((c) => c.t === "axis" && c.level === "mixed").length);
    // Every card's text comes from the manual for that axis.
    for (const c of cards) if (c.t === "axis" && c.level !== "mixed") expect([MANUAL[c.key]!.pos.portrait.ja, MANUAL[c.key]!.neg.portrait.ja]).toContain(c.portrait);

    const text = JSON.stringify(m.sections);
    expect(text).toContain("初めてフルマラソンを完走した");
    expect(text).toContain("資格に合格");
    expect(text).not.toContain("ひみつの中身");
    expect(text).toContain("2031-01-01");
    const tuvi = m.sections.find((s) => s.id === "tuvi")!;
    expect(tuvi.blocks.filter((b) => b.t === "p").length).toBeGreaterThan(1);
  });

  it("follows the reader's language", async () => {
    const u = await makeUser();
    await answerEverything(u.userId);
    const en = await buildManual(u.userId, "en");
    const vi = await buildManual(u.userId, "vi");
    expect(en.sections[0]!.title).toBe("Before you read");
    expect(vi.sections[0]!.title).toBe("Lời mở đầu");
    const card = en.sections.flatMap((s) => s.blocks).find((b) => b.t === "axis" && b.level !== "mixed");
    expect(card && card.t === "axis" && card.portrait).toMatch(/^[\x20-\x7E’“”—–]+$/);
  });

  it("only shows the user's own data", async () => {
    const a = await makeUser();
    const b = await makeUser();
    await createMemory(a.userId, { kind: "achievement", title: "Aだけの記録", body: "x" });
    const m = await buildManual(b.userId, "ja");
    expect(JSON.stringify(m)).not.toContain("Aだけの記録");
    expect(AXES.length).toBe(17);
  });
});
