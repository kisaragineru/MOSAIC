import { describe, expect, it } from "vitest";
import { SUPPORTED_LOCALES } from "@/lib/i18n/locales";
import { computeChart, type BirthInput } from "@/lib/tuvi/engine";
import { interpret, mainsOf } from "@/lib/tuvi/interpret";
import { GLOSSARY, PALACE_PLAIN, SECTION_PLAIN, STAR_PLAIN } from "@/lib/tuvi/plain";
import { MAIN_STARS, PALACES } from "@/lib/tuvi/stars";
import { GUIDE } from "@/content/tuvi-guide";

const base: BirthInput = { calendar: "solar", solar: { year: 1990, month: 6, day: 7 }, time: { hour: 6, minute: 30 }, timeZone: "Asia/Ho_Chi_Minh", sex: "male", lateRatHour: null, leapMonthRule: null };

function chartOf(input: BirthInput) {
  const r = computeChart(input);
  if (!r.ok) throw new Error("chart expected");
  return r.chart;
}

/** Search a few birthdays for a chart whose Mệnh has no main star of its own. */
function borrowedChart() {
  for (let d = 1; d <= 28; d++)
    for (const hour of [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]) {
      const c = chartOf({ ...base, solar: { year: 1991, month: 3, day: d }, time: { hour, minute: 30 } });
      if (mainsOf(c, "menh")?.borrowed) return c;
    }
  throw new Error("no borrowed chart found");
}

describe("Tử Vi in plain words", () => {
  it("has every star, palace, section and term in all three languages", () => {
    for (const s of MAIN_STARS) for (const l of SUPPORTED_LOCALES) {
      expect(STAR_PLAIN[s].persona[l], `${s}.persona.${l}`).not.toBe("");
      expect(STAR_PLAIN[s].plain[l].length, `${s}.plain.${l}`).toBeGreaterThan(30);
    }
    for (const p of PALACES) for (const l of SUPPORTED_LOCALES) expect(PALACE_PLAIN[p][l]).not.toBe("");
    for (const k of Object.keys(SECTION_PLAIN) as (keyof typeof SECTION_PLAIN)[]) for (const l of SUPPORTED_LOCALES) expect(SECTION_PLAIN[k][l]).not.toBe("");
    for (const g of Object.values(GLOSSARY)) for (const l of SUPPORTED_LOCALES) expect(g.term[l] && g.meaning[l]).toBeTruthy();
  });

  it("explains every theme in everyday words before the detailed reading", () => {
    const sections = interpret(chartOf(base), "ja", 37);
    for (const s of sections.filter((x) => x.section !== "cycles")) {
      expect(s.plain!.length, s.section).toBeGreaterThanOrEqual(3);
      expect(s.plain![0]).toBe(SECTION_PLAIN[s.section as keyof typeof SECTION_PLAIN].ja);
      expect(s.persona, s.section).toBeTruthy();
      expect(s.terms!.map((x) => x.term)).toContain(GLOSSARY.chinh_tinh.term.ja);
    }
    const p = sections.find((x) => x.section === "personality")!;
    const head = mainsOf(chartOf(base), "menh")!;
    expect(p.persona).toBe(head.mains.map((m) => STAR_PLAIN[m].persona.ja).join("・"));
    for (const m of head.mains) expect(p.plain!.join("")).toContain(STAR_PLAIN[m].plain.ja);
    expect(p.terms!.map((x) => x.term)).toContain(GLOSSARY.menh.term.ja);
  });

  it("explains a borrowed reading without jargon", () => {
    const p = interpret(borrowedChart(), "en", 30).find((x) => x.section === "personality")!;
    expect(p.plain!.join(" ")).toMatch(/no main star of its own/);
    expect(p.terms!.map((x) => x.term)).toContain(GLOSSARY.vo_chinh_dieu.term.en);
  });

  it("says in plain words what the current ten years are about", () => {
    const c = interpret(chartOf(base), "ja", 37).find((x) => x.section === "cycles")!;
    expect(c.plain![0]).toMatch(/10年ずつ/);
    expect(c.plain![1]).toMatch(/いま（数え年\d+〜\d+歳）の10年は、「.+」がテーマ/);
    expect(c.terms!.map((x) => x.term)).toContain(GLOSSARY.dai_han.term.ja);
  });

  it("speaks the reader's language", () => {
    for (const l of SUPPORTED_LOCALES) {
      const p = interpret(chartOf(base), l, 37).find((x) => x.section === "love")!;
      expect(p.plain![0]).toBe(SECTION_PLAIN.love[l]);
    }
  });

  it("has a complete guide in every language", () => {
    const texts = [GUIDE.title, GUIDE.lead, ...GUIDE.what, ...GUIDE.chart, ...GUIDE.mosaic, ...GUIDE.care, ...GUIDE.steps.flatMap((s) => [s.title, s.body])];
    for (const x of texts) for (const l of SUPPORTED_LOCALES) expect(x[l].trim()).not.toBe("");
    expect(GUIDE.steps).toHaveLength(6);
  });
});
