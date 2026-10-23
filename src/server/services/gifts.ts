/**
 * Gift suggestions — deterministic, evidence-based.
 *
 * Every candidate cites the records it came from. Candidates are never derived from
 * gender, age or nationality (MOSAIC does not even store those for people). AI may only
 * rephrase the explanation of these candidates (see ai/gift-text.ts); it cannot add any.
 */
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { I18nText } from "@/content/questions";
import { todayIn, uuid } from "@/lib/validation/common";
import { giftRecords, importantDates, people, profiles, relationshipEntries } from "../db/schema";
import { withUser } from "../db/tx";
import { notFound } from "../errors";
import { loadPreferences, nextOccurrence, type PreferenceView } from "./people";

export interface Evidence {
  type: "preference" | "gift" | "entry" | "date";
  id: string;
  label: string;
  source?: string;
  recordedAt?: string;
}

export interface GiftCandidate {
  idea: string;
  kind: "wished_item" | "related_to_like" | "experience_together" | "similar_to_loved_gift";
  strength: "strong" | "moderate" | "weak";
  reason: I18nText;
  evidence: Evidence[];
  /** Notes the user should double-check (e.g. unverified source). */
  caveats: I18nText[];
}

export interface GiftSuggestions {
  personName: string;
  candidates: GiftCandidate[];
  avoid: { label: string; source: string }[];
  alreadyGiven: string[];
  nextOccasion: { label: string; date: string; daysUntil: number } | null;
  budget: { amount: number; currency: string | null; checked: false; note: I18nText } | null;
  questionsToAsk: I18nText[];
}

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .trim();

const SOURCE_STRENGTH: Record<string, GiftCandidate["strength"]> = {
  person_stated: "strong",
  observed: "moderate",
  self_stated: "moderate",
  guess: "weak",
  unverified: "weak",
  ai_suggested: "weak",
};

const SOURCE_LABEL: Record<string, I18nText> = {
  person_stated: { en: "they said so", vi: "họ đã nói" },
  observed: { en: "you observed it", vi: "bạn quan sát được" },
  guess: { en: "your guess", vi: "bạn đoán" },
  unverified: { en: "unverified", vi: "chưa xác minh" },
  ai_suggested: { en: "AI suggestion you saved", vi: "gợi ý AI bạn đã lưu" },
  self_stated: { en: "you noted it", vi: "bạn ghi lại" },
};

function caveatsFor(source: string): I18nText[] {
  if (source === "guess" || source === "unverified" || source === "ai_suggested") {
    return [{ en: `Based on ${SOURCE_LABEL[source]!.en} — worth confirming first.`, vi: `Dựa trên ${SOURCE_LABEL[source]!.vi} — nên xác nhận trước.` }];
  }
  return [];
}

const RELATED_IDEA: Record<string, I18nText> = {
  food: { en: "a treat or meal featuring {x}", vi: "món quà/bữa ăn có {x}" },
  music: { en: "something related to {x} (concert, record, merch)", vi: "món liên quan đến {x} (vé nhạc, đĩa, đồ lưu niệm)" },
  hobby: { en: "a gift for their interest in {x}", vi: "món quà cho sở thích {x}" },
  travel: { en: "a trip or experience at {x}", vi: "chuyến đi/trải nghiệm ở {x}" },
  brand: { en: "something from {x}", vi: "món đồ của {x}" },
  color: { en: "something in {x}", vi: "món đồ màu {x}" },
  scent: { en: "something with a {x} scent", vi: "món có hương {x}" },
  book_film: { en: "something related to {x}", vi: "món liên quan đến {x}" },
  item: { en: "{x}", vi: "{x}" },
  experience: { en: "the experience: {x}", vi: "trải nghiệm: {x}" },
  other: { en: "something related to {x}", vi: "món liên quan đến {x}" },
};

