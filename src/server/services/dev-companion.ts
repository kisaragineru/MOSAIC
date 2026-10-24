/**
 * Development only (DEV_TOOLS=on): a test companion to connect with while there is nobody else.
 * It is a real account that cannot sign in (its password is random and never kept), connected
 * to the owner (both consents given), with a few answers, favourites and records shared in each
 * way, so connections, shared manuals and shared records can be tried from one account. The
 * owner can make it write another record, or remove it (which deletes the account entirely).
 */
import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { randomToken } from "../auth/crypto";
import { hashPassword } from "../auth/password";
import { devCompanions, notificationPreferences, profiles, users } from "../db/schema";
import { withUser } from "../db/tx";
import { AppError, forbidden, notFound } from "../errors";
import { audit } from "./audit";
import { answerQuestion } from "./discovery";
import { setManualShare } from "./manual-share";
import { createMemory } from "./memories";
import { setMemoryAudience } from "./memory-share";
import { addPreference } from "./people";
import { addPersonFromConnection, createShare, giveConsent, openComparison } from "./sharing";

export const devToolsEnabled = () => process.env.DEV_TOOLS === "on";
const MAX = 3;
const NAMES = ["ミナ（テスト）", "ソウ（テスト）", "リコ（テスト）"];
const RELATIONSHIPS = ["partner", "family", "friend", "colleague", "other"] as const;

function guard() {
  if (!devToolsEnabled()) throw forbidden();
}

const day = (back: number) => new Date(Date.now() - back * 86400_000).toISOString().slice(0, 10);

const RECORDS: { kind: string; body: string; back: number; audience: { visibility: string; circles?: string[] } }[] = [
  { kind: "memory", body: "駅前に新しいカフェができてた。窓際の席が静かで、ずっと本を読んでいられそう。今度いっしょに行こう。", back: 0, audience: { visibility: "connections" } },
  { kind: "feeling", body: "今週は少し疲れ気味。でも夕方の散歩で金木犀の匂いがして、それだけでちょっと元気になった。", back: 1, audience: { visibility: "circles", circles: ["partner", "family", "friend"] } },
  { kind: "decision", body: "来年はちゃんと休みをとって、ひとり旅に行くと決めた。行き先はまだ迷い中。", back: 3, audience: { visibility: "circles", circles: ["family"] } },
  { kind: "thought", body: "（これは自分だけの記録。テスト相手から見せていないので、あなたには見えないはず）", back: 4, audience: { visibility: "private" } },
];
const MORE = [
  "新しいアルバムをずっと聴いてる。歌詞がいまの気分にぴったり。",
  "久しぶりに料理をした。思ったよりうまくできて満足。",
  "朝いちばんに窓を開けたら、空気がもう冬の匂いだった。",
  "友だちと長電話。くだらない話で笑いすぎた。",
];

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

  // A few answers and favourites, shown in comparisons and the shared manual.
  const answers: [string, unknown][] = [
    ["p.weekend_plan", { choice: "see" }],
    ["ax.plan_pack", { choice: "morning" }],
    ["l.season", { choice: "autumn" }],
    ["l.coffee_tea", { choice: "coffee" }],
    ["l.music_genres", { choices: ["jpop", "folk"] }],
    ["l.fashion_style", { choices: ["simple", "vintage"] }],
  ];
  for (const [questionId, answer] of answers) {
    await answerQuestion(id, { questionId, questionVersion: 1, answer, privacy: "comparable" }).catch(() => undefined);
  }
  for (const [categoryId, label] of [["music", "宇多田ヒカル"], ["food", "浅煎りのコーヒー"], ["brand", "無印良品"]] as const) {
    await addPreference(id, { personId: null, categoryId, label, sentiment: "love", source: "self_stated" }).catch(() => undefined);
  }

  // Connected, both consents given; each files the other in People.
  const share = await createShare(id);
  const sid = await openComparison(ownerId, share.token);
  await giveConsent(id, sid, { scopes: ["preferences", "values"], agree: true });
  await giveConsent(ownerId, sid, { scopes: ["preferences", "values"], agree: true });
  await addPersonFromConnection(id, sid, "friend");
  await addPersonFromConnection(ownerId, sid, rel);
  await setManualShare(id, sid, "friend").catch(() => undefined);

  for (const r of RECORDS) {
    const entry = await createMemory(id, { kind: r.kind, body: r.body, occurredOn: day(r.back) });
    if (r.audience.visibility !== "private") await setMemoryAudience(id, entry, r.audience);
  }
  await withUser(ownerId, async (tx) => {
    await tx.insert(devCompanions).values({ ownerId, companionId: id });
    await audit(tx, ownerId, "dev.companion_created");
  });
  return id;
}

async function own(ownerId: string, companionId: string) {
  guard();
  const cid = z.string().uuid().parse(companionId);
  const [row] = await withUser(ownerId, (tx) => tx.select().from(devCompanions).where(and(eq(devCompanions.ownerId, ownerId), eq(devCompanions.companionId, cid))));
  if (!row) throw notFound();
  return cid;
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
