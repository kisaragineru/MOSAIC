/**
 * Gift suggestions — deterministic, evidence-based.
 *
 * Every candidate cites the records it came from. Candidates are never derived from
 * gender, age or nationality (MOSAIC does not even store those for people). AI may only
 * rephrase the explanation of these candidates (see ai/gift-text.ts); it cannot add any.
 */
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import type { I18nText } from "@/content/questions";
import { GIFT_HINTS } from "@/content/gift-hints";
import { LOCALIZED_BANK } from "@/content/questions-i18n";
import type { Answer } from "@/lib/discovery/answers";
import { todayIn, uuid } from "@/lib/validation/common";
import { giftRecords, importantDates, people, profiles, relationshipEntries } from "../db/schema";
import { withUser } from "../db/tx";
import { notFound } from "../errors";
import { loadPreferences, nextOccurrence, type PreferenceView } from "./people";

export interface Evidence {
  type: "preference" | "gift" | "entry" | "date" | "answer";
  id: string;
  label: string;
  /** Localised label, when there is one (their answers). */
  text?: I18nText;
  /** Preference sentiment key (rendered localised by the UI). */
  sentiment?: string;
  source?: string;
  recordedAt?: string;
}

export interface GiftCandidate {
  /** Localised idea text (the user's own labels are kept verbatim inside it). */
  idea: I18nText;
  kind: "wished_item" | "from_their_answers" | "related_to_like" | "experience_together" | "similar_to_loved_gift";
  strength: "strong" | "moderate" | "weak";
  reason: I18nText;
  evidence: Evidence[];
  /** Notes the user should double-check (e.g. unverified source). */
  caveats: I18nText[];
}

export interface GiftSuggestions {
  personName: string;
  candidates: GiftCandidate[];
  avoid: { label: string; source: string; text?: I18nText }[];
  /** Whether their own shared answers were used (connected, and they agreed to share preferences). */
  usedTheirAnswers: boolean;
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
  person_stated: { en: "they said so", vi: "họ đã nói", ja: "本人が言っていた" },
  observed: { en: "you observed it", vi: "bạn quan sát được", ja: "あなたが観察した" },
  guess: { en: "your guess", vi: "bạn đoán", ja: "あなたの推測" },
  unverified: { en: "unverified", vi: "chưa xác minh", ja: "未確認" },
  ai_suggested: { en: "AI suggestion you saved", vi: "gợi ý AI bạn đã lưu", ja: "保存したAIの提案" },
  self_stated: { en: "you noted it", vi: "bạn ghi lại", ja: "あなたが記録した" },
};

function caveatsFor(source: string): I18nText[] {
  if (source === "guess" || source === "unverified" || source === "ai_suggested") {
    return [{ en: `Based on ${SOURCE_LABEL[source]!.en} — worth confirming first.`, vi: `Dựa trên ${SOURCE_LABEL[source]!.vi} — nên xác nhận trước.`, ja: `根拠は「${SOURCE_LABEL[source]!.ja}」です。先に確認するのがおすすめです。` }];
  }
  return [];
}

const RELATED_IDEA: Record<string, I18nText> = {
  food: { en: "a treat or meal featuring {x}", vi: "món quà/bữa ăn có {x}", ja: "{x}を使ったお菓子や食事" },
  music: { en: "something related to {x} (concert, record, merch)", vi: "món liên quan đến {x} (vé nhạc, đĩa, đồ lưu niệm)", ja: "{x}に関するもの（ライブ、CD・レコード、グッズ）" },
  hobby: { en: "a gift for their interest in {x}", vi: "món quà cho sở thích {x}", ja: "趣味の{x}に使える贈り物" },
  travel: { en: "a trip or experience at {x}", vi: "chuyến đi/trải nghiệm ở {x}", ja: "{x}への旅行や体験" },
  brand: { en: "something from {x}", vi: "món đồ của {x}", ja: "{x}のアイテム" },
  color: { en: "something in {x}", vi: "món đồ màu {x}", ja: "{x}色のもの" },
  scent: { en: "something with a {x} scent", vi: "món có hương {x}", ja: "{x}の香りのもの" },
  book_film: { en: "something related to {x}", vi: "món liên quan đến {x}", ja: "{x}に関するもの" },
  item: { en: "{x}", vi: "{x}", ja: "{x}" },
  experience: { en: "the experience: {x}", vi: "trải nghiệm: {x}", ja: "体験：{x}" },
  other: { en: "something related to {x}", vi: "món liên quan đến {x}", ja: "{x}に関するもの" },
};

