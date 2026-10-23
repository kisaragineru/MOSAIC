import { describe, expect, it } from "vitest";
import { suggestGifts } from "@/server/services/gifts";
import {
  addGift,
  addImportantDate,
  addPreference,
  addRelationshipEntry,
  addRelationshipEvent,
  createPerson,
  deletePerson,
  deletePersonRecord,
  getPerson,
  listPeople,
  listPreferences,
  nextOccurrence,
  upcomingDates,
} from "@/server/services/people";
import { makeUser } from "../helpers/factory";

describe("people & relationship records", () => {
  it("creates a person from just a nickname and records notes with provenance", async () => {
    const u = await makeUser();
    const pid = await createPerson(u.userId, { nickname: "Linh" });
    await addRelationshipEntry(u.userId, pid, { kind: "conversation", body: "Talked about moving to Huế", source: "person_stated", occurredOn: "2026-09-01" });
    await addRelationshipEvent(u.userId, pid, { title: "Hội An trip", place: "Hội An", occurredOn: "2025-12-24" });
    await addGift(u.userId, pid, { item: "Ceramic mug", reaction: "loved", givenOn: "2025-12-25", priceAmount: 250000, priceCurrency: "VND" });
    const p = await getPerson(u.userId, pid);
    expect(p.person.relationship).toBe("other");
    expect(p.entries[0]).toMatchObject({ source: "person_stated", kind: "conversation" });
    expect(p.events[0]!.place).toBe("Hội An");
    expect(p.gifts[0]).toMatchObject({ item: "Ceramic mug", priceAmount: 250000, priceCurrency: "VND" });
  });

  it("keeps preference history and distinguishes sources; AI source only via explicit acceptance", async () => {
    const u = await makeUser();
    const pid = await createPerson(u.userId, { nickname: "Minh", relationship: "partner" });
    await addPreference(u.userId, { personId: pid, categoryId: "food", label: "Bún chả", sentiment: "like", source: "observed" });
    await addPreference(u.userId, { personId: pid, categoryId: "food", label: "bún chả", sentiment: "love", source: "person_stated" });
    const prefs = await listPreferences(u.userId, pid);
    expect(prefs).toHaveLength(1);
    expect(prefs[0]!.current).toMatchObject({ sentiment: "love", source: "person_stated" });
    expect(prefs[0]!.history.map((h) => h.source)).toEqual(["person_stated", "observed"]);
    await expect(addPreference(u.userId, { personId: pid, categoryId: "food", label: "Phở", sentiment: "like", source: "ai_suggested" })).rejects.toMatchObject({ code: "invalid_source" });
    await addPreference(u.userId, { personId: pid, categoryId: "food", label: "Phở", sentiment: "like", source: "ai_suggested" }, { allowAi: true });
    // Self preferences are separate from the person's.
    await expect(addPreference(u.userId, { personId: null, categoryId: "food", label: "Phở", sentiment: "like", source: "observed" })).rejects.toMatchObject({ code: "invalid_source" });
    await addPreference(u.userId, { personId: null, categoryId: "food", label: "Phở", sentiment: "love", source: "self_stated" });
    expect((await listPreferences(u.userId, null)).map((p) => p.label)).toEqual(["Phở"]);
  });

  it("person notes are private to the recording user", async () => {
    const a = await makeUser();
    const b = await makeUser();
    const pid = await createPerson(a.userId, { nickname: "Secret friend" });
    await addRelationshipEntry(a.userId, pid, { kind: "note", body: "private note" });
    expect(await listPeople(b.userId)).toEqual([]);
    await expect(getPerson(b.userId, pid)).rejects.toMatchObject({ code: "not_found" });
    await expect(addRelationshipEntry(b.userId, pid, { kind: "note", body: "x" })).rejects.toMatchObject({ code: "not_found" });
    await expect(addPreference(b.userId, { personId: pid, categoryId: "food", label: "x", sentiment: "like", source: "observed" })).rejects.toMatchObject({ code: "not_found" });
    await expect(deletePerson(b.userId, pid)).rejects.toMatchObject({ code: "not_found" });
    await expect(suggestGifts(b.userId, pid)).rejects.toMatchObject({ code: "not_found" });
    const entryId = (await getPerson(a.userId, pid)).entries[0]!.id;
    await expect(deletePersonRecord(b.userId, "entry", entryId)).rejects.toMatchObject({ code: "not_found" });
  });

  it("deleting a person removes everything about them", async () => {
    const u = await makeUser();
    const pid = await createPerson(u.userId, { nickname: "Temp" });
    await addImportantDate(u.userId, { personId: pid, label: "Birthday", kind: "birthday", month: 1, day: 2 });
    await deletePerson(u.userId, pid);
    expect(await upcomingDates(u.userId, 400)).toEqual([]);
  });
});

