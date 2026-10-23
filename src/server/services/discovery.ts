import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import type { I18nText, QuestionOption, Signal } from "@/content/questions";
import { followUpFor, normalizeAnswer, sameAnswer, type Answer } from "@/lib/discovery/answers";
import { selectQuestion, type HistoryEvent } from "@/lib/discovery/select";
import { todayIn, uuid } from "@/lib/validation/common";
import {
  dailyQuestionAssignments,
  profiles,
  questionDefinitions,
  questionResponses,
  questionVersions,
} from "../db/schema";
import { withUser, type Tx } from "../db/tx";
import { AppError, invalid, notFound } from "../errors";
import { recomputeTendencies } from "./tendencies";

export const MAX_DAILY_SLOTS = 3; // 1 daily question + up to 2 optional extra

export interface QuestionView {
  id: string;
  version: number;
  category: string;
  sensitivity: "low" | "medium" | "high";
  comparable: boolean;
  format: "single" | "multi" | "scale" | "short" | "free";
  prompt: I18nText;
  options: QuestionOption[] | null;
  maxChoices: number | null;
  scale: { min: number; max: number; minLabel: I18nText; maxLabel: I18nText } | null;
  followUps: { whenValue: string; questionId: string }[] | null;
  signals: Signal[] | null;
}

async function loadQuestion(tx: Tx, questionId: string, version?: number): Promise<QuestionView | null> {
  const rows = await tx
    .select({ d: questionDefinitions, v: questionVersions })
    .from(questionDefinitions)
    .innerJoin(questionVersions, eq(questionVersions.questionId, questionDefinitions.id))
    .where(
      and(
        eq(questionDefinitions.id, questionId),
        eq(questionVersions.version, version ?? sql`${questionDefinitions.currentVersion}`),
      ),
    );
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.d.id,
    version: r.v.version,
    category: r.d.category,
    sensitivity: r.d.sensitivity as QuestionView["sensitivity"],
    comparable: r.d.comparable,
    format: r.v.format as QuestionView["format"],
    prompt: r.v.prompt as I18nText,
    options: r.v.options as QuestionOption[] | null,
    maxChoices: r.v.maxChoices,
    scale: r.v.scale as QuestionView["scale"],
    followUps: r.v.followUps as QuestionView["followUps"],
    signals: r.v.signals as Signal[] | null,
  };
}

async function userTz(tx: Tx, userId: string) {
  const [p] = await tx.select({ tz: profiles.timeZone }).from(profiles).where(eq(profiles.userId, userId));
  return p?.tz ?? "UTC";
}

function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86400_000);
}

async function historyFor(tx: Tx, userId: string, today: string, timeZone: string): Promise<HistoryEvent[]> {
  const resp = await tx
    .select({
      questionId: questionResponses.questionId,
      status: questionResponses.status,
      day: sql<string>`to_char(${questionResponses.answeredAt} at time zone ${timeZone}, 'YYYY-MM-DD')`,
    })
    .from(questionResponses)
    .where(eq(questionResponses.userId, userId));
  const offers = await tx
    .select({ questionId: dailyQuestionAssignments.questionId, day: dailyQuestionAssignments.day })
    .from(dailyQuestionAssignments)
    .where(eq(dailyQuestionAssignments.userId, userId));
  return [
    ...resp.map((r) => ({
      questionId: r.questionId,
      kind: (r.status === "answered" ? "answered" : "skipped") as HistoryEvent["kind"],
      daysAgo: daysBetween(today, r.day),
    })),
    ...offers.map((o) => ({ questionId: o.questionId, kind: "offered" as const, daysAgo: daysBetween(today, o.day) })),
  ];
}

async function catalog(tx: Tx) {
  const rows = await tx
    .select({
      id: questionDefinitions.id,
      category: questionDefinitions.category,
      sensitivity: questionDefinitions.sensitivity,
      followUpOnly: questionDefinitions.followUpOnly,
    })
    .from(questionDefinitions)
    .where(eq(questionDefinitions.active, true))
    .orderBy(asc(questionDefinitions.id));
  return rows.map((r) => ({ ...r, sensitivity: r.sensitivity as "low" | "medium" | "high" }));
}

