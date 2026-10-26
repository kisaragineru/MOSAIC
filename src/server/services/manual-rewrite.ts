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
import { buildManual, type ManualBlock, type ManualSection } from "./manual";

/** Sections written as prose (the axis chapters already have their own written portraits). */
export const REWRITABLE = ["summary", "likes", "tips", "others", "tuvi", "story", "future", "changes"] as const;
type Rewritable = (typeof REWRITABLE)[number];

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

const output = z.object({
  sections: z.array(z.object({ id: z.enum(REWRITABLE), paragraphs: z.array(z.string().min(1).max(1500)).min(1).max(6) })).max(REWRITABLE.length),
});

export type RewriteResult = { ok: true } | { ok: false; reason: AiFailure | "not_opted_in" | "nothing" };

export async function rewriteManual(userId: string, locale: Locale): Promise<RewriteResult> {
  const [p] = await withUser(userId, (tx) => tx.select({ optIn: profiles.aiOptIn }).from(profiles).where(eq(profiles.userId, userId)));
  if (!p?.optIn) return { ok: false, reason: "not_opted_in" };
  if (!aiConfigured()) return { ok: false, reason: "not_configured" };
  const manual = await buildManual(userId, locale);
  const sources = manual.sections
    .filter((s): s is ManualSection & { id: Rewritable } => (REWRITABLE as readonly string[]).includes(s.id) && !s.locked)
    .map((s) => ({ id: s.id, title: s.title, text: sourceText(s) }))
    .filter((s) => s.text.trim().length > 0);
  if (!sources.length) return { ok: false, reason: "nothing" };
  await enforceRateLimit("ai", userId);
  const name = manual.name;
  const r = await generateStructured({
    system: [
      `You are MOSAIC, writing the chapters of a personal "user manual" about ${name}, in ${LANGUAGE[locale]}.`,
      `Write in the third person, warmly and specifically, for ${name} and for the people close to them.${locale === "ja" ? ` Refer to them as 「${name}さん」.` : ""}`,
      "Use ONLY the facts in the source sections. Never invent events, people, places, jobs, ages, relationships or feelings that the source does not support.",
      "Interpret: when an answer is short (a word or a phrase), say what it suggests about how they live, decide or relate to others, tentatively (e.g. 'seems', 'perhaps'), and expand it into natural sentences.",
      "Do not paste answers back as quotations; weave them into your own sentences (a short phrase may stay in quotation marks).",
      "Keep the Tử Vi section framed as a traditional reading, never as fact or prediction.",
      "For each source section write 2-4 paragraphs of 2-5 sentences. No headings, lists, emoji or mention of AI. Return only the sections given, with the same ids.",
    ].join("\n"),
    user: JSON.stringify({ name, sections: sources }),
    schema: output,
    maxTokens: 8000,
  });
  if (!r.ok) return r;
  const sections: Partial<Record<Rewritable, string[]>> = {};
  for (const s of r.data.sections) if (sources.some((x) => x.id === s.id)) sections[s.id] = s.paragraphs.map((x) => x.trim()).filter(Boolean);
  const pieces = (await knowledge(userId)).pieces;
  await withUser(userId, async (tx) => {
    await tx
      .insert(manualRewrites)
      .values({ userId, locale, sections, pieces })
      .onConflictDoUpdate({ target: manualRewrites.userId, set: { locale, sections, pieces, createdAt: new Date() } });
    await audit(tx, userId, "manual.ai_rewritten");
  });
  return { ok: true };
}

export interface ManualRewrite {
  sections: Partial<Record<Rewritable, string[]>>;
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
