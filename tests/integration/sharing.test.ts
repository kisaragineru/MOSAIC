import { Pool } from "pg";
import { describe, expect, it } from "vitest";
import { answerQuestion } from "@/server/services/discovery";
import { createMemory } from "@/server/services/memories";
import { addPreference, createPerson } from "@/server/services/people";
import {
  createShare,
  getComparison,
  giveConsent,
  listComparisons,
  listShares,
  lookupShare,
  openComparison,
  revokeComparison,
  revokeShare,
} from "@/server/services/sharing";
import { saveBirthProfile } from "@/server/services/tuvi";
import { makeUser } from "../helpers/factory";
import { TEST_MIGRATION_DATABASE_URL } from "../helpers/test-env";

async function owner<T>(q: string, params: unknown[]): Promise<T[]> {
  const pool = new Pool({ connectionString: TEST_MIGRATION_DATABASE_URL });
  try {
    return (await pool.query(q, params)).rows as T[];
  } finally {
    await pool.end();
  }
}

async function setupPair() {
  const a = await makeUser("An");
  const b = await makeUser("Bình");
  await saveBirthProfile(a.userId, { calendarInput: "solar", solarDate: "1990-06-07", timeKnown: true, birthTime: "06:30", timeZone: "Asia/Ho_Chi_Minh", sex: "male" });
  await saveBirthProfile(b.userId, { calendarInput: "solar", solarDate: "1992-03-15", timeKnown: false, timeZone: "Asia/Tokyo", sex: "female" });
  // Comparable + allowed
  await answerQuestion(a.userId, { questionId: "f.drink", questionVersion: 1, answer: { choice: "coffee" }, privacy: "comparable" });
  await answerQuestion(b.userId, { questionId: "f.drink", questionVersion: 1, answer: { choice: "tea" }, privacy: "comparable" });
  await answerQuestion(a.userId, { questionId: "m.genres", questionVersion: 1, answer: { choices: ["pop", "jazz"] }, privacy: "comparable" });
  await answerQuestion(b.userId, { questionId: "m.genres", questionVersion: 1, answer: { choices: ["jazz", "rock"] }, privacy: "comparable" });
  await answerQuestion(a.userId, { questionId: "r.love_language", questionVersion: 1, answer: { choice: "time" }, privacy: "comparable" });
  await answerQuestion(b.userId, { questionId: "r.love_language", questionVersion: 1, answer: { choice: "words" }, privacy: "comparable" });
  // Only A answered → must not count as a difference
  await answerQuestion(a.userId, { questionId: "t.style", questionVersion: 1, answer: { choice: "beach" }, privacy: "comparable" });
  // Private answers must never be used
  await answerQuestion(a.userId, { questionId: "f.spicy", questionVersion: 1, answer: { scale: 5 }, privacy: "private" });
  await answerQuestion(b.userId, { questionId: "f.spicy", questionVersion: 1, answer: { scale: 1 }, privacy: "comparable" });
  // Values scope
  await answerQuestion(a.userId, { questionId: "v.success", questionVersion: 1, answer: { choice: "peace" }, privacy: "comparable" });
  await answerQuestion(b.userId, { questionId: "v.success", questionVersion: 1, answer: { choice: "peace" }, privacy: "comparable" });
  // Diary & person notes exist but must never appear
  await createMemory(a.userId, { body: "DIARY-SECRET-A" });
  const p = await createPerson(b.userId, { nickname: "PERSON-SECRET-B" });
  await addPreference(b.userId, { personId: p, categoryId: "food", label: "PREF-SECRET-B", sentiment: "like", source: "observed" });
  return { a, b };
}