export interface DailySlot {
  slot: number;
  question: QuestionView;
  /** Latest response to this question (any day), if any. */
  latest: { id: string; status: string; answer: Answer | null; answeredAt: Date; privacy: string } | null;
  /** True if it was answered or skipped after being offered. */
  doneToday: boolean;
}

export interface DailyState {
  day: string;
  slots: DailySlot[];
  /** Follow-up question unlocked by a recent answer and not yet answered. */
  followUp: QuestionView | null;
  canRequestMore: boolean;
}

async function latestResponse(tx: Tx, userId: string, questionId: string) {
  const [r] = await tx
    .select()
    .from(questionResponses)
    .where(and(eq(questionResponses.userId, userId), eq(questionResponses.questionId, questionId)))
    .orderBy(desc(questionResponses.answeredAt), desc(questionResponses.id))
    .limit(1);
  return r ?? null;
}

async function assign(tx: Tx, userId: string, day: string, slot: number, timeZone: string): Promise<boolean> {
  const cat = await catalog(tx);
  const history = await historyFor(tx, userId, day, timeZone);
  const todays = await tx
    .select({ q: dailyQuestionAssignments.questionId })
    .from(dailyQuestionAssignments)
    .where(and(eq(dailyQuestionAssignments.userId, userId), eq(dailyQuestionAssignments.day, day)));
  const qid = selectQuestion(cat, history, `${userId}:${day}:${slot}`, todays.map((t) => t.q));
  if (!qid) return false;
  await tx.insert(dailyQuestionAssignments).values({ userId, day, slot, questionId: qid }).onConflictDoNothing();
  return true;
}

/** Today's question(s). Assigns the daily question on first call of the (local) day. */
export async function getDaily(userId: string, now = new Date()): Promise<DailyState> {
  return withUser(userId, async (tx) => {
    const tz = await userTz(tx, userId);
    const day = todayIn(tz, now);
    let rows = await tx
      .select()
      .from(dailyQuestionAssignments)
      .where(and(eq(dailyQuestionAssignments.userId, userId), eq(dailyQuestionAssignments.day, day)))
      .orderBy(asc(dailyQuestionAssignments.slot));
    if (rows.length === 0) {
      await assign(tx, userId, day, 0, tz);
      rows = await tx
        .select()
        .from(dailyQuestionAssignments)
        .where(and(eq(dailyQuestionAssignments.userId, userId), eq(dailyQuestionAssignments.day, day)))
        .orderBy(asc(dailyQuestionAssignments.slot));
    }
    const slots: DailySlot[] = [];
    for (const r of rows) {
      const q = await loadQuestion(tx, r.questionId);
      if (!q) continue;
      const latest = await latestResponse(tx, userId, q.id);
      // Done = answered or skipped after this slot was offered.
      const doneToday = !!latest && latest.answeredAt.getTime() >= r.createdAt.getTime();
      slots.push({
        slot: r.slot,
        question: q,
        latest: latest && {
          id: latest.id,
          status: latest.status,
          answer: latest.answer as Answer | null,
          answeredAt: latest.answeredAt,
          privacy: latest.privacy,
        },
        doneToday,
      });
    }
    const followUp = await pendingFollowUp(tx, userId, tz, day);
    return {
      day,
      slots,
      followUp,
      canRequestMore: rows.length < MAX_DAILY_SLOTS && slots.every((s) => s.doneToday),
    };
  });
}

async function pendingFollowUp(tx: Tx, userId: string, tz: string, day: string): Promise<QuestionView | null> {
  // Answers given today whose question defines a follow-up that hasn't been answered/skipped since.
  const recent = await tx
    .select()
    .from(questionResponses)
    .where(
      and(
        eq(questionResponses.userId, userId),
        eq(questionResponses.status, "answered"),
        gte(questionResponses.answeredAt, sql`now() - interval '2 days'`),
      ),
    )
    .orderBy(desc(questionResponses.answeredAt));
  for (const r of recent) {
    if (todayIn(tz, r.answeredAt) !== day) continue;
    const q = await loadQuestion(tx, r.questionId, r.questionVersion);
    const fid = q && followUpFor(r.answer as Answer, q.followUps);
    if (!fid) continue;
    const after = await tx
      .select({ id: questionResponses.id })
      .from(questionResponses)
      .where(
        and(
          eq(questionResponses.userId, userId),
          eq(questionResponses.questionId, fid),
          gte(questionResponses.answeredAt, r.answeredAt),
        ),
      )
      .limit(1);
    if (after.length === 0) return loadQuestion(tx, fid);
  }
  return null;
}

