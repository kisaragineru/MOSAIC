/**
 * Share links, consent and comparison.
 *
 * Flow: A creates a share link (random 256-bit token, only its SHA-256 is stored) →
 * B opens it while signed in → B explicitly starts a comparison (session 'pending', no data
 * access) → each participant consents to specific scopes → when both consented the session
 * becomes 'active' → the server computes the result from ONLY the agreed scopes, reading
 * through SECURITY DEFINER functions that re-check participation, consent and per-answer
 * privacy → result stored, readable by the two participants only → either can revoke,
 * which deletes the result and blocks further access.
 */
import { and, desc, eq, or, sql } from "drizzle-orm";
import { z } from "zod";
import type { I18nText } from "@/content/questions";
import { LOCALIZED_BANK } from "@/content/questions-i18n";
import type { Answer } from "@/lib/discovery/answers";
import {
  compareTuvi,
  comparePreferences,
  COMPARE_ENGINE_VERSION,
  conversationHints,
  type Observation,
  type PreferenceComparison,
  type QuestionMeta,
} from "@/lib/compare/compare";
import type { Element } from "@/lib/tuvi/canchi";
import type { Chart } from "@/lib/tuvi/engine";
import { toSharedChart, type SharedChart } from "@/lib/tuvi/shared-chart";
import { uuid } from "@/lib/validation/common";
import { randomToken, sha256 } from "../auth/crypto";
import { enforceRateLimit } from "../auth/rate-limit";
import { comparisonConsents, comparisonResults, comparisonSessions, COMPARISON_SCOPES, people, profileShares } from "../db/schema";
import { withUser, type Tx } from "../db/tx";
import { AppError, invalid, mapDbError, notFound } from "../errors";
import { audit } from "./audit";

// Bumped when the consent text changes: -bio added the bio (connection_bio ignores older consents),
// -detail added the full-chart scope.
export const CONSENT_TEXT_VERSION = "consent-2026-10-detail";
export type Scope = (typeof COMPARISON_SCOPES)[number];

/** What each scope shares with the other participant (shown before consenting). */
export const SCOPE_DESCRIPTIONS: Record<Scope, I18nText> = {
  tuvi: {
    en: "Tử Vi: your birth-year stem & branch, Nạp Âm element and Mệnh palace branch. Never your birth date, time or full chart.",
    vi: "Tử Vi: can chi năm sinh, ngũ hành nạp âm và chi của cung Mệnh. Không bao giờ chia sẻ ngày giờ sinh hay toàn bộ lá số.",
    ja: "Tử Vi：生まれ年の干支、納音の五行、命宮の地支。生年月日・出生時刻や命盤全体は決して共有しません。",
  },
  tuvi_detail: {
    en: "Tử Vi chart in full: the 12 palaces with their stars, Mệnh/Thân, Cục and 10-year periods, with the readings built on them, and a reading for the two of you. Your birth date and time are not shared, but a full chart can let someone narrow down your birth month, day and hour, and its direction shows the sex entered for the traditional calculation.",
    vi: "Toàn bộ lá số Tử Vi: 12 cung và các sao, Mệnh/Thân, Cục, các Đại Hạn cùng lời luận giải, và phần đọc cho hai người. Ngày giờ sinh không được chia sẻ, nhưng từ lá số đầy đủ có thể đoán gần đúng tháng, ngày và giờ sinh; chiều Đại Hạn cũng cho biết giới tính đã nhập để tính theo truyền thống.",
    ja: "Tử Viの命盤の全体：12宮とその星、命宮・身宮、局、10年ごとの大限と、それにもとづく読み、そしてお二人のための相性の読み。生年月日・出生時刻そのものは共有しませんが、命盤全体から生まれた月・日・時刻がある程度推測できる場合があります。また大限の向きから、伝統的な計算のために入力した性別が分かります。",
  },
  preferences: {
    en: "Preferences: your latest answers to food, travel, music, hobby and lifestyle questions that you marked “allowed in comparisons”.",
    vi: "Sở thích: câu trả lời mới nhất về ăn uống, du lịch, âm nhạc, sở thích và lối sống mà bạn đã đánh dấu “cho phép so sánh”.",
    ja: "好み：食べもの・旅行・音楽・趣味・暮らしに関する質問への最新の回答のうち、あなたが「比較に使用可」にしたもの。",
  },
  values: {
    en: "Values: your latest answers to values questions that you marked “allowed in comparisons”.",
    vi: "Giá trị sống: câu trả lời mới nhất về giá trị sống mà bạn đã đánh dấu “cho phép so sánh”.",
    ja: "価値観：価値観に関する質問への最新の回答のうち、あなたが「比較に使用可」にしたもの。",
  },
};