/** What people type for a currency: a code in any case, or the usual sign or word. Anything else is ignored. */
const CURRENCY_WORDS: Record<string, string> = { "円": "JPY", "¥": "JPY", "￥": "JPY", yen: "JPY", "$": "USD", "＄": "USD", dollar: "USD", "₫": "VND", "đ": "VND", dong: "VND", "đồng": "VND", "€": "EUR", euro: "EUR" };
export function normalizeCurrency(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  if (!s) return undefined;
  const code = CURRENCY_WORDS[s.toLowerCase()] ?? s.toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : undefined;
}

const budgetSchema = z.object({
  budget: z.preprocess((v) => (v === "" || v === null ? undefined : v), z.coerce.number().int().min(0).max(1_000_000_000).optional()),
  currency: z.preprocess(normalizeCurrency, z.string().optional()),
});

const QOPTS = new Map(LOCALIZED_BANK.map((q) => [q.id, q]));

/** Their own answers (shared with me in this connection) turned into ideas and things to avoid. */
function fromTheirAnswers(rows: { question_id: string; answer: Answer }[], name: string) {
  const ideas: GiftCandidate[] = [];
  const avoid: { label: string; source: string; text: I18nText }[] = [];
  for (const r of rows) {
    const hints = GIFT_HINTS[r.question_id];
    const q = QOPTS.get(r.question_id);
    if (!hints || !q) continue;
    const values = "choice" in r.answer ? [r.answer.choice] : "choices" in r.answer ? r.answer.choices : [];
    const label = (v: string) => q.options?.find((o) => o.value === v)?.label ?? { en: v, vi: v, ja: v };
    const join = (vs: string[], l: keyof I18nText) => vs.map((v) => label(v)[l]).join(l === "ja" ? "／" : ", ");
    const evidence = (vs: string[]): Evidence => ({
      type: "answer",
      id: r.question_id,
      label: `${q.prompt.en} → ${join(vs, "en")}`,
      text: { en: `${q.prompt.en} → ${join(vs, "en")}`, vi: `${q.prompt.vi} → ${join(vs, "vi")}`, ja: `${q.prompt.ja} → ${join(vs, "ja")}` },
      source: "their_answer",
    });
    const reason = (vs: string[]): I18nText => ({
      en: `${name} answered "${q.prompt.en}" with "${join(vs, "en")}" and shares it with you.`,
      vi: `${name} đã trả lời "${q.prompt.vi}" là "${join(vs, "vi")}" và chia sẻ với bạn.`,
      ja: `${name}さん本人の回答です（「${q.prompt.ja}」→ ${join(vs, "ja")}）。`,
    });
    // Options with their own hint one by one; the rest share the "*" hint, all named in one idea.
    const rest = values.filter((v) => !hints[v]);
    for (const v of values.filter((x) => hints[x])) {
      const h = hints[v]!;
      if (h.idea) ideas.push({ idea: h.idea, kind: "from_their_answers", strength: h.strength, reason: reason([v]), evidence: [evidence([v])], caveats: [] });
      if (h.avoid) avoid.push({ label: h.avoid.en, source: "their_answer", text: h.avoid });
    }
    const any = hints["*"];
    if (any?.idea && rest.length) {
      const fill = (l: keyof I18nText) => any.idea![l].replace("{x}", join(rest, l));
      ideas.push({ idea: { en: fill("en"), vi: fill("vi"), ja: fill("ja") }, kind: "from_their_answers", strength: any.strength, reason: reason(rest), evidence: [evidence(rest)], caveats: [] });
    }
  }
  return { ideas, avoid };
}

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
    // Linked to a connection: what they chose to share with me (empty unless they agreed to "preferences").
    const theirRows = person.connectionSessionId
      ? (await tx.execute<{ user_id: string; question_id: string; answer: Answer }>(sql`select user_id, question_id, answer from comparison_responses(${person.connectionSessionId})`)).rows.filter((r) => r.user_id !== userId)
      : [];
    const theirs = fromTheirAnswers(theirRows, person.nickname);

    const owned = new Set(prefs.filter((p) => p.current.sentiment === "owns").map((p) => fold(p.label)));
    const given = new Set(gifts.map((g) => fold(g.item)));
    const disliked = prefs.filter((p) => p.current.sentiment === "dislike" || p.current.sentiment === "avoid");
    const dislikedFolded = disliked.map((p) => fold(p.label));
    const conflictsWithDislike = (label: string) => dislikedFolded.some((d) => fold(label).includes(d) || d.includes(fold(label)));

    const prefEvidence = (p: PreferenceView): Evidence => ({
      type: "preference",
      id: p.itemId,
      label: p.label,
      sentiment: p.current.sentiment,
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
        idea: { en: p.label, vi: p.label, ja: p.label },
        kind: "wished_item",
        strength: SOURCE_STRENGTH[p.current.source] ?? "weak",
        reason: {
          en: `On their wish list (${src.en}, recorded ${p.current.recordedAt.toISOString().slice(0, 10)}). Not recorded as owned or already given.`,
          vi: `Có trong danh sách mong muốn (${src.vi}, ghi ngày ${p.current.recordedAt.toISOString().slice(0, 10)}). Chưa ghi là đã có hoặc đã tặng.`,
          ja: `欲しいものリストにあります（${src.ja}、${p.current.recordedAt.toISOString().slice(0, 10)}に記録）。持っている・贈ったという記録はありません。`,
        },
        evidence: [prefEvidence(p)],
        caveats: caveatsFor(p.current.source),
      });
    }
    // 1b. From their own answers, unless it clashes with something they dislike.
    for (const c of theirs.ideas) if (!conflictsWithDislike(c.idea.en)) candidates.push(c);
    // 2. Experiences you both want to do.
    for (const e of entries.filter((x) => x.kind === "wish_together")) {
      candidates.push({
        idea: { en: e.body, vi: e.body, ja: e.body },
        kind: "experience_together",
        strength: e.source === "person_stated" ? "strong" : "moderate",
        reason: {
          en: "Something you noted wanting to do together — a shared experience can be a gift.",
          vi: "Điều bạn ghi là muốn cùng làm — một trải nghiệm chung cũng có thể là món quà.",
          ja: "「一緒にしたいこと」として記録したものです。一緒に過ごす体験も贈り物になります。",
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
        idea: { en: tmpl.en.replace("{x}", p.label), vi: tmpl.vi.replace("{x}", p.label), ja: tmpl.ja.replace("{x}", p.label) },
        kind: "related_to_like",
        strength: p.current.sentiment === "love" && p.current.source === "person_stated" ? "moderate" : "weak",
        reason: {
          en: `They ${p.current.sentiment} ${p.label} (${(SOURCE_LABEL[p.current.source] ?? SOURCE_LABEL.unverified!).en}).`,
          vi: `Họ ${p.current.sentiment === "love" ? "rất thích" : "thích"} ${p.label} (${(SOURCE_LABEL[p.current.source] ?? SOURCE_LABEL.unverified!).vi}).`,
          ja: `${p.label}が${p.current.sentiment === "love" ? "大好き" : "好き"}です（${(SOURCE_LABEL[p.current.source] ?? SOURCE_LABEL.unverified!).ja}）。`,
        },
        evidence: [prefEvidence(p)],
        caveats: caveatsFor(p.current.source),
      });
    }
    // 4. Similar to past gifts they loved (but not the same item).
    for (const g of gifts.filter((x) => x.reaction === "loved")) {
      candidates.push({
        idea: { en: `something in the spirit of "${g.item}"`, vi: `món quà theo tinh thần "${g.item}"`, ja: `「${g.item}」に通じる贈り物` },
        kind: "similar_to_loved_gift",
        strength: "moderate",
        reason: {
          en: `They loved "${g.item}"${g.givenOn ? ` (${g.givenOn})` : ""}. Avoid giving the same thing again.`,
          vi: `Họ rất thích "${g.item}"${g.givenOn ? ` (${g.givenOn})` : ""}. Tránh tặng trùng lại.`,
          ja: `「${g.item}」${g.givenOn ? `（${g.givenOn}）` : ""}をとても喜んでくれました。同じものは避けましょう。`,
        },
        evidence: [{ type: "gift", id: g.id, label: g.item }],
        caveats: [],
      });
    }

    const order = { strong: 0, moderate: 1, weak: 2 } as const;
    const kindOrder = { wished_item: 0, from_their_answers: 1, experience_together: 2, similar_to_loved_gift: 3, related_to_like: 4 } as const;
    candidates.sort((a, b) => order[a.strength] - order[b.strength] || kindOrder[a.kind] - kindOrder[b.kind]);

    const today = todayIn(tzRow?.tz ?? "UTC", now);
    const next = dates
      .map((d) => ({ label: d.label, ...nextOccurrence(d.month, d.day, today) }))
      .sort((a, b) => a.daysUntil - b.daysUntil)[0];

    const questionsToAsk: I18nText[] = [];
    if (person.connectionSessionId && theirRows.length === 0) {
      questionsToAsk.push({
        en: `If ${person.nickname} agrees to share "Preferences" in your connection, ideas can come from their own answers too.`,
        vi: `Nếu ${person.nickname} đồng ý chia sẻ "Sở thích" trong kết nối, gợi ý có thể dựa cả vào câu trả lời của họ.`,
        ja: `つながりで${person.nickname}さんが「好み」の共有に同意すると、本人の回答からも提案できます。`,
      });
    }
    if (!prefs.some((p) => p.current.sentiment === "wants")) {
      questionsToAsk.push({
        en: `Has ${person.nickname} mentioned wanting anything recently? Add it as "wants" with the source "they said".`,
        vi: `Gần đây ${person.nickname} có nhắc muốn món gì không? Hãy thêm với trạng thái "muốn có" và nguồn "họ đã nói".`,
        ja: `最近、${person.nickname}さんが欲しいと言っていたものはありますか？「欲しい」「本人が言っていた」として追加してください。`,
      });
    }
    if (!prefs.some((p) => p.current.sentiment === "love" || p.current.sentiment === "like")) {
      questionsToAsk.push({
        en: `What does ${person.nickname} enjoy (food, music, hobbies)? Record a few likes first.`,
        vi: `${person.nickname} thích gì (món ăn, âm nhạc, sở thích)? Hãy ghi lại vài điều họ thích trước.`,
        ja: `${person.nickname}さんの好きなもの（食べもの、音楽、趣味）は？まずいくつか記録してみてください。`,
      });
    }
    if (disliked.length === 0) {
      questionsToAsk.push({
        en: `Is there anything ${person.nickname} dislikes or can't use (allergies, colours, scents)?`,
        vi: `Có điều gì ${person.nickname} không thích hoặc không dùng được (dị ứng, màu sắc, mùi hương) không?`,
        ja: `${person.nickname}さんが苦手なもの・使えないもの（アレルギー、色、香り）はありますか？`,
      });
    }

    return {
      personName: person.nickname,
      candidates,
      avoid: [...disliked.map((p) => ({ label: p.label, source: p.current.source })), ...theirs.avoid],
      usedTheirAnswers: theirRows.length > 0,
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
                ja: "欲しいものの価格は記録されていないため、候補は予算で絞り込んでいません。価格はご自身で確認してください。",
              },
            }
          : null,
      questionsToAsk,
    };
  });
}
