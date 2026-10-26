/**
 * The first-run guide: your Tử Vi chart, three questions from three chapters, a few words
 * for the people who matter, then connecting with one. Finishing or skipping it is remembered (profiles.onboarded_at).
 */
import { and, desc, eq } from "drizzle-orm";
import { CHAPTER_INFO, chapterOf, type Chapter } from "@/content/axes";
import { LOCALIZED_BANK } from "@/content/questions-i18n";
import type { Answer } from "@/lib/discovery/answers";
import { answerLabel } from "@/lib/discovery/format";
import type { Locale } from "@/lib/i18n/locales";
import { profiles, questionResponses, tuviCharts } from "../db/schema";
import { withUser } from "../db/tx";
import { answeredQuestionIds } from "./discovery";
import { audit } from "./audit";

/**
 * Three questions from three chapters, easy to deep: what you love, how you decide, and what
 * you want next. Each puts a first piece in its chapter (and something to tell the people who matter).
 */
export const SEED_QUESTIONS = ["l.place_relax", "p.decide", "fut.one_thing"] as const;

export interface OnboardingState {
  done: boolean;
  /** Seed questions not answered yet, in order. */
  left: string[];
  bio: string | null;
  /** A Tử Vi chart exists (the guide's chart step is done). */
  hasChart: boolean;
}

export async function onboardingState(userId: string): Promise<OnboardingState> {
  const [p] = await withUser(userId, (tx) => tx.select({ at: profiles.onboardedAt, bio: profiles.bio }).from(profiles).where(eq(profiles.userId, userId)));
  const [chart] = await withUser(userId, (tx) => tx.select({ id: tuviCharts.id }).from(tuviCharts).where(and(eq(tuviCharts.userId, userId), eq(tuviCharts.isCurrent, true))));
  const answered = await answeredQuestionIds(userId);
  return {
    done: !!p?.at,
    left: SEED_QUESTIONS.filter((q) => !answered.has(q)),
    bio: p?.bio ?? null,
    hasChart: !!chart,
  };
}

/** Close Home's getting-started checklist for good (what is left stays doable from each page). */
export async function dismissStarter(userId: string) {
  await withUser(userId, async (tx) => {
    await tx.update(profiles).set({ starterDismissedAt: new Date() }).where(eq(profiles.userId, userId));
    await audit(tx, userId, "onboarding.starter_dismissed");
  });
}

export interface SeedPiece {
  chapter: Chapter;
  chapterTitle: string;
  icon: string;
  prompt: string;
  answer: string;
}

/** The pieces the guide's questions placed: each chapter, what was asked, and your answer in words. */
export async function seedPieces(userId: string, locale: Locale): Promise<SeedPiece[]> {
  const out: SeedPiece[] = [];
  for (const id of SEED_QUESTIONS) {
    const q = LOCALIZED_BANK.find((x) => x.id === id);
    if (!q) continue;
    const [r] = await withUser(userId, (tx) =>
      tx.select({ status: questionResponses.status, answer: questionResponses.answer }).from(questionResponses)
        .where(and(eq(questionResponses.userId, userId), eq(questionResponses.questionId, id)))
        .orderBy(desc(questionResponses.answeredAt), desc(questionResponses.id)).limit(1),
    );
    if (r?.status !== "answered" || !r.answer) continue;
    const chapter = chapterOf(q);
    out.push({ chapter, chapterTitle: CHAPTER_INFO[chapter].title[locale], icon: CHAPTER_INFO[chapter].icon, prompt: q.prompt[locale], answer: answerLabel(q.options ?? null, r.answer as Answer, locale) });
  }
  return out;
}

export async function finishOnboarding(userId: string) {
  await withUser(userId, async (tx) => {
    await tx.update(profiles).set({ onboardedAt: new Date() }).where(eq(profiles.userId, userId));
    await audit(tx, userId, "onboarding.finished");
  });
}

/** The guide step to come back to: the chart, the three questions, the bio, then the end. */
export function resumeStep(st: OnboardingState): number {
  if (!st.hasChart) return 2;
  if (st.left.length > 0) return 4;
  if (!st.bio) return 5;
  return 6;
}
