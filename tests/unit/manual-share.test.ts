import { describe, expect, it } from "vitest";
import { MANUAL } from "@/content/manual-axes";
import { composeSharedManual, type SharedManualData } from "@/server/services/manual-share";

const base = (over: Partial<SharedManualData> = {}): SharedManualData => ({
  preset: "friend",
  name: "Hana",
  bio: null,
  claims: [
    { key: "planning", direction: 1, evidence: 5, support: 5, confidence: 0.8 },
    { key: "social_energy", direction: -1, evidence: 3, support: 3, confidence: 0.3 },
    { key: "calm", direction: 1, evidence: 4, support: 2, confidence: 0.2 },
    { key: "pace", direction: 1, evidence: 2, support: 2, confidence: 0.1 },
    { key: "saving", direction: 1, evidence: 5, support: 5, confidence: 0.9 },
    { key: "not_an_axis", direction: 1, evidence: 5, support: 5, confidence: 0.9 },
  ],
  likes: [
    { question_id: "l.season", answer: { choice: "autumn" } },
    { question_id: "v.not_likes", answer: { choice: "x" } },
  ],
  ...over,
});

describe("composeSharedManual", () => {
  it("writes each tendency about the owner, by how sure it is", () => {
    const m = composeSharedManual(base(), "en");
    const t = Object.fromEntries(m.chapters.flatMap((c) => c.traits).map((x) => [x.key, x]));
    expect(t.planning).toMatchObject({ level: "consistent", statement: "Usually, Hana plans ahead.", ask: MANUAL.planning!.pos.ask.en });
    expect(t.social_energy).toMatchObject({ level: "emerging", statement: "It's starting to show that Hana gets energy from time alone.", ask: MANUAL.social_energy!.neg.ask.en });
    expect(t.calm).toMatchObject({ level: "mixed", ask: null });
    expect(t.calm!.statement).toMatch(/^Hana sometimes .+, and sometimes .+\.$/);
    expect(t.pace).toBeUndefined(); // not enough answers yet
  });

  it("never shows axes outside the preset, unknown keys or non-likes answers", () => {
    const m = composeSharedManual(base(), "en");
    expect(m.chapters.map((c) => c.chapter)).toEqual(["self"]);
    expect(JSON.stringify(m)).not.toMatch(/saving|not_an_axis|v\.not_likes/);
    expect(m.likes).toEqual([{ k: "Your favourite season?", v: "Autumn" }]);
    expect(composeSharedManual(base({ preset: "partner" }), "en").chapters.map((c) => c.chapter)).toEqual(["self", "life"]);
  });

  it("puts the clearest first in the summary", () => {
    const m = composeSharedManual(base({ preset: "partner" }), "ja");
    expect(m.summary[0]).toMatch(/^Hanaさんは「.+」ことが多いようです。$/);
    expect(m.summary[0]).toContain("Hanaさん");
    expect(m.summary).toHaveLength(3);
    expect(m.summaryTitle).toBe("ひとことで言うと");
  });

  it("says so when there is nothing to show yet, in every language", () => {
    for (const l of ["ja", "en", "vi"] as const) {
      const m = composeSharedManual(base({ claims: [], likes: [] }), l);
      expect(m.empty).toContain("Hana");
      expect(m.chapters).toEqual([]);
    }
  });
});
