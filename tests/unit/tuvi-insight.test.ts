import { describe, expect, it } from "vitest";
import { SUPPORTED_LOCALES, type Locale } from "@/lib/i18n/locales";
import { en } from "@/lib/i18n/messages/en";
import { ja } from "@/lib/i18n/messages/ja";
import { vi } from "@/lib/i18n/messages/vi";
import { computeChart, type BirthInput, type Chart } from "@/lib/tuvi/engine";
import { lifeBand, PAIRS, PALACE_OPTIONS, pairKey, SECTION_ASK, STAR_LIFE, type LifeBand } from "@/lib/tuvi/insight";
import { interpret, lifeStages } from "@/lib/tuvi/interpret";
import { MAIN_STARS, PALACES, STAR_INFO, type MainStarId } from "@/lib/tuvi/stars";

const base: BirthInput = { calendar: "solar", solar: { year: 1990, month: 6, day: 7 }, time: { hour: 6, minute: 30 }, timeZone: "Asia/Ho_Chi_Minh", sex: "male", lateRatHour: null, leapMonthRule: null };
const BANDS: LifeBand[] = ["young", "prime", "transition", "elder"];

function chartOf(input: BirthInput): Chart {
  const r = computeChart(input);
  if (!r.ok) throw new Error("chart expected");
  return r.chart;
}

/** Charts over a year of births at every hour: enough to meet every palace pattern. */
function* charts() {
  for (let m = 1; m <= 12; m++) for (let d = 1; d <= 28; d++) for (let h = 0; h < 24; h += 2) {
    const r = computeChart({ ...base, solar: { year: 1951, month: m, day: d }, time: { hour: h, minute: 30 }, lateRatHour: "next_day", leapMonthRule: "same_month" });
    if (r.ok) yield r.chart;
  }
}

/** Every piece of new text, by language. */
function allText(l: Locale): string[] {
  return [
    ...MAIN_STARS.flatMap((s) => [STAR_LIFE[s].everyday[l], STAR_LIFE[s].tryThis[l], STAR_LIFE[s].ask[l]]),
    ...Object.values(PAIRS).map((p) => p.reading[l]),
    ...PALACES.flatMap((p) => BANDS.flatMap((b) => PALACE_OPTIONS[p][b][l])),
    ...(Object.keys(SECTION_ASK) as (keyof typeof SECTION_ASK)[]).map((k) => SECTION_ASK[k](["x"], l)),
  ];
}

// Words that would turn a traditional reading into a verdict or a prediction.
const VERDICT: Record<Locale, RegExp> = {
  ja: /必ず|絶対|間違いなく|運命|確実に/,
  en: /\balways\b|\bnever\b|\bdefinitely\b|\bguarantee|\bmust\b|\bdestined\b/i,
  vi: /chắc chắn|nhất định|luôn luôn|định mệnh/i,
};
// Ruling things out because of age (or anything else) is not this guide's place.
const PROHIBIT: Record<Locale, RegExp> = {
  ja: /控え|やめ|避け|しないように|無理をしない|もう年|年だから/,
  // "Don't …" as an instruction, not "what you don't accept" as a description.
  en: /\bavoid\b|should not|shouldn't|(^|[.!?]\s+)don't\b|too old|at your age/i,
  vi: /không nên|tránh|đã già|tuổi này rồi/i,
};

