/**
 * Works: the owner's story, handed to someone as a work to read. The owner reads exactly what will
 * be shown before making it a work; the work is then fixed (later records don't change it). Each
 * person it's handed to gets a link of their own, with a note and an end date (14 days unless the
 * owner chooses otherwise); it can be extended or taken back any time. Someone with the link reads
 * it without signing up. Rules for reading live in work_open() (migration 0055).
 */
import { and, desc, eq, gt, isNull, isNotNull } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { LOCALE_NAMES, type Locale } from "@/lib/i18n/locales";
import type { MainStarId } from "@/lib/tuvi/stars";
import { uuid } from "@/lib/validation/common";
import { randomToken, sha256 } from "../auth/crypto";
import { enforceRateLimit } from "../auth/rate-limit";
import { profiles, workLinks, works } from "../db/schema";
import { withAnon, withUser } from "../db/tx";
import { mapDbError, notFound } from "../errors";
import { generateStructured } from "../ai/claude";
import { audit } from "./audit";
import { buildManual, gatherManual } from "./manual";
import { getManualRewrite } from "./manual-rewrite";
import { getTuvi } from "./tuvi";
import { typeInsight } from "./tuvi-type";

export interface WorkEpisode {
  key: string;
  title: string;
  paragraphs: string[];
}

/** What a work shows, fixed when it's made. */
export interface WorkContent {
  name: string;
  /** The type(s) on the cover: from the chart, or the ones they picked. */
  types: MainStarId[];
  storyTitle: string;
  subtitle: string;
  episodes: WorkEpisode[];
  /** "How this story came to be": the summary of their manual, and answers they chose to show. */
  backstage: { summary: string[]; answers: { q: string; a: string }[] };
}

/** Answers the owner may choose to show in the backstage. */
export async function answerChoices(userId: string, locale: Locale): Promise<{ id: string; q: string; a: string }[]> {
  const d = await gatherManual(userId, locale);
  return d.answers.map((x) => ({ id: x.questionId, q: x.prompt[locale], a: x.label[locale] })).filter((x) => x.a.trim());
}

/** The work as it would be now: the story (with its AI-written scenes), the type, the backstage. */
export async function draftWork(userId: string, locale: Locale, answerIds: string[] = []): Promise<WorkContent | null> {
  const manual = await buildManual(userId, locale);
  const novel = manual.sections.find((s) => s.id === "novel");
  if (!novel) return null;
  const rewrite = await getManualRewrite(userId, locale);
  const head = novel.blocks.find((b) => b.t === "storyTitle");
  const episodes = novel.blocks.flatMap((b) =>
    b.t === "episode" ? [{ key: b.key ?? b.title, title: b.title, paragraphs: (b.key && rewrite?.sections[`novel.${b.key}`]?.length ? rewrite.sections[`novel.${b.key}`]! : b.paragraphs).filter((p) => p.trim()) }] : [],
  );
  if (!episodes.length) return null;
  const summarySection = manual.sections.find((s) => s.id === "summary");
  const summary = rewrite?.sections.summary?.length ? rewrite.sections.summary : (summarySection?.blocks ?? []).flatMap((b) => (b.t === "p" ? [b.text] : []));
  const tv = await getTuvi(userId, locale);
  const insight = await typeInsight(userId, tv.chart ?? null);
  const types = insight.types.length ? insight.types : insight.selfTypes;
  const choices = new Map((await answerChoices(userId, locale)).map((x) => [x.id, x]));
  const answers = answerIds.flatMap((id) => (choices.has(id) ? [{ q: choices.get(id)!.q, a: choices.get(id)!.a }] : [])).slice(0, 5);
  return {
    name: manual.name,
    types,
    storyTitle: head?.t === "storyTitle" ? head.title : manual.name,
    subtitle: head?.t === "storyTitle" ? head.subtitle : "",
    episodes,
    backstage: { summary: summary.slice(0, 3), answers },
  };
}