export const PURPOSE_TEXT: I18nText = {
  en: "Purpose: to show the two of you traditional Tử Vi associations, what you have in common and where you differ, and conversation ideas. No overall score is calculated. Diaries, notes about people and free-text answers are never used.",
  vi: "Mục đích: cho hai bạn thấy các liên hệ Tử Vi truyền thống, điểm chung, điểm khác và gợi ý trò chuyện. Không tính điểm tổng. Nhật ký, ghi chú về người khác và câu trả lời tự do không bao giờ được sử dụng.",
    ja: "目的：お二人に、Tử Viの伝統的な関係、共通点、違い、会話のヒントを示すことです。総合スコアは計算しません。日記、他の人についてのメモ、自由記述の回答は一切使いません。",
};

function appOrigin() {
  return (process.env.APP_ORIGIN ?? "http://localhost:3000").replace(/\/$/, "");
}

/** Share URLs carry the token in the fragment, which browsers never send to servers or in Referer. */
export function shareUrl(token: string) {
  return `${appOrigin()}/s#${token}`;
}

const createShareSchema = z.object({
  label: z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().max(80).optional()),
  expiresInDays: z.coerce.number().int().min(1).max(30).default(7),
  maxUses: z.preprocess((v) => (v === "" || v === null ? undefined : v), z.coerce.number().int().min(1).max(100).optional()),
});

export async function createShare(userId: string, input: unknown = {}) {
  const d = createShareSchema.parse(input);
  const token = randomToken(32);
  return withUser(userId, async (tx) => {
    const [row] = await tx
      .insert(profileShares)
      .values({
        userId,
        tokenHash: sha256(token),
        label: d.label ?? null,
        expiresAt: new Date(Date.now() + d.expiresInDays * 86400_000),
        maxUses: d.maxUses ?? null,
      })
      .returning();
    await audit(tx, userId, "share.created", "profile_share", row!.id);
    // The raw token is returned exactly once and is not recoverable afterwards.
    return { id: row!.id, token, url: shareUrl(token), expiresAt: row!.expiresAt };
  });
}

export async function listShares(userId: string) {
  return withUser(userId, (tx) =>
    tx
      .select({
        id: profileShares.id,
        label: profileShares.label,
        expiresAt: profileShares.expiresAt,
        maxUses: profileShares.maxUses,
        useCount: profileShares.useCount,
        revokedAt: profileShares.revokedAt,
        createdAt: profileShares.createdAt,
        status: sql<"active" | "revoked" | "expired" | "used_up">`case
          when ${profileShares.revokedAt} is not null then 'revoked'
          when ${profileShares.expiresAt} <= now() then 'expired'
          when ${profileShares.maxUses} is not null and ${profileShares.useCount} >= ${profileShares.maxUses} then 'used_up'
          else 'active' end`,
      })
      .from(profileShares)
      .where(eq(profileShares.userId, userId))
      .orderBy(desc(profileShares.createdAt)),
  );
}

export async function revokeShare(userId: string, shareId: string) {
  const id = uuid.parse(shareId);
  await withUser(userId, async (tx) => {
    try {
      await tx.execute(sql`select share_revoke(${id})`);
    } catch (e) {
      mapDbError(e);
    }
    await audit(tx, userId, "share.revoked", "profile_share", id);
  });
}

const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{20,100}$/);

export async function lookupShare(userId: string, token: unknown) {
  const t = tokenSchema.safeParse(token);
  if (!t.success) throw new AppError("share_unavailable", 404);
  await enforceRateLimit("shareOpen", userId);
  return withUser(userId, async (tx) => {
    const r = await tx.execute<{ share_id: string; owner_display_name: string; usable: boolean; is_own: boolean }>(
      sql`select * from share_lookup(${sha256(t.data)})`,
    );
    const row = r.rows[0];
    if (!row || !row.usable) throw new AppError("share_unavailable", 404);
    return { ownerDisplayName: row.owner_display_name, isOwn: row.is_own };
  });
}