/** Offer one more question today (optional, max MAX_DAILY_SLOTS per day). */
export async function requestAnotherQuestion(userId: string, now = new Date()) {
  await withUser(userId, async (tx) => {
    const tz = await userTz(tx, userId);
    const day = todayIn(tz, now);
    const rows = await tx
      .select()
      .from(dailyQuestionAssignments)
      .where(and(eq(dailyQuestionAssignments.userId, userId), eq(dailyQuestionAssignments.day, day)));
    if (rows.length >= MAX_DAILY_SLOTS) throw new AppError("daily_limit_reached", 400);
    if (!(await assign(tx, userId, day, rows.length, tz))) throw new AppError("no_more_questions", 400);
  });
}

const answerSchema = z.object({
  questionId: z.string().min(1).max(100),
  questionVersion: z.coerce.number().int().min(1),
  answer: z.unknown(),
  privacy: z.enum(["private", "comparable"]).default("private"),
  /** Required only when the new answer differs from the previous one. */
  changeKind: z.enum(["reanswer", "changed_mind", "correction"]).optional(),
});

export interface AnswerResult {
  responseId: string;
  changedFromPrevious: boolean;
  previousAnswer: Answer | null;
  followUpQuestionId: string | null;
}

/**
 * Store an answer. Never overwrites: each answer is a new row linked to the previous one.
 * If the answer differs from the previous answer, the caller may say why (changed_mind /
 * correction); otherwise it is recorded as a plain re-answer.
 */
export async function answerQuestion(userId: string, input: unknown): Promise<AnswerResult> {
  const data = answerSchema.parse(input);
  return withUser(userId, async (tx) => {
    const q = await loadQuestion(tx, data.questionId, data.questionVersion);
    if (!q) throw notFound();
    let answer: Answer;
    try {
      answer = normalizeAnswer(q, data.answer);
    } catch (e) {
      throw invalid((e as Error).message);
    }
    if (data.privacy === "comparable" && !q.comparable) throw invalid("not_comparable");
    const prev = await latestResponse(tx, userId, q.id);
    const prevAnswer = prev?.status === "answered" ? (prev.answer as Answer) : null;
    const changed = !!prevAnswer && !sameAnswer(prevAnswer, answer);
    const changeKind = !prev ? "first" : changed ? (data.changeKind ?? "reanswer") : "reanswer";
    const [row] = await tx
      .insert(questionResponses)
      .values({
        userId,
        questionId: q.id,
        questionVersion: q.version,
        status: "answered",
        answer,
        changeKind,
        previousResponseId: prev?.id ?? null,
        privacy: data.privacy,
      })
      .returning({ id: questionResponses.id });
    await recomputeTendencies(tx, userId);
    return {
      responseId: row!.id,
      changedFromPrevious: changed,
      previousAnswer: prevAnswer,
      followUpQuestionId: followUpFor(answer, q.followUps),
    };
  });
}

/** Mark why an answer differs from the previous one (asked after the fact: "did your view change?"). */
export async function setChangeKind(userId: string, responseId: string, kind: "changed_mind" | "correction" | "reanswer") {
  const id = uuid.parse(responseId);
  const k = z.enum(["changed_mind", "correction", "reanswer"]).parse(kind);
  await withUser(userId, async (tx) => {
    const r = await tx
      .update(questionResponses)
      .set({ changeKind: k })
      .where(
        and(
          eq(questionResponses.id, id),
          eq(questionResponses.userId, userId),
          sql`${questionResponses.previousResponseId} is not null`,
        ),
      )
      .returning({ id: questionResponses.id });
    if (r.length === 0) throw notFound();
  });
}