const makeSchema = z.object({ title: z.string().trim().min(1).max(80), answerIds: z.array(z.string().max(80)).max(5) });

/** Fix the story as a work (exactly what the owner read just now). */
export async function makeWork(userId: string, locale: Locale, input: unknown): Promise<string> {
  const d = makeSchema.parse(input);
  const content = await draftWork(userId, locale, d.answerIds);
  if (!content) throw notFound();
  return withUser(userId, async (tx) => {
    const [w] = await tx.insert(works).values({ ownerId: userId, title: d.title, locale, content }).returning({ id: works.id });
    await audit(tx, userId, "work.made", "work", w!.id);
    return w!.id;
  });
}

export interface MyWork {
  id: string;
  title: string;
  locale: string;
  content: WorkContent;
  createdAt: Date;
}

/** My latest work, if any. */
export async function latestWork(userId: string): Promise<MyWork | null> {
  const [w] = await withUser(userId, (tx) => tx.select().from(works).where(eq(works.ownerId, userId)).orderBy(desc(works.createdAt)).limit(1));
  return w ? { id: w.id, title: w.title, locale: w.locale, content: w.content as WorkContent, createdAt: w.createdAt } : null;
}

export const LINK_DAYS = [7, 14, 30, 90] as const;
const linkSchema = z.object({
  recipient: z.string().trim().max(60).optional().transform((x) => x || null),
  note: z.string().trim().max(300).optional().transform((x) => x || null),
  days: z.coerce.number().pipe(z.union(LINK_DAYS.map((n) => z.literal(n)) as unknown as [z.ZodLiteral<7>, z.ZodLiteral<14>, z.ZodLiteral<30>, z.ZodLiteral<90>])).default(14),
});

/** Hand a work to someone: a link of their own (its token is shown once). */
export async function handOver(userId: string, workId: string, input: unknown): Promise<{ id: string; token: string }> {
  const id = uuid.parse(workId);
  const d = linkSchema.parse(input);
  await enforceRateLimit("write", userId);
  const token = randomToken(24);
  return withUser(userId, async (tx) => {
    const [l] = await tx
      .insert(workLinks)
      .values({ workId: id, ownerId: userId, tokenHash: sha256(token), recipient: d.recipient, note: d.note, expiresAt: new Date(Date.now() + d.days * 86_400_000) })
      .returning({ id: workLinks.id });
    await audit(tx, userId, "work.handed", "work_link", l!.id);
    return { id: l!.id, token };
  });
}

export interface WorkLink {
  id: string;
  workId: string;
  recipient: string | null;
  note: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  openedAt: Date | null;
  state: "open" | "expired" | "revoked";
}

export async function myLinks(userId: string): Promise<WorkLink[]> {
  const rows = await withUser(userId, (tx) => tx.select().from(workLinks).where(eq(workLinks.ownerId, userId)).orderBy(desc(workLinks.createdAt)));
  const now = Date.now();
  return rows.map((l) => ({
    id: l.id,
    workId: l.workId,
    recipient: l.recipient,
    note: l.note,
    expiresAt: l.expiresAt,
    revokedAt: l.revokedAt,
    openedAt: l.openedAt,
    state: l.revokedAt ? "revoked" : l.expiresAt.getTime() <= now ? "expired" : "open",
  }));
}

/** Give more time (from now). */
export async function extendLink(userId: string, linkId: string, days: unknown) {
  const id = uuid.parse(linkId);
  const n = linkSchema.shape.days.parse(days);
  await withUser(userId, async (tx) => {
    const r = await tx.update(workLinks).set({ expiresAt: new Date(Date.now() + n * 86_400_000), revokedAt: null }).where(eq(workLinks.id, id)).returning({ id: workLinks.id });
    if (!r.length) throw notFound();
    await audit(tx, userId, "work.extended", "work_link", id);
  });
}

