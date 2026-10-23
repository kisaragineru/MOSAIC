/**
 * A chart as shared with a connected person (comparison scope "tuvi_detail").
 *
 * It keeps what the readings need — palaces, stars, Mệnh/Thân, Cục, Đại Hạn, Tuần/Triệt and the
 * birth lunar year (already implied by the year pillar) — and drops the birth date, the birth
 * time, the day pillar and the leap-month handling. The full chart can still let someone narrow
 * down the birth month, day and hour; the consent text says so.
 */
import type { Chart } from "./engine";

export type SharedChart = Omit<Chart, "solar" | "lunar" | "effectiveMonth" | "dayPillar" | "hourBranch" | "warnings"> & {
  lunarYear: number;
};

export function toSharedChart(c: Chart): SharedChart {
  // Copy field by field so a field added to Chart later is not shared by accident.
  return {
    engineVersion: c.engineVersion,
    rulesetId: c.rulesetId,
    lunarYear: c.lunar.year,
    yearPillar: c.yearPillar,
    napAm: c.napAm,
    yinYangSex: c.yinYangSex,
    direction: c.direction,
    menh: c.menh,
    than: c.than,
    cuc: c.cuc,
    palaces: c.palaces,
    tuan: c.tuan,
    triet: c.triet,
    hoaTargets: c.hoaTargets,
    notComputed: c.notComputed,
  };
}

/**
 * Back to the Chart shape the readings and the chart view take. The removed fields get neutral
 * placeholders; nothing that renders a shared chart may show them (the readings use only the
 * lunar year).
 */
export function fromSharedChart(s: SharedChart): Chart {
  const { lunarYear, ...rest } = s;
  return {
    ...rest,
    solar: { year: lunarYear, month: 1, day: 1 },
    lunar: { year: lunarYear, month: 1, day: 1, leap: false },
    effectiveMonth: 1,
    dayPillar: { stem: 0, branch: 0, name: "" },
    hourBranch: null,
    warnings: [],
  };
}