export async function skipQuestion(userId: string, questionId: string) {
  const qid = z.string().min(1).max(100).parse(questionId);
  await withUser(userId, async (tx) => {
    const q = await loadQuestion(tx, qid);
    if (!q) throw notFound();
    const prev = await latestResponse(tx, userId, q.id);
    await tx.insert(questionResponses).values({
      userId,
      questionId: q.id,
      questionVersion: q.version,
      status: "skipped",
      answer: null,
      changeKind: prev ? "reanswer" : "first",
      previousResponseId: prev?.id ?? null,
    });
    // A skip after an answer means "no current answer" for this question.
    await recomputeTendencies(tx, userId);
  });
}

export async function setResponsePrivacy(userId: string, responseId: string, privacy: unknown) {
  const id = uuid.parse(responseId);
  const p = z.enum(["private", "comparable"]).parse(privacy);
  await withUser(userId, async (tx) => {
    const [r] = await tx
      .select({ comparable: questionDefinitions.comparable })
      .from(questionResponses)
      .innerJoin(questionDefinitions, eq(questionDefinitions.id, questionResponses.questionId))
      .where(and(eq(questionResponses.id, id), eq(questionResponses.userId, userId)));
    if (!r) throw notFound();
    if (p === "comparable" && !r.comparable) throw invalid("not_comparable");
    await tx.update(questionResponses).set({ privacy: p }).where(eq(questionResponses.id, id));
  });
}

/** Permanently delete a single response (e.g. regretted answer). Tendencies are recomputed. */
export async function deleteResponse(userId: string, responseId: string) {
  const id = uuid.parse(responseId);
  await withUser(userId, async (tx) => {
    // Re-link any later response that pointed at this one so the chain stays intact.
    const [target] = await tx
      .select()
      .from(questionResponses)
      .where(and(eq(questionResponses.id, id), eq(questionResponses.userId, userId)));
    if (!target) throw notFound();
    await tx
      .update(questionResponses)
      .set({ previousResponseId: target.previousResponseId })
      .where(and(eq(questionResponses.userId, userId), eq(questionResponses.previousResponseId, id)));
    await tx.delete(questionResponses).where(eq(questionResponses.id, id));
    await recomputeTendencies(tx, userId);
  });
}

export interface HistoryItem {
  question: QuestionView;
  responses: {
    id: string;
    status: string;
    answer: Answer | null;
    changeKind: string;
    privacy: string;
    answeredAt: Date;
    questionVersion: number;
  }[];
}

/** All of the user's responses grouped by question, newest activity first. */
export async function getHistory(userId: string, opts: { category?: string } = {}): Promise<HistoryItem[]> {
  return withUser(userId, async (tx) => {
    const rows = await tx
      .select()
      .from(questionResponses)
      .where(eq(questionResponses.userId, userId))
      .orderBy(desc(questionResponses.answeredAt), desc(questionResponses.id));
    const ids = [...new Set(rows.map((r) => r.questionId))];
    const items: HistoryItem[] = [];
    for (const qid of ids) {
      const q = await loadQuestion(tx, qid);
      if (!q || (opts.category && q.category !== opts.category)) continue;
      items.push({
        question: q,
        responses: rows
          .filter((r) => r.questionId === qid)
          .map((r) => ({
            id: r.id,
            status: r.status,
            answer: r.answer as Answer | null,
            changeKind: r.changeKind,
            privacy: r.privacy,
            answeredAt: r.answeredAt,
            questionVersion: r.questionVersion,
          })),
      });
    }
    return items;
  });
}

/** Answer any question by id (used for follow-ups and re-answering from history). */
export async function getQuestion(userId: string, questionId: string) {
  return withUser(userId, async (tx) => {
    const q = await loadQuestion(tx, z.string().max(100).parse(questionId));
    if (!q) throw notFound();
    const latest = await latestResponse(tx, userId, q.id);
    return { question: q, latest };
  });
}

export async function questionsByIds(tx: Tx, ids: string[]) {
  if (ids.length === 0) return [];
  return tx.select().from(questionDefinitions).where(inArray(questionDefinitions.id, ids));
}
