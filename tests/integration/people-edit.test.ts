import { describe, expect, it } from "vitest";
import {
  addGift,
  addImportantDate,
  addPreference,
  addRelationshipEntry,
  addRelationshipEvent,
  createPerson,
  getPerson,
  listPreferences,
  updatePersonRecord,
  updatePreference,
} from "@/server/services/people";
import { makeUser } from "../helpers/factory";

describe("editing preferences", () => {
  it("renames in place and keeps earlier feelings as history", async () => {
    const u = await makeUser();
    const pid = await createPerson(u.userId, { nickname: "Lan" });
    const item = await addPreference(u.userId, { personId: pid, categoryId: "color", label: "Pnk", sentiment: "dislike", source: "person_stated", note: "until 20" });
    // Fixing a typo only renames; no new history entry.
    await updatePreference(u.userId, item, { categoryId: "color", label: "Pink", sentiment: "dislike", source: "person_stated", note: "until 20" });
    let [p] = await listPreferences(u.userId, pid);
    expect(p!.label).toBe("Pink");
    expect(p!.history).toHaveLength(1);
    // Changing the feeling adds to history.
    await updatePreference(u.userId, item, { categoryId: "color", label: "Pink", sentiment: "like", source: "person_stated", note: "likes it now" });
    [p] = await listPreferences(u.userId, pid);
    expect(p!.current).toMatchObject({ sentiment: "like", note: "likes it now" });
    expect(p!.history.map((h) => h.sentiment)).toEqual(["like", "dislike"]);
  });

  it("refuses a clash with another item, a source that does not fit, and other people's items", async () => {
    const u = await makeUser();
    const a = await addPreference(u.userId, { categoryId: "food", label: "Tea", sentiment: "like", source: "self_stated" });
    await addPreference(u.userId, { categoryId: "food", label: "Coffee", sentiment: "like", source: "self_stated" });
    await expect(updatePreference(u.userId, a, { categoryId: "food", label: "coffee", sentiment: "like", source: "self_stated" })).rejects.toMatchObject({ code: "duplicate_preference" });
    await expect(updatePreference(u.userId, a, { categoryId: "food", label: "Tea", sentiment: "like", source: "observed" })).rejects.toMatchObject({ code: "invalid_source" });
    const other = await makeUser();
    await expect(updatePreference(other.userId, a, { categoryId: "food", label: "x", sentiment: "like", source: "self_stated" })).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("editing notes, events, gifts and dates", () => {
  it("updates each kind in place, only for the owner", async () => {
    const u = await makeUser();
    const pid = await createPerson(u.userId, { nickname: "Lan" });
    const e = await addRelationshipEntry(u.userId, pid, { kind: "note", body: "lieks tea" });
    const ev = await addRelationshipEvent(u.userId, pid, { title: "Hike" });
    const g = await addGift(u.userId, pid, { item: "Mug", reaction: "unknown", note: "blue one" });
    const d = await addImportantDate(u.userId, { personId: pid, label: "Birthday", kind: "birthday", month: 7, day: 2 });

    await updatePersonRecord(u.userId, "entry", e, { kind: "joy", body: "likes tea", source: "person_stated" });
    await updatePersonRecord(u.userId, "event", ev, { title: "Hike at Ba Vì", place: "Ba Vì", occurredOn: "2026-05-01" });
    await updatePersonRecord(u.userId, "gift", g, { item: "Ceramic mug", reaction: "loved" });
    await updatePersonRecord(u.userId, "date", d, { personId: pid, label: "Birthday", kind: "birthday", month: 7, day: 20, year: 2001, remindDaysBefore: 14 });

    const v = await getPerson(u.userId, pid);
    expect(v.entries[0]).toMatchObject({ kind: "joy", body: "likes tea", source: "person_stated" });
    expect(v.events[0]).toMatchObject({ title: "Hike at Ba Vì", place: "Ba Vì", occurredOn: "2026-05-01" });
    expect(v.gifts[0]).toMatchObject({ item: "Ceramic mug", reaction: "loved", note: "blue one" }); // the form has no note: kept
    expect(v.dates[0]).toMatchObject({ day: 20, year: 2001, remindDaysBefore: 14 });

    const other = await makeUser();
    await expect(updatePersonRecord(other.userId, "entry", e, { kind: "note", body: "x" })).rejects.toMatchObject({ code: "not_found" });
    await expect(updatePersonRecord(u.userId, "date", d, { personId: pid, label: "x", kind: "custom", month: 2, day: 30 })).rejects.toThrow();
    await expect(updatePersonRecord(u.userId, "nope", e, {})).rejects.toThrow();
  });
});