const budgetSchema = z.object({
  budget: z.preprocess((v) => (v === "" || v === null ? undefined : v), z.coerce.number().int().min(0).max(1_000_000_000).optional()),
  currency: z.preprocess((v) => (v === "" ? undefined : v), z.string().regex(/^[A-Z]{3}$/).optional()),
});

export async function suggestGifts(userId: string, personId: string, opts: unknown = {}, now = new Date()): Promise<GiftSuggestions> {
  const o = budgetSchema.parse(opts);
  const pid = uuid.parse(personId);
  return withUser(userId, async (tx) => {
    const [person] = await tx.select().from(people).where(and(eq(people.id, pid), eq(people.userId, userId)));
    if (!person) throw notFound();
    const [tzRow] = await tx.select({ tz: profiles.timeZone }).from(profiles).where(eq(profiles.userId, userId));
    const prefs = await loadPreferences(tx, userId, pid);
    const gifts = await tx.select().from(giftRecords).where(eq(giftRecords.personId, pid));
    const entries = await tx.select().from(relationshipEntries).where(eq(relationshipEntries.personId, pid));
    const dates = await tx.select().from(importantDates).where(eq(importantDates.personId, pid));

    const owned = new Set(prefs.filter((p) => p.current.sentiment === "owns").map((p) => fold(p.label)));
    const given = new Set(gifts.map((g) => fold(g.item)));
    const disliked = prefs.filter((p) => p.current.sentiment === "dislike" || p.current.sentiment === "avoid");
    const dislikedFolded = disliked.map((p) => fold(p.label));
    const conflictsWithDislike = (label: string) => dislikedFolded.some((d) => fold(label).includes(d) || d.includes(fold(label)));

    const prefEvidence = (p: PreferenceView): Evidence => ({
      type: "preference",
      id: p.itemId,
      label: `${p.label} (${p.current.sentiment})`,
      source: p.current.source,
      recordedAt: p.current.recordedAt.toISOString().slice(0, 10),
    });

    const candidates: GiftCandidate[] = [];
    // 1. Things they said (or you observed) they want, not already owned or given.
    for (const p of prefs.filter((x) => x.current.sentiment === "wants")) {
      const f = fold(p.label);
      if (owned.has(f) || given.has(f) || conflictsWithDislike(p.label)) continue;
      const src = SOURCE_LABEL[p.current.source] ?? SOURCE_LABEL.unverified!;
      candidates.push({
        idea: p.label,
        kind: "wished_item",
        strength: SOURCE_STRENGTH[p.current.source] ?? "weak",
        reason: {
          en: `On their wish list (${src.en}, recorded ${p.current.recordedAt.toISOString().slice(0, 10)}). Not recorded as owned or already given.`,
          vi: `Có trong danh sách mong muốn (${src.vi}, ghi ngày ${p.current.recordedAt.toISOString().slice(0, 10)}). Chưa ghi là đã có hoặc đã tặng.`,
        },
        evidence: [prefEvidence(p)],
        caveats: caveatsFor(p.current.source),
      });
    }
    // 2. Experiences you both want to do.
    for (const e of entries.filter((x) => x.kind === "wish_together")) {
      candidates.push({
        idea: e.body,
        kind: "experience_together",
        strength: e.source === "person_stated" ? "strong" : "moderate",
        reason: {
          en: "Something you noted wanting to do together — a shared experience can be a gift.",
          vi: "Điều bạn ghi là muốn cùng làm — một trải nghiệm chung cũng có thể là món quà.",
        },
        evidence: [{ type: "entry", id: e.id, label: e.body.slice(0, 80), source: e.source }],
        caveats: caveatsFor(e.source),
      });
    }
    // 3. Related to things they love/like.
    for (const p of prefs.filter((x) => x.current.sentiment === "love" || x.current.sentiment === "like")) {
      if (conflictsWithDislike(p.label)) continue;
      const tmpl = RELATED_IDEA[p.categoryId] ?? RELATED_IDEA.other!;
      candidates.push({
        idea: tmpl.en.replace("{x}", p.label),
        kind: "related_to_like",
        strength: p.current.sentiment === "love" && p.current.source === "person_stated" ? "moderate" : "weak",
        reason: {
          en: `They ${p.current.sentiment} ${p.label} (${(SOURCE_LABEL[p.current.source] ?? SOURCE_LABEL.unverified!).en}).`,
          vi: `Họ ${p.current.sentiment === "love" ? "rất thích" : "thích"} ${p.label} (${(SOURCE_LABEL[p.current.source] ?? SOURCE_LABEL.unverified!).vi}).`,
        },
        evidence: [prefEvidence(p)],
        caveats: caveatsFor(p.current.source),
      });
    }
    // 4. Similar to past gifts they loved (but not the same item).
    for (const g of gifts.filter((x) => x.reaction === "loved")) {
      candidates.push({
        idea: `something in the spirit of "${g.item}"`,
        kind: "similar_to_loved_gift",
        strength: "moderate",
        reason: {
          en: `They loved "${g.item}"${g.givenOn ? ` (${g.givenOn})` : ""}. Avoid giving the same thing again.`,
          vi: `Họ rất thích "${g.item}"${g.givenOn ? ` (${g.givenOn})` : ""}. Tránh tặng trùng lại.`,
        },
        evidence: [{ type: "gift", id: g.id, label: g.item }],
        caveats: [],
      });
    }

    const order = { strong: 0, moderate: 1, weak: 2 } as const;
    const kindOrder = { wished_item: 0, experience_together: 1, similar_to_loved_gift: 2, related_to_like: 3 } as const;
    candidates.sort((a, b) => order[a.strength] - order[b.strength] || kindOrder[a.kind] - kindOrder[b.kind]);

    const today = todayIn(tzRow?.tz ?? "UTC", now);
    const next = dates
      .map((d) => ({ label: d.label, ...nextOccurrence(d.month, d.day, today) }))
      .sort((a, b) => a.daysUntil - b.daysUntil)[0];

    const questionsToAsk: I18nText[] = [];
    if (!prefs.some((p) => p.current.sentiment === "wants")) {
      questionsToAsk.push({
        en: `Has ${person.nickname} mentioned wanting anything recently? Add it as "wants" with the source "they said".`,
        vi: `Gần đây ${person.nickname} có nhắc muốn món gì không? Hãy thêm với trạng thái "muốn có" và nguồn "họ đã nói".`,
      });
    }
    if (!prefs.some((p) => p.current.sentiment === "love" || p.current.sentiment === "like")) {
      questionsToAsk.push({
        en: `What does ${person.nickname} enjoy (food, music, hobbies)? Record a few likes first.`,
        vi: `${person.nickname} thích gì (món ăn, âm nhạc, sở thích)? Hãy ghi lại vài điều họ thích trước.`,
      });
    }
    if (disliked.length === 0) {
      questionsToAsk.push({
        en: `Is there anything ${person.nickname} dislikes or can't use (allergies, colours, scents)?`,
        vi: `Có điều gì ${person.nickname} không thích hoặc không dùng được (dị ứng, màu sắc, mùi hương) không?`,
      });
    }

    return {
      personName: person.nickname,
      candidates,
      avoid: disliked.map((p) => ({ label: p.label, source: p.current.source })),
      alreadyGiven: gifts.map((g) => g.item),
      nextOccasion: next ? { label: next.label, date: next.date, daysUntil: next.daysUntil } : null,
      budget:
        o.budget !== undefined
          ? {
              amount: o.budget,
              currency: o.currency ?? null,
              checked: false,
              note: {
                en: "Prices are not recorded for wish-list items, so candidates were NOT filtered by budget. Check prices yourself.",
                vi: "Giá của các món mong muốn chưa được ghi lại nên gợi ý CHƯA được lọc theo ngân sách. Hãy tự kiểm tra giá.",
              },
            }
          : null,
      questionsToAsk,
    };
  });
}
