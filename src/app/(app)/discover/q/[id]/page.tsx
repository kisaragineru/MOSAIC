import { notFound } from "next/navigation";
import { FeedbackPrompt } from "@/components/feedback-prompt";
import { LikesFollowUp } from "@/components/likes-follow-up";
import { Flash } from "@/components/flash";
import { QuestionForm } from "@/components/question-form";
import { Card } from "@/components/ui";
import { Page } from "@/components/page";
import { answerLabel } from "@/lib/discovery/format";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import type { Answer } from "@/lib/discovery/answers";
import { getQuestion } from "@/server/services/discovery";

export default async function QuestionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const { t, locale } = await getT();
  const r = await getQuestion(uid, decodeURIComponent(id)).catch(() => null);
  if (!r) notFound();
  return (
    <Page title={t.discover.title} back="/discover">
      <Flash t={t} sp={sp} />
      <FeedbackPrompt sp={sp} back={`/discover/q/${encodeURIComponent(r.question.id)}`} t={t} />
      <LikesFollowUp sp={sp} back={`/discover/q/${encodeURIComponent(r.question.id)}`} t={t} locale={locale} />
      <Card>
        {r.latest?.status === "answered" && (
          <p className="mb-2 text-xs text-stone-500">
            {t.discover.lastAnswer(answerLabel(r.question, r.latest.answer as Answer, locale), r.latest.answeredAt.toISOString().slice(0, 10))}
          </p>
        )}
        <QuestionForm q={r.question} t={t} locale={locale} back={`/discover/q/${encodeURIComponent(r.question.id)}`} />
      </Card>
    </Page>
  );
}
