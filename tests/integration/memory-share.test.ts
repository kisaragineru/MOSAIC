import { describe, expect, it } from "vitest";
import { buildTimeline } from "@/lib/timeline";
import { createMemory, getMemory } from "@/server/services/memories";
import { audienceChoices, connectionFeed, feedForPage, memoryAudienceOf, recentTimeline, setMemoryAudience } from "@/server/services/memory-share";
import { createShare, giveConsent, openComparison, revokeComparison } from "@/server/services/sharing";
import { makeUser } from "../helpers/factory";

async function connect(a: string, b: string) {
  const s = await createShare(a);
  const id = await openComparison(b, s.token);
  await giveConsent(a, id, { scopes: ["preferences"], agree: true });
  await giveConsent(b, id, { scopes: ["preferences"], agree: true });
  return id;
}

describe("records shared with connections", () => {
  it("are private by default and shown, as current text only, to everyone or to the chosen ones", async () => {
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

    await setMemoryAudience(a.userId, id, { visibility: "selected", sessions: [ac] });
    expect(await memoryAudienceOf(a.userId, id)).toEqual([ac]);
    expect(await connectionFeed(b.userId)).toEqual([]);
    expect((await connectionFeed(c.userId)).map((x) => x.id)).toEqual([id]);

    await setMemoryAudience(a.userId, id, { visibility: "private" });
    expect(await connectionFeed(c.userId)).toEqual([]);
    expect(await memoryAudienceOf(a.userId, id)).toEqual([]);
  });

  it("refuses letters, other people's records, strangers as an audience and an empty choice", async () => {
    const a = await makeUser();
    const b = await makeUser();
    const stranger = await makeUser();
    const ab = await connect(a.userId, b.userId);
    const letter = await createMemory(a.userId, { kind: "letter_to_future", body: "未来へ", revealOn: "2030-01-01" });
    await expect(setMemoryAudience(a.userId, letter, { visibility: "connections" })).rejects.toMatchObject({ code: "letters_stay_private" });
    const id = await createMemory(a.userId, { kind: "thought", body: "x" });
    await expect(setMemoryAudience(b.userId, id, { visibility: "connections" })).rejects.toMatchObject({ code: "not_found" });
    const other = await connect(stranger.userId, b.userId);
    await expect(setMemoryAudience(a.userId, id, { visibility: "selected", sessions: [other] })).rejects.toMatchObject({ code: "invalid_audience" });
    await expect(setMemoryAudience(a.userId, id, { visibility: "selected", sessions: [] })).rejects.toMatchObject({ code: "choose_audience" });
    await expect(setMemoryAudience(a.userId, id, { visibility: "everyone" })).rejects.toThrow();
    expect((await audienceChoices(a.userId)).map((x) => x.sessionId)).toEqual([ab]);
  });

  it("stops showing anything once the connection ends, and not before it is active", async () => {
    const a = await makeUser();
    const b = await makeUser();
    const s = await createShare(a.userId);
    const pending = await openComparison(b.userId, s.token);
    const id = await createMemory(a.userId, { kind: "thought", body: "共有" });
    await setMemoryAudience(a.userId, id, { visibility: "connections" });
    expect(await connectionFeed(b.userId)).toEqual([]); // not consented yet
    expect(await audienceChoices(a.userId)).toEqual([]);
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
    const p0 = await feedForPage(a.userId, { previousOldest: null, oldest: "2026-01-03", first: true, last: false });
    const p1 = await feedForPage(a.userId, { previousOldest: "2026-01-03", oldest: "2026-01-01", first: false, last: true });
    expect(p0.map((x) => x.body)).toEqual(["sora 2026-01-06", "sora 2026-01-04"]);
    expect(p1.map((x) => x.body)).toEqual(["sora 2026-01-03", "sora 2026-01-02", "sora 2025-12-31"]);
    expect((await connectionFeed(a.userId, { offset: 1, limit: 2 })).map((x) => x.effectiveOn)).toEqual(["2026-01-04", "2026-01-03"]);

    const recent = await recentTimeline(a.userId, 4);
    expect(recent).toHaveLength(4);
    expect(recent.some((e) => !e.mine && e.ownerName === "Sora")).toBe(true);
    const days = buildTimeline(recent, "Asia/Tokyo");
    expect(days.map((d) => d.day)).toEqual([...days.map((d) => d.day)].sort().reverse());
  });
});
