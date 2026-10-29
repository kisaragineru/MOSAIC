import { describe, expect, it } from "vitest";
import { computeChart, toVietnamTime, type BirthInput } from "@/lib/tuvi/engine";

const tokyo: BirthInput = { calendar: "solar", solar: { year: 1990, month: 1, day: 2 }, time: { hour: 0, minute: 30 }, timeZone: "Asia/Tokyo", sex: "male", lateRatHour: null, leapMonthRule: null };

function chartOf(input: BirthInput) {
  const r = computeChart(input);
  if (!r.ok) throw new Error(JSON.stringify(r));
  return r.chart;
}

describe("reading a birth outside Vietnam on Vietnam's clock", () => {
  it("turns the birthplace's date and time into the same moment at UTC+7", () => {
    // 00:30 in Tokyo (UTC+9) is 22:30 the day before in Vietnam.
    expect(toVietnamTime({ year: 1990, month: 1, day: 2 }, { hour: 0, minute: 30 }, "Asia/Tokyo")).toEqual({ solar: { year: 1990, month: 1, day: 1 }, time: { hour: 22, minute: 30 } });
    // Summer time is part of the birthplace's offset: 10:00 EDT (UTC−4) is 21:00 in Vietnam.
    expect(toVietnamTime({ year: 1990, month: 7, day: 1 }, { hour: 10, minute: 0 }, "America/New_York")).toEqual({ solar: { year: 1990, month: 7, day: 1 }, time: { hour: 21, minute: 0 } });
  });

  it("computes the chart from the converted date and time, and says so", () => {
    const vn = chartOf({ ...tokyo, timeBasis: "vietnam" });
    const asIfVietnam = chartOf({ ...tokyo, solar: { year: 1990, month: 1, day: 1 }, time: { hour: 22, minute: 30 }, timeZone: "Asia/Ho_Chi_Minh" });
    expect(vn.solar).toEqual({ year: 1990, month: 1, day: 1 });
    expect(vn.lunar).toEqual(asIfVietnam.lunar);
    expect(vn.menh).toBe(asIfVietnam.menh);
    expect(vn.palaces.map((p) => p.mainStars.map((s) => s.id))).toEqual(asIfVietnam.palaces.map((p) => p.mainStars.map((s) => s.id)));
    expect(vn.warnings.find((w) => w.code === "time_converted_vn")?.detail).toEqual({ zone: "Asia/Tokyo", local: "1990-01-02 00:30", vietnam: "1990-01-01 22:30" });
    // A different hour than the birthplace's clock: the choice matters, so it is the user's.
    expect(vn.menh).not.toBe(chartOf(tokyo).menh);
  });

  it("leaves a chart read by the birthplace's clock exactly as before", () => {
    const before = chartOf(tokyo);
    const local = chartOf({ ...tokyo, timeBasis: "local" });
    expect(local).toEqual(before);
    expect(local.warnings.map((w) => w.code)).not.toContain("time_converted_vn");
  });

  it("changes nothing for a birth in Vietnam, or without a birth time", () => {
    const saigon: BirthInput = { ...tokyo, timeZone: "Asia/Ho_Chi_Minh" };
    expect(chartOf({ ...saigon, timeBasis: "vietnam" })).toEqual(chartOf(saigon));
    // Saigon used UTC+8 in 1965: still read by its own clock, as a birth in Vietnam.
    const s1965: BirthInput = { ...saigon, solar: { year: 1965, month: 5, day: 10 }, time: { hour: 9, minute: 0 } };
    expect(chartOf({ ...s1965, timeBasis: "vietnam" })).toEqual(chartOf(s1965));
    const noTime: BirthInput = { ...tokyo, time: null };
    expect(chartOf({ ...noTime, timeBasis: "vietnam" })).toEqual(chartOf(noTime));
  });

  it("asks about the late Tý hour when the converted time falls in it", () => {
    // 01:30 in Tokyo is 23:30 in Vietnam.
    const r = computeChart({ ...tokyo, time: { hour: 1, minute: 30 }, timeBasis: "vietnam" });
    expect(r).toEqual({ ok: false, needs: ["late_rat_hour"] });
  });

  it("has no summer-time warning once converted (the offset is already in the moment)", () => {
    const ny: BirthInput = { ...tokyo, solar: { year: 1991, month: 7, day: 1 }, time: { hour: 10, minute: 0 }, timeZone: "America/New_York" };
    expect(chartOf(ny).warnings.map((w) => w.code)).toContain("dst_in_effect");
    expect(chartOf({ ...ny, timeBasis: "vietnam" }).warnings.map((w) => w.code)).not.toContain("dst_in_effect");
  });
});
