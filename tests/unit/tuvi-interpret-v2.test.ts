import { describe, expect, it } from "vitest";
import { SUPPORTED_LOCALES } from "@/lib/i18n/locales";
import { computeChart, type BirthInput } from "@/lib/tuvi/engine";
import { interpret, INTERPRETATION_VERSION, lifeStages, palaceDetails, relatedBranches } from "@/lib/tuvi/interpret";
import { MAIN_EXTRA, PALACE_ROLE } from "@/lib/tuvi/interpret-detail";
import { MAIN_STARS, PALACES } from "@/lib/tuvi/stars";

const base: BirthInput = { calendar: "solar", solar: { year: 1990, month: 6, day: 7 }, time: { hour: 6, minute: 30 }, timeZone: "Asia/Ho_Chi_Minh", sex: "male", lateRatHour: null, leapMonthRule: null };

function chartOf(input: BirthInput) {
  const r = computeChart(input);
  if (!r.ok) throw new Error("chart expected");
  return r.chart;
}

describe("Tử Vi interpretation v2", () => {
  it("bumps the interpretation version", () => {
    expect(INTERPRETATION_VERSION).toBe("interp-2");
  });

  it("has every content entry in all three languages", () => {
    for (const s of MAIN_STARS) for (const k of ["family", "strength", "caution"] as const) for (const l of SUPPORTED_LOCALES) expect(MAIN_EXTRA[s][k][l], `${s}.${k}.${l}`).not.toBe("");
    for (const p of PALACES) for (const l of SUPPORTED_LOCALES) expect(PALACE_ROLE[p][l], `${p}.${l}`).not.toBe("");
  });

  it("gives each theme a headline, related palaces and advice traceable to rule ids", () => {
    const sections = interpret(chartOf(base), "ja", 37);
    for (const id of ["personality", "love", "career", "wealth", "family"] as const) {
      const s = sections.find((x) => x.section === id)!;
      expect(s.summary, id).toBeTruthy();
      expect(s.keywords!.length, id).toBeGreaterThan(0);
      const kinds = new Set(s.paragraphs.map((p) => p.kind));
      for (const k of ["core", "related", "strength", "caution"]) expect(kinds.has(k as never), `${id}:${k}`).toBe(true);
      for (const p of s.paragraphs) expect(p.ruleIds.length).toBeGreaterThan(0);
    }
  });

  it("reads the family section with family texts rather than generic keywords", () => {
    const chart = chartOf(base);
    const fam = interpret(chart, "en", 37).find((s) => s.section === "family")!;
    const familyTexts = new Set(MAIN_STARS.map((m) => MAIN_EXTRA[m].family.en));
    expect(fam.paragraphs.some((p) => familyTexts.has(p.text))).toBe(true);
  });

  it("lists twelve consecutive 10-year stages with exactly one current", () => {
    const stages = lifeStages(chartOf(base), "ja", 37);
    expect(stages).toHaveLength(12);
    for (let i = 1; i < stages.length; i++) expect(stages[i]!.from).toBe(stages[i - 1]!.to + 1);
    expect(stages.filter((s) => s.state === "current")).toHaveLength(1);
    const cur = stages.find((s) => s.state === "current")!;
    expect(37).toBeGreaterThanOrEqual(cur.from);
    expect(37).toBeLessThanOrEqual(cur.to);
    expect(stages.every((s) => s.theme.includes(s.role))).toBe(true);
  });

  it("marks stages unknown without an age, and none without a sex (direction unknown)", () => {
    expect(lifeStages(chartOf(base), "en", null).every((s) => s.state === "unknown")).toBe(true);
    expect(lifeStages(chartOf({ ...base, sex: "unspecified" }), "en", 37)).toHaveLength(0);
  });

  it("relates each palace to its trines and its opposite", () => {
    expect(relatedBranches(0)).toEqual({ trine: [4, 8], opposite: 6 });
    expect(relatedBranches(10)).toEqual({ trine: [2, 6], opposite: 4 });
    const details = palaceDetails(chartOf(base), "vi");
    expect(details).toHaveLength(12);
    for (const d of details) {
      expect(d.related).toHaveLength(3);
      if (d.borrowedFrom) expect(d.mains.length).toBeGreaterThanOrEqual(0);
    }
  });

  it("keeps a partial chart (unknown hour) free of palace roles and relations", () => {
    const chart = chartOf({ ...base, time: null });
    expect(palaceDetails(chart, "en").every((d) => d.related.length === 0 && d.role === "")).toBe(true);
    expect(interpret(chart, "en").map((s) => s.section)).toEqual(["personality"]);
  });

  it("dates each 10-year stage: lunar years from the nominal age, Gregorian dates from Lunar New Year", () => {
    const stages = lifeStages(chartOf(base), "ja", 37);
    const first = stages[0]!;
    // Born in lunar year 1990 (Canh Ngọ): nominal age 5 is lived in lunar year 1994.
    expect([first.from, first.yearFrom, first.yearTo]).toEqual([5, 1994, 2003]);
    expect(first.startDate).toBe("1994-02-10"); // Tết Giáp Tuất
    expect(first.endDate).toBe("2004-01-21"); // eve of Tết Giáp Thân (2004-01-22)
    for (let i = 1; i < stages.length; i++) {
      const prev = new Date(`${stages[i - 1]!.endDate}T00:00:00Z`);
      prev.setUTCDate(prev.getUTCDate() + 1);
      if (stages[i]!.startDate) expect(stages[i]!.startDate).toBe(prev.toISOString().slice(0, 10));
    }
    const last = stages[stages.length - 1]!;
    expect(last.yearTo).toBe(2113);
    expect(stages.every((x) => x.startDate && x.endDate)).toBe(true);
  });

  it("gives every stage a theme name, hints from its stars and its three supporting palaces", () => {
    for (const st of lifeStages(chartOf(base), "en", 37)) {
      expect(st.short).not.toBe("");
      expect(st.hints.strengths.length).toBeGreaterThan(0);
      expect(st.hints.strengths.length).toBe(st.hints.cautions.length);
      expect(st.hints.support).toHaveLength(3);
    }
  });
});
