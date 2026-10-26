/**
 * The manual rewritten by AI: at the owner's request, with AI turned on in settings, Claude reads
 * what the manual already says (built only from the owner's own answers, records and readings) and
 * writes each section again in fuller, interpretive prose. Nothing new is added about the person.
 * The result is kept for the owner alone; shared manuals keep MOSAIC's own template text.
 */
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { Locale } from "@/lib/i18n/locales";
import { enforceRateLimit } from "../auth/rate-limit";
import { aiConfigured, generateStructured, type AiFailure } from "../ai/claude";
import { manualRewrites, profiles } from "../db/schema";
import { withUser } from "../db/tx";
import { audit } from "./audit";
import { knowledge } from "./knowledge";
import { buildManual, EPISODES, type ManualBlock, type ManualSection } from "./manual";

/** Sections written as prose (the axis chapters already have their own written portraits). */
export const REWRITABLE = ["summary", "likes", "tips", "others", "tuvi", "story", "future", "changes"] as const;
type Rewritable = (typeof REWRITABLE)[number];
/** A unit of the rewrite: a prose chapter, or one episode of the closing story ("novel.<episode>"). */
type Unit = Rewritable | `novel.${(typeof EPISODES)[number]}`;
const unitSchema = z.union([z.enum(REWRITABLE), z.enum(EPISODES.map((e) => `novel.${e}`) as [`novel.${(typeof EPISODES)[number]}`, ...`novel.${(typeof EPISODES)[number]}`[]])]);

/** The story's episodes that exist (each becomes a unit of its own: a long scene per request). */
export function novelUnits(sections: ManualSection[]): Unit[] {
  const novel = sections.find((s) => s.id === "novel");
  return (novel?.blocks ?? []).flatMap((b) => (b.t === "episode" && b.key ? [`novel.${b.key}` as Unit] : []));
}

const LANGUAGE: Record<Locale, string> = { ja: "Japanese", en: "English", vi: "Vietnamese" };

/** A section's content as plain text for the model (no links or locked samples). */
function sourceText(s: ManualSection): string {
  const line = (b: ManualBlock): string => {
    switch (b.t) {
      case "p":
      case "note":
        return b.text;
      case "quote":
        return b.cite ? `“${b.text}” (${b.cite})` : `“${b.text}”`;
      case "list":
        return [b.title, ...b.items.map((i) => `- ${i}`)].filter(Boolean).join("\n");
      case "kv":
        return [b.title, ...b.items.map((i) => `- ${i.k}: ${i.v}`)].filter(Boolean).join("\n");
      default:
        return "";
    }
  };
  return s.blocks.map(line).filter(Boolean).join("\n");
}

const output = z.object({ paragraphs: z.array(z.string().min(1).max(1500)).min(1).max(8) });

export type RewriteResult = { ok: true } | { ok: false; reason: AiFailure | "not_opted_in" | "nothing" };

/** The chapters there is something to rewrite in, in reading order (what the screen walks through). */
export async function rewritableSections(userId: string, locale: Locale): Promise<Unit[]> {
  const manual = await buildManual(userId, locale);
  return [...sourcesOf(manual.sections).map((s) => s.id), ...novelUnits(manual.sections)];
}

function sourcesOf(sections: ManualSection[]) {
  return sections
    .filter((s): s is ManualSection & { id: Rewritable } => (REWRITABLE as readonly string[]).includes(s.id) && !s.locked)
    .map((s) => ({ id: s.id, title: s.title, text: sourceText(s) }))
    .filter((s) => s.text.trim().length > 0);
}

/**
 * Rewrite one chapter. A whole manual at once takes longer than one hosted request may run, so the
 * screen asks chapter by chapter (each well inside the limit); `first` starts a fresh rewrite.
 */
export async function rewriteManualSection(userId: string, locale: Locale, sectionId: unknown, first: boolean): Promise<RewriteResult> {
  const id = unitSchema.parse(sectionId);
  const [p] = await withUser(userId, (tx) => tx.select({ optIn: profiles.aiOptIn }).from(profiles).where(eq(profiles.userId, userId)));
  if (!p?.optIn) return { ok: false, reason: "not_opted_in" };
  if (!aiConfigured()) return { ok: false, reason: "not_configured" };
  const manual = await buildManual(userId, locale);
  const sources = sourcesOf(manual.sections);
  const name = manual.name;
  if (id.startsWith("novel.")) return rewriteEpisode(userId, locale, manual.name, manual.sections, id as Unit, first);
  const source = sources.find((s) => s.id === id);
  if (!source) return { ok: false, reason: "nothing" };
  await enforceRateLimit("ai", userId);
  // The summary goes along as context, so every chapter speaks in the same voice about the same person.
  const summary = sources.find((s) => s.id === "summary");
  const r = await generateStructured({
    system: [
      `You are MOSAIC, writing one chapter of a personal "user manual" about ${name}, in ${LANGUAGE[locale]}.`,
      `Write in the third person, warmly and specifically, for ${name} and for the people close to them.${locale === "ja" ? ` Refer to them as 「${name}さん」.` : ""}`,
      "Use ONLY the facts in the source chapter (the summary is context only). Never invent events, people, places, jobs, ages, relationships or feelings that the source does not support.",
      "Interpret: when an answer is short (a word or a phrase), say what it suggests about how they live, decide or relate to others, tentatively (e.g. 'seems', 'perhaps'), and expand it into natural sentences.",
      "Do not paste answers back as quotations; weave them into your own sentences (a short phrase may stay in quotation marks).",
      "Keep anything about Tử Vi framed as a traditional reading, never as fact or prediction.",
      "Write 2-3 paragraphs of 2-4 sentences. No headings, lists, emoji or mention of AI.",
    ].join("\n"),
    user: JSON.stringify({ name, chapter: source, ...(summary && summary.id !== id ? { summary: summary.text } : {}) }),
    schema: output,
    maxTokens: 1400,
    timeoutMs: 24_000,
    effort: "low",
  });
  if (!r.ok) return r;
  await store(userId, locale, id, r.data.paragraphs, first);
  return { ok: true };
}

