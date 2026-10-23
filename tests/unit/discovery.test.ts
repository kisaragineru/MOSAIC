import { describe, expect, it } from "vitest";
import { QUESTION_BANK } from "@/content/questions";
import { followUpFor, normalizeAnswer, signalsFor } from "@/lib/discovery/answers";
import { selectQuestion, type CatalogQuestion, type HistoryEvent } from "@/lib/discovery/select";
import { computeClaims, MIN_EVIDENCE } from "@/lib/discovery/tendency-model";

const catalog: CatalogQuestion[] = QUESTION_BANK.map((q) => ({
  id: q.id,
  category: q.category,
  sensitivity: q.sensitivity,
  followUpOnly: !!q.followUpOnly,
}));
const byId = new Map(catalog.map((q) => [q.id, q]));

describe("question bank integrity", () => {
  it("ids are unique, prompts bilingual, options/scales well-formed, follow-ups resolve", () => {
    const ids = new Set<string>();
    for (const q of QUESTION_BANK) {
      expect(ids.has(q.id)).toBe(false);
      ids.add(q.id);
      expect(q.prompt.en.length).toBeGreaterThan(3);
      expect(q.prompt.vi.length).toBeGreaterThan(3);
      if (q.format === "single" || q.format === "multi") {
        expect(q.options!.length).toBeGreaterThanOrEqual(2);
        expect(new Set(q.options!.map((o) => o.value)).size).toBe(q.options!.length);
        for (const o of q.options!) expect(o.label.en && o.label.vi).toBeTruthy();
      }
      if (q.format === "scale") expect(q.scale!.min).toBeLessThan(q.scale!.max);
      for (const f of q.followUps ?? []) expect(QUESTION_BANK.find((x) => x.id === f.questionId)?.followUpOnly).toBe(true);
      for (const s of q.signals ?? []) {
        if (s.whenValue) expect(q.options!.map((o) => o.value)).toContain(s.whenValue);
      }
      // Free text is never used for comparison.
      if (q.format === "short" || q.format === "free") expect(q.comparable).toBe(false);
    }
  });
});

describe("selection", () => {
  it("is deterministic for the same state and seed", () => {
    expect(selectQuestion(catalog, [], "u1:2026-10-23:0")).toBe(selectQuestion(catalog, [], "u1:2026-10-23:0"));
  });

  it("never offers follow-up-only questions", () => {
    for (let i = 0; i < 50; i++) {
      const id = selectQuestion(catalog, [], `seed-${i}`)!;
      expect(byId.get(id)!.followUpOnly).toBe(false);
    }
  });

  it("does not repeat recently answered, skipped or offered questions", () => {
    const history: HistoryEvent[] = [];
    const offered = new Set<string>();
    // Simulate 40 days, answering every offered question.
    for (let day = 0; day < 40; day++) {
      for (const e of history) e.daysAgo += 1;
      const id = selectQuestion(catalog, history, `u:${day}`)!;
      expect(offered.has(id)).toBe(false);
      offered.add(id);
      history.push({ questionId: id, kind: "offered", daysAgo: 0 }, { questionId: id, kind: "answered", daysAgo: 0 });
    }
  });

  it("re-offers a long-answered question only when nothing new is left", () => {
    const small: CatalogQuestion[] = [
      { id: "a", category: "x", sensitivity: "low", followUpOnly: false },
      { id: "b", category: "x", sensitivity: "low", followUpOnly: false },
    ];
    expect(selectQuestion(small, [{ questionId: "a", kind: "answered", daysAgo: 400 }], "s")).toBe("b");
    expect(
      selectQuestion(small, [{ questionId: "a", kind: "answered", daysAgo: 400 }, { questionId: "b", kind: "answered", daysAgo: 3 }], "s"),
    ).toBe("a");
    expect(selectQuestion(small, [{ questionId: "a", kind: "answered", daysAgo: 30 }, { questionId: "b", kind: "skipped", daysAgo: 3 }], "s")).toBeNull();
  });

  it("avoids two high-sensitivity questions in a row", () => {
    const high = catalog.filter((q) => q.sensitivity === "high");
    expect(high.length).toBeGreaterThan(0);
    const history: HistoryEvent[] = [{ questionId: high[0]!.id, kind: "offered", daysAgo: 1 }];
    for (let i = 0; i < 30; i++) {
      const id = selectQuestion(catalog, history, `s${i}`)!;
      expect(byId.get(id)!.sensitivity).not.toBe("high");
    }
  });

  it("prefers categories with fewer answers", () => {
    const food = catalog.filter((q) => q.category === "food").map((q) => q.id);
    const history: HistoryEvent[] = food.slice(0, 3).map((id) => ({ questionId: id, kind: "answered" as const, daysAgo: 5 }));
    for (let i = 0; i < 10; i++) expect(byId.get(selectQuestion(catalog, history, `t${i}`)!)!.category).not.toBe("food");
  });
});

