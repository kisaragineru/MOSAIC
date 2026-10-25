import { describe, expect, it } from "vitest";
import { withUser } from "@/server/db/tx";
import { people } from "@/server/db/schema";
import { createMemory, deleteMemory, editMemory, getMemory, listMemories, listTags } from "@/server/services/memories";
import { sql } from "drizzle-orm";
import { buildTimeline } from "@/lib/timeline";
import { mineToEntry } from "@/server/services/memory-share";
import { makeUser } from "../helpers/factory";

describe("memories & timeline", () => {
  it("creates from a short note with sensible defaults", async () => {
    const u = await makeUser();
    const id = await createMemory(u.userId, { body: "Rainy day, felt calm." });
    const m = await getMemory(u.userId, id);
    expect(m).toMatchObject({ kind: "note", body: "Rainy day, felt calm.", version: 1, tags: [], sealed: false });
    expect(m.versions).toHaveLength(1);
  });

  it("editing appends a version and keeps the old text", async () => {
    const u = await makeUser();
    const id = await createMemory(u.userId, { kind: "value", body: "Money matters most.", tags: ["Values"] });
    const r = await editMemory(u.userId, id, { kind: "value", body: "Time with family matters most.", tags: ["values", "family"] });
    expect(r).toEqual({ version: 2, contentChanged: true });
    const m = await getMemory(u.userId, id);
    expect(m.body).toBe("Time with family matters most.");
    expect(m.versions.map((v) => v.body)).toEqual(["Money matters most.", "Time with family matters most."]);
    expect(m.versions[0]!.createdAt.getTime()).toBeLessThanOrEqual(m.versions[1]!.createdAt.getTime());
    expect(m.tags).toEqual(["family", "values"]);
    // Metadata-only edits do not create a new version.
    expect(await editMemory(u.userId, id, { kind: "value", body: "Time with family matters most.", tags: [] })).toEqual({
      version: 2,
      contentChanged: false,
    });
  });

  it("keeps a mood saved before mood was taken out of the form", async () => {
    const u = await makeUser();
    const id = await createMemory(u.userId, { body: "Old note", mood: 4 });
    expect(await editMemory(u.userId, id, { kind: "thought", body: "Old note" })).toEqual({ version: 1, contentChanged: false });
    await editMemory(u.userId, id, { kind: "thought", body: "Old note, edited" });
    expect((await getMemory(u.userId, id)).mood).toBe(4);
  });

  it("keeps decision reasons and event dates", async () => {
    const u = await makeUser();
    const id = await createMemory(u.userId, {
      kind: "decision",
      title: "Moved to Đà Nẵng",
      body: "Left Hà Nội for the coast.",
      reason: "Wanted to live near the sea.",
      occurredOn: "2019-03-15",
    });
    const m = await getMemory(u.userId, id);
    expect(m).toMatchObject({ occurredOn: "2019-03-15", reason: "Wanted to live near the sea." });
  });

  it("searches accent-insensitively and filters by kind, tag, person and date", async () => {
    const u = await makeUser();
    const [mom] = await withUser(u.userId, (tx) => tx.insert(people).values({ userId: u.userId, nickname: "Mẹ" }).returning());
    await createMemory(u.userId, { kind: "memory", body: "Ăn phở với mẹ ở Hà Nội", occurredOn: "2001-05-01", tags: ["food"], personIds: [mom!.id] });
    await createMemory(u.userId, { kind: "goal", body: "Run a marathon", occurredOn: "2030-01-01", tags: ["health"] });
    await createMemory(u.userId, { kind: "feeling", body: "100% tired_today" });
    expect((await listMemories(u.userId, { q: "pho" })).map((m) => m.body)).toEqual(["Ăn phở với mẹ ở Hà Nội"]);
    expect((await listMemories(u.userId, { q: "HA NOI" })).length).toBe(1);
    expect((await listMemories(u.userId, { kind: "goal" })).map((m) => m.body)).toEqual(["Run a marathon"]);
    expect((await listMemories(u.userId, { tag: "health" })).length).toBe(1);
    expect((await listMemories(u.userId, { personId: mom!.id }))[0]!.people).toEqual([{ id: mom!.id, nickname: "Mẹ" }]);
    expect((await listMemories(u.userId, { from: "2000-01-01", to: "2010-12-31" })).length).toBe(1);
    // LIKE wildcards in the query are literal.
    expect((await listMemories(u.userId, { q: "%" })).map((m) => m.body)).toEqual(["100% tired_today"]);
    expect((await listMemories(u.userId, { q: "_" })).map((m) => m.body)).toEqual(["100% tired_today"]);
    // Timeline order: by event date, newest first.
    const all = await listMemories(u.userId);
    expect(all[0]!.body).toBe("Run a marathon");
    expect(all.at(-1)!.body).toBe("Ăn phở với mẹ ở Hà Nội");
    expect(await listTags(u.userId)).toEqual([
      { tag: "food", n: 1 },
      { tag: "health", n: 1 },
    ]);
  });

  it("letters to the future stay sealed and unsearchable until their date", async () => {
    const u = await makeUser();
    const id = await createMemory(u.userId, { kind: "letter_to_future", body: "Dear future me: secret plan", revealOn: "2099-01-01" });
    const m = await getMemory(u.userId, id);
    expect(m).toMatchObject({ sealed: true, body: null, versions: [] });
    expect(await listMemories(u.userId, { q: "secret" })).toEqual([]);
    await expect(createMemory(u.userId, { kind: "letter_to_future", body: "no date" })).rejects.toMatchObject({
      code: "reveal_date_required",
    });
    const past = await createMemory(u.userId, { kind: "letter_to_future", body: "opened", revealOn: "2020-01-01" });
    expect((await getMemory(u.userId, past)).body).toBe("opened");
  });

  it("an opened letter sits on the timeline on the day it opened, with how long it waited", async () => {
    const u = await makeUser();
    const before = await createMemory(u.userId, { body: "older note", occurredOn: "2026-01-10" });
    const letter = await createMemory(u.userId, { kind: "letter_to_future", body: "Hello from March", revealOn: "2099-01-01" });
    const sealedAt = (await listMemories(u.userId)).find((m) => m.id === letter)!;
    expect(sealedAt).toMatchObject({ sealed: true, body: null });
    // Written on 1 March, opened on 15 June (both in the past now).
    await withUser(u.userId, (tx) => tx.execute(sql`update memory_entries set created_at = '2026-03-01T03:00:00Z', reveal_on = '2026-06-15' where id = ${letter}`));
    const all = await listMemories(u.userId);
    expect(all.map((m) => m.id)).toEqual([letter, before]);
    expect(all[0]).toMatchObject({ sealed: false, body: "Hello from March", timelineOn: "2026-06-15" });
    // Date filters follow the opening day, not the writing day.
    expect((await listMemories(u.userId, { from: "2026-06-01", to: "2026-06-30" })).map((m) => m.id)).toEqual([letter]);
    expect((await listMemories(u.userId, { from: "2026-03-01", to: "2026-03-31" })).map((m) => m.id)).toEqual([]);
    const [day] = buildTimeline(all.map(mineToEntry), "UTC");
    expect(day!.day).toBe("2026-06-15");
    expect(day!.items[0]!.letter).toEqual({ writtenOn: "2026-03-01", days: 106 });
    expect(day!.items[0]!.writtenOn).toBeNull();
  });

  it("deletes permanently, including all versions", async () => {
    const u = await makeUser();
    const id = await createMemory(u.userId, { body: "v1" });
    await editMemory(u.userId, id, { body: "v2" });
    await deleteMemory(u.userId, id);
    await expect(getMemory(u.userId, id)).rejects.toMatchObject({ code: "not_found" });
    await expect(deleteMemory(u.userId, id)).rejects.toMatchObject({ code: "not_found" });
  });

  it("isolates users: another user cannot read, edit, delete or link", async () => {
    const a = await makeUser();
    const b = await makeUser();
    const id = await createMemory(a.userId, { body: "A only" });
    await expect(getMemory(b.userId, id)).rejects.toMatchObject({ code: "not_found" });
    await expect(editMemory(b.userId, id, { body: "hijack" })).rejects.toMatchObject({ code: "not_found" });
    await expect(deleteMemory(b.userId, id)).rejects.toMatchObject({ code: "not_found" });
    expect(await listMemories(b.userId)).toEqual([]);
    const [p] = await withUser(a.userId, (tx) => tx.insert(people).values({ userId: a.userId, nickname: "A friend" }).returning());
    await expect(createMemory(b.userId, { body: "link", personIds: [p!.id] })).rejects.toMatchObject({ code: "unknown_person" });
    expect((await getMemory(a.userId, id)).body).toBe("A only");
  });

  it("validates input", async () => {
    const u = await makeUser();
    await expect(createMemory(u.userId, { body: "" })).rejects.toThrow();
    await expect(createMemory(u.userId, { body: "x", kind: "nonsense" })).rejects.toThrow();
    await expect(createMemory(u.userId, { body: "x", occurredOn: "2023-02-30" })).rejects.toThrow();
    await expect(getMemory(u.userId, "not-a-uuid")).rejects.toThrow();
  });
});

