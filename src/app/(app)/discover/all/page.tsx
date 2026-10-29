import Link from "next/link";
import { FeedbackPrompt } from "@/components/feedback-prompt";
import { LikesFollowUp } from "@/components/likes-follow-up";
import { Flash } from "@/components/flash";
import { QuestionForm } from "@/components/question-form";
import { Card, LinkButton, ProgressBar } from "@/components/ui";
import { Page } from "@/components/page";
import { CHAPTER_INFO } from "@/content/axes";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { allProgress, getQuestion } from "@/server/services/discovery";

const BACK = "/discover/all";

/** Every unanswered question, one after another, with no daily limit. */
export default async function AllQuestionsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const sp = await searchParams;
  const { t, locale } = await getT();
  const d = t.discover;
  const p = await allProgress(uid);
  // A follow-up to the answer just given is asked first, in place.
  const followUp = sp.f ? await getQuestion(uid, sp.f).catch(() => null) : null;
  const next = followUp ?? (p.next ? await getQuestion(uid, p.next.id).catch(() => null) : null);
  const info = p.next ? CHAPTER_INFO[p.next.chapter] : null;
  return (
    <Page title={d.allTitle} back="/discover">
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between text-xs">
          <span className="font-semibold text-teal-800">{d.allProgress(p.answered, p.total)}</span>
          <span className="text-stone-500">{d.allLeft(p.left)}</span>
        </div>
        <ProgressBar value={p.answered} max={p.total} label={d.allTitle} />
      </div>
      <Flash t={t} sp={sp} />
      <FeedbackPrompt sp={sp} back={BACK} t={t} />
      <LikesFollowUp sp={sp} back={BACK} t={t} locale={locale} />
      {next ? (
        <Card key={next.question.id} className="animate-[fadeUp_.35s_ease-out] motion-reduce:animate-none">
          {followUp ? (
            <p className="mb-2 inline-block rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-900">↳ {d.followUpBadge}</p>
          ) : (
            info && <p className="mb-2 text-xs text-stone-500">{info.icon} {info.title[locale]}</p>
          )}
          <QuestionForm q={next.question} t={t} locale={locale} back={BACK} />
        </Card>
      ) : (
        <Card className="text-center">
          <p className="text-3xl" aria-hidden>🎉</p>
          <p className="mt-2 font-semibold text-stone-900">{d.allDoneTitle}</p>
          <p className="mt-1 text-sm text-stone-600">{d.allDoneText}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <LinkButton href="/me/manual" variant="primary">📖 {d.allReadManual}</LinkButton>
            <LinkButton href="/insights" variant="secondary">{t.insights.title}</LinkButton>
          </div>
        </Card>
      )}
      {next && (
        <p className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
          <Link href="/insights" className="text-stone-600 underline underline-offset-4">☕ {d.allRest}</Link>
          <Link href="/me/manual" className="text-teal-700 underline underline-offset-4">📖 {d.allReadManual}</Link>
        </p>
      )}
      <p className="text-center text-xs text-stone-500">{d.allIntro}</p>
    </Page>
  );
}
