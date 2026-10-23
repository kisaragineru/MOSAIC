import { Solar } from "lunar-javascript";
import { describe, expect, it } from "vitest";
import {
  jdFromDate,
  jdToDate,
  leapMonthOf,
  lunarMonthLength,
  lunarToSolar,
  solarToLunar,
} from "@/lib/tuvi/calendar";

describe("Vietnamese lunar calendar (UTC+7)", () => {
  // Well-known Tết Nguyên Đán dates in Vietnam.
  it.each([
    [1985, "1985-01-21"], // Vietnam celebrated Tết a month before China (1985-02-20)
    [2007, "2007-02-17"], // China: 2007-02-18
    [2020, "2020-01-25"],
    [2023, "2023-01-22"],
    [2024, "2024-02-10"],
    [2025, "2025-01-29"],
    [2026, "2026-02-17"],
  ])("Tết %i falls on %s", (year, iso) => {
    const s = lunarToSolar({ year, month: 1, day: 1, leap: false }, 7)!;
    expect(`${s.year}-${String(s.month).padStart(2, "0")}-${String(s.day).padStart(2, "0")}`).toBe(iso);
  });

  it("differs from the Chinese (UTC+8) calendar exactly where history says it does", () => {
    expect(lunarToSolar({ year: 1985, month: 1, day: 1, leap: false }, 8)).toEqual({ year: 1985, month: 2, day: 20 });
    expect(lunarToSolar({ year: 2007, month: 1, day: 1, leap: false }, 8)).toEqual({ year: 2007, month: 2, day: 18 });
  });

  it.each([
    [2012, 4],
    [2014, 9],
    [2017, 6],
    [2020, 4],
    [2023, 2],
    [2025, 6],
    [2024, 0],
  ])("leap month of %i is %i", (year, leap) => {
    expect(leapMonthOf(year, 7)).toBe(leap);
  });

  it("converts a leap-month date both ways (2023 leap month 2)", () => {
    // 2023-03-22 is the 1st day of leap month 2 (Quý Mão).
    expect(solarToLunar({ year: 2023, month: 3, day: 22 }, 7)).toEqual({ year: 2023, month: 2, day: 1, leap: true });
    expect(lunarToSolar({ year: 2023, month: 2, day: 1, leap: true }, 7)).toEqual({ year: 2023, month: 3, day: 22 });
    // The non-leap month 2 starts one lunation earlier.
    expect(lunarToSolar({ year: 2023, month: 2, day: 1, leap: false }, 7)).toEqual({ year: 2023, month: 2, day: 20 });
  });

  it("rejects non-existent lunar dates", () => {
    expect(lunarToSolar({ year: 2024, month: 3, day: 1, leap: true }, 7)).toBeNull(); // 2024 has no leap month
    expect(lunarToSolar({ year: 2023, month: 5, day: 1, leap: true }, 7)).toBeNull(); // leap month is 2, not 5
    for (let m = 1; m <= 12; m++) {
      const len = lunarMonthLength(2024, m, false, 7);
      expect([29, 30]).toContain(len);
      if (len === 29) expect(lunarToSolar({ year: 2024, month: m, day: 30, leap: false }, 7)).toBeNull();
    }
  });

  it("round-trips Julian day numbers including the Gregorian switch", () => {
    for (const jd of [2299159, 2299160, 2299161, 2415021, 2451545, 2460000]) {
      const d = jdToDate(jd);
      expect(jdFromDate(d.day, d.month, d.year)).toBe(jd);
    }
  });

  it("matches the independent lunar-javascript implementation (China, UTC+8) on every day 1901–2099, except known edge months", () => {
    // Known, explained differences (reference month keys "year/month", negative = leap):
    //  - 1914/10, 1916/1, 1920/10: China used Beijing local mean time (UTC+7:46) before 1929;
    //    lunar-javascript models that, a fixed UTC+8 meridian does not.
    //  - 2057/8-9, 2097/7: new moon / solar term within minutes of midnight (borderline months).
    //  - single days: new moon within minutes of midnight (truncated series vs. VSOP87/ELP2000).
    const allowed = new Set([
      "1914/10", "1916/1", "1920/10", "1939/2", "1947/2", "2009/2", "2054/3", "2057/8", "2057/9", "2062/2", "2097/7",
    ]);
    let checked = 0;
    const unexpected: string[] = [];
    for (let jd = jdFromDate(1, 1, 1901); jd <= jdFromDate(31, 12, 2099); jd++) {
      const d = jdToDate(jd);
      const ref = Solar.fromYmd(d.year, d.month, d.day).getLunar();
      const mine = solarToLunar(d, 8);
      const refMonth = ref.getMonth();
      const same =
        mine.year === ref.getYear() &&
        mine.month === Math.abs(refMonth) &&
        mine.day === ref.getDay() &&
        mine.leap === refMonth < 0;
      if (!same && !allowed.has(`${ref.getYear()}/${refMonth}`)) unexpected.push(`${d.year}-${d.month}-${d.day}`);
      checked++;
    }
    expect(checked).toBeGreaterThan(72000);
    expect(unexpected).toEqual([]);
  });

  it("solar→lunar→solar round-trips for every day of 2000–2030 (UTC+7)", () => {
    for (let jd = jdFromDate(1, 1, 2000); jd <= jdFromDate(31, 12, 2030); jd++) {
      const d = jdToDate(jd);
      expect(lunarToSolar(solarToLunar(d, 7), 7)).toEqual(d);
    }
  });
});
