/**
 * Showing your manual to someone you are connected with. The owner picks a preset per connection
 * (friend / partner); the other participant reads it through manual_shared_with_me() (migration
 * 0010), which only ever returns the preset's tendencies (never notes or evidence), the owner's
 * name and bio, and "likes" answers the owner marked as shown.
 *
 * The shared text is written about the owner in the third person, so it reads right for the
 * viewer: "Usually, Hana plans ahead." plus Hana's own words ("When I seem tired…").
 */
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { AXES, AXIS_CHAPTER, AXIS_LABEL, chapterOf, PEER_POLES } from "@/content/axes";
import { MANUAL } from "@/content/manual-axes";
import { PRESET_CHAPTERS, SECTION_TEXT, SHARED_TEXT as S, type ManualPreset } from "@/content/manual-text";
import { LOCALIZED_BANK } from "@/content/questions-i18n";
import { QUESTION_BANK, type I18nText, type TendencyKey } from "@/content/questions";
import type { Answer } from "@/lib/discovery/answers";
import { answerLabel } from "@/lib/discovery/format";
import type { Locale } from "@/lib/i18n/locales";
import { uuid } from "@/lib/validation/common";
import { manualShares, profiles, questionDefinitions, questionResponses, tendencyClaims } from "../db/schema";
import { withUser } from "../db/tx";
import { mapDbError } from "../errors";
import { audit } from "./audit";
import { claimState, type ClaimState } from "./tendencies";

/** What the database hands over (the same shape for the owner's own preview). */
export interface SharedManualData {
  preset: ManualPreset;
  name: string;
  bio: string | null;
  claims: { key: string; direction: 1 | -1; evidence: number; support: number; confidence: number }[];
  likes: { question_id: string; answer: Answer }[];
}

export interface SharedTrait {
  key: TendencyKey;
  name: string;
  pole: string;
  level: Exclude<ClaimState, "insufficient">;
  statement: string;
  /** The owner's own request to others (only when the tendency says something). */
  ask: string | null;
}

export interface SharedManual {
  preset: ManualPreset;
  name: string;
  heading: string;
  lead: string;
  bio: string | null;
  summaryTitle: string;
  summary: string[];
  chapters: { chapter: string; traits: SharedTrait[] }[];
  likes: { k: string; v: string }[];
  askLabel: string;
  likesTitle: string;
  empty: string | null;
  outro: string;
}

const KEYS = new Set<string>(AXES);
const QMETA = new Map(LOCALIZED_BANK.map((q) => [q.id, q]));
const LIKES = new Set(QUESTION_BANK.filter((q) => chapterOf(q) === "likes").map((q) => q.id));

export function composeSharedManual(d: SharedManualData, locale: Locale): SharedManual {
  const L = (t: I18nText) => t[locale];
  const chapters = PRESET_CHAPTERS[d.preset];
  // Defence in depth: the database already limits the axes to the preset.
  const claims = d.claims
    .filter((c) => KEYS.has(c.key) && chapters.includes(AXIS_CHAPTER[c.key as TendencyKey]))
    .map((c) => ({ ...c, key: c.key as TendencyKey, state: claimState(c.evidence, c.support, c.confidence) }))
    .filter((c): c is typeof c & { state: SharedTrait["level"] } => c.state !== "insufficient");
  const pole = (k: TendencyKey, dir: 1 | -1) => (dir === 1 ? PEER_POLES[k].pos : PEER_POLES[k].neg);
  const trait = (c: (typeof claims)[number]): SharedTrait => {
    const label = AXIS_LABEL[c.key];
    if (c.state === "mixed")
      return { key: c.key, name: L(label.name), pole: `${L(label.pos)} / ${L(label.neg)}`, level: "mixed", statement: L(S.mixed(d.name, PEER_POLES[c.key].pos, PEER_POLES[c.key].neg)), ask: null };
    const p = pole(c.key, c.direction);
    const m = MANUAL[c.key];
    return {
      key: c.key,
      name: L(label.name),
      pole: L(c.direction === 1 ? label.pos : label.neg),
      level: c.state,
      statement: L(c.state === "consistent" ? S.consistent(d.name, p) : S.emerging(d.name, p)),
      ask: m ? L((c.direction === 1 ? m.pos : m.neg).ask) : null,
    };
  };
  const clear = claims
    .filter((c) => c.state === "consistent" || c.state === "emerging")
    .sort((a, b) => (a.state === b.state ? b.confidence - a.confidence || a.key.localeCompare(b.key) : a.state === "consistent" ? -1 : 1))
    .slice(0, 3);
  const likes = d.likes
    .filter((l) => LIKES.has(l.question_id))
    .map((l) => {
      const q = QMETA.get(l.question_id);
      return { k: q ? q.prompt[locale] : l.question_id, v: answerLabel(q?.options ?? null, l.answer, locale) };
    });
  const out = chapters
    .map((ch) => ({ chapter: ch, traits: AXES.filter((k) => AXIS_CHAPTER[k] === ch).flatMap((k) => claims.filter((c) => c.key === k).map(trait)) }))
    .filter((c) => c.traits.length > 0);
  return {
    preset: d.preset,
    name: d.name,
    heading: L(S.heading(d.name, d.preset)),
    lead: L(S.lead(d.name)),
    bio: d.bio,
    summaryTitle: L(SECTION_TEXT.summary.title),
    summary: clear.map((c) => L(S.consistent(d.name, pole(c.key, c.direction)))),
    chapters: out,
    likes,
    askLabel: L(S.askLabel(d.name)),
    likesTitle: L(S.likesTitle),
    empty: out.length === 0 && likes.length === 0 ? L(S.nothing(d.name)) : null,
    outro: L(S.outro(d.name)),
  };
}