describe("answers", () => {
  const single = { format: "single" as const, options: [{ value: "a", label: { en: "A", vi: "A" } }, { value: "b", label: { en: "B", vi: "B" } }], maxChoices: null, scale: null };
  it("validates formats strictly", () => {
    expect(normalizeAnswer(single, { choice: "a" })).toEqual({ choice: "a" });
    expect(() => normalizeAnswer(single, { choice: "z" })).toThrow("invalid_choice");
    const multi = { ...single, format: "multi" as const, maxChoices: 1 };
    expect(() => normalizeAnswer(multi, { choices: ["a", "b"] })).toThrow("too_many_choices");
    expect(normalizeAnswer({ ...multi, maxChoices: null }, { choices: ["b", "a", "b"] })).toEqual({ choices: ["a", "b"] });
    const scale = { format: "scale" as const, options: null, maxChoices: null, scale: { min: 1, max: 5 } };
    expect(normalizeAnswer(scale, { scale: "4" })).toEqual({ scale: 4 });
    expect(() => normalizeAnswer(scale, { scale: 6 })).toThrow("invalid_scale");
    expect(() => normalizeAnswer(scale, { scale: 2.5 })).toThrow("invalid_scale");
    const short = { format: "short" as const, options: null, maxChoices: null, scale: null };
    expect(normalizeAnswer(short, { text: "  hi " })).toEqual({ text: "hi" });
    expect(() => normalizeAnswer(short, { text: "x".repeat(281) })).toThrow("answer_too_long");
    expect(() => normalizeAnswer(short, { text: "   " })).toThrow("empty_answer");
  });

  it("maps answers to signals and follow-ups", () => {
    const sig = [
      { claimKey: "planning" as const, direction: 1 as const, whenScaleAtLeast: 4 },
      { claimKey: "planning" as const, direction: -1 as const, whenScaleAtMost: 2 },
    ];
    expect(signalsFor({ scale: 3 }, sig)).toEqual([]);
    expect(signalsFor({ scale: 5 }, sig)[0]!.direction).toBe(1);
    expect(followUpFor({ choice: "yes" }, [{ whenValue: "yes", questionId: "f" }])).toBe("f");
    expect(followUpFor({ choice: "no" }, [{ whenValue: "yes", questionId: "f" }])).toBeNull();
  });
});

describe("tendency model", () => {
  const now = new Date("2026-10-23T00:00:00Z");
  const r = (id: string, direction: 1 | -1, daysAgo = 1) => ({
    responseId: id,
    questionId: `q-${id}`,
    answeredAt: new Date(now.getTime() - daysAgo * 86400_000),
    signals: [{ claimKey: "planning" as const, direction }],
  });

  it("never asserts a claim from a single answer", () => {
    const [c] = computeClaims([r("1", 1)], now);
    expect(c!.isValid).toBe(false);
    expect(c!.supportIds).toEqual(["1"]);
    expect(MIN_EVIDENCE).toBeGreaterThanOrEqual(3);
  });

  it("asserts with enough agreeing evidence, keeps contradicting ids, confidence < 1", () => {
    const [c] = computeClaims([r("1", 1), r("2", 1), r("3", 1), r("4", -1)], now);
    expect(c).toMatchObject({ direction: 1, isValid: true, mixed: false, supportIds: ["1", "2", "3"], contradictIds: ["4"] });
    expect(c!.confidence).toBeGreaterThan(0);
    expect(c!.confidence).toBeLessThan(1);
  });

  it("reports mixed evidence instead of picking a side", () => {
    const [c] = computeClaims([r("1", 1), r("2", 1), r("3", -1), r("4", -1)], now);
    expect(c).toMatchObject({ isValid: false, mixed: true });
  });

  it("old evidence is less certain than recent evidence", () => {
    const fresh = computeClaims([r("1", 1), r("2", 1), r("3", 1)], now)[0]!;
    const old = computeClaims([r("1", 1, 2000), r("2", 1, 2000), r("3", 1, 2000)], now)[0]!;
    expect(old.confidence).toBeLessThan(fresh.confidence);
  });

  it("a multi-choice answer counts once per claim", () => {
    const multi = { ...r("1", 1), signals: [{ claimKey: "planning" as const, direction: 1 as const }, { claimKey: "planning" as const, direction: 1 as const }] };
    expect(computeClaims([multi], now)[0]!.supportIds).toEqual(["1"]);
  });
});