describe("Tử Vi readings made personal (interp-4)", () => {
  it("has every new text in all three languages, and each language is its own", () => {
    for (const l of SUPPORTED_LOCALES) for (const x of allText(l)) expect(x.trim(), l).not.toBe("");
    for (const s of MAIN_STARS) for (const k of ["everyday", "tryThis", "ask"] as const) {
      expect(STAR_LIFE[s][k].ja, `${s}.${k}`).not.toBe(STAR_LIFE[s][k].en);
      expect(STAR_LIFE[s][k].vi, `${s}.${k}`).not.toBe(STAR_LIFE[s][k].en);
    }
    // The same number of options in each language, so no language says more than the others.
    for (const p of PALACES) for (const b of BANDS) {
      const o = PALACE_OPTIONS[p][b];
      expect(o.ja.length, `${p}.${b}`).toBe(3);
      expect(o.en.length, `${p}.${b}`).toBe(3);
      expect(o.vi.length, `${p}.${b}`).toBe(3);
    }
  });

  it("reads exactly the pairs of main stars that can share a palace", () => {
    const seen = new Set<string>();
    for (const c of charts()) for (const p of c.palaces) if (p.mainStars.length === 2) seen.add(pairKey(p.mainStars[0]!.id as MainStarId, p.mainStars[1]!.id as MainStarId));
    expect([...seen].sort()).toEqual(Object.keys(PAIRS).sort());
    expect(seen.size).toBe(24);
  });

  it("names a pair by both stars' own names in every language", () => {
    // 1990-06-07 06:30: Thiên Cơ and Cự Môn share the Mệnh palace.
    const chart = chartOf(base);
    for (const l of SUPPORTED_LOCALES) {
      const pair = interpret(chart, l, 37).find((s) => s.section === "personality")!.paragraphs.filter((p) => p.kind === "pair");
      expect(pair, l).toHaveLength(1);
      expect(pair[0]!.ruleIds).toEqual([`menh.pair.${pairKey("thien_co", "cu_mon")}`]);
      for (const name of [STAR_INFO.thien_co.vi, STAR_INFO.cu_mon.vi, "Cơ Cự"]) expect(pair[0]!.text, l).toContain(name);
    }
  });

  it("brings the Mệnh reading into daily life, with something to try and a question per lead star", () => {
    const p = interpret(chartOf(base), "ja", 37).find((s) => s.section === "personality")!;
    for (const kind of ["everyday", "try", "ask"] as const) expect(p.paragraphs.filter((x) => x.kind === kind).map((x) => x.ruleIds[0]), kind).toEqual([`menh.${kind}.thien_co`, `menh.${kind}.cu_mon`]);
    const career = interpret(chartOf(base), "ja", 37).find((s) => s.section === "career")!;
    expect(career.paragraphs.filter((x) => x.kind === "ask")).toHaveLength(1);
  });

  it("says the same thing in each language: the same paragraphs, from the same rules", () => {
    for (const c of [chartOf(base), chartOf({ ...base, solar: { year: 1972, month: 11, day: 3 }, time: { hour: 22, minute: 10 }, sex: "female" })]) {
      const by = Object.fromEntries(SUPPORTED_LOCALES.map((l) => [l, interpret(c, l, 40)]));
      for (const l of SUPPORTED_LOCALES) {
        expect(by[l]!.map((s) => s.paragraphs.map((p) => `${p.kind}:${p.ruleIds.join(",")}`)), l).toEqual(by.en!.map((s) => s.paragraphs.map((p) => `${p.kind}:${p.ruleIds.join(",")}`)));
      }
    }
  });

  it("never turns a reading into a verdict, and never rules something out", () => {
    for (const l of SUPPORTED_LOCALES) for (const x of allText(l)) {
      expect(x, l).not.toMatch(VERDICT[l]);
      expect(x, l).not.toMatch(PROHIBIT[l]);
    }
    for (const d of [ja, en, vi]) for (const x of [d.tuvi.ui.optionsLead, d.tuvi.ui.optionsNote]) expect(x).not.toMatch(/必ず|\bmust\b|chắc chắn/);
  });

  it("says a palace without main stars lacks nothing, and names the tradition's term", () => {
    let found = false;
    for (const c of charts()) {
      if (c.menh === null || c.palaces[c.menh]!.mainStars.length) continue;
      for (const l of SUPPORTED_LOCALES) {
        const plain = interpret(c, l, 30).find((s) => s.section === "personality")!.plain!.join(" ");
        expect(plain, l).toContain("Vô Chính Diệu");
      }
      found = true;
      break;
    }
    expect(found).toBe(true);
  });
});

describe("10-year periods by age (interp-4)", () => {
  it("puts ages into bands by the period's middle age, without childhood or 95+", () => {
    expect(lifeBand(4, 13)).toBeNull();
    expect(lifeBand(14, 23)).toBe("young");
    expect(lifeBand(24, 33)).toBe("young");
    expect(lifeBand(34, 43)).toBe("prime");
    expect(lifeBand(54, 63)).toBe("transition");
    expect(lifeBand(64, 73)).toBe("transition");
    expect(lifeBand(74, 83)).toBe("elder");
    expect(lifeBand(84, 93)).toBe("elder");
    expect(lifeBand(94, 103)).toBeNull();
  });

  it("keeps the periods as the chart computes them, whatever the age", () => {
    const chart = chartOf(base);
    const engine = chart.palaces.filter((p) => p.daiHan).map((p) => `${p.branch}:${p.daiHan!.from}-${p.daiHan!.to}`).sort();
    for (const age of [10, 37, 62, 90]) {
      const stages = lifeStages(chart, "ja", age);
      expect(stages.map((s) => `${s.branch}:${s.from}-${s.to}`).sort(), String(age)).toEqual(engine);
      expect(stages.map((s) => s.label)).toEqual(lifeStages(chart, "ja", 10).map((s) => s.label));
    }
  });

  it("offers ways of living a theme that fit the age, only for periods now or ahead", () => {
    const chart = chartOf(base);
    const stages = lifeStages(chart, "ja", 37);
    for (const s of stages) {
      if (s.state === "past" || s.band === null) expect(s.hints.options, `${s.from}`).toEqual([]);
      else expect(s.hints.options, `${s.from}`).toEqual(PALACE_OPTIONS[s.palace!][s.band].ja);
    }
    // The same theme reads differently when young and when old.
    for (const p of PALACES) expect(PALACE_OPTIONS[p].young.ja).not.toEqual(PALACE_OPTIONS[p].elder.ja);
  });

  it("at about 90, offers choices worded for now — new places included — and no age-based ban", () => {
    // Born 1936: around 90 in 2025, in the period that holds that age.
    const chart = chartOf({ ...base, solar: { year: 1936, month: 3, day: 15 } });
    for (const l of SUPPORTED_LOCALES) {
      const now = lifeStages(chart, l, 90).find((s) => s.state === "current")!;
      expect(now.band, l).toBe("elder");
      expect(now.hints.options.length, l).toBe(3);
      for (const o of now.hints.options) expect(o, l).not.toMatch(PROHIBIT[l]);
      // Later life, now: the question is about these years, not "when you reach this age".
      if (now.hints.reflection) expect(now.hints.reflection.text, l).not.toMatch(/迎えたとき|When you reach|Khi đến độ tuổi/);
    }
    // Travel and new places stay open in later life, in the reader's own way.
    expect(PALACE_OPTIONS.thien_di.elder.ja.join(" ")).toContain("新しい場所");
    expect(PALACE_OPTIONS.thien_di.elder.en.join(" ")).toContain("new places");
    expect(PALACE_OPTIONS.thien_di.elder.ja.join(" ")).not.toMatch(/冒険しよう/);
  });
});