describe("share links", () => {
  it("stores only a token hash; token is high-entropy and returned once", async () => {
    const a = await makeUser();
    const s = await createShare(a.userId, { label: "Coffee chat" });
    expect(s.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(s.url).toContain(`/s#${s.token}`); // fragment: never sent to servers
    const rows = await owner<{ token_hash: string }>("select token_hash from profile_shares where id=$1", [s.id]);
    expect(rows[0]!.token_hash).not.toContain(s.token);
    const listed = await listShares(a.userId);
    expect(JSON.stringify(listed)).not.toContain(s.token);
  });

  it("opening a link reveals only the owner's display name and grants no data access", async () => {
    const { a, b } = await setupPair();
    const s = await createShare(a.userId);
    expect(await lookupShare(b.userId, s.token)).toEqual({ ownerDisplayName: "An", isOwn: false });
    const sid = await openComparison(b.userId, s.token);
    const view = await getComparison(b.userId, sid);
    expect(view).toMatchObject({ status: "pending", result: null, otherName: "An" });
    // Even with B's consent alone, nothing is computed.
    expect(await giveConsent(b.userId, sid, { scopes: ["tuvi", "preferences"], agree: true })).toBe("pending");
    expect((await getComparison(b.userId, sid)).result).toBeNull();
    const results = await owner("select * from comparison_results where session_id=$1", [sid]);
    expect(results).toEqual([]);
  });

  it("rejects invalid, own, expired, exhausted and revoked links", async () => {
    const a = await makeUser();
    const b = await makeUser();
    await expect(lookupShare(b.userId, "not a token")).rejects.toMatchObject({ code: "share_unavailable" });
    await expect(lookupShare(b.userId, "A".repeat(43))).rejects.toMatchObject({ code: "share_unavailable" });
    const own = await createShare(a.userId);
    await expect(openComparison(a.userId, own.token)).rejects.toMatchObject({ code: "own_share" });
    const expired = await createShare(a.userId);
    await owner("update profile_shares set expires_at = now() - interval '1 second' where id=$1", [expired.id]);
    await expect(openComparison(b.userId, expired.token)).rejects.toMatchObject({ code: "share_unavailable" });
    const once = await createShare(a.userId, { maxUses: 1 });
    await openComparison(b.userId, once.token);
    const c = await makeUser();
    await expect(openComparison(c.userId, once.token)).rejects.toMatchObject({ code: "share_unavailable" });
    const revoked = await createShare(a.userId);
    await revokeShare(a.userId, revoked.id);
    await expect(lookupShare(b.userId, revoked.token)).rejects.toMatchObject({ code: "share_unavailable" });
    // Only the owner can revoke.
    const other = await createShare(a.userId);
    await expect(revokeShare(b.userId, other.id)).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("consented comparison", () => {
  it("requires both consents; uses only agreed scopes, comparable+allowed answers; unanswered ≠ different", async () => {
    const { a, b } = await setupPair();
    const s = await createShare(a.userId);
    const sid = await openComparison(b.userId, s.token);
    await expect(giveConsent(a.userId, sid, { scopes: ["tuvi"], agree: false })).rejects.toMatchObject({ code: "consent_required" });
    await expect(giveConsent(a.userId, sid, { scopes: ["diary"], agree: true })).rejects.toMatchObject({ code: "consent_required" });
    await giveConsent(b.userId, sid, { scopes: ["tuvi", "preferences", "values"], agree: true });
    // A agrees to tuvi + preferences, NOT values → values must be excluded.
    expect(await giveConsent(a.userId, sid, { scopes: ["tuvi", "preferences"], agree: true })).toBe("active");

    const view = await getComparison(a.userId, sid);
    const r = view.result!;
    expect(r.agreedScopes).toEqual(["preferences", "tuvi"]);
    expect(r.participants).toEqual({ a: "An", b: "Bình" });
    // Tử Vi: Canh Ngọ (1990) vs Nhâm Thân (1992); B has no birth time → Mệnh not compared.
    expect(r.tuvi!.available).toBe(true);
    const ids = r.tuvi!.observations.map((o) => o.ruleId);
    expect(ids).toContain("menh_branch.unknown");
    expect(ids.some((x) => x.startsWith("year_branch."))).toBe(true);
    expect(ids.some((x) => x.startsWith("nap_am."))).toBe(true);
    // Preferences
    const items = Object.fromEntries(r.preferences!.items.map((i) => [i.questionId, i]));
    expect(items["f.drink"]!.kind).toBe("different");
    expect(items["m.genres"]).toMatchObject({ kind: "partly_shared", shared: ["jazz"] });
    expect(items["r.love_language"]!.kind).toBe("different");
    expect(items["f.spicy"]).toBeUndefined(); // A's answer is private
    expect(items["v.success"]).toBeUndefined(); // values scope not agreed by A
    expect(r.preferences!.onlyA).toEqual(["t.style"]);
    expect(r.preferences!.onlyB).toEqual(["f.spicy"]);
    expect(r.hints.map((h) => h.ruleId)).toContain("hint.diff.r.love_language");
    // No score anywhere
    expect(JSON.stringify(r)).not.toMatch(/"score"/);
    // Nothing private leaked
    const blob = JSON.stringify(view);
    for (const secret of ["DIARY-SECRET-A", "PERSON-SECRET-B", "PREF-SECRET-B", "1990-06-07", "06:30", "1992-03-15"]) {
      expect(blob).not.toContain(secret);
    }
    // B sees the same stored result.
    expect((await getComparison(b.userId, sid)).result).toEqual(r);
  });

  it("only participants can read; a third user and forged ids get not_found", async () => {
    const { a, b } = await setupPair();
    const c = await makeUser("Chi");
    const s = await createShare(a.userId);
    const sid = await openComparison(b.userId, s.token);
    await giveConsent(b.userId, sid, { scopes: ["preferences"], agree: true });
    await giveConsent(a.userId, sid, { scopes: ["preferences"], agree: true });
    await expect(getComparison(c.userId, sid)).rejects.toMatchObject({ code: "not_found" });
    await expect(giveConsent(c.userId, sid, { scopes: ["preferences"], agree: true })).rejects.toMatchObject({ code: "not_found" });
    await expect(revokeComparison(c.userId, sid)).rejects.toMatchObject({ code: "not_found" });
    expect(await listComparisons(c.userId)).toEqual([]);
  });

  it("revoking ends access immediately and deletes the result; share revocation cascades", async () => {
    const { a, b } = await setupPair();
    const s = await createShare(a.userId);
    const sid = await openComparison(b.userId, s.token);
    await giveConsent(b.userId, sid, { scopes: ["preferences"], agree: true });
    await giveConsent(a.userId, sid, { scopes: ["preferences"], agree: true });
    expect((await getComparison(a.userId, sid)).result).not.toBeNull();
    await revokeComparison(b.userId, sid);
    const after = await getComparison(a.userId, sid);
    expect(after).toMatchObject({ status: "revoked", result: null, myConsent: null });
    expect(await owner("select 1 from comparison_results where session_id=$1", [sid])).toEqual([]);
    await expect(giveConsent(a.userId, sid, { scopes: ["preferences"], agree: true })).rejects.toMatchObject({ code: "revoked" });

    // A new session via a new link; then A revokes the LINK → session revoked too.
    const s2 = await createShare(a.userId);
    const sid2 = await openComparison(b.userId, s2.token);
    await giveConsent(b.userId, sid2, { scopes: ["preferences"], agree: true });
    await giveConsent(a.userId, sid2, { scopes: ["preferences"], agree: true });
    await revokeShare(a.userId, s2.id);
    expect((await getComparison(b.userId, sid2))).toMatchObject({ status: "revoked", result: null });
  });

  it("changing consent scope invalidates the stored result", async () => {
    const { a, b } = await setupPair();
    const s = await createShare(a.userId);
    const sid = await openComparison(b.userId, s.token);
    await giveConsent(b.userId, sid, { scopes: ["preferences", "values"], agree: true });
    await giveConsent(a.userId, sid, { scopes: ["preferences", "values"], agree: true });
    expect((await getComparison(a.userId, sid)).result!.preferences!.items.map((i) => i.questionId)).toContain("v.success");
    await giveConsent(a.userId, sid, { scopes: ["preferences"], agree: true });
    expect((await getComparison(b.userId, sid)).result!.preferences!.items.map((i) => i.questionId)).not.toContain("v.success");
  });

  it("a participant's later privacy change is respected on recompute", async () => {
    const { a, b } = await setupPair();
    const s = await createShare(a.userId);
    const sid = await openComparison(b.userId, s.token);
    await giveConsent(b.userId, sid, { scopes: ["preferences"], agree: true });
    await giveConsent(a.userId, sid, { scopes: ["preferences"], agree: true });
    // A re-answers f.drink privately → the latest answer is private → excluded.
    await answerQuestion(a.userId, { questionId: "f.drink", questionVersion: 1, answer: { choice: "tea" }, privacy: "private" });
    const v = await getComparison(a.userId, sid, { recompute: true });
    expect(v.result!.preferences!.items.map((i) => i.questionId)).not.toContain("f.drink");
  });
});
