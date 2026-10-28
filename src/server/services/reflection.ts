/**
 * "Look back" reflections over the user's own records.
 *
 * 1. Evidence is retrieved deterministically (SQL over current, non-deleted records).
 * 2. A deterministic summary is always produced from that evidence.
 * 3. Optionally (user opt-in + API key), Claude writes a short reflection that must cite
 *    evidence ids; output citing unknown ids, or no ids, is discarded. AI output is never
 *    stored, so deleted records can never be resurfaced by a stale summary.
 */
import { and, asc, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import type { I18nText } from "@/content/questions";
import { LOCALIZED_BANK } from "@/content/questions-i18n";
import type { Answer } from "@/lib/discovery/answers";
import type { Locale } from "@/lib/i18n/locales";
import { uuid } from "@/lib/validation/common";
import { enforceRateLimit } from "../auth/rate-limit";
import { generateStructured, type AiFailure } from "../ai/claude";
import {
  memoryEntries,
  memoryEntryVersions,
  memoryPeople,
  memoryTags,
  people,
  profiles,
  questionResponses,
  relationshipEntries,
  relationshipEvents,
} from "../db/schema";
import { withUser, type Tx } from "../db/tx";
import { notFound } from "../errors";

export const REFLECTION_KINDS = ["changes", "values", "patterns", "past_beliefs", "relationship"] as const;
export type ReflectionKind = (typeof REFLECTION_KINDS)[number];

export const REFLECTION_QUESTIONS: Record<ReflectionKind, I18nText> = {
  changes: { en: "What has changed compared to before?", vi: "So với trước đây, điều gì đã thay đổi?", ja: "以前と比べて、何が変わった？" },
  values: { en: "What have I been valuing?", vi: "Mình đã và đang coi trọng điều gì?", ja: "自分が大切にしてきたものは何？" },
  patterns: { en: "Are there worries or behaviours I keep repeating?", vi: "Có nỗi lo hay hành vi nào mình hay lặp lại không?", ja: "繰り返している悩みや行動パターンはある？" },
  past_beliefs: { en: "What did my past self believe?", vi: "Mình của ngày trước đã tin vào điều gì?", ja: "過去の自分は何を信じていた？" },
  relationship: { en: "How has my relationship with this person changed?", vi: "Mối quan hệ của mình với người này đã thay đổi thế nào?", ja: "この人との関係はどう変わってきた？" },
};

export interface EvidenceItem {
  ref: string; // E1, E2 … (stable within one reflection)
  recordType: "memory" | "memory_version" | "response" | "relationship_entry" | "relationship_event";
  recordId: string;
  date: string;
  excerpt: string;
}

export interface Reflection {
  kind: ReflectionKind;
  question: I18nText;
  status: "ok" | "insufficient";
  evidence: EvidenceItem[];
  /** Deterministic statements, each referencing evidence refs. */
  findings: { text: I18nText; refs: string[] }[];
  ai: { text: string; refs: string[] } | null;
  aiUnavailableReason: AiFailure | "not_opted_in" | "not_requested" | null;
}

const QMAP = new Map(LOCALIZED_BANK.map((q) => [q.id, q]));
const KIND_LABEL: Record<string, I18nText> = {
  note: { en: "note", vi: "đôi dòng", ja: "ひとこと" },
  daily: { en: "everyday", vi: "thường ngày", ja: "日常" },
  memo: { en: "memo", vi: "ghi nhớ", ja: "メモ" },
  fun: { en: "funny", vi: "vui", ja: "おもしろ" },
  like: { en: "liked or found", vi: "thích · phát hiện", ja: "好き・発見" },
  thought: { en: "thought", vi: "suy nghĩ", ja: "考え" },
  feeling: { en: "feeling", vi: "cảm xúc", ja: "気持ち" },
  memory: { en: "memory", vi: "kỷ niệm", ja: "思い出" },
  decision: { en: "decision", vi: "quyết định", ja: "決断" },
  goal: { en: "goal", vi: "mục tiêu", ja: "目標" },
  dream: { en: "dream", vi: "ước mơ", ja: "夢" },
  regret: { en: "regret", vi: "hối tiếc", ja: "後悔" },
  achievement: { en: "achievement", vi: "thành tựu", ja: "達成" },
  value: { en: "value", vi: "giá trị", ja: "価値観" },
  letter_to_future: { en: "letter to the future", vi: "thư gửi tương lai", ja: "未来への手紙" },
};
const kindLabel = (k: string) => KIND_LABEL[k] ?? { en: k, vi: k, ja: k };
const MAX_EXCERPT = 280;
const clip = (s: string) => (s.length > MAX_EXCERPT ? `${s.slice(0, MAX_EXCERPT)}…` : s);
const day = (d: Date | string) => (typeof d === "string" ? d : d.toISOString().slice(0, 10));

function answerText(questionId: string, a: Answer | null, locale: Locale): string {
  if (!a) return "—";
  const q = QMAP.get(questionId);
  const label = (v: string) => q?.options?.find((o) => o.value === v)?.label[locale] ?? v;
  if ("choice" in a) return label(a.choice);
  if ("choices" in a) return a.choices.map(label).join(", ");
  if ("scale" in a) return String(a.scale);
  return a.text;
}

class EvidenceBag {
  items: EvidenceItem[] = [];
  add(e: Omit<EvidenceItem, "ref">): string {
    const existing = this.items.find((x) => x.recordType === e.recordType && x.recordId === e.recordId);
    if (existing) return existing.ref;
    const ref = `E${this.items.length + 1}`;
    this.items.push({ ...e, ref, excerpt: clip(e.excerpt) });
    return ref;
  }
}

async function currentMemories(tx: Tx, userId: string, opts: { kinds?: string[]; ids?: string[] } = {}) {
  const conds = [eq(memoryEntries.userId, userId), sql`(${memoryEntries.revealOn} is null or ${memoryEntries.revealOn} <= current_date)`];
  if (opts.kinds) conds.push(sql`${memoryEntries.labels} && ${`{${opts.kinds.join(",")}}`}::text[]`);
  if (opts.ids) conds.push(inArray(memoryEntries.id, opts.ids.length ? opts.ids : ["00000000-0000-0000-0000-000000000000"]));
  return tx
    .select({ e: memoryEntries, v: memoryEntryVersions })
    .from(memoryEntries)
    .innerJoin(memoryEntryVersions, and(eq(memoryEntryVersions.entryId, memoryEntries.id), eq(memoryEntryVersions.version, memoryEntries.currentVersion)))
    .where(and(...conds))
    .orderBy(asc(sql`coalesce(${memoryEntries.occurredOn}, ${memoryEntries.createdAt}::date)`));
}

async function gather(tx: Tx, userId: string, kind: ReflectionKind, locale: Locale, personId?: string) {
  const bag = new EvidenceBag();
  const findings: Reflection["findings"] = [];

  if (kind === "changes" || kind === "past_beliefs") {
    // Answers that changed over time (both versions kept in history).
    const changed = await tx
      .select()
      .from(questionResponses)
      .where(and(eq(questionResponses.userId, userId), sql`${questionResponses.previousResponseId} is not null`, eq(questionResponses.status, "answered")))
      .orderBy(desc(questionResponses.answeredAt));
    for (const r of changed) {
      const [prev] = await tx.select().from(questionResponses).where(eq(questionResponses.id, r.previousResponseId!));
      if (!prev || prev.status !== "answered" || JSON.stringify(prev.answer) === JSON.stringify(r.answer)) continue;
      if (kind === "past_beliefs" && QMAP.get(r.questionId)?.category !== "values" && QMAP.get(r.questionId)?.category !== "personality") continue;
      const q = QMAP.get(r.questionId);
      const prompt = q?.prompt[locale] ?? r.questionId;
      const before = bag.add({ recordType: "response", recordId: prev.id, date: day(prev.answeredAt), excerpt: `${prompt} → ${answerText(r.questionId, prev.answer as Answer, locale)}` });
      const after = bag.add({ recordType: "response", recordId: r.id, date: day(r.answeredAt), excerpt: `${prompt} → ${answerText(r.questionId, r.answer as Answer, locale)}` });
      const why = r.changeKind === "correction" ? { en: " (you marked this as a correction)", vi: " (bạn đánh dấu là sửa lỗi)", ja: "（訂正として記録）" } : r.changeKind === "changed_mind" ? { en: " (you said your view changed)", vi: " (bạn cho biết suy nghĩ đã thay đổi)", ja: "（考えが変わったと回答）" } : { en: "", vi: "", ja: "" };
      findings.push({
        refs: [before, after],
        text: {
          en: `“${q?.prompt.en ?? r.questionId}”: ${answerText(r.questionId, prev.answer as Answer, "en")} (${day(prev.answeredAt)}) → ${answerText(r.questionId, r.answer as Answer, "en")} (${day(r.answeredAt)})${why.en}.`,
          vi: `“${q?.prompt.vi ?? r.questionId}”: ${answerText(r.questionId, prev.answer as Answer, "vi")} (${day(prev.answeredAt)}) → ${answerText(r.questionId, r.answer as Answer, "vi")} (${day(r.answeredAt)})${why.vi}.`,
          ja: `「${q?.prompt.ja ?? r.questionId}」：${answerText(r.questionId, prev.answer as Answer, "ja")}（${day(prev.answeredAt)}）→ ${answerText(r.questionId, r.answer as Answer, "ja")}（${day(r.answeredAt)}）${why.ja}`,
        },
      });
    }
    // Rewritten memories: first version vs current.
    const rewritten = await tx
      .select({ e: memoryEntries })
      .from(memoryEntries)
      .where(and(eq(memoryEntries.userId, userId), gt(memoryEntries.currentVersion, 1), sql`(${memoryEntries.revealOn} is null or ${memoryEntries.revealOn} <= current_date)`, ...(kind === "past_beliefs" ? [sql`${memoryEntries.labels} && '{value,decision,goal,dream}'::text[]`] : [])));
    for (const { e } of rewritten) {
      const vs = await tx.select().from(memoryEntryVersions).where(eq(memoryEntryVersions.entryId, e.id)).orderBy(asc(memoryEntryVersions.version));
      const first = vs[0]!;
      const last = vs.at(-1)!;
      const a = bag.add({ recordType: "memory_version", recordId: first.id, date: day(first.createdAt), excerpt: first.body });
      const b = bag.add({ recordType: "memory_version", recordId: last.id, date: day(last.createdAt), excerpt: last.body });
      findings.push({
        refs: [a, b],
        text: {
          en: `You rewrote an entry ${vs.length - 1} time(s): first on ${day(first.createdAt)}, latest on ${day(last.createdAt)}.`,
          vi: `Bạn đã viết lại một ghi chép ${vs.length - 1} lần: lần đầu ${day(first.createdAt)}, gần nhất ${day(last.createdAt)}.`,
          ja: `ある記録を${vs.length - 1}回書き直しました（最初 ${day(first.createdAt)}、最新 ${day(last.createdAt)}）。`,
        },
      });
    }
  }

  if (kind === "values") {
    const latest = await tx.execute<{ id: string; question_id: string; answer: Answer; answered_at: Date; status: string }>(sql`
      select distinct on (question_id) id, question_id, answer, answered_at, status from ${questionResponses}
      where user_id = ${userId} order by question_id, answered_at desc, id desc`);
    for (const r of latest.rows) {
      if (r.status !== "answered" || QMAP.get(r.question_id)?.category !== "values") continue;
      const q = QMAP.get(r.question_id)!;
      const ref = bag.add({ recordType: "response", recordId: r.id, date: day(new Date(r.answered_at)), excerpt: `${q.prompt[locale]} → ${answerText(r.question_id, r.answer, locale)}` });
      findings.push({ refs: [ref], text: { en: `${q.prompt.en} → ${answerText(r.question_id, r.answer, "en")}`, vi: `${q.prompt.vi} → ${answerText(r.question_id, r.answer, "vi")}`, ja: `${q.prompt.ja} → ${answerText(r.question_id, r.answer, "ja")}` } });
    }
    for (const { e, v } of await currentMemories(tx, userId, { kinds: ["value", "decision"] })) {
      const ref = bag.add({ recordType: "memory", recordId: e.id, date: e.occurredOn ?? day(e.createdAt), excerpt: `${v.title ? `${v.title}: ` : ""}${v.body}${v.reason ? ` — ${v.reason}` : ""}` });
      findings.push({ refs: [ref], text: { en: `You wrote (${kindLabel(e.labels[0] ?? e.kind).en}): “${clip(v.title ?? v.body)}”`, vi: `Bạn đã viết (${kindLabel(e.labels[0] ?? e.kind).vi}): “${clip(v.title ?? v.body)}”`, ja: `あなたの記録（${kindLabel(e.labels[0] ?? e.kind).ja}）：「${clip(v.title ?? v.body)}」` } });
    }
  }

  if (kind === "patterns") {
    const tagCounts = await tx
      .select({ tag: memoryTags.tag, n: sql<number>`count(*)::int`, ids: sql<string[]>`array_agg(${memoryTags.entryId})` })
      .from(memoryTags)
      .where(eq(memoryTags.userId, userId))
      .groupBy(memoryTags.tag)
      .having(sql`count(*) >= 3`);
    for (const t of tagCounts) {
      const mems = await currentMemories(tx, userId, { ids: t.ids });
      const refs = mems.map(({ e, v }) => bag.add({ recordType: "memory", recordId: e.id, date: e.occurredOn ?? day(e.createdAt), excerpt: v.body }));
      if (refs.length < 3) continue;
      findings.push({ refs, text: { en: `The tag “${t.tag}” appears in ${refs.length} entries.`, vi: `Thẻ “${t.tag}” xuất hiện trong ${refs.length} ghi chép.`, ja: `タグ「${t.tag}」が${refs.length}件の記録に出てきます。` } });
    }
    const hard = await currentMemories(tx, userId, { kinds: ["feeling", "regret", "thought"] });
    const regrets = hard.filter(({ e }) => e.labels.includes("regret"));
    if (regrets.length >= 2) {
      const refs = regrets.map(({ e, v }) => bag.add({ recordType: "memory", recordId: e.id, date: e.occurredOn ?? day(e.createdAt), excerpt: v.body }));
      findings.push({ refs, text: { en: `You recorded ${regrets.length} regrets.`, vi: `Bạn đã ghi lại ${regrets.length} điều hối tiếc.`, ja: `後悔を${regrets.length}件記録しています。` } });
    }
  }

  if (kind === "relationship") {
    const pid = uuid.parse(personId);
    const [p] = await tx.select().from(people).where(and(eq(people.id, pid), eq(people.userId, userId)));
    if (!p) throw notFound();
    const linked = await tx.select({ id: memoryPeople.entryId }).from(memoryPeople).where(eq(memoryPeople.personId, pid));
    const byYear = new Map<string, string[]>();
    const push = (date: string, ref: string) => {
      const y = date.slice(0, 4);
      byYear.set(y, [...(byYear.get(y) ?? []), ref]);
    };
    for (const { e, v } of await currentMemories(tx, userId, { ids: linked.map((l) => l.id) })) {
      const d = e.occurredOn ?? day(e.createdAt);
      push(d, bag.add({ recordType: "memory", recordId: e.id, date: d, excerpt: v.body }));
    }
    for (const ev of await tx.select().from(relationshipEvents).where(eq(relationshipEvents.personId, pid))) {
      const d = ev.occurredOn ?? day(ev.createdAt);
      push(d, bag.add({ recordType: "relationship_event", recordId: ev.id, date: d, excerpt: `${ev.title}${ev.place ? ` @ ${ev.place}` : ""}` }));
    }
    for (const en of await tx.select().from(relationshipEntries).where(eq(relationshipEntries.personId, pid))) {
      const d = en.occurredOn ?? day(en.createdAt);
      push(d, bag.add({ recordType: "relationship_entry", recordId: en.id, date: d, excerpt: `[${en.kind}] ${en.body}` }));
    }
    for (const [y, refs] of [...byYear].sort(([a], [b]) => a.localeCompare(b))) {
      findings.push({ refs, text: { en: `${y}: ${refs.length} record(s) involving ${p.nickname}.`, vi: `${y}: ${refs.length} ghi chép liên quan đến ${p.nickname}.`, ja: `${y}年：${p.nickname}さんに関する記録が${refs.length}件。` } });
    }
  }
  return { evidence: bag.items, findings };
}

const aiSchema = z.object({
  insufficient: z.boolean(),
  answer: z.string().max(2000),
  citations: z.array(z.string()).max(40),
});

const SYSTEM_PROMPT = `You help a person look back on their OWN life records in a personal journal app.
Rules:
- Use only the evidence items provided. Every claim must cite evidence refs (like E3) in "citations" and inline in the answer.
- If the evidence does not support an answer to the question, set "insufficient" to true and say plainly that there is not enough information. Do not fill gaps with guesses.
- Do not diagnose medical or psychological conditions, and do not judge the person. Describe, don't prescribe.
- Do not predict the future.
- Keep it under 150 words, warm and plain. Write in the requested language.`;

export async function reflect(
  userId: string,
  input: { kind: unknown; personId?: unknown; locale: Locale; useAi?: boolean },
): Promise<Reflection> {
  const kind = z.enum(REFLECTION_KINDS).parse(input.kind);
  const personId = kind === "relationship" ? uuid.parse(input.personId) : undefined;
  const { evidence, findings, optIn } = await withUser(userId, async (tx) => {
    const [p] = await tx.select({ ai: profiles.aiOptIn }).from(profiles).where(eq(profiles.userId, userId));
    return { ...(await gather(tx, userId, kind, input.locale, personId)), optIn: p?.ai ?? false };
  });
  const base: Reflection = {
    kind,
    question: REFLECTION_QUESTIONS[kind],
    status: evidence.length ? "ok" : "insufficient",
    evidence,
    findings,
    ai: null,
    aiUnavailableReason: input.useAi ? null : "not_requested",
  };
  if (!input.useAi || evidence.length === 0) return base;
  if (!optIn) return { ...base, aiUnavailableReason: "not_opted_in" };
  await enforceRateLimit("ai", userId);
  const userMsg = [
    `Language: ${{ vi: "Vietnamese", en: "English", ja: "Japanese" }[input.locale]}`,
    `Question: ${REFLECTION_QUESTIONS[kind][input.locale]}`,
    "Evidence (the person's own records):",
    ...evidence.map((e) => `${e.ref} [${e.recordType}, ${e.date}]: ${e.excerpt}`),
  ].join("\n");
  const r = await generateStructured({ system: SYSTEM_PROMPT, user: userMsg, schema: aiSchema });
  if (!r.ok) return { ...base, aiUnavailableReason: r.reason };
  const valid = validateAiOutput(r.data, evidence);
  return valid ? { ...base, ai: valid } : { ...base, aiUnavailableReason: "invalid_output" };
}

/** Accept AI output only if it cites at least one ref and every ref (listed or inline) exists. */
export function validateAiOutput(out: z.infer<typeof aiSchema>, evidence: EvidenceItem[]): { text: string; refs: string[] } | null {
  const known = new Set(evidence.map((e) => e.ref));
  const inline = [...out.answer.matchAll(/\bE\d+\b/g)].map((m) => m[0]);
  const all = [...new Set([...out.citations, ...inline])];
  if (all.some((r) => !known.has(r))) return null;
  if (out.insufficient) return { text: out.answer, refs: all };
  if (all.length === 0) return null;
  return { text: out.answer, refs: all };
}

export async function setAiOptIn(userId: string, optIn: boolean) {
  await withUser(userId, (tx) => tx.update(profiles).set({ aiOptIn: optIn, updatedAt: new Date() }).where(eq(profiles.userId, userId)));
}