/** Keep one rewritten unit (a fresh rewrite starts from nothing). */
async function store(userId: string, locale: Locale, id: Unit, raw: string[], first: boolean) {
  const paragraphs = raw.map((x) => x.trim()).filter(Boolean);
  const pieces = (await knowledge(userId)).pieces;
  await withUser(userId, async (tx) => {
    const [row] = await tx.select().from(manualRewrites).where(eq(manualRewrites.userId, userId));
    const keep = !first && row && row.locale === locale ? (row.sections as Record<string, string[]>) : {};
    const sections = { ...keep, [id]: paragraphs };
    await tx
      .insert(manualRewrites)
      .values({ userId, locale, sections, pieces })
      .onConflictDoUpdate({ target: manualRewrites.userId, set: { locale, sections, pieces, createdAt: new Date() } });
    if (first) await audit(tx, userId, "manual.ai_rewritten");
  });
}

const EPISODE_BRIEF: Record<(typeof EPISODES)[number], string> = {
  prologue: "the prologue: the year they were born and what the old chart says sits at the heart of them",
  childhood: "episode 1, when there were dreams: their childhood as their own answers and family's words tell it",
  path: "episode 2, the road so far: turning points, lessons and records from their own life",
  now: "episode 3, who they are now: how they live, decide and relate to others, and what this stage of life is about",
  future: "episode 4, toward tomorrow: what they want to do and hope for",
  epilogue: "the epilogue: a quiet ending that says the story is still being written with every answer and record",
};

/**
 * One episode of the closing story, as a long scene. The story's own lines are the spine; the rest of
 * the manual is the only other material. Scenes may be drawn from feelings and atmosphere, but every
 * fact (event, person, place, plan) must come from the source.
 */
async function rewriteEpisode(userId: string, locale: Locale, name: string, sections: ManualSection[], id: Unit, first: boolean): Promise<RewriteResult> {
  const key = id.slice("novel.".length) as (typeof EPISODES)[number];
  const novel = sections.find((s) => s.id === "novel");
  const episode = novel?.blocks.find((b) => b.t === "episode" && b.key === key);
  if (!episode || episode.t !== "episode") return { ok: false, reason: "nothing" };
  await enforceRateLimit("ai", userId);
  const facts = sourcesOf(sections).filter((s) => ["summary", "likes", "tuvi", "story", "future"].includes(s.id));
  const r = await generateStructured({
    system: [
      `You are writing ${EPISODE_BRIEF[key]} — one episode of a short light novel about ${name}, in ${LANGUAGE[locale]}, in the third person.`,
      locale === "ja" ? `Write about 800-1000 Japanese characters, in 5-7 paragraphs, in a warm literary voice. Call them 「${name}」.` : "Write about 450-600 words in 5-7 paragraphs, in a warm literary voice.",
      "The episode's lines are the spine: keep every fact in them and tell them as scenes, with atmosphere, the senses and inner reflection.",
      "Every fact must come from the episode or the other sources: never invent events, people, places, jobs, ages, family or plans. Feelings may be imagined only as quiet possibilities ('perhaps', 'it may be').",
      "Anything from Tử Vi is the old tradition's reading, never fact or prediction. No headings, lists, emoji or mention of AI.",
    ].join("\n"),
    user: JSON.stringify({ name, episode: { title: episode.title, lines: episode.paragraphs }, sources: facts }),
    schema: output,
    maxTokens: 2200,
    timeoutMs: 24_000,
    effort: "low",
  });
  if (!r.ok) return r;
  await store(userId, locale, id, r.data.paragraphs, first);
  return { ok: true };
}

/** The whole manual, chapter by chapter (for tests and scripts; the screen walks chapters itself). */
export async function rewriteManual(userId: string, locale: Locale): Promise<RewriteResult> {
  const [p] = await withUser(userId, (tx) => tx.select({ optIn: profiles.aiOptIn }).from(profiles).where(eq(profiles.userId, userId)));
  if (!p?.optIn) return { ok: false, reason: "not_opted_in" };
  if (!aiConfigured()) return { ok: false, reason: "not_configured" };
  const ids = await rewritableSections(userId, locale);
  if (!ids.length) return { ok: false, reason: "nothing" };
  for (const [i, id] of ids.entries()) {
    const r = await rewriteManualSection(userId, locale, id, i === 0);
    if (!r.ok) return r;
  }
  return { ok: true };
}

export interface ManualRewrite {
  /** Paragraphs per unit: a prose chapter id, or "novel.<episode>". */
  sections: Record<string, string[]>;
  createdAt: Date;
  /** Pieces MOSAIC has gained since it was written. */
  growth: number;
}

/** The owner's rewrite, when there is one in the language being read. */
export async function getManualRewrite(userId: string, locale: Locale): Promise<ManualRewrite | null> {
  const [row] = await withUser(userId, (tx) => tx.select().from(manualRewrites).where(eq(manualRewrites.userId, userId)));
  if (!row || row.locale !== locale) return null;
  return { sections: row.sections as ManualRewrite["sections"], createdAt: row.createdAt, growth: Math.max(0, (await knowledge(userId)).pieces - row.pieces) };
}

/** Back to MOSAIC's own text. */
export async function clearManualRewrite(userId: string) {
  await withUser(userId, async (tx) => {
    await tx.delete(manualRewrites).where(eq(manualRewrites.userId, userId));
    await audit(tx, userId, "manual.ai_cleared");
  });
}
