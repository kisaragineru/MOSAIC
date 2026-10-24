/**
 * Development only (DEV_TOOLS=on): a test companion to connect with while there is nobody else.
 * It is a real account that cannot sign in (its password is random and never kept), connected
 * to the owner (both consents given), with a few answers, favourites and records shared in each
 * way, so connections, shared manuals and shared records can be tried from one account. The
 * owner can make it write another record, or remove it (which deletes the account entirely).
 */
import { randomUUID } from "node:crypto";
import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { randomToken } from "../auth/crypto";
import { hashPassword } from "../auth/password";
import { devCompanions, notificationPreferences, people, profiles, users } from "../db/schema";
import { withUser } from "../db/tx";
import { AppError, forbidden, notFound } from "../errors";
import { audit } from "./audit";
import { answerQuestion } from "./discovery";
import { setManualShare } from "./manual-share";
import { createMemory } from "./memories";
import { setMemoryAudience } from "./memory-share";
import { addPreference, updatePerson } from "./people";
import { ANSWERS, BIO, BIRTH, FAVOURITES, INTRO, LEAN, MORE, MOTHER_COMMENT, MOTHER_GUESS, MOTHER_SEES_OTHERWISE, RECORDS } from "./dev-persona";
import { answerPeer, askPeer, myPeerRequests } from "./peers";
import { listTendencies } from "./tendencies";
import { AXES } from "@/content/axes";
import type { TendencyKey } from "@/content/questions";
import { saveIntro } from "./intro";
import { listMemories } from "./memories";
import { saveBirthProfile } from "./tuvi";
import { QUESTION_BANK } from "@/content/questions";
import { addPersonFromConnection, createShare, getComparison, giveConsent, linkPersonToConnection, listComparisons, openComparison } from "./sharing";

export const devToolsEnabled = () => process.env.DEV_TOOLS === "on";
const MAX = 3;
const NAMES = ["ミナ（テスト）", "ソウ（テスト）", "リコ（テスト）"];
const RELATIONSHIPS = ["partner", "family", "friend", "colleague", "other"] as const;

function guard() {
  if (!devToolsEnabled()) throw forbidden();
}

const day = (back: number) => new Date(Date.now() - back * 86400_000).toISOString().slice(0, 10);

export async function listCompanions(ownerId: string) {
  if (!devToolsEnabled()) return [];
  const rows = await withUser(ownerId, (tx) => tx.select().from(devCompanions).where(eq(devCompanions.ownerId, ownerId)).orderBy(asc(devCompanions.createdAt)));
  return rows.map((r, i) => ({ id: r.companionId, name: NAMES[i] ?? `テスト相手 ${i + 1}`, createdAt: r.createdAt }));
}

/** Create a companion connected to the owner; `relationship` is how the owner files it in People. */
export async function createCompanion(ownerId: string, relationship: unknown): Promise<string> {
  guard();
  const rel = z.enum(RELATIONSHIPS).catch("friend").parse(relationship);
  const existing = await listCompanions(ownerId);
  if (existing.length >= MAX) throw new AppError("too_many_companions", 400);
  const id = randomUUID();
  const name = NAMES[existing.length] ?? "テスト相手";
  // A password nobody knows: the account exists only to be connected with.
  const passwordHash = await hashPassword(randomToken());
  await withUser(id, async (tx) => {
    await tx.insert(users).values({ id, email: `companion-${id}@companion.invalid`, passwordHash });
    await tx.insert(profiles).values({ userId: id, displayName: name, locale: "ja", timeZone: "Asia/Tokyo", bio: "開発用のテスト相手です。本物の人ではありません。" });
    await tx.insert(notificationPreferences).values({ userId: id });
    await audit(tx, id, "account.dev_companion");
  });

  // Connected, both consents given; each files the other in People.
  const share = await createShare(id);
  const sid = await openComparison(ownerId, share.token);
  await giveConsent(id, sid, { scopes: ["preferences", "values"], agree: true });
  await giveConsent(ownerId, sid, { scopes: ["preferences", "values"], agree: true });
  await addPersonFromConnection(id, sid, "family");
  await addPersonFromConnection(ownerId, sid, rel);
  await setManualShare(id, sid, "friend").catch(() => undefined);

  await withUser(ownerId, async (tx) => {
    await tx.insert(devCompanions).values({ ownerId, companionId: id });
    await audit(tx, ownerId, "dev.companion_created");
  });
  await fill(id);
  return id;
}