/** Starts (or reuses) a pending comparison. Grants NO data access by itself. */
export async function openComparison(userId: string, token: unknown): Promise<string> {
  const t = tokenSchema.safeParse(token);
  if (!t.success) throw new AppError("share_unavailable", 404);
  await enforceRateLimit("shareOpen", userId);
  return withUser(userId, async (tx) => {
    try {
      const r = await tx.execute<{ id: string }>(sql`select comparison_open(${sha256(t.data)}) as id`);
      await audit(tx, userId, "comparison.opened", "comparison_session", r.rows[0]!.id);
      return r.rows[0]!.id;
    } catch (e) {
      mapDbError(e);
    }
  });
}

const consentSchema = z.object({
  scopes: z.array(z.enum(COMPARISON_SCOPES)).min(1).max(COMPARISON_SCOPES.length),
  agree: z.literal(true),
});

export async function giveConsent(userId: string, sessionId: string, input: unknown) {
  const id = uuid.parse(sessionId);
  const parsed = consentSchema.safeParse(input);
  if (!parsed.success) throw invalid("consent_required");
  return withUser(userId, async (tx) => {
    let status: string;
    try {
      const r = await tx.execute<{ s: string }>(
        sql`select comparison_give_consent(${id}, ${`{${[...new Set(parsed.data.scopes)].join(",")}}`}::text[], ${CONSENT_TEXT_VERSION}) as s`,
      );
      status = r.rows[0]!.s;
    } catch (e) {
      mapDbError(e);
    }
    await audit(tx, userId, "comparison.consented", "comparison_session", id);
    if (status === "active") await computeInTx(tx, id);
    return status;
  });
}

export async function revokeComparison(userId: string, sessionId: string) {
  const id = uuid.parse(sessionId);
  await withUser(userId, async (tx) => {
    try {
      await tx.execute(sql`select comparison_revoke(${id})`);
    } catch (e) {
      mapDbError(e);
    }
    await audit(tx, userId, "comparison.revoked", "comparison_session", id);
  });
}

export interface ComparisonResult {
  engineVersion: string;
  agreedScopes: Scope[];
  participants: { a: string; b: string };
  tuvi: { available: boolean; observations: Observation[]; missing: ("a" | "b")[] } | null;
  /** Both full charts without birth date/time (scope tuvi_detail); readings are built when shown. */
  tuviDetail: { a: SharedChart | null; b: SharedChart | null } | null;
  preferences: (PreferenceComparison & { questions: Record<string, QuestionMeta> }) | null;
  hints: Observation[];
  disclaimer: I18nText;
}

const QUESTION_META = new Map<string, QuestionMeta>(
  LOCALIZED_BANK.map((q) => [q.id, { id: q.id, category: q.category, prompt: q.prompt, format: q.format, options: q.options ?? null }]),
);

