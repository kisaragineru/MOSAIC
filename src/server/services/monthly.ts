import { SELF_LABELS } from "@/lib/labels";
/**
 * The monthly look back: what the user answered and recorded in one calendar month (in their own
 * time zone), how it compares with the month before, and a place
 * to write a few lines about it. Read-only over existing data; writing back is an ordinary record.
 */
import { cache } from "react";
import { eq, sql } from "drizzle-orm";
import { LOCALIZED_BANK } from "@/content/questions-i18n";
import type { TendencyKey } from "@/content/questions";
import { chapterOf, type Chapter } from "@/content/axes";
import type { Answer } from "@/lib/discovery/answers";
import { answerLabel } from "@/lib/discovery/format";
import type { Locale } from "@/lib/i18n/locales";
import { todayIn } from "@/lib/validation/common";
import { en } from "@/lib/i18n/messages/en";
import { ja } from "@/lib/i18n/messages/ja";
import { vi } from "@/lib/i18n/messages/vi";
import { profiles } from "../db/schema";
import { withUser } from "../db/tx";
import { createMemory, listMemories, type MemorySummary } from "./memories";
import { listTendencies } from "./tendencies";

export interface Month {
  year: number;
  month: number;
}

export const monthKey = (m: Month) => `${m.year}-${String(m.month).padStart(2, "0")}`;
export function parseMonth(s: string | undefined): Month | null {
  const m = /^(\d{4})-(\d{2})$/.exec(s ?? "");
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  return month >= 1 && month <= 12 && year >= 1900 && year <= 2200 ? { year, month } : null;
}
export const shiftMonth = (m: Month, by: number): Month => {
  const i = m.year * 12 + (m.month - 1) + by;
  return { year: Math.floor(i / 12), month: (i % 12) + 1 };
};
const firstDay = (m: Month) => `${monthKey(m)}-01`;
const lastDay = (m: Month) => {
  const n = shiftMonth(m, 1);
  return new Date(Date.UTC(n.year, n.month - 1, 0)).toISOString().slice(0, 10);
};

export interface MonthReport {
  month: Month;
  /** The user's time zone, for showing times. */
  timeZone: string;
  current: boolean;
  answers: number;
  records: number;
  pieces: number;
  days: number;
  previousPieces: number;
  highlights: MemorySummary[];
  /** The look backs written for this month (newest first), as prompt / answer pairs. */
  lookBacks: { id: string; createdAt: Date; sections: { prompt: string; answer: string }[] }[];
  /** Every question answered in the month, its latest answer there, newest first. */
  answered: AnsweredInMonth[];
  deepened: TendencyKey[];
}

export interface AnsweredInMonth {
  questionId: string;
  chapter: Chapter;
  prompt: string;
  answer: string;
  /** First time ever, changed (the user said their view changed), or answered again. */
  how: "first" | "changed" | "again";
  /** The answer before this one, when it differs. */
  before: string | null;
  /** Their private "why", shown only to them. */
  note: string | null;
  answeredAt: Date;
}

const timeZoneOf = cache(async (userId: string) => {
  return withUser(userId, async (tx) => (await tx.select({ tz: profiles.timeZone }).from(profiles).where(eq(profiles.userId, userId)))[0]?.tz ?? "UTC");
});

/** This month in the user's time zone. */
export async function thisMonth(userId: string, now = new Date()): Promise<Month> {
  const [y, m] = todayIn(await timeZoneOf(userId), now).split("-").map(Number) as [number, number];
  return { year: y, month: m };
}

const QMETA = new Map(LOCALIZED_BANK.map((q) => [q.id, q]));

async function responsesIn(userId: string, tz: string, m: Month) {
  return withUser(userId, async (tx) =>
    (
      await tx.execute<{ id: string; question_id: string; answer: Answer | null; change_kind: string; note: string | null; answered_at: string; before: Answer | null; first: boolean }>(sql`
        select r.id, r.question_id, r.answer, r.change_kind, r.note, r.answered_at,
               (select p.answer from question_responses p where p.id = r.previous_response_id and p.status = 'answered') as before,
               not exists (select 1 from question_responses p where p.user_id = r.user_id and p.question_id = r.question_id
                           and p.status = 'answered' and (p.answered_at, p.id) < (r.answered_at, r.id)) as first
        from question_responses r
        where r.user_id = ${userId} and r.status = 'answered'
          and (r.answered_at at time zone ${tz})::date between ${firstDay(m)}::date and ${lastDay(m)}::date
        order by r.answered_at`)
    ).rows,
  );
}