async function own(ownerId: string, companionId: string) {
  guard();
  const cid = z.string().uuid().parse(companionId);
  const [row] = await withUser(ownerId, (tx) => tx.select().from(devCompanions).where(and(eq(devCompanions.ownerId, ownerId), eq(devCompanions.companionId, cid))));
  if (!row) throw notFound();
  return cid;
}

/**
 * Fill the companion with the made-up persona (dev-persona.ts): bio and intro, a Tử Vi chart,
 * an answer to every question (axes leaning her way), favourites and a few months of records
 * shared in each way. Safe to run again: answers are re-saved, records already there are kept.
 */
/** Questions the persona answers that the companion hasn't answered yet. */
async function unanswered(cid: string) {
  const latest = new Map(
    (
      await withUser(cid, (tx) =>
        tx.execute<{ q: string; answer: unknown }>(sql`
          select distinct on (question_id) question_id as q, answer from question_responses
          where user_id = ${cid} and status = 'answered' order by question_id, answered_at desc, id desc`),
      )
    ).rows.map((r) => [r.q, r.answer]),
  );
  const norm = (a: unknown) => JSON.stringify(a, (_k, v) => (Array.isArray(v) ? [...v].sort() : v));
  // Not yet answered, or answered differently (e.g. by an older version of the persona).
  return QUESTION_BANK.filter((q) => !q.followUpOnly && q.active !== false).flatMap((q) => {
    const answer = ANSWERS[q.id] ?? leaning(q);
    return answer && (!latest.has(q.id) || norm(latest.get(q.id)) !== norm(answer)) ? [{ q, answer }] : [];
  });
}

/**
 * A serverless request has only seconds, and every answer recomputes tendencies: answer for at
 * most this long, then stop; the next "fill" carries on where this one left off.
 */
const BUDGET_MS = 6000;

async function fill(cid: string): Promise<number> {
  const started = Date.now();
  await withUser(cid, (tx) => tx.update(profiles).set({ bio: BIO, updatedAt: new Date() }).where(eq(profiles.userId, cid)));
  await saveIntro(cid, INTRO);
  await saveBirthProfile(cid, BIRTH).catch(() => undefined);

  for (const f of FAVOURITES) {
    await addPreference(cid, { personId: null, ...f, source: "self_stated" }).catch(() => undefined);
  }

  // She files the owner as family, so family-only records reach them.
  const [conn] = (await listComparisons(cid)).filter((c) => c.status === "active");
  if (conn) {
    const pid = await addPersonFromConnection(cid, conn.id, "family");
    const [p] = await withUser(cid, (tx) => tx.select({ nickname: people.nickname }).from(people).where(eq(people.id, pid)));
    await updatePerson(cid, pid, { nickname: p?.nickname ?? conn.otherName, relationship: "family" });
    await setManualShare(cid, conn.id, "friend").catch(() => undefined);
  }

  const have = new Set((await listMemories(cid, { limit: 200 })).map((m) => m.body));
  for (const r of [...RECORDS].reverse()) {
    if (have.has(r.body)) continue;
    const entry = await createMemory(cid, { kind: r.kind, title: r.title, body: r.body, occurredOn: day(r.back) });
    if (r.audience.visibility !== "private") await setMemoryAudience(cid, entry, r.audience);
  }

  const todo = await unanswered(cid);
  let left = todo.length;
  for (const { q, answer } of todo) {
    if (Date.now() - started > BUDGET_MS) break;
    await answerQuestion(cid, { questionId: q.id, questionVersion: q.version, answer, privacy: q.comparable ? "comparable" : "private", changeKind: "correction" }).catch(() => undefined);
    left--;
  }
  // Comparison results are stored when computed: refresh them with what she answered.
  if (conn) await getComparison(cid, conn.id, { recompute: true }).catch(() => undefined);
  return left;
}

/** How many answers are still to fill in, per companion (0 when its profile is complete). */
export async function companionPending(companionId: string) {
  return (await unanswered(companionId)).length;
}

