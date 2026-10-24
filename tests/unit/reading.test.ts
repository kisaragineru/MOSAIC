import { describe, expect, it } from "vitest";
import { AXES } from "@/content/axes";
import { COMBOS } from "@/content/insight-combos";
import { MANUAL } from "@/content/manual-axes";
import { composeReading, type ReadingClaim } from "@/server/services/reading";

const c = (key: ReadingClaim["key"], direction: 1 | -1, state: ReadingClaim["state"], evidenceCount: number, confidence = 0.6, rejected = false): ReadingClaim => ({
  id: `id-${key}`, key, direction, state, confidence, evidenceCount, rejected,
  evidence: [{ questionId: "p.weekend_plan", polarity: 1, answer: { choice: "plan" } }],
});

describe("the Insights reading", () => {
  it("has a combo text for every pair, in all languages, on real axes", () => {
    for (const x of COMBOS) {
      expect(AXES).toContain(x.a[0]);
      expect(AXES).toContain(x.b[0]);
      for (const l of ["ja", "en", "vi"] as const) expect(x.title[l] && x.text[l].length > 30).toBeTruthy();
    }
  });

  it("invites a first answer when there is nothing yet", () => {
    const r = composeReading([], new Set(), 0, "ja");
    expect(r.overview).toHaveLength(1);
    expect(r.overview[0]).toMatch(/まだ手がかり/);
    expect(r.cards).toEqual([]);
  });

  it("reads something even from one or two answers, as a clearly marked hypothesis", () => {
    const r = composeReading([c("planning", 1, "insufficient", 1)], new Set(["p.weekend_plan"]), 1, "ja");
    expect(r.overview[0]).toMatch(/1問答えてくれました/);
    const card = r.cards[0]!;
    expect(card).toMatchObject({ kind: "hypothesis", need: 2 });
    expect(card.lead).toMatch(/^まだ1問の答えからの仮説ですが、いまのところ「先に計画を立てる」寄りです。/);
    expect(MANUAL.planning!.pos.portrait.ja.startsWith(card.body)).toBe(true);
    expect(card.body.endsWith("。")).toBe(true);
    expect(card.quotes[0]).toMatch(/^「.+」に「.+」と答えました$/);
    expect(card.nextQuestionId).not.toBe("p.weekend_plan");
  });

  it("weaves the clearest tendencies and a matching combo into the overview", () => {
    const r = composeReading([c("planning", 1, "consistent", 5, 0.8), c("novelty", 1, "emerging", 3, 0.4), c("calm", 1, "mixed", 4)], new Set(), 12, "en");
    expect(r.overview[0]).toBe("From your 12 answers so far, 3 tendencies have come into view. The clearest is that you're someone who plans ahead.");
    expect(r.overview[1]).toMatch(/someone who plans ahead, and also someone who jumps at new things.*the planning adventurer\.$/);
    expect(r.overview.join(" ")).toMatch(/go both ways/);
    expect(r.combos[0]!.title).toBe("The planning adventurer");
    expect(r.cards.map((x) => x.kind)).toEqual(["consistent", "emerging", "mixed"]);
    expect(r.cards[0]!.body).toBe(`${MANUAL.planning!.pos.portrait.en} ${MANUAL.planning!.pos.thrive.en}`);
    expect(r.cards[2]!.body).toBe(MANUAL.calm!.mixed.en);
  });

  it("leaves out what the user rejected", () => {
    const r = composeReading([c("planning", 1, "consistent", 5, 0.8, true), c("novelty", 1, "consistent", 5)], new Set(), 10, "en");
    expect(r.cards.map((x) => x.key)).toEqual(["novelty"]);
    expect(r.combos).toEqual([]);
    expect(r.overview.join(" ")).not.toMatch(/plans ahead/);
  });
});