export async function revokeLink(userId: string, linkId: string) {
  const id = uuid.parse(linkId);
  await withUser(userId, async (tx) => {
    const r = await tx.update(workLinks).set({ revokedAt: new Date() }).where(eq(workLinks.id, id)).returning({ id: workLinks.id });
    if (!r.length) throw notFound();
    await audit(tx, userId, "work.revoked", "work_link", id);
  });
}

/** Links someone opened that I haven't been told about yet (Home says it once). */
export async function newOpens(userId: string): Promise<{ id: string; recipient: string | null }[]> {
  return withUser(userId, (tx) =>
    tx.select({ id: workLinks.id, recipient: workLinks.recipient }).from(workLinks).where(and(eq(workLinks.ownerId, userId), isNotNull(workLinks.openedAt), isNull(workLinks.openedSeenAt))),
  );
}

export async function markOpensSeen(userId: string) {
  await withUser(userId, (tx) => tx.update(workLinks).set({ openedSeenAt: new Date() }).where(and(eq(workLinks.ownerId, userId), isNotNull(workLinks.openedAt), isNull(workLinks.openedSeenAt))));
}

/** The story grows with the records. Home says so when it has new pages, and once it has grown
 * (three pages or more) asks now and then (a month apart, and not when a link was made lately)
 * whether there's someone to hand it to. */
export const STORY_ASK_PAGES = 3;
export const STORY_ASK_DAYS = 30;

export async function storyGrowth(userId: string, locale: Locale): Promise<{ pages: number; added: number; ask: boolean }> {
  const manual = await buildManual(userId, locale);
  const pages = manual.sections.find((s) => s.id === "novel")?.blocks.filter((b) => b.t === "episode").length ?? 0;
  const [p] = await withUser(userId, (tx) => tx.select({ seen: profiles.storyPagesSeen, asked: profiles.storyAskedAt }).from(profiles).where(eq(profiles.userId, userId)));
  const seen = p?.seen ?? 0;
  // Asked again now and then (every STORY_ASK_DAYS), unless a link was made lately.
  const since = new Date(Date.now() - STORY_ASK_DAYS * 86_400_000);
  const due = !p?.asked || p.asked < since;
  const recent = due ? (await withUser(userId, (tx) => tx.select({ id: workLinks.id }).from(workLinks).where(and(eq(workLinks.ownerId, userId), gt(workLinks.createdAt, since))).limit(1))).length > 0 : true;
  const ask = pages >= STORY_ASK_PAGES && due && !recent;
  return { pages, added: Math.max(0, pages - seen), ask };
}

/** Remember how many pages the user has been told about (the number only: never the story). */
export async function markStoryPagesSeen(userId: string, pages: number) {
  const n = z.number().int().min(0).max(1000).parse(pages);
  await withUser(userId, (tx) => tx.update(profiles).set({ storyPagesSeen: n }).where(eq(profiles.userId, userId)));
}

/** The question has been answered (either way): it waits a month before coming back. */
export async function markStoryAsked(userId: string) {
  await withUser(userId, async (tx) => {
    await tx.update(profiles).set({ storyAskedAt: new Date() }).where(eq(profiles.userId, userId));
    await audit(tx, userId, "work.story_asked");
  });
}

/** The reader opened the envelope: noted once (the writer is told), never for the writer themself. */
export async function markWorkOpened(token: string, viewerId: string | null) {
  if (!TOKEN.test(token)) return;
  await as(viewerId)((tx) => tx.execute(sql`select work_mark_opened(${sha256(token)})`));
}

export type OpenedWork =
  | { status: "closed" }
  | { status: "open"; linkId: string; ownerId: string; mine: boolean; title: string; locale: string; content: WorkContent; note: string | null; expiresAt: Date };

const TOKEN = /^[A-Za-z0-9_-]{16,64}$/;
const as = (viewerId: string | null) => (viewerId ? <T,>(fn: Parameters<typeof withAnon<T>>[0]) => withUser(viewerId, fn) : withAnon);