describe("important dates & reminders", () => {
  it("computes next occurrences incl. Feb 29 and year rollover", () => {
    expect(nextOccurrence(10, 25, "2026-10-23")).toEqual({ date: "2026-10-25", daysUntil: 2, year: 2026 });
    expect(nextOccurrence(1, 1, "2026-10-23")).toMatchObject({ date: "2027-01-01", year: 2027 });
    expect(nextOccurrence(2, 29, "2026-10-23")).toMatchObject({ date: "2027-02-28" });
    expect(nextOccurrence(2, 29, "2027-10-23")).toMatchObject({ date: "2028-02-29" });
  });

  it("flags due reminders and anniversaries", async () => {
    const u = await makeUser();
    const pid = await createPerson(u.userId, { nickname: "Lan" });
    await addImportantDate(u.userId, { personId: pid, label: "Lan's birthday", kind: "birthday", month: 10, day: 30, year: 1995, remindDaysBefore: 7 });
    await addImportantDate(u.userId, { label: "Our anniversary", kind: "anniversary", month: 12, day: 1, remindDaysBefore: 3 });
    await expect(addImportantDate(u.userId, { label: "bad", kind: "custom", month: 2, day: 30 })).rejects.toThrow();
    const list = await upcomingDates(u.userId, 60, new Date("2026-10-23T02:00:00Z"));
    expect(list[0]).toMatchObject({ label: "Lan's birthday", daysUntil: 7, years: 31, reminderDue: true, personName: "Lan" });
    expect(list[1]).toMatchObject({ label: "Our anniversary", reminderDue: false });
  });
});

describe("gift suggestions", () => {
  it("cites evidence, excludes owned/given/disliked, and never pretends to check budget", async () => {
    const u = await makeUser();
    const pid = await createPerson(u.userId, { nickname: "Hà", relationship: "partner" });
    await addPreference(u.userId, { personId: pid, categoryId: "item", label: "Film camera", sentiment: "wants", source: "person_stated" });
    await addPreference(u.userId, { personId: pid, categoryId: "item", label: "Kindle", sentiment: "wants", source: "guess" });
    await addPreference(u.userId, { personId: pid, categoryId: "item", label: "Headphones", sentiment: "wants", source: "person_stated" });
    await addPreference(u.userId, { personId: pid, categoryId: "item", label: "Headphones", sentiment: "owns", source: "observed" });
    await addPreference(u.userId, { personId: pid, categoryId: "item", label: "Scarf", sentiment: "wants", source: "observed" });
    await addGift(u.userId, pid, { item: "scarf", reaction: "liked" });
    await addPreference(u.userId, { personId: pid, categoryId: "scent", label: "Lavender", sentiment: "avoid", source: "person_stated" });
    await addPreference(u.userId, { personId: pid, categoryId: "scent", label: "Lavender candle", sentiment: "wants", source: "unverified" });
    await addPreference(u.userId, { personId: pid, categoryId: "music", label: "Đen Vâu", sentiment: "love", source: "person_stated" });
    await addRelationshipEntry(u.userId, pid, { kind: "wish_together", body: "Cooking class in Hội An", source: "person_stated" });
    await addImportantDate(u.userId, { personId: pid, label: "Birthday", kind: "birthday", month: 11, day: 5 });

    const s = await suggestGifts(u.userId, pid, { budget: "500000", currency: "VND" }, new Date("2026-10-23T02:00:00Z"));
    const ideas = s.candidates.map((c) => c.idea.en);
    expect(ideas[0]).toBe("Film camera"); // strongest: they said so
    expect(ideas).not.toContain("Headphones"); // owned
    expect(ideas).not.toContain("Scarf"); // already given
    expect(ideas).not.toContain("Lavender candle"); // conflicts with "avoid"
    expect(ideas).toContain("Cooking class in Hội An");
    const kindle = s.candidates.find((c) => c.idea.en === "Kindle")!;
    // Generated idea text is localised (regression: Vietnamese UI showed English text).
    const music = s.candidates.find((c) => c.kind === "related_to_like")!;
    expect(music.idea.vi).toBe("món liên quan đến Đen Vâu (vé nhạc, đĩa, đồ lưu niệm)");
    expect(music.idea.en).toBe("something related to Đen Vâu (concert, record, merch)");
    expect(kindle.strength).toBe("weak");
    expect(kindle.caveats.length).toBe(1);
    for (const c of s.candidates) expect(c.evidence.length).toBeGreaterThan(0);
    expect(s.avoid).toEqual([{ label: "Lavender", source: "person_stated" }]);
    expect(s.nextOccasion).toMatchObject({ label: "Birthday", daysUntil: 13 });
    expect(s.budget).toMatchObject({ amount: 500000, checked: false });
    expect(s.questionsToAsk).toHaveLength(0);
  });

  it("asks questions instead of guessing when there is no information", async () => {
    const u = await makeUser();
    const pid = await createPerson(u.userId, { nickname: "New friend" });
    const s = await suggestGifts(u.userId, pid);
    expect(s.candidates).toEqual([]);
    expect(s.questionsToAsk.length).toBe(3);
  });
});
