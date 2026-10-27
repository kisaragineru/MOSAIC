/**
 * "What's your type?" for someone without an account (after reading a work they were handed):
 * the chart is computed from the date and hour given and thrown away. Nothing is stored here;
 * the page may keep the answer in the visitor's own browser to fill in sign-up's birth form.
 */
import { computeChart } from "@/lib/tuvi/engine";
import { mainsOf } from "@/lib/tuvi/interpret";
import type { MainStarId } from "@/lib/tuvi/stars";
import { isoDate } from "@/lib/validation/common";

/** Where the tried date waits (in the visitor's own browser, an hour) to fill in sign-up's birth form. */
export const TRY_COOKIE = "mosaic_try_birth";

/** The tried date and hour, if any, as the birth form's starting values. */
export function triedBirth(raw: string | undefined): { solarDate: string; birthTime: string | null } | null {
  try {
    const v = JSON.parse(raw ?? "") as { date?: unknown; hour?: unknown };
    const d = isoDate.safeParse(v.date);
    if (!d.success) return null;
    const h = Number(v.hour);
    return { solarDate: d.data, birthTime: v.hour !== "" && Number.isInteger(h) && h >= 0 && h < 24 ? `${String(h).padStart(2, "0")}:00` : null };
  } catch {
    return null;
  }
}

export type TryResult = { status: "type"; ids: MainStarId[] } | { status: "no_time" } | { status: "needs" } | { status: "invalid" };

export function tryType(date: unknown, hour: unknown): TryResult {
  const d = isoDate.safeParse(date);
  if (!d.success) return { status: "invalid" };
  if (hour === "" || hour == null) return { status: "no_time" };
  const h = Number(hour);
  if (!Number.isInteger(h) || h < 0 || h > 23) return { status: "invalid" };
  const [year, month, day] = d.data.split("-").map(Number) as [number, number, number];
  const r = computeChart({
    calendar: "solar",
    solar: { year, month, day },
    // "Around" the hour: the middle of it, so a rough answer doesn't sit on a boundary.
    time: { hour: h, minute: 30 },
    timeZone: "Asia/Ho_Chi_Minh",
    sex: "unspecified",
    lateRatHour: null,
    leapMonthRule: null,
  });
  if (!r.ok) return "needs" in r ? { status: "needs" } : { status: "invalid" };
  const m = r.chart.menh !== null ? mainsOf(r.chart, "menh") : null;
  return m?.mains.length ? { status: "type", ids: m.mains } : { status: "invalid" };
}
