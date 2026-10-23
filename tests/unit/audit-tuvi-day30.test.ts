/** Audit: day 30 was not covered by the differential sweep (days 1–29 only). */
import { astro } from "iztro";
import { describe, expect, it } from "vitest";
import { lunarMonthLength } from "@/lib/tuvi/calendar";
import { computeChart } from "@/lib/tuvi/engine";
import { STAR_INFO } from "@/lib/tuvi/stars";

const ZH = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const MAJOR: Record<string, string> = { 紫微: "tu_vi", 天府: "thien_phu", 七杀: "that_sat", 破军: "pha_quan", 天机: "thien_co" };

describe("day 30 births", () => {
  it("main stars and Mệnh agree with iztro for every hour on lunar day 30 (months with 30 days in VN calendar)", () => {
    let checked = 0;
    for (let y = 1950; y <= 2030 && checked < 300; y += 3) {
      for (let m = 1; m <= 12; m++) {
        if (lunarMonthLength(y, m, false, 7) !== 30) continue;
        for (const h of [0, 3, 6, 9, 11]) {
          const r = computeChart({ calendar: "lunar", lunar: { year: y, month: m, day: 30, leap: false }, time: { hour: h === 0 ? 0 : h * 2, minute: 30 }, timeZone: "Asia/Ho_Chi_Minh", sex: "male", lateRatHour: null, leapMonthRule: null });
          if (!r.ok) throw new Error(JSON.stringify(r));
          let a;
          try {
            a = astro.byLunar(`${y}-${m}-30`, h, "男", false, false, "zh-CN");
          } catch {
            continue; // month has 29 days in the Chinese calendar: no comparable reference
          }
          if (a.lunarDate && !String(a.lunarDate).includes("三十")) continue;
          expect(r.chart.menh).toBe(ZH.indexOf(a.earthlyBranchOfSoulPalace));
          for (const p of a.palaces) {
            const b = ZH.indexOf(p.earthlyBranch);
            const mine = r.chart.palaces[b]!.mainStars.map((s) => s.id).filter((id) => Object.values(MAJOR).includes(id)).sort();
            const ref = p.majorStars.map((s) => MAJOR[s.name]).filter(Boolean).sort();
            expect(mine, `${y}-${m}-30 h${h} ${ZH[b]}`).toEqual(ref);
          }
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(100);
    void STAR_INFO;
  }, 120_000);
});