/** For a question that feeds an axis: the option (or scale end) on her side of it. */
function leaning(q: (typeof QUESTION_BANK)[number]) {
  for (const sig of q.signals ?? []) {
    const want = LEAN[sig.claimKey];
    if (sig.whenValue !== undefined && sig.direction === want) {
      return q.format === "multi" ? { choices: [sig.whenValue] } : { choice: sig.whenValue };
    }
    if (q.format === "scale" && sig.whenScaleAtLeast !== undefined) return { scale: sig.direction === want ? 4 : 2 };
  }
  return null;
}

/** Fill (or refill) an existing companion with the persona. */
export async function enrichCompanion(ownerId: string, companionId: string): Promise<number> {
  return fill(await own(ownerId, companionId));
}

/** Whether the companion is still connected with its owner (they may have ended it to try that). */
export async function companionConnected(companionId: string) {
  return (await listComparisons(companionId)).some((c) => c.status === "active");
}

/**
 * Connect again after the owner ended the connection: a new connection with both consents,
 * the owner's existing person entry moved onto it, her shares restored.
 */
export async function reconnectCompanion(ownerId: string, companionId: string) {
  const cid = await own(ownerId, companionId);
  if (await companionConnected(cid)) return;
  const ended = (await listComparisons(cid)).filter((c) => c.status === "revoked").map((c) => c.id);
  const ownerPerson = (await listComparisons(ownerId)).find((c) => ended.includes(c.id) && c.personId)?.personId ?? null;
  const share = await createShare(cid);
  const sid = await openComparison(ownerId, share.token);
  await giveConsent(cid, sid, { scopes: ["preferences", "values"], agree: true });
  await giveConsent(ownerId, sid, { scopes: ["preferences", "values"], agree: true });
  if (ownerPerson) await linkPersonToConnection(ownerId, ownerPerson, sid);
  else await addPersonFromConnection(ownerId, sid, "family");
  await fill(cid);
}

/** Requests from the owner ("how do you see me?") she hasn't answered yet. */
export async function companionAsks(companionId: string) {
  return (await myPeerRequests(companionId)).filter((r) => r.role === "responder" && r.status === "pending");
}

/**
 * She answers the owner's "how do you see me?" as a mother would: mostly what the owner's own
 * answers say, a couple of things the other way round (so there is something to discover), and
 * a few words of her own. Named, not anonymous.
 */
export async function companionAnswersAsks(ownerId: string, companionId: string) {
  const cid = await own(ownerId, companionId);
  const own_ = new Map((await listTendencies(ownerId)).filter((c) => c.userStatus !== "rejected" && c.direction).map((c) => [c.claimKey, c.direction as 1 | -1]));
  const answers: Partial<Record<TendencyKey, 1 | 0 | -1>> = {};
  AXES.forEach((k, i) => {
    const mine = own_.get(k);
    // Two axes seen differently from the inside: a blind spot to talk about.
    if (mine) answers[k] = MOTHER_SEES_OTHERWISE.includes(k) ? (-mine as 1 | -1) : mine;
    else answers[k] = i % 3 === 0 ? 0 : MOTHER_GUESS[k] ?? 0;
  });
  for (const r of await companionAsks(cid)) {
    await answerPeer(cid, r.id, { anonymous: false, answers, comment: MOTHER_COMMENT });
  }
}

/** She asks the owner "how do you see me?" (shows up on the owner's Home and in "how others see you"). */
export async function companionAsksOwner(ownerId: string, companionId: string) {
  const cid = await own(ownerId, companionId);
  const conn = (await listComparisons(cid)).find((c) => c.status === "active");
  if (!conn) throw new AppError("connection_ended", 409);
  await askPeer(cid, conn.id);
}

/** The companion writes one more record, shared with everyone it's connected with. */
export async function companionWrites(ownerId: string, companionId: string) {
  const cid = await own(ownerId, companionId);
  const body = MORE[Math.floor(Math.random() * MORE.length)]!;
  const entry = await createMemory(cid, { kind: "thought", body });
  await setMemoryAudience(cid, entry, { visibility: "connections" });
}

/** Remove the companion: its account and everything in it (connections end with it). */
export async function deleteCompanion(ownerId: string, companionId: string) {
  const cid = await own(ownerId, companionId);
  await withUser(cid, (tx) => tx.delete(users).where(eq(users.id, cid)));
  await withUser(ownerId, (tx) => audit(tx, ownerId, "dev.companion_deleted"));
}
