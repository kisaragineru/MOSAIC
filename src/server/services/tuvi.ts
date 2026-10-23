import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { SUPPORTED_LOCALES, type Locale } from "@/lib/i18n/locales";
import { solarToLunar } from "@/lib/tuvi/calendar";
import { canonicalJson, computeChart, isValidTimeZone, nominalAge, type BirthInput, type Chart, type NeedsDecision } from "@/lib/tuvi/engine";
import { interpret, INTERPRETATION_VERSION, type InterpretationSection } from "@/lib/tuvi/interpret";
import { DEFAULT_RULESET, ENGINE_VERSION } from "@/lib/tuvi/ruleset";
import { isoDate, todayIn } from "@/lib/validation/common";
import { sha256 } from "../auth/crypto";
import { birthProfiles, profiles, tuviCharts, tuviInterpretations } from "../db/schema";
import { withUser, type Tx } from "../db/tx";
import { invalid } from "../errors";
import { audit } from "./audit";

const empty = (v: unknown) => (v === "" || v === null ? undefined : v);

export const birthSchema = z
  .object({
    calendarInput: z.enum(["solar", "lunar"]),
    solarDate: z.preprocess(empty, isoDate.optional()),
    lunarYear: z.preprocess(empty, z.coerce.number().int().min(1900).max(2100).optional()),
    lunarMonth: z.preprocess(empty, z.coerce.number().int().min(1).max(12).optional()),
    lunarDay: z.preprocess(empty, z.coerce.number().int().min(1).max(30).optional()),
    lunarLeap: z.preprocess((v) => v === true || v === "on" || v === "true", z.boolean()),
    timeKnown: z.preprocess((v) => v === true || v === "on" || v === "true", z.boolean()),
    birthTime: z.preprocess(empty, z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional()),
    timeZone: z.string().max(64).refine(isValidTimeZone, "invalid_time_zone"),
    placeLabel: z.preprocess(empty, z.string().trim().max(120).optional()),
    sex: z.enum(["male", "female", "unspecified"]).default("unspecified"),
    lateRatHour: z.preprocess(empty, z.enum(["next_day", "same_day"]).optional()),
    leapMonthRule: z.preprocess(empty, z.enum(["same_month", "next_month", "split_15"]).optional()),
  })
  .superRefine((v, ctx) => {
    if (v.calendarInput === "solar" && !v.solarDate) ctx.addIssue({ code: "custom", message: "solar_date_required", path: ["solarDate"] });
    if (v.calendarInput === "lunar" && (!v.lunarYear || !v.lunarMonth || !v.lunarDay)) {
      ctx.addIssue({ code: "custom", message: "lunar_date_required", path: ["lunarDay"] });
    }
    if (v.timeKnown && !v.birthTime) ctx.addIssue({ code: "custom", message: "time_required", path: ["birthTime"] });
  });

export type BirthFormInput = z.input<typeof birthSchema>;

function toEngineInput(p: typeof birthProfiles.$inferSelect): BirthInput {
  const [y, m, d] = (p.solarDate ?? "0-0-0").split("-").map(Number) as [number, number, number];
  const [hh, mm] = (p.birthTime ?? "00:00").split(":").map(Number) as [number, number];
  return {
    calendar: p.calendarInput as "solar" | "lunar",
    solar: p.calendarInput === "solar" ? { year: y, month: m, day: d } : undefined,
    lunar:
      p.calendarInput === "lunar"
        ? { year: p.lunarYear!, month: p.lunarMonth!, day: p.lunarDay!, leap: p.lunarLeap }
        : undefined,
    time: p.timeKnown ? { hour: hh, minute: mm } : null,
    timeZone: p.timeZone,
    sex: p.sex as BirthInput["sex"],
    lateRatHour: (p.lateRatHour as BirthInput["lateRatHour"]) ?? null,
    leapMonthRule: (p.leapMonthRule as BirthInput["leapMonthRule"]) ?? null,
  };
}

export type SaveBirthResult =
  | { status: "computed"; chartId: string; reused: boolean }
  | { status: "needs_decision"; needs: NeedsDecision[] }
  | { status: "invalid"; error: "invalid_date" | "invalid_time" };

