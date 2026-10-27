/**
 * The intro MOSAIC drafts for you: a few first-person sentences built only from what you told it
 * (your clearest tendencies, some "likes" answers, your favourites, your Tử Vi persona). It is
 * a draft — nothing is shown to anyone until you edit and save it. With the AI opt-in, the same
 * facts (never your records) can be turned into more natural prose; the template is the fallback.
 */
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { AXES, PEER_POLES } from "@/content/axes";
import { INTRO, type IntroLength, type IntroTone } from "@/content/intro-text";
import { LOCALIZED_BANK } from "@/content/questions-i18n";
import type { I18nText } from "@/content/questions";
import type { Answer } from "@/lib/discovery/answers";
import { answerLabel } from "@/lib/discovery/format";
import type { Locale } from "@/lib/i18n/locales";
import { mainsOf } from "@/lib/tuvi/interpret";
import type { Chart } from "@/lib/tuvi/engine";
import { STAR_PLAIN } from "@/lib/tuvi/plain";
import { generateStructured, aiConfigured, type AiFailure } from "../ai/claude";
import { enforceRateLimit } from "../auth/rate-limit";
import { preferenceItems, preferenceValues, profiles, tuviCharts } from "../db/schema";
import { withUser } from "../db/tx";
import { audit } from "./audit";
import { getHistory } from "./discovery";
import { knowledge } from "./knowledge";
import { listTendencies } from "./tendencies";

export interface IntroFacts {
  traits: I18nText[];
  likes: { questionId: string; label: I18nText }[];
  favourites: string[];
  persona: I18nText | null;
}


const each = (f: (l: Locale) => string): I18nText => ({ ja: f("ja"), en: f("en"), vi: f("vi") });
const ORDER = new Map(AXES.map((k, i) => [k, i]));

/** Pure: the draft from the facts, at a length and in a tone. */
export function composeIntro(f: IntroFacts, length: IntroLength, tone: IntroTone, locale: Locale): string {
  const out: string[] = [];
  const say = (t: Record<IntroTone, I18nText>) => out.push(t[tone][locale]);
  const [a, b, c] = f.traits;
  if (a) say(INTRO.first(a));
  if (length !== "one") {
    if (b) say(INTRO.also(b));
    const like = f.likes[0];
    if (like) say(INTRO.likes[like.questionId]!(like.label));
  }
  if (length === "long") {
    if (c) say(INTRO.third(c));
    for (const like of f.likes.slice(1, 2)) say(INTRO.likes[like.questionId]!(like.label));
    if (f.favourites.length) say(INTRO.favourites(f.favourites.slice(0, 3)));
    if (f.persona) say(INTRO.tuvi(f.persona));
  }
  if (out.length === 0) {
    if (f.favourites.length) say(INTRO.favourites(f.favourites.slice(0, 2)));
    else say(INTRO.empty);
  }
  if (length === "long" && out.length > 1) say(INTRO.closing);
  return out.join(locale === "ja" ? "" : " ");
}

export async function introFacts(userId: string): Promise<IntroFacts> {
  const claims = await listTendencies(userId);
  const traits = claims
    .filter((c) => c.userStatus !== "rejected" && (c.state === "consistent" || c.state === "emerging"))
    .sort((x, y) => (x.state === y.state ? y.confidence - x.confidence || ORDER.get(x.claimKey)! - ORDER.get(y.claimKey)! : x.state === "consistent" ? -1 : 1))
    .slice(0, 3)
    .map((c) => (c.direction === 1 ? PEER_POLES[c.claimKey].pos : PEER_POLES[c.claimKey].neg));
  const meta = new Map(LOCALIZED_BANK.map((q) => [q.id, q]));
  const likes = (await getHistory(userId))
    .filter((h) => INTRO.likes[h.question.id])
    .flatMap((h) => {
      const r = h.responses.find((x) => x.status === "answered" && x.answer);
      if (!r) return [];
      const q = meta.get(h.question.id);
      return [{ questionId: h.question.id, label: each((l) => answerLabel(q, r.answer as Answer, l)) }];
    });
  const { favourites, chart } = await withUser(userId, async (tx) => {
    const items = await tx
      .select({ label: preferenceItems.label, sentiment: preferenceValues.sentiment, at: preferenceValues.recordedAt })
      .from(preferenceItems)
      .innerJoin(preferenceValues, eq(preferenceValues.itemId, preferenceItems.id))
      .where(and(eq(preferenceItems.userId, userId), isNull(preferenceItems.personId)));
    // Latest feeling per item; loves before likes.
    const latest = new Map<string, { sentiment: string; at: Date }>();
    for (const i of items) if (!latest.has(i.label) || latest.get(i.label)!.at < i.at) latest.set(i.label, { sentiment: i.sentiment, at: i.at });
    const fav = [...latest.entries()].filter(([, v]) => v.sentiment === "love").map(([k]) => k).concat([...latest.entries()].filter(([, v]) => v.sentiment === "like").map(([k]) => k));
    const [c] = await tx.select({ chart: tuviCharts.chart }).from(tuviCharts).where(and(eq(tuviCharts.userId, userId), eq(tuviCharts.isCurrent, true)));
    return { favourites: fav, chart: (c?.chart as Chart | undefined) ?? null };
  });
  const head = chart && chart.menh !== null ? mainsOf(chart, "menh") : null;
  const persona = head?.mains.length ? each((l) => head.mains.map((m) => STAR_PLAIN[m].persona[l]).join(l === "ja" ? "・" : " / ")) : null;
  return { traits, likes, favourites, persona };
}

