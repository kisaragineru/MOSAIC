import { describe, expect, it } from "vitest";
import { AXES, AXIS_CHAPTER, AXIS_CHAPTERS, AXIS_LABEL, CHAPTER_INFO, CHAPTERS, chapterOf } from "@/content/axes";
import { isComparable, QUESTION_BANK, TENDENCY_KEYS, TENDENCY_TEXT } from "@/content/questions";
import { QUESTION_JA } from "@/content/questions-ja";
import { SUPPORTED_LOCALES } from "@/lib/i18n/locales";

describe("question bank v2", () => {
  it("covers every axis with at least five questions, and both poles of each", () => {
    for (const k of TENDENCY_KEYS) {
      const qs = QUESTION_BANK.filter((q) => q.signals?.some((s) => s.claimKey === k));
      expect(qs.length, k).toBeGreaterThanOrEqual(5);
      const dirs = new Set(qs.flatMap((q) => q.signals!.filter((s) => s.claimKey === k).map((s) => s.direction)));
      expect([...dirs].sort(), k).toEqual([-1, 1]);
    }
  });

  it("decides comparability by one rule: picked answers yes, written answers never", () => {
    for (const q of QUESTION_BANK) {
      expect(q.comparable, q.id).toBe(isComparable(q));
      if (q.format === "short" || q.format === "free") expect(q.comparable, q.id).toBe(false);
      if (q.followUpOnly || q.sensitivity === "high" || q.category === "change") expect(q.comparable, q.id).toBe(false);
    }
  });

  it("has Japanese and Vietnamese text for every prompt, option and scale", () => {
    for (const q of QUESTION_BANK) {
      expect(q.prompt.vi.trim(), q.id).not.toBe("");
      const ja = QUESTION_JA[q.id];
      expect(ja?.prompt, q.id).toBeTruthy();
      for (const o of q.options ?? []) {
        expect(o.label.vi.trim(), `${q.id}.${o.value}`).not.toBe("");
        expect(ja!.options?.[o.value], `${q.id}.${o.value} ja`).toBeTruthy();
      }
      if (q.scale) expect(ja!.scale, `${q.id} scale ja`).toHaveLength(2);
      expect(new Set(q.options?.map((o) => o.value)).size, q.id).toBe(q.options?.length ?? 0);
    }
  });

  it("signals only point at options that exist", () => {
    for (const q of QUESTION_BANK)
      for (const s of q.signals ?? []) {
        if (s.whenValue) expect(q.options?.some((o) => o.value === s.whenValue), `${q.id} → ${s.whenValue}`).toBe(true);
        if (s.whenScaleAtLeast !== undefined || s.whenScaleAtMost !== undefined) expect(q.format, q.id).toBe("scale");
      }
  });

  it("puts every axis in an axis chapter and gives each chapter enough questions", () => {
    expect(new Set(AXES)).toEqual(new Set(TENDENCY_KEYS));
    for (const k of TENDENCY_KEYS) expect(AXIS_CHAPTERS as readonly string[]).toContain(AXIS_CHAPTER[k]);
    for (const c of CHAPTERS) expect(QUESTION_BANK.filter((q) => !q.followUpOnly && chapterOf(q) === c).length, c).toBeGreaterThanOrEqual(5);
    for (const q of QUESTION_BANK.filter((x) => x.signals?.length)) expect(chapterOf(q), q.id).toBe(AXIS_CHAPTER[q.signals![0]!.claimKey]);
  });

  it("names every axis, pole and chapter in every language", () => {
    for (const l of SUPPORTED_LOCALES) {
      for (const k of TENDENCY_KEYS) {
        for (const t of [AXIS_LABEL[k].name, AXIS_LABEL[k].pos, AXIS_LABEL[k].neg, TENDENCY_TEXT[k].pos, TENDENCY_TEXT[k].neg]) expect(t[l].trim(), `${k} ${l}`).not.toBe("");
      }
      for (const c of CHAPTERS) expect(CHAPTER_INFO[c].title[l]).toBeTruthy();
    }
  });
});
