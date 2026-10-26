import { describe, expect, it } from "vitest";
import { getTuvi, saveBirthProfile } from "@/server/services/tuvi";
import { saveSelfTypes, typeInsight } from "@/server/services/tuvi-type";
import { makeUser } from "../helpers/factory";

describe("which type someone is", () => {
  it("with a birth time, the chart says (exactly)", async () => {
    const u = await makeUser();
    await saveBirthProfile(u.userId, { calendarInput: "solar", solarDate: "1978-02-01", timeKnown: true, birthTime: "10:00", timeZone: "Asia/Ho_Chi_Minh", sex: "female" });
    const tv = await getTuvi(u.userId, "en");
    const i = await typeInsight(u.userId, tv.chart);
    expect(i.source).toBe("chart");
    expect(i.types.length).toBeGreaterThan(0);
    expect(i.progress).toBe(100);
  });

  it("without one, MOSAIC doesn't guess; the user's own pick is kept apart, up to two", async () => {
    const u = await makeUser();
    await saveBirthProfile(u.userId, { calendarInput: "solar", solarDate: "1990-06-07", timeKnown: false, timeZone: "Asia/Ho_Chi_Minh", sex: "unspecified" });
    const tv = await getTuvi(u.userId, "en");
    let i = await typeInsight(u.userId, tv.chart);
    expect(i).toMatchObject({ source: "none", types: [], selfTypes: [] });
    expect(i.progress).toBeLessThan(100);

    await expect(saveSelfTypes(u.userId, ["thai_duong", "thai_am", "tham_lang"])).rejects.toMatchObject({ code: "too_many_types" });
    await saveSelfTypes(u.userId, ["thai_duong", "not_a_star", "thai_am"]);
    i = await typeInsight(u.userId, tv.chart);
    expect(i.selfTypes).toEqual(["thai_duong", "thai_am"]);
    // A pick never becomes MOSAIC's judgment.
    expect(i.source).toBe("none");
    await saveSelfTypes(u.userId, []);
    expect((await typeInsight(u.userId, tv.chart)).selfTypes).toEqual([]);
  });
});
