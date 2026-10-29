import { Pool } from "pg";
import { describe, expect, it } from "vitest";
import { INTERPRETATION_VERSION } from "@/lib/tuvi/interpret";
import { chartHistory, deleteBirthProfile, exploreHours, getTuvi, saveBirthProfile, storedInterpretations } from "@/server/services/tuvi";
import { makeUser } from "../helpers/factory";
import { TEST_MIGRATION_DATABASE_URL } from "../helpers/test-env";

const birth = {
  calendarInput: "solar",
  solarDate: "1990-06-07",
  timeKnown: true,
  birthTime: "06:30",
  timeZone: "Asia/Ho_Chi_Minh",
  sex: "male",
};

describe("Tử Vi service", () => {
  it("reads a birth abroad on the clock the user chose, and leaves one saved before the choice as it was", async () => {
    const u = await makeUser();
    const tokyo = { ...birth, solarDate: "1990-01-02", birthTime: "00:30", timeZone: "Asia/Tokyo" };
    // Saved without the choice (as before it existed): the birthplace's clock.
    await saveBirthProfile(u.userId, tokyo);
    const local = await getTuvi(u.userId, "ja", new Date("2026-10-23T00:00:00Z"));
    expect(local.profile!.timeBasis).toBeNull();
    expect(local.chart!.solar).toEqual({ year: 1990, month: 1, day: 2 });
    expect(local.chart!.warnings.map((w) => w.code)).not.toContain("time_converted_vn");
    // Chosen: the same moment on Vietnam's clock, a new chart (the old one is kept in the history).
    const r = await saveBirthProfile(u.userId, { ...tokyo, timeBasis: "vietnam" });
    expect(r).toMatchObject({ status: "computed", reused: false });
    const vn = await getTuvi(u.userId, "ja", new Date("2026-10-23T00:00:00Z"));
    expect(vn.profile!.timeBasis).toBe("vietnam");
    expect(vn.chart!.solar).toEqual({ year: 1990, month: 1, day: 1 });
    expect(vn.chart!.warnings.find((w) => w.code === "time_converted_vn")?.detail).toMatchObject({ local: "1990-01-02 00:30", vietnam: "1990-01-01 22:30" });
    expect((await chartHistory(u.userId)).length).toBe(2);
    // Age by birthdays beside the nominal age.
    expect(vn.fullAge).toBe(36);
  });

  it("computes, stores with ruleset/engine version, and reuses for identical input", async () => {
    const u = await makeUser();
    const r1 = await saveBirthProfile(u.userId, birth);
    expect(r1).toMatchObject({ status: "computed", reused: false });
    const r2 = await saveBirthProfile(u.userId, birth);
    expect(r2).toMatchObject({ status: "computed", reused: true });
    const v = await getTuvi(u.userId, "vi", new Date("2026-10-23T00:00:00Z"));
    expect(v.chart).toMatchObject({ rulesetId: "vn-ttl-2026.1", engineVersion: "1.1.0", menh: 3, cuc: { number: 5 } });
    expect(v.currentAge).toBe(37); // Bính Ngọ 2026 − Canh Ngọ 1990 + 1
    expect(v.sections.map((s) => s.section)).toEqual(["personality", "relationships", "love", "career", "wealth", "family", "cycles"]);
    expect(v.sections.at(-1)!.paragraphs.some((p) => p.text.startsWith("▶"))).toBe(true);
    const stored = await storedInterpretations(u.userId, v.chart!.id, "en");
    expect(stored.length).toBe(7);
    expect(stored[0]!.ruleIds[0]).toBe(INTERPRETATION_VERSION);
  });

  it("recomputes and keeps chart history when birth data changes", async () => {
    const u = await makeUser();
    await saveBirthProfile(u.userId, birth);
    await saveBirthProfile(u.userId, { ...birth, birthTime: "10:15" });
    const h = await chartHistory(u.userId);
    expect(h).toHaveLength(2);
    expect(h.filter((c) => c.isCurrent)).toHaveLength(1);
  });

  it("asks for decisions instead of guessing (late Tý, leap month) and hides stale charts", async () => {
    const u = await makeUser();
    await saveBirthProfile(u.userId, birth);
    const r = await saveBirthProfile(u.userId, { ...birth, birthTime: "23:30" });
    expect(r).toEqual({ status: "needs_decision", needs: ["late_rat_hour"] });
    let v = await getTuvi(u.userId, "en");
    expect(v.chart).toBeNull();
    expect(v.needs).toEqual(["late_rat_hour"]);
    expect(await saveBirthProfile(u.userId, { ...birth, birthTime: "23:30", lateRatHour: "next_day" })).toMatchObject({ status: "computed" });
    const leap = await saveBirthProfile(u.userId, { ...birth, solarDate: "2023-04-01" });
    expect(leap).toEqual({ status: "needs_decision", needs: ["leap_month_rule"] });
    expect(await saveBirthProfile(u.userId, { ...birth, solarDate: "2023-04-01", leapMonthRule: "split_15" })).toMatchObject({ status: "computed" });
    v = await getTuvi(u.userId, "en");
    expect(v.chart?.warnings.map((w) => w.code)).toContain("leap_month_rule_applied");
  });

  it("accepts lunar input and rejects non-existent lunar dates", async () => {
    const u = await makeUser();
    const r = await saveBirthProfile(u.userId, {
      ...birth, calendarInput: "lunar", solarDate: "", lunarYear: 1990, lunarMonth: 5, lunarDay: 15, lunarLeap: false,
    });
    expect(r).toMatchObject({ status: "computed" });
    expect((await getTuvi(u.userId, "en")).chart!.solar).toEqual({ year: 1990, month: 6, day: 7 });
    expect(
      await saveBirthProfile(u.userId, { ...birth, calendarInput: "lunar", lunarYear: 2024, lunarMonth: 3, lunarDay: 1, lunarLeap: true }),
    ).toEqual({ status: "invalid", error: "invalid_date" });
  });

  it("unknown time: partial chart + 12 candidate hours, nothing guessed", async () => {
    const u = await makeUser();
    await saveBirthProfile(u.userId, { ...birth, timeKnown: false, birthTime: "" });
    const v = await getTuvi(u.userId, "en");
    expect(v.chart!.menh).toBeNull();
    expect(v.sections[0]!.paragraphs[0]!.ruleIds).toEqual(["partial.hour_unknown"]);
    const hours = await exploreHours(u.userId);
    expect(hours).toHaveLength(12);
    expect(new Set(hours.map((h) => h.menh)).size).toBe(12);
  });

  it("validates input", async () => {
    const u = await makeUser();
    await expect(saveBirthProfile(u.userId, { ...birth, timeZone: "Mars/Olympus" })).rejects.toThrow();
    await expect(saveBirthProfile(u.userId, { ...birth, solarDate: "1990-02-30" })).rejects.toThrow();
    await expect(saveBirthProfile(u.userId, { ...birth, birthTime: "25:00" })).rejects.toThrow();
    await expect(saveBirthProfile(u.userId, { ...birth, calendarInput: "lunar" })).rejects.toThrow();
  });

  it("birth data is private and deletable", async () => {
    const a = await makeUser();
    const b = await makeUser();
    await saveBirthProfile(a.userId, birth);
    expect((await getTuvi(b.userId, "en")).profile).toBeNull();
    await deleteBirthProfile(a.userId);
    expect((await getTuvi(a.userId, "en")).chart).toBeNull();
    const owner = new Pool({ connectionString: TEST_MIGRATION_DATABASE_URL });
    const n = await owner.query("select count(*)::int n from tuvi_charts where user_id=$1", [a.userId]);
    await owner.end();
    expect(n.rows[0].n).toBe(0);
  });
});
