import { describe, expect, it } from "vitest";
import { createShare, getComparison, giveConsent, openComparison } from "@/server/services/sharing";
import { saveBirthProfile } from "@/server/services/tuvi";
import { makeUser } from "../helpers/factory";

async function pair() {
  const a = await makeUser("An");
  const b = await makeUser("Bình");
  await saveBirthProfile(a.userId, { calendarInput: "solar", solarDate: "1990-06-07", timeKnown: true, birthTime: "06:30", timeZone: "Asia/Ho_Chi_Minh", sex: "male" });
  await saveBirthProfile(b.userId, { calendarInput: "solar", solarDate: "1992-03-15", timeKnown: true, birthTime: "21:10", timeZone: "Asia/Tokyo", sex: "female" });
  const s = await createShare(a.userId);
  const id = await openComparison(b.userId, s.token);
  return { a, b, id };
}

describe("Tử Vi detail scope", () => {
  it("shares both charts only when both agreed, without birth date, time or day pillar", async () => {
    const { a, b, id } = await pair();
    await giveConsent(a.userId, id, { scopes: ["tuvi", "tuvi_detail"], agree: true });
    await giveConsent(b.userId, id, { scopes: ["tuvi"], agree: true });
    expect((await getComparison(a.userId, id)).result!.tuviDetail).toBeNull();

    await giveConsent(b.userId, id, { scopes: ["tuvi", "tuvi_detail"], agree: true });
    const r = (await getComparison(b.userId, id)).result!;
    const { a: ca, b: cb } = r.tuviDetail!;
    expect(ca!.lunarYear).toBe(1990);
    expect(cb!.palaces).toHaveLength(12);
    for (const c of [ca!, cb!]) {
      for (const k of ["solar", "lunar", "dayPillar", "hourBranch", "effectiveMonth", "warnings"]) expect(c).not.toHaveProperty(k);
    }
    const json = JSON.stringify(r);
    expect(json).not.toContain("06:30");
    expect(json).not.toContain("21:10");
    expect(json).not.toMatch(/"month":\s*6,\s*"day":\s*7/);
  });

  it("reports a missing chart instead of failing", async () => {
    const a = await makeUser("An");
    const b = await makeUser("Bình");
    await saveBirthProfile(a.userId, { calendarInput: "solar", solarDate: "1990-06-07", timeKnown: true, birthTime: "06:30", timeZone: "Asia/Ho_Chi_Minh", sex: "male" });
    const s = await createShare(a.userId);
    const id = await openComparison(b.userId, s.token);
    await giveConsent(a.userId, id, { scopes: ["tuvi_detail"], agree: true });
    await giveConsent(b.userId, id, { scopes: ["tuvi_detail"], agree: true });
    const d = (await getComparison(a.userId, id)).result!.tuviDetail!;
    expect(d.a).not.toBeNull();
    expect(d.b).toBeNull();
  });
});