/**
 * Save birth data and (re)compute the chart. Birth data is private and never leaves the
 * owner's rows; comparisons only ever read derived summary columns via consented functions.
 */
export async function saveBirthProfile(userId: string, input: unknown): Promise<SaveBirthResult> {
  const v = birthSchema.parse(input);
  return withUser(userId, async (tx) => {
    const values = {
      userId,
      calendarInput: v.calendarInput,
      solarDate: v.calendarInput === "solar" ? v.solarDate! : null,
      lunarYear: v.calendarInput === "lunar" ? v.lunarYear! : null,
      lunarMonth: v.calendarInput === "lunar" ? v.lunarMonth! : null,
      lunarDay: v.calendarInput === "lunar" ? v.lunarDay! : null,
      lunarLeap: v.calendarInput === "lunar" ? v.lunarLeap : false,
      birthTime: v.timeKnown ? v.birthTime! : null,
      timeKnown: v.timeKnown,
      timeZone: v.timeZone,
      placeLabel: v.placeLabel ?? null,
      sex: v.sex,
      lateRatHour: v.lateRatHour ?? null,
      leapMonthRule: v.leapMonthRule ?? null,
      updatedAt: new Date(),
    };
    const [profile] = await tx
      .insert(birthProfiles)
      .values(values)
      .onConflictDoUpdate({ target: birthProfiles.userId, set: values })
      .returning();
    await audit(tx, userId, "tuvi.birth_profile_saved");
    return computeAndStore(tx, userId, profile!);
  });
}

async function computeAndStore(tx: Tx, userId: string, profile: typeof birthProfiles.$inferSelect): Promise<SaveBirthResult> {
  const input = toEngineInput(profile);
  const outcome = computeChart(input, DEFAULT_RULESET);
  if (!outcome.ok) {
    // Keep the previous chart out of "current" so stale results are never shown for new data.
    await tx.update(tuviCharts).set({ isCurrent: false }).where(and(eq(tuviCharts.userId, userId), eq(tuviCharts.isCurrent, true)));
    return "needs" in outcome ? { status: "needs_decision", needs: outcome.needs } : { status: "invalid", error: outcome.error };
  }
  const chart = outcome.chart;
  const inputHash = sha256(canonicalJson({ input, ruleset: DEFAULT_RULESET.id, engine: ENGINE_VERSION }));
  const [current] = await tx.select().from(tuviCharts).where(and(eq(tuviCharts.userId, userId), eq(tuviCharts.isCurrent, true)));
  if (current && current.inputHash === inputHash && current.engineVersion === ENGINE_VERSION) {
    return { status: "computed", chartId: current.id, reused: true };
  }
  await tx.update(tuviCharts).set({ isCurrent: false }).where(and(eq(tuviCharts.userId, userId), eq(tuviCharts.isCurrent, true)));
  const [row] = await tx
    .insert(tuviCharts)
    .values({
      userId,
      birthProfileId: profile.id,
      rulesetId: DEFAULT_RULESET.id,
      engineVersion: ENGINE_VERSION,
      inputHash,
      chart,
      yearStem: chart.yearPillar.stem,
      yearBranch: chart.yearPillar.branch,
      napAmElement: chart.napAm.element,
      menhBranch: chart.menh,
      cucNumber: chart.cuc?.number ?? null,
      isCurrent: true,
    })
    .returning();
  for (const locale of SUPPORTED_LOCALES) {
    const sections = interpret(chart, locale);
    const rows = sections.map((s) => ({
      userId,
      chartId: row!.id,
      section: s.section,
      locale,
      ruleIds: [INTERPRETATION_VERSION, ...s.paragraphs.flatMap((p) => p.ruleIds)],
      body: JSON.stringify(s),
      source: "rules" as const,
    }));
    if (rows.length) await tx.insert(tuviInterpretations).values(rows);
  }
  return { status: "computed", chartId: row!.id, reused: false };
}