async function computeInTx(tx: Tx, sessionId: string): Promise<ComparisonResult | null> {
  const scopesRow = await tx.execute<{ s: string[] }>(sql`select comparison_agreed_scopes(${sessionId}) as s`);
  const agreed = (scopesRow.rows[0]?.s ?? []) as Scope[];
  const [session] = await tx.select().from(comparisonSessions).where(eq(comparisonSessions.id, sessionId));
  if (!session || session.status !== "active") return null;
  const parts = await tx.execute<{ user_id: string; display_name: string; role: string }>(
    sql`select * from comparison_participants(${sessionId})`,
  );
  const nameOf = (role: "a" | "b") => parts.rows.find((p) => p.role === role)?.display_name ?? "?";
  const names: [string, string] = [nameOf("a"), nameOf("b")];

  let tuvi: ComparisonResult["tuvi"] = null;
  if (agreed.includes("tuvi")) {
    const rows = await tx.execute<{ user_id: string; year_stem: number; year_branch: number; nap_am_element: string; menh_branch: number | null }>(
      sql`select * from comparison_tuvi_summaries(${sessionId})`,
    );
    const a = rows.rows.find((r) => r.user_id === session.userA);
    const b = rows.rows.find((r) => r.user_id === session.userB);
    const missing = [!a ? "a" : null, !b ? "b" : null].filter(Boolean) as ("a" | "b")[];
    tuvi =
      a && b
        ? {
            available: true,
            missing,
            observations: compareTuvi(
              { yearStem: a.year_stem, yearBranch: a.year_branch, napAmElement: a.nap_am_element as Element, menhBranch: a.menh_branch },
              { yearStem: b.year_stem, yearBranch: b.year_branch, napAmElement: b.nap_am_element as Element, menhBranch: b.menh_branch },
              names,
            ),
          }
        : { available: false, missing, observations: [] };
  }

  let tuviDetail: ComparisonResult["tuviDetail"] = null;
  if (agreed.includes("tuvi_detail")) {
    const rows = await tx.execute<{ user_id: string; chart: Chart }>(sql`select * from comparison_tuvi_details(${sessionId})`);
    const of = (uid: string) => {
      const r = rows.rows.find((x) => x.user_id === uid);
      return r ? toSharedChart(r.chart) : null;
    };
    tuviDetail = { a: of(session.userA), b: of(session.userB) };
  }

  let preferences: ComparisonResult["preferences"] = null;
  let hints: Observation[] = [];
  if (agreed.includes("preferences") || agreed.includes("values")) {
    const rows = await tx.execute<{ user_id: string; question_id: string; answer: Answer }>(
      sql`select * from comparison_responses(${sessionId})`,
    );
    const pick = (uid: string) => rows.rows.filter((r) => r.user_id === uid).map((r) => ({ questionId: r.question_id, answer: r.answer }));
    const pc = comparePreferences(pick(session.userA), pick(session.userB));
    const used = new Set([...pc.items.map((i) => i.questionId), ...pc.onlyA, ...pc.onlyB]);
    preferences = { ...pc, questions: Object.fromEntries([...used].flatMap((q) => (QUESTION_META.has(q) ? [[q, QUESTION_META.get(q)!]] : []))) };
    hints = conversationHints(pc, QUESTION_META);
  }

  const result: ComparisonResult = {
    engineVersion: COMPARE_ENGINE_VERSION,
    agreedScopes: agreed,
    participants: { a: names[0], b: names[1] },
    tuvi,
    tuviDetail,
    preferences,
    hints,
    disclaimer: {
      en: "Tử Vi observations are traditional interpretations, not scientific facts or predictions. No compatibility score is calculated.",
      vi: "Nhận định Tử Vi là diễn giải truyền thống, không phải sự thật khoa học hay lời tiên đoán. Không tính điểm hợp nhau.",
    ja: "Tử Viの内容は伝統的な解釈であり、科学的な事実や予言ではありません。相性スコアは計算しません。",
    },
  };
  await tx
    .insert(comparisonResults)
    .values({ sessionId, engineVersion: COMPARE_ENGINE_VERSION, result })
    .onConflictDoUpdate({ target: comparisonResults.sessionId, set: { engineVersion: COMPARE_ENGINE_VERSION, result, computedAt: new Date() } });
  return result;
}

export interface ComparisonView {
  id: string;
  status: "pending" | "active" | "revoked";
  myRole: "a" | "b";
  otherName: string;
  /** Shown once the other person has consented in this connection (see connection_bio). */
  otherBio: string | null;
  /** Their approved MOSAIC intro, under the same rule. */
  otherIntro: string | null;
  myConsent: { scopes: string[]; consentedAt: Date } | null;
  otherConsented: boolean;
  otherScopes: string[] | null;
  result: ComparisonResult | null;
  computedAt: Date | null;
  createdAt: Date;
}

/** Comparison as seen by one participant. Others get not_found. */
export async function getComparison(userId: string, sessionId: string, opts: { recompute?: boolean } = {}): Promise<ComparisonView> {
  const id = uuid.parse(sessionId);
  return withUser(userId, async (tx) => {
    const [s] = await tx.select().from(comparisonSessions).where(eq(comparisonSessions.id, id));
    if (!s) throw notFound();
    const myRole = s.userA === userId ? "a" : "b";
    const parts = await tx.execute<{ user_id: string; display_name: string }>(sql`select * from comparison_participants(${id})`);
    const other = parts.rows.find((p) => p.user_id !== userId);
    const bio = await tx.execute<{ bio: string | null; intro: string | null }>(sql`select bio, intro from connection_bio(${id})`);
    const consents = await tx
      .select()
      .from(comparisonConsents)
      .where(and(eq(comparisonConsents.sessionId, id), sql`${comparisonConsents.withdrawnAt} is null`));
    const mine = consents.find((c) => c.userId === userId);
    const theirs = consents.find((c) => c.userId !== userId);
    let result: ComparisonResult | null = null;
    let computedAt: Date | null = null;
    if (s.status === "active") {
      const [r] = await tx.select().from(comparisonResults).where(eq(comparisonResults.sessionId, id));
      if (r && !opts.recompute) {
        result = r.result as ComparisonResult;
        computedAt = r.computedAt;
      } else {
        result = await computeInTx(tx, id);
        computedAt = new Date();
      }
    }
    return {
      id,
      status: s.status as ComparisonView["status"],
      myRole,
      otherName: other?.display_name ?? "?",
      otherBio: bio.rows[0]?.bio ?? null,
      otherIntro: bio.rows[0]?.intro ?? null,
      myConsent: mine ? { scopes: mine.scopes, consentedAt: mine.consentedAt } : null,
      otherConsented: !!theirs,
      otherScopes: theirs ? theirs.scopes : null,
      result,
      computedAt,
      createdAt: s.createdAt,
    };
  });
}

