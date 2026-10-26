/**
 * The shared manual rewritten by AI, for one preset (friend / partner). It is written only from
 * what that preset shows — the very text a connection would read — so nothing private can slip in.
 * Others see it only after the owner approved it in the preview, and only while the shared content
 * is unchanged (a fingerprint is kept); otherwise they read MOSAIC's own text.
 */
import { createHash } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import type { ManualPreset } from "@/content/manual-text";
import type { Locale } from "@/lib/i18n/locales";
import { uuid } from "@/lib/validation/common";
import { enforceRateLimit } from "../auth/rate-limit";
import { aiConfigured, generateStructured, type AiFailure } from "../ai/claude";
import { manualShareRewrites, profiles } from "../db/schema";
import { withUser } from "../db/tx";
import { mapDbError } from "../errors";
import { audit } from "./audit";
import { sharedManualPreview, type SharedManual } from "./manual-share";

const LANGUAGE: Record<Locale, string> = { ja: "Japanese", en: "English", vi: "Vietnamese" };
const presetSchema = z.enum(["friend", "partner"]);

/** The units a shared manual is rewritten in: the summary, each chapter, the likes. */
export function sharedUnits(m: SharedManual): string[] {
  return [...(m.summary.length || m.bio || m.intro ? ["summary"] : []), ...m.chapters.map((c) => `ch.${c.chapter}`), ...(m.likes.length ? ["likes"] : [])];
}

function sourceOf(m: SharedManual, unit: string): string {
  if (unit === "summary") return [m.bio && `Own words: ${m.bio}`, m.intro && `Introduction: ${m.intro}`, ...m.summary].filter(Boolean).join("\n");
  if (unit === "likes") return m.likes.map((l) => `- ${l.k}: ${l.v}`).join("\n");
  const c = m.chapters.find((x) => `ch.${x.chapter}` === unit);
  return (c?.traits ?? []).map((t) => [`- ${t.name} (${t.pole}): ${t.statement}`, t.ask && `  ${m.askLabel}: ${t.ask}`].filter(Boolean).join("\n")).join("\n");
}

/** A fingerprint of what the preset shows: when it changes, an approved rewrite stops being shown. */
export function sharedHash(m: SharedManual): string {
  const content = { bio: m.bio, intro: m.intro, summary: m.summary, chapters: m.chapters.map((c) => [c.chapter, c.traits.map((t) => [t.key, t.statement, t.ask])]), likes: m.likes };
  return createHash("sha256").update(JSON.stringify(content)).digest("hex").slice(0, 32);
}

const output = z.object({ paragraphs: z.array(z.string().min(1).max(1500)).min(1).max(5) });

export type SharedRewriteResult = { ok: true } | { ok: false; reason: AiFailure | "not_opted_in" | "nothing" };

