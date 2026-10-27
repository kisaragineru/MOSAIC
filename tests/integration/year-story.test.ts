import { describe, expect, it } from "vitest";
import { createMemory } from "@/server/services/memories";
import { saveBirthProfile } from "@/server/services/tuvi";
import { lastBirthday, yearStory, yearStoryDue } from "@/server/services/year-story";
import { makeUser } from "../helpers/factory";

const birth = (date: string) => ({ calendarInput: "solar", solarDate: date, timeKnown: false, timeZone: "Asia/Tokyo", sex: "unspecified" });

describe("the story of a year, given on the birthday", () => {
  it("covers the twelve months before the birthday, in the user's own words, and is kept", async () => {
    const { userId } = await makeUser("Hana");
    await saveBirthProfile(userId, birth("1990-10-20"));
    expect(await lastBirthday(userId, "2026-10-27")).toEqual({ year: 2026, age: 36, from: "2025-10-20", to: "2026-10-19", on: "2026-10-20" });
    expect(await yearStoryDue(userId, "2026-10-27")).toBeNull(); // nothing written that year
    await createMemory(userId, { kind: "memory", body: "駅前に新しいカフェができてた。窓際の席が静か。", occurredOn: "2025-11-02", visibility: "private" });
    await createMemory(userId, { kind: "memory", body: "はじめてパンを焼いた。", occurredOn: "2026-05-01", visibility: "private" });
    await createMemory(userId, { kind: "memory", body: "前の年のこと", occurredOn: "2025-10-01", visibility: "private" });
    expect((await yearStoryDue(userId, "2026-10-27"))?.year).toBe(2026);
    expect(await yearStoryDue(userId, "2026-11-05")).toBeNull(); // more than two weeks on

    const s = (await yearStory(userId, 2026, "ja", "2026-10-27"))!;
    expect(s.title).toBe("36歳の1年");
    expect(s.ai).toBe(false);
    const text = s.paragraphs.join("\n");
    expect(text).toContain("「駅前に新しいカフェができてた。」");
    expect(text).toContain("「はじめてパンを焼いた。」");
    expect(text).not.toContain("前の年のこと");
    // Kept: a later record doesn't change it.
    await createMemory(userId, { kind: "memory", body: "あとから", occurredOn: "2026-06-01", visibility: "private" });
    expect((await yearStory(userId, 2026, "ja", "2026-10-27"))!.paragraphs).toEqual(s.paragraphs);
    // Not before its birthday, and nothing without a birth date.
    expect(await yearStory(userId, 2027, "ja", "2026-10-27")).toBeNull();
    const other = await makeUser("Sora");
    expect(await lastBirthday(other.userId, "2026-10-27")).toBeNull();
  });

  it("a birthday on 29 February falls on the 28th in other years", async () => {
    const { userId } = await makeUser("Rin");
    await saveBirthProfile(userId, birth("2000-02-29"));
    expect(await lastBirthday(userId, "2027-03-01")).toMatchObject({ year: 2027, age: 27, on: "2027-02-28" });
  });
});
