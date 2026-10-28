import { describe, expect, it } from "vitest";
import { SUPPORTED_LOCALES } from "@/lib/i18n/locales";
import { LENS_PALACE, PAIR_LENSES, pairReadings } from "@/lib/compare/tuvi-pair";
import { computeChart, type BirthInput } from "@/lib/tuvi/engine";
import { mainsOf } from "@/lib/tuvi/interpret";
import { fromSharedChart, toSharedChart } from "@/lib/tuvi/shared-chart";
import { MAIN_STARS, STAR_INFO } from "@/lib/tuvi/stars";
import { PAIR_STAR } from "@/lib/compare/pair-stars";

const base: BirthInput = { calendar: "solar", solar: { year: 1990, month: 6, day: 7 }, time: { hour: 6, minute: 30 }, timeZone: "Asia/Ho_Chi_Minh", sex: "male", lateRatHour: null, leapMonthRule: null };
const other: BirthInput = { ...base, solar: { year: 1992, month: 3, day: 15 }, time: { hour: 21, minute: 10 }, sex: "female" };
function chartOf(input: BirthInput) {
  const r = computeChart(input);
  if (!r.ok) throw new Error("chart expected");
  return r.chart;
}

describe("pair readings (pair-1)", () => {
  const a = chartOf(base);
  const b = chartOf(other);

  it("reads every lens both ways, pointing out exactly the shared main stars", () => {
    const r = pairReadings(a, b, ["An", "Bình"], [37, 35], "ja");
    expect(r.lenses.map((x) => x.lens)).toEqual([...PAIR_LENSES]);
    for (const lens of r.lenses) {
      const [ab, ba] = lens.sides;
      expect([ab.from, ab.to, ba.from, ba.to]).toEqual(["An", "Bình", "Bình", "An"]);
      const want = (mainsOf(a, LENS_PALACE[lens.lens])?.mains ?? []).filter((m) => (mainsOf(b, "menh")?.mains ?? []).includes(m)).map((m) => STAR_INFO[m].vi);
      expect(ab.shared).toEqual(want);
      expect(ab.text.includes("重なっています")).toBe(want.length > 0);
      expect(lens.prompts.length).toBeGreaterThan(0);
      // In plain words: what An tends to look for, what Bình brings, and one thing to keep in mind.
      expect(ab.reading).toMatch(/^Anさんが.+に求めやすいのは、.+Bìnhさんの持ち味は/);
      expect(ab.reading!.includes("思い描く姿に近く")).toBe(want.length > 0);
      expect(ab.care).toBeTruthy();
    }
  });

  it("sees a shared Mệnh and the same decade when both charts match", () => {
    const r = pairReadings(a, a, ["An", "An2"], [37, 37], "ja");
    expect(r.menh.text).toMatch(/共通の星/);
    expect(r.timing.lines).toHaveLength(2);
    expect(r.timing.note).toMatch(/二人とも今は/);
  });

  it("has a concrete reading for every main star, in every language", () => {
    for (const m of MAIN_STARS) for (const k of ["want", "give", "scene", "care"] as const) for (const l of SUPPORTED_LOCALES) expect(PAIR_STAR[m][k][l].length).toBeGreaterThan(4);
  });

  it("never scores, in any language", () => {
    for (const l of SUPPORTED_LOCALES) {
      const json = JSON.stringify(pairReadings(a, b, ["An", "Bình"], [37, 35], l));
      expect(json).not.toMatch(/\d+\s*(%|点|points?|điểm)/i);
      expect(json).not.toMatch(/undefined|NaN/);
    }
  });

  it("works the same on a shared (scrubbed) chart", () => {
    const shared = fromSharedChart(toSharedChart(a));
    expect(pairReadings(shared, b, ["An", "Bình"], [37, 35], "en")).toEqual(pairReadings(a, b, ["An", "Bình"], [37, 35], "en"));
  });
});
