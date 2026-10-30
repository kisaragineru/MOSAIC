import { describe, expect, it } from "vitest";
import { buildTimeline } from "@/lib/timeline";
import { createMemory, getMemory, listMemories } from "@/server/services/memories";
import { aheadTimeline, connectionFeed, feedForPage, recentTimeline, setMemoriesAudience, setMemoryAudience, shareTargets, visibleCount } from "@/server/services/memory-share";
import { addPersonFromConnection, createShare, giveConsent, openComparison, revokeComparison } from "@/server/services/sharing";
import { updatePerson } from "@/server/services/people";
import { makeUser } from "../helpers/factory";
import { getAccount } from "@/server/services/account";
import { todayIn } from "@/lib/validation/common";

async function connect(a: string, b: string) {
  const s = await createShare(a);
  const id = await openComparison(b, s.token);
  await giveConsent(a, id, { scopes: ["preferences"], agree: true });
  await giveConsent(b, id, { scopes: ["preferences"], agree: true });
  return id;
}

describe("records shared with connections", () => {
  it("are private by default and shown, as current text only, to everyone or by relationship", async () => {
    const a = await makeUser("Hana");
    const b = await makeUser("Sora");
    const c = await makeUser("Ren");
    const stranger = await makeUser("X");
    const ab = await connect(a.userId, b.userId);
    const ac = await connect(a.userId, c.userId);
    const id = await createMemory(a.userId, { kind: "memory", title: "海", body: "みんなで海に行った", mood: "4", tags: ["夏"], reason: "秘密の理由" });
    expect((await getMemory(a.userId, id)).visibility).toBe("private");
    expect(await connectionFeed(b.userId)).toEqual([]);

    await setMemoryAudience(a.userId, id, { visibility: "connections" });
    const [seen] = await connectionFeed(b.userId);
    expect(seen).toMatchObject({ id, ownerName: "Hana", sessionId: ab, title: "海", body: "みんなで海に行った" });
    expect(Object.keys(seen!).sort()).toEqual(["body", "createdAt", "effectiveOn", "id", "kind", "occurredOn", "ownerId", "ownerName", "sessionId", "title", "updatedAt"]);
    expect(await connectionFeed(c.userId)).toHaveLength(1);
    expect(await connectionFeed(stranger.userId)).toEqual([]);

    // By relationship: Sora is family to Hana, Ren a friend; nobody unlisted sees it.
    await setMemoryAudience(a.userId, id, { visibility: "circles", circles: ["family"] });
    expect((await getMemory(a.userId, id)).circles).toEqual(["family"]);
    expect(await connectionFeed(b.userId)).toEqual([]); // not in Hana's people yet
    await addPersonFromConnection(a.userId, ab, "family");
    const ren = await addPersonFromConnection(a.userId, ac, "friend");
    expect((await connectionFeed(b.userId)).map((x) => x.id)).toEqual([id]);
    expect(await connectionFeed(c.userId)).toEqual([]);
    expect(await visibleCount(a.userId, "family")).toBe(1);
    expect(await visibleCount(a.userId, null)).toBe(0);
    expect((await shareTargets(a.userId)).map((x) => x.circle).sort()).toEqual(["family", "friend"]);

    // Ren becomes family later: what was already shared with family reaches him too.
    await updatePerson(a.userId, ren, { nickname: "Ren", relationship: "family" });
    expect((await connectionFeed(c.userId)).map((x) => x.id)).toEqual([id]);

    await setMemoryAudience(a.userId, id, { visibility: "private" });
    expect(await connectionFeed(b.userId)).toEqual([]);
    expect((await getMemory(a.userId, id)).circles).toEqual([]);
  });

  it("refuses letters, other people's records, unknown circles and an empty choice", async () => {
    const a = await makeUser();
    const b = await makeUser();
    await connect(a.userId, b.userId);
    const letter = await createMemory(a.userId, { kind: "letter_to_future", body: "未来へ", revealOn: "2030-01-01" });
    await expect(setMemoryAudience(a.userId, letter, { visibility: "connections" })).rejects.toMatchObject({ code: "letters_stay_private" });
    const id = await createMemory(a.userId, { kind: "thought", body: "x" });
    await expect(setMemoryAudience(b.userId, id, { visibility: "connections" })).rejects.toMatchObject({ code: "not_found" });
    await expect(setMemoryAudience(a.userId, id, { visibility: "circles", circles: [] })).rejects.toMatchObject({ code: "choose_audience" });
    await expect(setMemoryAudience(a.userId, id, { visibility: "circles", circles: ["other"] })).rejects.toThrow();
    await expect(setMemoryAudience(a.userId, id, { visibility: "everyone" })).rejects.toThrow();
  });

  it("stops showing anything once the connection ends, and not before it is active", async () => {
    const a = await makeUser();
    const b = await makeUser();
    const s = await createShare(a.userId);
    const pending = await openComparison(b.userId, s.token);
    const id = await createMemory(a.userId, { kind: "thought", body: "共有" });
    await setMemoryAudience(a.userId, id, { visibility: "connections" });
    expect(await connectionFeed(b.userId)).toEqual([]); // not consented yet
    expect(await shareTargets(a.userId)).toEqual([]);
    await giveConsent(a.userId, pending, { scopes: ["preferences"], agree: true });
    await giveConsent(b.userId, pending, { scopes: ["preferences"], agree: true });
    expect(await connectionFeed(b.userId)).toHaveLength(1);
    await revokeComparison(b.userId, pending);
    expect(await connectionFeed(b.userId)).toEqual([]);
    expect(await connectionFeed(a.userId)).toEqual([]);
  });

  it("pages theirs alongside mine without gaps or repeats, and merges the newest on Home", async () => {
    const a = await makeUser();
    const b = await makeUser("Sora");
    await connect(a.userId, b.userId);
    for (const d of ["2026-01-05", "2026-01-03", "2026-01-01"]) await createMemory(a.userId, { kind: "thought", body: `me ${d}`, occurredOn: d });
    for (const d of ["2026-01-06", "2026-01-04", "2026-01-03", "2026-01-02", "2025-12-31"]) {
      const id = await createMemory(b.userId, { kind: "thought", body: `sora ${d}`, occurredOn: d });
      await setMemoryAudience(b.userId, id, { visibility: "connections" });
    }
    // Pages of two of mine: [01-05, 01-03] then [01-01].
    const p0 = await feedForPage(a.userId, { previousOldest: null, oldest: "2026-01-03", first: true, last: false, today: "2099-12-31" });
    const p1 = await feedForPage(a.userId, { previousOldest: "2026-01-03", oldest: "2026-01-01", first: false, last: true, today: "2099-12-31" });
    expect(p0.map((x) => x.body)).toEqual(["sora 2026-01-06", "sora 2026-01-04"]);
    expect(p1.map((x) => x.body)).toEqual(["sora 2026-01-03", "sora 2026-01-02", "sora 2025-12-31"]);
    expect((await connectionFeed(a.userId, { offset: 1, limit: 2 })).map((x) => x.effectiveOn)).toEqual(["2026-01-04", "2026-01-03"]);

    const recent = await recentTimeline(a.userId, "2099-12-31", 4);
    expect(recent).toHaveLength(4);
    expect(recent.some((e) => !e.mine && e.ownerName === "Sora")).toBe(true);
    const days = buildTimeline(recent, "Asia/Tokyo");
    expect(days.map((d) => d.day)).toEqual([...days.map((d) => d.day)].sort().reverse());
  });

  it("narrows to one connection's shared records", async () => {
    const a = await makeUser();
    const b = await makeUser("Sora");
    const c = await makeUser("Ren");
    const ab = await connect(a.userId, b.userId);
    const ac = await connect(a.userId, c.userId);
    for (const [u, body] of [[b.userId, "ソラの記録"], [c.userId, "レンの記録"]] as const) {
      const id = await createMemory(u, { kind: "thought", body });
      await setMemoryAudience(u, id, { visibility: "connections" });
    }
    expect((await connectionFeed(a.userId)).map((x) => x.body).sort()).toEqual(["ソラの記録", "レンの記録"]);
    expect((await connectionFeed(a.userId, { sessionId: ab })).map((x) => x.body)).toEqual(["ソラの記録"]);
    expect((await connectionFeed(a.userId, { sessionId: ac })).map((x) => x.body)).toEqual(["レンの記録"]);
    // Someone else's connection id gives nothing, not their records.
    expect(await connectionFeed(c.userId, { sessionId: ab })).toEqual([]);
  });

  it("finds what is shared at a glance and changes many at once; only your own, never letters", async () => {
    const a = await makeUser("Hana");
    const b = await makeUser("Sora");
    await connect(a.userId, b.userId);
    const ids = [];
    for (const body of ["一", "二", "三"]) ids.push(await createMemory(a.userId, { kind: "note", body }));
    const letter = await createMemory(a.userId, { kind: "letter_to_future", body: "未来へ", revealOn: "2099-01-01" });
    const shared = async () => (await listMemories(a.userId, { audience: "shared" })).map((m) => m.id).sort();
    const priv = async () => (await listMemories(a.userId, { audience: "private" })).map((m) => m.id).sort();
    expect(await shared()).toEqual([]);
    expect(await priv()).toEqual([...ids].sort()); // the letter isn't listed

    await setMemoriesAudience(a.userId, [ids[0]!, ids[1]!], { visibility: "connections" });
    expect(await shared()).toEqual([ids[0]!, ids[1]!].sort());
    expect((await connectionFeed(b.userId)).map((x) => x.id).sort()).toEqual([ids[0]!, ids[1]!].sort());
    await setMemoriesAudience(a.userId, [ids[1]!], { visibility: "circles", circles: ["family"] });
    expect((await getMemory(a.userId, ids[1]!)).circles).toEqual(["family"]);
    await setMemoriesAudience(a.userId, ids, { visibility: "private" });
    expect(await shared()).toEqual([]);

    // All or nothing: a letter, or someone else's record, in the batch changes none of them.
    await expect(setMemoriesAudience(a.userId, [ids[0]!, letter], { visibility: "connections" })).rejects.toThrow();
    const other = await createMemory(b.userId, { kind: "note", body: "Soraの" });
    await expect(setMemoriesAudience(a.userId, [ids[0]!, other], { visibility: "connections" })).rejects.toThrow();
    expect(await shared()).toEqual([]);
    expect((await getMemory(b.userId, other)).visibility).toBe("private");
    await expect(setMemoriesAudience(a.userId, [], { visibility: "private" })).rejects.toThrow();
  });
  it("reaches the people chosen by name, alone or with relationships, and only while connected", async () => {
    const a = await makeUser("Hana");
    const b = await makeUser("Sora");
    const c = await makeUser("Ren");
    const stranger = await makeUser("X");
    const ab = await connect(a.userId, b.userId);
    const ac = await connect(a.userId, c.userId);
    const id = await createMemory(a.userId, { kind: "thought", body: "ソラにだけ" });

    // Sora by name only: Ren (a connection too) doesn't see it.
    await setMemoryAudience(a.userId, id, { visibility: "circles", people: [b.userId] });
    expect((await getMemory(a.userId, id)).audience).toEqual([b.userId]);
    expect((await connectionFeed(b.userId)).map((x) => x.id)).toEqual([id]);
    expect(await connectionFeed(c.userId)).toEqual([]);
    expect(await visibleCount(a.userId, null, b.userId)).toBe(1);
    expect(await visibleCount(a.userId, null, c.userId)).toBe(0);

    // Relationships and people together: Ren as a friend, Sora by name.
    await addPersonFromConnection(a.userId, ac, "friend");
    await setMemoryAudience(a.userId, id, { visibility: "circles", circles: ["friend"], people: [b.userId] });
    expect((await connectionFeed(c.userId)).map((x) => x.id)).toEqual([id]);
    expect((await connectionFeed(b.userId)).map((x) => x.id)).toEqual([id]);

    // Only people I'm connected with can be chosen.
    await expect(setMemoryAudience(a.userId, id, { visibility: "circles", people: [stranger.userId] })).rejects.toMatchObject({ code: "not_connected" });

    // Back to relationships only: Sora's name is dropped.
    await setMemoryAudience(a.userId, id, { visibility: "circles", circles: ["friend"] });
    expect((await getMemory(a.userId, id)).audience).toEqual([]);
    expect(await connectionFeed(b.userId)).toEqual([]);

    // Once the connection ends, a record chosen for them stops reaching them.
    await setMemoryAudience(a.userId, id, { visibility: "circles", people: [b.userId] });
    await revokeComparison(b.userId, ab);
    expect(await connectionFeed(b.userId)).toEqual([]);
    expect(await connectionFeed(stranger.userId)).toEqual([]);
  });
  it("keeps records dated after today ahead of the timeline, soonest first, mine and theirs", async () => {
    const a = await makeUser();
    const b = await makeUser("Sora");
    await connect(a.userId, b.userId);
    const today = todayIn((await getAccount(a.userId)).profile.timeZone);
    const past = await createMemory(a.userId, { kind: "thought", body: "昔", occurredOn: "2020-06-14" });
    const todays = await createMemory(a.userId, { kind: "thought", body: "今日", occurredOn: today });
    const far = await createMemory(a.userId, { kind: "thought", body: "正月", occurredOn: "2099-01-01" });
    const soon = await createMemory(a.userId, { kind: "thought", body: "期限", occurredOn: "2098-06-20" });
    const theirs = await createMemory(b.userId, { kind: "thought", body: "ソラの予定", occurredOn: "2098-07-01" });
    await setMemoryAudience(b.userId, theirs, { visibility: "connections" });

    expect((await aheadTimeline(a.userId, today)).map((e) => e.id)).toEqual([soon, theirs, far]);
    expect((await recentTimeline(a.userId, today, 10)).map((e) => e.id)).not.toContain(far);
    expect((await recentTimeline(a.userId, today, 10)).map((e) => e.id)).not.toContain(theirs);
    const pastIds = (await listMemories(a.userId, { when: "past" })).map((m) => m.id);
    expect(pastIds).toEqual(expect.arrayContaining([past, todays]));
    expect((await listMemories(a.userId, { when: "future" })).map((m) => m.id)).toEqual([soon, far]);
    // Without "when" (search, filters) everything is found.
    expect((await listMemories(a.userId)).map((m) => m.id)).toEqual(expect.arrayContaining([past, todays, soon, far]));
  });
});