describe("labels and feelings", () => {
  it("reads labels from the words, keeps the owner's correction, and asks feelings only of the owner", async () => {
    const { setMemoryFeeling, setMemoryLabels } = await import("@/server/services/memories");
    const u = await makeUser();
    const other = await makeUser();
    const id = await createMemory(u.userId, { body: "資格試験に合格できた！嬉しい。" });
    let m = await getMemory(u.userId, id);
    expect(m).toMatchObject({ kind: "achievement", labels: ["achievement", "feeling"], labelsBy: "auto", feeling: null });
    // Re-read on edit while automatic.
    await editMemory(u.userId, id, { body: "来年は留学すると決めた。" });
    expect((await getMemory(u.userId, id)).labels).toEqual(["decision"]);
    // Once the owner sets them, edits keep theirs.
    await setMemoryLabels(u.userId, id, ["goal", "decision"]);
    await editMemory(u.userId, id, { body: "お昼はカレー。" });
    m = await getMemory(u.userId, id);
    expect(m).toMatchObject({ labels: ["goal", "decision"], labelsBy: "user", kind: "goal" });
    await expect(setMemoryLabels(u.userId, id, ["nonsense"])).rejects.toBeTruthy();
    await setMemoryFeeling(u.userId, id, "grateful");
    expect((await getMemory(u.userId, id)).feeling).toBe("grateful");
    await expect(setMemoryFeeling(other.userId, id, "sad")).rejects.toMatchObject({ code: "not_found" });
    await expect(setMemoryLabels(other.userId, id, ["goal"])).rejects.toMatchObject({ code: "not_found" });
    // A plain note has none, and isn't filtered as anything.
    const plain = await createMemory(u.userId, { body: "お昼はカレー。" });
    expect(await getMemory(u.userId, plain)).toMatchObject({ kind: "note", labels: [] });
    expect((await listMemories(u.userId, { kind: "goal" })).map((x) => x.id)).toEqual([id]);
  });
});