/**
 * A work by its link, signed in or not (null: no such link). Looking doesn't count as opening:
 * link previews fetch the page too. The reader opening the envelope does (markWorkOpened).
 */
export async function openWork(token: string, viewerId: string | null): Promise<OpenedWork | null> {
  if (!TOKEN.test(token)) return null;
  const r = await as(viewerId)((tx) => tx.execute<{ w: Record<string, unknown> | null }>(sql`select work_peek(${sha256(token)}) as w`));
  const w = r.rows[0]?.w;
  if (!w) return null;
  if (w.status !== "open") return { status: "closed" };
  return {
    status: "open",
    linkId: w.link_id as string,
    ownerId: w.owner_id as string,
    mine: !!w.mine,
    title: w.title as string,
    locale: w.locale as string,
    content: w.content as WorkContent,
    note: (w.note as string | null) ?? null,
    expiresAt: new Date(w.expires_at as string),
  };
}

// ── Offers: the reader's side of a work they were handed ─────────────────

/** In a transaction as the user, with database errors turned into the app's own (not_found…). */
async function run<T>(userId: string, fn: Parameters<typeof withUser<T>>[1]) {
  return withUser(userId, async (tx) => {
    try {
      return await fn(tx);
    } catch (e) {
      mapDbError(e);
    }
  });
}

export interface Offer {
  id: string;
  ownerName: string;
  title: string;
  createdAt: Date;
  dismissed: boolean;
  accepted: boolean;
  /** Our connection, while it lasts. */
  sessionId: string | null;
  startAnswer: "told" | "kept" | null;
}

/** I read a work I was handed (signed in, or signed up from its link): keep the writer's offer. */
export async function recordOffer(userId: string, token: string): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;
  const r = await run(userId, (tx) => tx.execute<{ id: string | null }>(sql`select work_offer_record(${sha256(token)}) as id`));
  return r.rows[0]?.id ?? null;
}

export async function myOffers(userId: string): Promise<Offer[]> {
  const r = await run(userId, (tx) =>
    tx.execute<{ id: string; owner_name: string; title: string; created_at: string | Date; dismissed_at: string | null; accepted_at: string | null; session_id: string | null; start_answer: Offer["startAnswer"] }>(sql`select * from work_offers_mine()`),
  );
  return r.rows.map((x) => ({ id: x.id, ownerName: x.owner_name, title: x.title, createdAt: new Date(x.created_at), dismissed: !!x.dismissed_at, accepted: !!x.accepted_at, sessionId: x.session_id, startAnswer: x.start_answer }));
}

/** Connect with the writer in one step (nothing shown to each other yet). Returns our connection. */
export async function acceptOffer(userId: string, offerId: string): Promise<string> {
  const id = uuid.parse(offerId);
  return run(userId, async (tx) => {
    const r = await tx.execute<{ sid: string }>(sql`select work_offer_accept(${id}) as sid`);
    await audit(tx, userId, "work.offer_accepted", "work_offer", id);
    return r.rows[0]!.sid;
  });
}

export async function dismissOffer(userId: string, offerId: string) {
  const id = uuid.parse(offerId);
  await run(userId, (tx) => tx.execute(sql`select work_offer_update(${id}, true, null)`));
}

/** Tell the writer I started my own story (or keep it to myself). */
export async function answerStart(userId: string, offerId: string, tell: boolean) {
  const id = uuid.parse(offerId);
  await run(userId, (tx) => tx.execute(sql`select work_offer_update(${id}, false, ${tell ? "told" : "kept"})`));
}

/** A work I was handed, read in the app (also after its link ran out, while we're connected). */
export async function readOffer(userId: string, offerId: string): Promise<OpenedWork | null> {
  const id = uuid.parse(offerId);
  const r = await run(userId, (tx) => tx.execute<{ w: Record<string, unknown> | null }>(sql`select work_offer_read(${id}) as w`));
  const w = r.rows[0]?.w;
  if (!w) return null;
  if (w.status !== "open") return { status: "closed" };
  return { status: "open", linkId: "", ownerId: "", mine: false, title: w.title as string, locale: w.locale as string, content: w.content as WorkContent, note: (w.note as string | null) ?? null, expiresAt: new Date(0) };
}