export async function monthReport(userId: string, m: Month, locale: Locale, now = new Date()): Promise<MonthReport> {
  const tz = await timeZoneOf(userId);
  const prev = shiftMonth(m, -1);
  const [answers, prevAnswers] = [await responsesIn(userId, tz, m), await responsesIn(userId, tz, prev)];
  const records = (await listMemories(userId, { from: firstDay(m), to: lastDay(m), limit: 200 })).filter((r) => !r.sealed);
  const prevRecords = (await listMemories(userId, { from: firstDay(prev), to: lastDay(prev), limit: 200 })).filter((r) => !r.sealed);
  const lookBacks = records.filter(isLookBack);
  const dayOf = (r: MemorySummary) => r.occurredOn ?? todayIn(tz, r.createdAt);

  const label = (qid: string, a: Answer | null) => {
    const q = QMETA.get(qid);
    return { prompt: q?.prompt[locale] ?? qid, answer: answerLabel(q, a, locale) };
  };
  const answeredIds = new Set(answers.map((a) => a.question_id));
  const deepened = (await listTendencies(userId))
    .filter((c) => c.userStatus !== "rejected" && (c.state === "consistent" || c.state === "emerging") && c.evidence.some((e) => answeredIds.has(e.questionId)))
    .map((c) => c.claimKey);
  const current = monthKey(await thisMonth(userId, now)) === monthKey(m);

  return {
    month: m,
    timeZone: tz,
    current,
    answers: answers.length,
    records: records.length,
    pieces: answers.length + records.length,
    days: new Set(records.map(dayOf)).size,
    previousPieces: prevAnswers.length + prevRecords.length,
    lookBacks: lookBacks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).map((r) => ({ id: r.id, createdAt: r.createdAt, sections: lookBackSections(r.body ?? "") })),
    highlights: records.filter((r) => !isLookBack(r)).filter((r) => r.labels.some((l) => l !== "thought" && (SELF_LABELS as readonly string[]).includes(l)) || r.feeling || r.title).slice(0, 8),
    answered: answeredIn(answers, locale),
    deepened,
  };
}

// The look back's tag in any language (the user may have switched since writing it).
const LOOKBACK_TAGS = new Set([en, vi, ja].map((d) => d.monthly.tag.toLowerCase()));
const isLookBack = (r: MemorySummary) => r.tags.some((x) => LOOKBACK_TAGS.has(x.toLowerCase()));

/** "■ prompt\nanswer" blocks, as saveLookBack writes them (edited text that lost the marks stays one block). */
export function lookBackSections(body: string): { prompt: string; answer: string }[] {
  const parts = body.split(/^■ /m).filter((x) => x.trim());
  if (!body.trimStart().startsWith("■ ")) return [{ prompt: "", answer: body.trim() }];
  return parts.map((p) => {
    const [prompt, ...rest] = p.split("\n");
    return { prompt: prompt!.trim(), answer: rest.join("\n").trim() };
  });
}

/** One entry per question, its last answer in the month; "first" if the month holds its first answer. */
function answeredIn(rows: Awaited<ReturnType<typeof responsesIn>>, locale: Locale): AnsweredInMonth[] {
  const byQ = new Map<string, AnsweredInMonth>();
  for (const r of rows) {
    const q = QMETA.get(r.question_id);
    const text = (a: Answer | null) => answerLabel(q, a, locale);
    const firstInMonth = byQ.get(r.question_id)?.how === "first" || r.first;
    const before = r.before && JSON.stringify(r.before) !== JSON.stringify(r.answer) ? text(r.before) : null;
    byQ.set(r.question_id, {
      questionId: r.question_id,
      chapter: q ? chapterOf(q) : "story",
      prompt: q?.prompt[locale] ?? r.question_id,
      answer: text(r.answer),
      how: firstInMonth ? "first" : r.change_kind === "changed_mind" ? "changed" : "again",
      before: firstInMonth ? null : before,
      note: r.note,
      answeredAt: new Date(r.answered_at),
    });
  }
  return [...byQ.values()].sort((a, b) => b.answeredAt.getTime() - a.answeredAt.getTime());
}

/** Months with any answer or record, newest first (at most two years back). */
export async function activeMonths(userId: string): Promise<Month[]> {
  const tz = await timeZoneOf(userId);
  return withUser(userId, async (tx) => {
    const r = await tx.execute<{ m: string }>(sql`
      select distinct m from (
        select to_char(answered_at at time zone ${tz}, 'YYYY-MM') as m from question_responses where user_id = ${userId} and status = 'answered'
        union
        select to_char(coalesce(occurred_on, (created_at at time zone ${tz})::date), 'YYYY-MM') from memory_entries where user_id = ${userId}
      ) x order by m desc limit 24`);
    return r.rows.map((x) => parseMonth(x.m)).filter((x): x is Month => !!x);
  });
}

/** In the first week of a month, the month just ended (if anything happened in it). */
export async function lookBackDue(userId: string, now = new Date()): Promise<Month | null> {
  const tz = await timeZoneOf(userId);
  const day = Number(todayIn(tz, now).slice(8, 10));
  if (day > 7) return null;
  const last = shiftMonth(await thisMonth(userId, now), -1);
  return (await activeMonths(userId)).some((m) => monthKey(m) === monthKey(last)) ? last : null;
}

/** Save the look back as an ordinary record, dated the month's last day (or today). */
export async function saveLookBack(userId: string, m: Month, prompts: string[], answers: string[], title: string, tag: string) {
  const body = prompts
    .map((p, i) => ({ p, a: (answers[i] ?? "").trim() }))
    .filter((x) => x.a)
    .map((x) => `■ ${x.p}\n${x.a}`)
    .join("\n\n");
  const tz = await timeZoneOf(userId);
  const today = todayIn(tz);
  const end = lastDay(m);
  return createMemory(userId, { kind: "thought", title, body, occurredOn: end < today ? end : today, tags: [tag] });
}