export async function listComparisons(userId: string) {
  return withUser(userId, async (tx) => {
    const sessions = await tx
      .select()
      .from(comparisonSessions)
      .where(or(eq(comparisonSessions.userA, userId), eq(comparisonSessions.userB, userId)))
      .orderBy(desc(comparisonSessions.createdAt));
    const out = [];
    for (const s of sessions) {
      const parts = await tx.execute<{ user_id: string; display_name: string }>(sql`select * from comparison_participants(${s.id})`);
      const [mine] = await tx
        .select({ id: comparisonConsents.id })
        .from(comparisonConsents)
        .where(and(eq(comparisonConsents.sessionId, s.id), eq(comparisonConsents.userId, userId), sql`${comparisonConsents.withdrawnAt} is null`));
      out.push({
        id: s.id,
        status: s.status,
        /** Pending sessions split by whose consent is missing (the other side's state is not shown in detail). */
        waitingOn: s.status !== "pending" ? null : mine ? ("them" as const) : ("you" as const),
        otherName: parts.rows.find((p) => p.user_id !== userId)?.display_name ?? "?",
        createdAt: s.createdAt,
        revokedAt: s.revokedAt,
      });
    }
    const linked = await tx
      .select({ id: people.id, sessionId: people.connectionSessionId })
      .from(people)
      .where(and(eq(people.userId, userId), sql`${people.connectionSessionId} is not null`));
    return out.map((c) => ({ ...c, personId: linked.find((p) => p.sessionId === c.id)?.id ?? null }));
  });
}

export interface SharedPreview {
  displayName: string;
  bio: string | null;
  intro: string | null;
  /** The summary a comparison reads when Tử Vi is agreed (null without a chart). */
  tuvi: { yearStem: number; yearBranch: number; napAmElement: Element; menhBranch: number | null } | null;
  /** Latest answers the user marked "allow in comparisons", by the scope that would share them. */
  answers: { questionId: string; scope: "preferences" | "values"; answer: Answer }[];
  /** Every latest answer to a comparable question, shared or not, for changing its setting. */
  choices: { responseId: string; questionId: string; scope: "preferences" | "values"; answer: Answer; shared: boolean }[];
}

/**
 * What another person could see of this user, read from the user's own rows with the same
 * rules the comparison functions apply (latest answered response, marked comparable, on a
 * comparable question). Nothing here is shared until both people consent to a scope.
 */
export async function sharedPreview(userId: string): Promise<SharedPreview> {
  return withUser(userId, async (tx) => {
    const name = await tx.execute<{ display_name: string; bio: string | null; intro: string | null }>(sql`select display_name, bio, intro from profiles where user_id = ${userId}`);
    const chart = await tx.execute<{ year_stem: number; year_branch: number; nap_am_element: string; menh_branch: number | null }>(
      sql`select year_stem, year_branch, nap_am_element, menh_branch from tuvi_charts where user_id = ${userId} and is_current limit 1`,
    );
    const rows = await tx.execute<{ id: string; question_id: string; answer: Answer; scope: "preferences" | "values"; privacy: string }>(sql`
      with latest as (
        select distinct on (r.question_id) r.*
        from question_responses r
        where r.user_id = ${userId}
        order by r.question_id, r.answered_at desc, r.id desc
      )
      select l.id, l.question_id, l.answer, l.privacy, case when q.category = 'values' then 'values' else 'preferences' end as scope
      from latest l join question_definitions q on q.id = l.question_id
      where l.status = 'answered' and q.comparable
      order by q.category, l.question_id`);
    const c = chart.rows[0];
    return {
      displayName: name.rows[0]?.display_name ?? "",
      bio: name.rows[0]?.bio?.trim() || null,
      intro: name.rows[0]?.intro?.trim() || null,
      tuvi: c ? { yearStem: c.year_stem, yearBranch: c.year_branch, napAmElement: c.nap_am_element as Element, menhBranch: c.menh_branch } : null,
      answers: rows.rows.filter((r) => r.privacy === "comparable").map((r) => ({ questionId: r.question_id, scope: r.scope, answer: r.answer })),
      choices: rows.rows.map((r) => ({ responseId: r.id, questionId: r.question_id, scope: r.scope, answer: r.answer, shared: r.privacy === "comparable" })),
    };
  });
}

