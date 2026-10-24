/** Japanese must be complete: nothing may silently fall back to English or Vietnamese. */
import { describe, expect, it } from "vitest";
import { PREFERENCE_CATEGORIES } from "@/content/preference-categories";
import { QUESTION_BANK, QUESTION_CATEGORIES, TENDENCY_TEXT } from "@/content/questions";
import { LOCALIZED_BANK } from "@/content/questions-i18n";
import { QUESTION_JA } from "@/content/questions-ja";
import { compareTuvi, comparePreferences, conversationHints } from "@/lib/compare/compare";
import { en } from "@/lib/i18n/messages/en";
import { ja } from "@/lib/i18n/messages/ja";
import { computeChart, type BirthInput } from "@/lib/tuvi/engine";
import { interpret } from "@/lib/tuvi/interpret";

const JP = /[぀-ヿ一-鿿]/;

describe("Japanese translations", () => {
  it("every question, option and scale label has Japanese text, and no stale keys exist", () => {
    for (const q of QUESTION_BANK) {
      const t = QUESTION_JA[q.id];
      expect(t, q.id).toBeDefined();
      expect(t!.prompt).toMatch(JP);
      for (const o of q.options ?? []) expect(t!.options?.[o.value], `${q.id}.${o.value}`).toMatch(JP);
      if (q.scale) expect(t!.scale?.every((x) => JP.test(x)), `${q.id} scale`).toBe(true);
      expect(Object.keys(t!.options ?? {}).sort()).toEqual((q.options ?? []).map((o) => o.value).sort());
    }
    expect(Object.keys(QUESTION_JA).sort()).toEqual(QUESTION_BANK.map((q) => q.id).sort());
    for (const q of LOCALIZED_BANK) expect(q.prompt.ja).not.toBe(q.prompt.en);
  });

  it("catalog texts are translated", () => {
    for (const c of QUESTION_CATEGORIES) expect(c.label.ja).toMatch(JP);
    for (const c of PREFERENCE_CATEGORIES) expect(c.label.ja).toMatch(JP);
    for (const v of Object.values(TENDENCY_TEXT)) {
      expect(v.pos.ja).toMatch(JP);
      expect(v.neg.ja).toMatch(JP);
    }
  });

  it("UI dictionary: every string differs from English except brand/proper nouns", () => {
    const same: string[] = [];
    const walk = (a: unknown, b: unknown, path: string) => {
      if (typeof a === "string") {
        if (a === b) same.push(path);
      } else if (typeof a === "function") {
        const ra = (a as (...x: unknown[]) => string)("X", 2);
        const rb = (b as (...x: unknown[]) => string)("X", 2);
        if (ra === rb) same.push(path);
      } else if (a && typeof a === "object") {
        for (const k of Object.keys(a)) walk((a as never)[k], (b as never)[k], `${path}.${k}`);
      }
    };
    walk(ja, en, "");
    expect(same.sort()).toEqual([".common.appName", ".common.tagline", ".compare.scopeNames.tuvi", ".insights.aiReasons.not_requested", ".nav.tuvi", ".nav.tabs.tuvi", ".tuvi.title", ".tuvi.ui.stateLabel.unknown", ".tuvi.tuanTriet", ".knowledge.parts.tuvi", ".knowledge.level", ".knowledge.plus", ".welcome.cards.0.0", ".welcome.cards.1.0", ".welcome.cards.2.0", ".welcome.cards.3.0", ".welcome.progress", ".welcome.stepOf"].sort());
  });

  const base: BirthInput = { calendar: "solar", solar: { year: 1990, month: 6, day: 7 }, time: { hour: 6, minute: 30 }, timeZone: "Asia/Ho_Chi_Minh", sex: "male", lateRatHour: null, leapMonthRule: null };
  it.each([
    ["full chart", base],
    ["unknown hour", { ...base, time: null }],
    ["sex unspecified", { ...base, sex: "unspecified" as const }],
    ["another chart", { ...base, solar: { year: 1984, month: 2, day: 2 }, time: { hour: 22, minute: 0 }, sex: "female" as const }],
  ])("Tử Vi interpretation is Japanese in every paragraph (%s)", (_n, input) => {
    const r = computeChart(input);
    if (!r.ok) throw new Error("chart");
    const sections = interpret(r.chart, "ja", 37);
    for (const s of sections) {
      expect(s.title).toMatch(JP);
      for (const p of s.paragraphs) expect(p.text, p.ruleIds.join(",")).toMatch(JP);
    }
  });

  it("comparison texts are Japanese", () => {
    const obs = compareTuvi({ yearStem: 6, yearBranch: 6, napAmElement: "tho", menhBranch: 3 }, { yearStem: 8, yearBranch: 8, napAmElement: "kim", menhBranch: null }, ["An", "Bình"]);
    for (const o of obs) expect(o.text.ja).toMatch(JP);
    const pc = comparePreferences([{ questionId: "r.love_language", answer: { choice: "time" } }, { questionId: "f.drink", answer: { choice: "tea" } }], [{ questionId: "r.love_language", answer: { choice: "words" } }, { questionId: "f.drink", answer: { choice: "tea" } }]);
    for (const h of conversationHints(pc, new Map(LOCALIZED_BANK.map((q) => [q.id, { id: q.id, category: q.category, prompt: q.prompt, format: q.format, options: q.options ?? null }])))) {
      expect(h.text.ja).toMatch(JP);
    }
  });
});