/** For the writer: who connected through a work, and who started their own story (said once). */
export async function writerNews(userId: string): Promise<{ connected: (string | null)[]; started: (string | null)[] }> {
  const rows = await run(userId, (tx) =>
    tx.execute<{ recipient: string | null; accepted: boolean; started: boolean }>(sql`
      select l.recipient,
             (o.accepted_at is not null and o.accepted_seen_at is null) as accepted,
             (o.start_answer = 'told' and o.start_seen_at is null) as started
      from work_offers o join work_links l on l.id = o.link_id
      where o.owner_id = ${userId}`),
  );
  return { connected: rows.rows.filter((x) => x.accepted).map((x) => x.recipient), started: rows.rows.filter((x) => x.started).map((x) => x.recipient) };
}

export async function markWriterNewsSeen(userId: string) {
  await run(userId, (tx) => tx.execute(sql`select work_offer_seen()`));
}

/**
 * A work in the reader's language, translated by AI the first time it's asked for on a link and
 * kept (so it is translated once). The story is translated in parts, side by side, to stay quick.
 * Null: no such open link, the same language, or no translation could be made (shown untranslated).
 */
export async function translatedWork(token: string, viewerId: string | null, locale: Locale, make: boolean): Promise<{ title: string; content: WorkContent; note: string | null } | null> {
  const work = await openWork(token, viewerId);
  if (!work || work.status !== "open" || work.locale === locale) return null;
  const h = sha256(token);
  const got = await as(viewerId)((tx) => tx.execute<{ t: { title: string; content: WorkContent; note: string | null } | null }>(sql`select work_translation_get(${h}, ${locale}) as t`));
  const kept = got.rows[0]?.t;
  if (kept) return kept;
  if (!make) return null;
  const lang = LOCALE_NAMES[locale];
  const system = `You translate a short personal story into ${lang} (${locale}). Keep its warmth, rhythm and meaning; write natural ${lang}, not word for word. Keep people's names as they are. Return only the translation in the given shape.`;
  const strings = z.array(z.string());
  const one = <S extends z.ZodType>(schema: S, input: unknown) => generateStructured({ system, user: JSON.stringify(input), schema, effort: "low", timeoutMs: 25_000, maxTokens: 6000 });
  const c = work.content;
  const head = z.object({ title: z.string(), subtitle: z.string(), note: z.string(), summary: strings, answers: z.array(z.object({ q: z.string(), a: z.string() })) });
  const ep = z.object({ title: z.string(), paragraphs: strings });
  const [h1, ...eps] = await Promise.all([
    one(head, { title: work.title, subtitle: c.subtitle, note: work.note ?? "", summary: c.backstage.summary, answers: c.backstage.answers }),
    ...c.episodes.map((e) => one(ep, { title: e.title, paragraphs: e.paragraphs })),
  ]);
  if (!h1?.ok || eps.some((x) => !x.ok)) return null;
  const hd = h1.data as z.infer<typeof head>;
  const content: WorkContent = {
    ...c,
    subtitle: hd.subtitle,
    episodes: c.episodes.map((e, i) => ({ key: e.key, ...((eps[i] as { ok: true; data: z.infer<typeof ep> }).data) })),
    backstage: { summary: hd.summary, answers: hd.answers.slice(0, c.backstage.answers.length) },
  };
  const out = { title: hd.title || work.title, content, note: work.note ? hd.note : null };
  await as(viewerId)(async (tx) => {
    try {
      await tx.execute(sql`select work_translation_put(${h}, ${locale}, ${out.title}, ${JSON.stringify(out.content)}::jsonb, ${out.note})`);
    } catch (e) {
      mapDbError(e);
    }
  });
  return out;
}