// ---------------------------------------------------------------------------
// Linking a QR connection to one of the user's own "people" entries.
// The link lives only on the user's own row: the other person never sees it,
// and nothing from the user's private notes becomes part of the comparison.
// ---------------------------------------------------------------------------

/** The connection as seen by this user; not_found unless they take part in it. */
async function ownConnection(tx: Tx, userId: string, sessionId: string) {
  const id = uuid.parse(sessionId);
  const [s] = await tx
    .select()
    .from(comparisonSessions)
    .where(and(eq(comparisonSessions.id, id), or(eq(comparisonSessions.userA, userId), eq(comparisonSessions.userB, userId))));
  if (!s) throw notFound();
  const parts = await tx.execute<{ user_id: string; display_name: string }>(sql`select * from comparison_participants(${id})`);
  const bio = await tx.execute<{ bio: string }>(sql`select bio from connection_bio(${id})`);
  return { id, status: s.status, otherName: parts.rows.find((p) => p.user_id !== userId)?.display_name ?? "?", otherBio: bio.rows[0]?.bio ?? null };
}

export async function linkPersonToConnection(userId: string, personId: string, sessionId: string) {
  const pid = uuid.parse(personId);
  await withUser(userId, async (tx) => {
    const c = await ownConnection(tx, userId, sessionId);
    if (c.status === "revoked") throw new AppError("connection_ended", 409);
    const [p] = await tx.select({ id: people.id }).from(people).where(and(eq(people.id, pid), eq(people.userId, userId)));
    if (!p) throw notFound();
    // One person per connection: move the link if another entry held it.
    await tx.update(people).set({ connectionSessionId: null }).where(and(eq(people.userId, userId), eq(people.connectionSessionId, c.id)));
    await tx.update(people).set({ connectionSessionId: c.id, updatedAt: new Date() }).where(eq(people.id, pid));
    await audit(tx, userId, "person.linked", "person", pid);
  });
}

export async function unlinkPerson(userId: string, personId: string) {
  const pid = uuid.parse(personId);
  await withUser(userId, async (tx) => {
    const r = await tx.update(people).set({ connectionSessionId: null, updatedAt: new Date() }).where(and(eq(people.id, pid), eq(people.userId, userId))).returning({ id: people.id });
    if (r.length === 0) throw notFound();
    await audit(tx, userId, "person.unlinked", "person", pid);
  });
}

/** Adds the other participant to the user's people (named as they appear), or returns the entry already linked. */
export async function addPersonFromConnection(userId: string, sessionId: string, relationship = "friend"): Promise<string> {
  const rel = z.enum(["partner", "family", "friend", "colleague", "other"]).catch("friend").parse(relationship);
  return withUser(userId, async (tx) => {
    const c = await ownConnection(tx, userId, sessionId);
    const [existing] = await tx.select({ id: people.id }).from(people).where(and(eq(people.userId, userId), eq(people.connectionSessionId, c.id)));
    if (existing) return existing.id;
    if (c.status === "revoked") throw new AppError("connection_ended", 409);
    const [p] = await tx.insert(people).values({ userId, nickname: c.otherName.slice(0, 80), relationship: rel, connectionSessionId: c.id }).returning({ id: people.id });
    await audit(tx, userId, "person.linked", "person", p!.id);
    return p!.id;
  });
}

/** The connection linked to a person, for the person page (null when none or not visible). */
export async function connectionForPerson(userId: string, sessionId: string | null) {
  if (!sessionId) return null;
  return withUser(userId, (tx) => ownConnection(tx, userId, sessionId)).catch(() => null);
}