const LENGTH_HINT: Record<IntroLength, string> = { one: "one sentence", short: "two or three sentences", long: "four to six sentences" };
const LANGUAGE: Record<Locale, string> = { ja: "Japanese", en: "English", vi: "Vietnamese" };

async function aiIntro(f: IntroFacts, length: IntroLength, tone: IntroTone, locale: Locale): Promise<{ ok: true; text: string } | { ok: false; reason: AiFailure }> {
  const r = await generateStructured({
    system: [
      `You write a short first-person self-introduction for someone's profile, in ${LANGUAGE[locale]}.`,
      "Use ONLY the facts provided. Never invent a job, place, age, family, hobby or any other detail.",
      `Tone: ${tone === "polite" ? "polite and warm" : "casual and friendly"}. Length: ${LENGTH_HINT[length]}. No emoji, no hashtags, do not mention any app.`,
      "Traits are written as things the person does; turn them into natural first-person sentences.",
    ].join("\n"),
    user: JSON.stringify({
      traits: f.traits.map((t) => t[locale]),
      answers: f.likes.map((l) => ({ question: LOCALIZED_BANK.find((q) => q.id === l.questionId)?.prompt[locale], answer: l.label[locale] })),
      favourites: f.favourites,
      tuviPersona: f.persona?.[locale] ?? null,
    }),
    schema: z.object({ text: z.string().min(1).max(800) }),
    maxTokens: 800,
  });
  return r.ok ? { ok: true, text: r.data.text.trim() } : r;
}

export interface IntroDraft {
  text: string;
  source: "template" | "ai";
  aiUnavailable: AiFailure | "not_opted_in" | null;
}

export const draftSchema = z.object({
  length: z.enum(["one", "short", "long"]).catch("short"),
  tone: z.enum(["polite", "casual"]).catch("polite"),
  ai: z.boolean().default(false),
});

/** A draft to edit; nothing is saved or shown to anyone. */
export async function draftIntro(userId: string, input: unknown, locale: Locale): Promise<IntroDraft> {
  const o = draftSchema.parse(input);
  const facts = await introFacts(userId);
  const template = composeIntro(facts, o.length, o.tone, locale);
  if (!o.ai) return { text: template, source: "template", aiUnavailable: null };
  const [p] = await withUser(userId, (tx) => tx.select({ optIn: profiles.aiOptIn }).from(profiles).where(eq(profiles.userId, userId)));
  if (!p?.optIn) return { text: template, source: "template", aiUnavailable: "not_opted_in" };
  if (!aiConfigured()) return { text: template, source: "template", aiUnavailable: "not_configured" };
  await enforceRateLimit("ai", userId);
  const r = await aiIntro(facts, o.length, o.tone, locale);
  return r.ok ? { text: r.text, source: "ai", aiUnavailable: null } : { text: template, source: "template", aiUnavailable: r.reason };
}

/** Save (or with null, withdraw) the intro the user approved. */
export async function saveIntro(userId: string, text: unknown) {
  const t = z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), z.string().trim().max(2000).nullable()).parse(text);
  const pieces = t ? (await knowledge(userId)).pieces : null;
  await withUser(userId, async (tx) => {
    await tx.update(profiles).set({ intro: t, introUpdatedAt: t ? new Date() : null, introPieces: pieces, updatedAt: new Date() }).where(eq(profiles.userId, userId));
    await audit(tx, userId, t ? "intro.saved" : "intro.withdrawn");
  });
}

/** Pieces MOSAIC has gained since the intro was saved (0 without an intro). */
export async function introGrowth(userId: string, savedPieces: number | null): Promise<number> {
  if (savedPieces === null) return 0;
  return Math.max(0, (await knowledge(userId)).pieces - savedPieces);
}

export const INTRO_UPDATE_AFTER = 10;
