import { describe, expect, it } from "vitest";
import { answerQuestion } from "@/server/services/discovery";
import { buildExport, listExportJobs } from "@/server/services/export";
import { createMemory, editMemory } from "@/server/services/memories";
import { addGift, addPreference, createPerson } from "@/server/services/people";
import { createShare } from "@/server/services/sharing";
import { saveBirthProfile } from "@/server/services/tuvi";
import { makeUser } from "../helpers/factory";

describe("data export", () => {
  it("exports everything the user owns, with history, as standard JSON — and nothing secret", async () => {
    const u = await makeUser("Exporter");
    const other = await makeUser("Other");
    await createMemory(other.userId, { body: "OTHER-USER-DIARY" });
    const mid = await createMemory(u.userId, { body: "first words", tags: ["life"] });
    await editMemory(u.userId, mid, { body: "second words", tags: ["life"] });
    await answerQuestion(u.userId, { questionId: "f.drink", questionVersion: 1, answer: { choice: "coffee" } });
    await answerQuestion(u.userId, { questionId: "f.drink", questionVersion: 1, answer: { choice: "tea" }, changeKind: "changed_mind" });
    await saveBirthProfile(u.userId, { calendarInput: "solar", solarDate: "1990-06-07", timeKnown: true, birthTime: "06:30", timeZone: "Asia/Ho_Chi_Minh", sex: "male" });
    const pid = await createPerson(u.userId, { nickname: "Mai" });
    await addPreference(u.userId, { personId: pid, categoryId: "food", label: "Chè", sentiment: "love", source: "person_stated" });
    await addGift(u.userId, pid, { item: "Book" });
    const share = await createShare(u.userId);

    const { json, filename } = await buildExport(u.userId);
    expect(filename).toMatch(/^mosaic-export-\d{4}-\d{2}-\d{2}\.json$/);
    const doc = JSON.parse(json);
    expect(doc).toMatchObject({ format: "mosaic-export", formatVersion: 1 });
    expect(doc.account.email).toBe(u.email);
    expect(doc.memories[0].versions.map((v: { body: string }) => v.body)).toEqual(["first words", "second words"]);
    expect(doc.memories[0].tags).toEqual(["life"]);
    expect(doc.questionResponses.map((r: { answer: unknown }) => r.answer)).toEqual([{ choice: "coffee" }, { choice: "tea" }]);
    expect(doc.questions[0].versions[0].prompt.en).toContain("drink");
    expect(doc.tuvi.birthProfile.solarDate).toBe("1990-06-07");
    expect(doc.tuvi.charts[0].rulesetId).toBe("vn-ttl-2026.1");
    expect(doc.tuvi.charts[0].interpretations.length).toBeGreaterThan(0);
    expect(doc.people[0].preferences[0].values[0]).toMatchObject({ sentiment: "love", source: "person_stated" });
    expect(doc.people[0].gifts[0].item).toBe("Book");
    expect(doc.shares).toHaveLength(1);
    // No secrets, no other users' data.
    expect(json).not.toContain(share.token);
    expect(json).not.toContain("argon2");
    expect(json).not.toMatch(/password|token_hash|tokenHash/);
    expect(json).not.toContain("OTHER-USER-DIARY");
    expect(json).not.toContain(other.userId);
    const jobs = await listExportJobs(u.userId);
    expect(jobs.at(-1)).toMatchObject({ status: "completed" });
    expect(jobs.at(-1)!.byteSize).toBe(Buffer.byteLength(json));
  });

  it("is rate limited", async () => {
    const u = await makeUser();
    for (let i = 0; i < 5; i++) await buildExport(u.userId);
    await expect(buildExport(u.userId)).rejects.toMatchObject({ code: "rate_limited" });
  });
});
