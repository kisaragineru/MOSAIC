import Link from "next/link";
import { notFound } from "next/navigation";
import { FeedbackPrompt } from "@/components/feedback-prompt";
import { LikesFollowUp } from "@/components/likes-follow-up";
import { Flash } from "@/components/flash";
import { QuestionForm } from "@/components/question-form";
import { Card, LinkButton, Page, ProgressBar } from "@/components/ui";
import { CHAPTER_INFO, CHAPTERS, type Chapter } from "@/content/axes";
import { answerLabel } from "@/lib/discovery/format";
import type { Answer } from "@/lib/discovery/answers";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { chapterProgress, getQuestion } from "@/server/services/discovery";
import { listCategories, listPreferences } from "@/server/services/people";
import { PreferenceSection } from "@/components/preferences";

/** One question at a time from a chapter; after each answer the next one appears here. */
export default async function ChapterPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  if (!(CHAPTERS as readonly string[]).includes(id)) notFound();
  const chapter = id as Chapter;
  const { t, locale } = await getT();
  const d = t.discover;
  const all = await chapterProgress(uid);
  const c = all.find((x) => x.chapter === chapter)!;
  const info = CHAPTER_INFO[chapter];
  const followUp = sp.f ? await getQuestion(uid, sp.f).catch(() => null) : null;
  const next = followUp ?? (c.nextId ? await getQuestion(uid, c.nextId).catch(() => null) : null);
  const back = `/discover/chapter/${chapter}`;
  return (
    <Page title={`${info.icon} ${info.title[locale]}`} back="/discover/chapters">
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-stone-500">
          <span>{info.intro[locale]}</span>
          <span className="shrink-0 pl-2 font-semibold text-teal-800">{d.chapterProgress(c.answered, c.total)}</span>
        </div>
        <ProgressBar value={c.answered} max={c.total} label={info.title[locale]} />
      </div>
      <Flash t={t} sp={sp} />
      <FeedbackPrompt sp={sp} back={back} t={t} />
      <LikesFollowUp sp={sp} back={back} t={t} locale={locale} />
      {next ? (
        <Card key={next.question.id} className="animate-[fadeUp_.35s_ease-out] motion-reduce:animate-none">
          {followUp && <p className="mb-2 inline-block rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-900">↳ {d.followUpBadge}</p>}
          {next.latest?.status === "answered" && (
            <p className="mb-2 text-xs text-stone-500">{d.lastAnswer(answerLabel(next.question.options, next.latest.answer as Answer, locale), next.latest.answeredAt.toISOString().slice(0, 10))}</p>
          )}
          <QuestionForm q={next.question} t={t} locale={locale} back={back} />
        </Card>
      ) : (
        <Card className="text-center">
          <p className="text-3xl" aria-hidden>🎉</p>
          <p className="mt-2 font-semibold text-stone-900">{d.chapterDoneTitle}</p>
          <p className="mt-1 text-sm text-stone-600">{d.chapterDoneText}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <LinkButton href="/insights" variant="primary">{t.insights.title} →</LinkButton>
            <LinkButton href="/discover/chapters" variant="secondary">{d.otherChapters}</LinkButton>
          </div>
        </Card>
      )}
      {chapter === "likes" && (
        <Card title={`🍀 ${d.likesOwnTitle}`}>
          <p className="mb-3 text-xs leading-5 text-stone-500">{d.likesOwnHelp}</p>
          <PreferenceSection t={t} locale={locale} prefs={await listPreferences(uid, null)} categories={await listCategories()} personId={null} back={back} editing={sp.edit ?? null} />
        </Card>
      )}
      <p className="text-center text-xs">
        <Link href="/me/preview" className="text-teal-700 underline">{d.privacyLink}</Link>
      </p>
    </Page>
  );
}