/** Rewrite one unit of the shared manual for a preset; `first` starts afresh (and un-approves). */
export async function rewriteSharedUnit(userId: string, presetInput: unknown, locale: Locale, unit: unknown, first: boolean): Promise<SharedRewriteResult> {
  const preset = presetSchema.parse(presetInput);
  const u = z.string().regex(/^(summary|likes|ch\.(self|mind|people|life))$/).parse(unit);
  const [p] = await withUser(userId, (tx) => tx.select({ optIn: profiles.aiOptIn }).from(profiles).where(eq(profiles.userId, userId)));
  if (!p?.optIn) return { ok: false, reason: "not_opted_in" };
  if (!aiConfigured()) return { ok: false, reason: "not_configured" };
  const m = await sharedManualPreview(userId, preset, locale);
  const source = sourceOf(m, u);
  if (!sharedUnits(m).includes(u) || !source.trim()) return { ok: false, reason: "nothing" };
  await enforceRateLimit("ai", userId);
  const r = await generateStructured({
    system: [
      `You are MOSAIC, writing one part of ${m.name}'s manual as their ${preset === "partner" ? "partner" : "friends"} will read it, in ${LANGUAGE[locale]}.`,
      `Write in the third person, warmly and specifically, so the reader understands ${m.name} and how to be with them.${locale === "ja" ? ` Refer to them as 「${m.name}さん」.` : ""}`,
      "Use ONLY the facts in the source. It is exactly what the reader is allowed to see: never add anything beyond it, never invent events, people, places or feelings.",
      "Interpret short answers tentatively ('seems', 'perhaps') and expand them into natural sentences; keep any request they make to others, in their spirit.",
      "Write 2-3 paragraphs of 2-4 sentences. No headings, lists, emoji or mention of AI.",
    ].join("\n"),
    user: JSON.stringify({ name: m.name, part: u, source }),
    schema: output,
    maxTokens: 1400,
    timeoutMs: 24_000,
    effort: "low",
  });
  if (!r.ok) return r;
  const paragraphs = r.data.paragraphs.map((x) => x.trim()).filter(Boolean);
  const hash = sharedHash(m);
  await withUser(userId, async (tx) => {
    const [row] = await tx.select().from(manualShareRewrites).where(and(eq(manualShareRewrites.ownerId, userId), eq(manualShareRewrites.preset, preset)));
    const keep = !first && row && row.locale === locale && row.sourceHash === hash ? (row.sections as Record<string, string[]>) : {};
    const values = { locale, sections: { ...keep, [u]: paragraphs }, sourceHash: hash, approved: false, updatedAt: new Date() };
    await tx.insert(manualShareRewrites).values({ ownerId: userId, preset, ...values }).onConflictDoUpdate({ target: [manualShareRewrites.ownerId, manualShareRewrites.preset], set: values });
    if (first) await audit(tx, userId, "manual.share_ai_rewritten");
  });
  return { ok: true };
}

export interface SharedRewriteState {
  sections: Record<string, string[]>;
  approved: boolean;
  /** The shared content changed since it was written (then it isn't shown to anyone). */
  stale: boolean;
  updatedAt: Date;
}

/** The owner's rewrite for a preset, with whether it's approved and still current. */
export async function sharedRewriteState(userId: string, presetInput: unknown, locale: Locale, m: SharedManual): Promise<SharedRewriteState | null> {
  const preset = presetSchema.parse(presetInput);
  const [row] = await withUser(userId, (tx) => tx.select().from(manualShareRewrites).where(and(eq(manualShareRewrites.ownerId, userId), eq(manualShareRewrites.preset, preset))));
  if (!row || row.locale !== locale) return null;
  return { sections: row.sections as Record<string, string[]>, approved: row.approved, stale: row.sourceHash !== sharedHash(m), updatedAt: row.updatedAt };
}

/** Show (or stop showing) the rewrite to the people this preset is shared with. */
export async function approveSharedRewrite(userId: string, presetInput: unknown, approved: boolean) {
  const preset = presetSchema.parse(presetInput);
  await withUser(userId, async (tx) => {
    await tx.update(manualShareRewrites).set({ approved, updatedAt: new Date() }).where(and(eq(manualShareRewrites.ownerId, userId), eq(manualShareRewrites.preset, preset)));
    await audit(tx, userId, approved ? "manual.share_ai_approved" : "manual.share_ai_withdrawn");
  });
}

/** Back to MOSAIC's own text for this preset. */
export async function clearSharedRewrite(userId: string, presetInput: unknown) {
  const preset = presetSchema.parse(presetInput);
  await withUser(userId, async (tx) => {
    await tx.delete(manualShareRewrites).where(and(eq(manualShareRewrites.ownerId, userId), eq(manualShareRewrites.preset, preset)));
    await audit(tx, userId, "manual.share_ai_cleared");
  });
}

/**
 * The approved rewrite the other participant shows me, when it fits what I'm reading: written in my
 * language, and from exactly the content shown now (same fingerprint). Otherwise null.
 */
export async function sharedRewriteFor(userId: string, sessionId: string, locale: Locale, m: SharedManual): Promise<Record<string, string[]> | null> {
  const id = uuid.parse(sessionId);
  const row = await withUser(userId, async (tx) => {
    try {
      return (await tx.execute<{ r: { locale: string; sections: Record<string, string[]>; source_hash: string } | null }>(sql`select manual_share_rewrite_for_me(${id}) as r`)).rows[0]?.r ?? null;
    } catch (e) {
      mapDbError(e);
    }
  });
  if (!row || row.locale !== locale || row.source_hash !== sharedHash(m)) return null;
  return row.sections;
}

export type { ManualPreset };