// ---------------------------------------------------------------------------

const presetSchema = z.enum(["friend", "partner"]).nullable();

/** Show (friend / partner) or stop showing (null) my manual in a connection. */
export async function setManualShare(userId: string, sessionId: string, preset: unknown) {
  const id = uuid.parse(sessionId);
  const p = presetSchema.parse(preset === "" || preset === "none" ? null : preset);
  await withUser(userId, async (tx) => {
    try {
      await tx.execute(sql`select manual_share_set(${id}, ${p})`);
    } catch (e) {
      mapDbError(e);
    }
    await audit(tx, userId, p ? "manual.shared" : "manual.unshared", "comparison_session", id);
  });
}

export async function myManualShare(userId: string, sessionId: string): Promise<ManualPreset | null> {
  const id = uuid.parse(sessionId);
  return withUser(userId, async (tx) => {
    const [r] = await tx.select({ preset: manualShares.preset }).from(manualShares).where(and(eq(manualShares.sessionId, id), eq(manualShares.ownerId, userId)));
    return (r?.preset as ManualPreset | undefined) ?? null;
  });
}

/** What the other participant of a connection shows me, or null. */
export async function sharedManualFor(userId: string, sessionId: string, locale: Locale): Promise<SharedManual | null> {
  const id = uuid.parse(sessionId);
  const data = await withUser(userId, async (tx) => {
    try {
      const r = await tx.execute<{ m: SharedManualData | null }>(sql`select manual_shared_with_me(${id}) as m`);
      return r.rows[0]?.m ?? null;
    } catch (e) {
      mapDbError(e);
    }
  });
  return data ? composeSharedManual(data, locale) : null;
}

/**
 * My own manual as a connection would see it with this preset: the same selection
 * manual_shared_with_me() makes, read from my own rows.
 */
export async function sharedManualPreview(userId: string, preset: ManualPreset, locale: Locale): Promise<SharedManual> {
  const data = await withUser(userId, async (tx): Promise<SharedManualData> => {
    const [p] = await tx.select({ name: profiles.displayName, bio: profiles.bio }).from(profiles).where(eq(profiles.userId, userId));
    const claims = await tx
      .select({ key: tendencyClaims.claimKey, direction: tendencyClaims.direction, evidence: tendencyClaims.evidenceCount, support: tendencyClaims.supportCount, confidence: tendencyClaims.confidence, status: tendencyClaims.userStatus, valid: tendencyClaims.isValid })
      .from(tendencyClaims)
      .where(eq(tendencyClaims.userId, userId));
    const likes = await tx.execute<{ question_id: string; answer: Answer }>(sql`
      select l.question_id, l.answer from (
        select distinct on (r.question_id) r.question_id, r.answer, r.status, r.privacy
        from ${questionResponses} r where r.user_id = ${userId}
        order by r.question_id, r.answered_at desc, r.id desc) l
      join ${questionDefinitions} q on q.id = l.question_id
      where l.status = 'answered' and l.privacy = 'comparable' and q.category in ('food','travel','music','hobbies')
      order by l.question_id`);
    return {
      preset,
      name: p?.name ?? "",
      bio: p?.bio?.trim() || null,
      claims: claims.filter((c) => c.valid && c.status !== "rejected").map((c) => ({ key: c.key, direction: c.direction as 1 | -1, evidence: c.evidence, support: c.support, confidence: c.confidence })),
      likes: likes.rows,
    };
  });
  return composeSharedManual(data, locale);
}