export interface TuviView {
  profile: typeof birthProfiles.$inferSelect | null;
  chart: (Chart & { id: string; createdAt: Date; rulesetId: string; engineVersion: string; inputHash: string }) | null;
  needs: NeedsDecision[];
  error: string | null;
  sections: InterpretationSection[];
  currentAge: number | null;
  currentLunarYear: number;
}

export async function getTuvi(userId: string, locale: Locale, now = new Date()): Promise<TuviView> {
  return withUser(userId, async (tx) => {
    const [profile] = await tx.select().from(birthProfiles).where(eq(birthProfiles.userId, userId));
    const [p] = await tx.select({ tz: profiles.timeZone }).from(profiles).where(eq(profiles.userId, userId));
    const [y, m, d] = todayIn(p?.tz ?? "Asia/Ho_Chi_Minh", now).split("-").map(Number) as [number, number, number];
    const currentLunarYear = solarToLunar({ year: y, month: m, day: d }, DEFAULT_RULESET.calendarTimeZone).year;
    if (!profile) return { profile: null, chart: null, needs: [], error: null, sections: [], currentAge: null, currentLunarYear };
    const [row] = await tx.select().from(tuviCharts).where(and(eq(tuviCharts.userId, userId), eq(tuviCharts.isCurrent, true)));
    if (!row) {
      const outcome = computeChart(toEngineInput(profile));
      return {
        profile,
        chart: null,
        needs: !outcome.ok && "needs" in outcome ? outcome.needs : [],
        error: !outcome.ok && "error" in outcome ? outcome.error : null,
        sections: [],
        currentAge: null,
        currentLunarYear,
      };
    }
    const chart = row.chart as Chart;
    const currentAge = nominalAge(chart.lunar.year, currentLunarYear);
    // Re-render interpretation with the current age (cycles section marks "now").
    const sections = interpret(chart, locale, currentAge);
    return {
      profile,
      chart: { ...chart, id: row.id, createdAt: row.createdAt, rulesetId: row.rulesetId, engineVersion: row.engineVersion, inputHash: row.inputHash },
      needs: [],
      error: null,
      sections,
      currentAge,
      currentLunarYear,
    };
  });
}

/** For an unknown birth time: the 12 possible Mệnh placements, computed on the fly, never stored. */
export async function exploreHours(userId: string) {
  return withUser(userId, async (tx) => {
    const [profile] = await tx.select().from(birthProfiles).where(eq(birthProfiles.userId, userId));
    if (!profile || profile.timeKnown) throw invalid("not_applicable");
    const base = toEngineInput(profile);
    const out = [];
    for (let h = 0; h < 12; h++) {
      const r = computeChart({ ...base, time: { hour: h === 0 ? 0 : h * 2, minute: 30 } });
      if (!r.ok) {
        out.push({ hourBranch: h, needs: "needs" in r ? r.needs : [], menh: null, mainStars: [] as string[] });
        continue;
      }
      const menh = r.chart.palaces[r.chart.menh!]!;
      out.push({ hourBranch: h, needs: [], menh: r.chart.menh, mainStars: menh.mainStars.map((s) => s.id) });
    }
    return out;
  });
}

export async function deleteBirthProfile(userId: string) {
  await withUser(userId, async (tx) => {
    await tx.delete(birthProfiles).where(eq(birthProfiles.userId, userId));
    await audit(tx, userId, "tuvi.birth_profile_deleted");
  });
}

export async function chartHistory(userId: string) {
  return withUser(userId, (tx) =>
    tx
      .select({ id: tuviCharts.id, createdAt: tuviCharts.createdAt, isCurrent: tuviCharts.isCurrent, engineVersion: tuviCharts.engineVersion, rulesetId: tuviCharts.rulesetId })
      .from(tuviCharts)
      .where(eq(tuviCharts.userId, userId))
      .orderBy(desc(tuviCharts.createdAt)),
  );
}

export async function storedInterpretations(userId: string, chartId: string, locale: Locale) {
  return withUser(userId, (tx) =>
    tx
      .select()
      .from(tuviInterpretations)
      .where(and(eq(tuviInterpretations.chartId, chartId), eq(tuviInterpretations.locale, locale)))
      .orderBy(asc(tuviInterpretations.createdAt)),
  );
}
