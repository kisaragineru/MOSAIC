import Link from "next/link";
import { anotherQuestionAction, changeKindAction } from "@/app/actions/discovery";
import { DayWatcher } from "@/components/day-watcher";
import { FeedbackPrompt } from "@/components/feedback-prompt";
import { LikesFollowUp } from "@/components/likes-follow-up";
import { Flash } from "@/components/flash";
import { QuestionForm } from "@/components/question-form";
import { Button, Card, Notice, Page, Pill, SegmentedTabs } from "@/components/ui";
import { answerLabel } from "@/lib/discovery/format";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { allProgress, getDaily, getHistory } from "@/server/services/discovery";
import { AnswerPrivacyLink } from "@/components/answer-privacy-link";

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const sp = await searchParams;
  const { t, locale } = await getT();
  const daily = await getDaily(uid);
  const all = await allProgress(uid);

  let changed: { id: string; prompt: string; before: string; after: string } | null = null;
  if (sp.changed) {
    const hist = await getHistory(uid);
    for (const h of hist) {
      const i = h.responses.findIndex((r) => r.id === sp.changed);
      if (i >= 0) {
        const prev = h.responses.slice(i + 1).find((r) => r.status === "answered");
        changed = {
          id: sp.changed,
          prompt: h.question.prompt[locale],
          before: answerLabel(h.question.options, prev?.answer ?? null, locale),
          after: answerLabel(h.question.options, h.responses[i]!.answer, locale),
        };
      }
    }
  }

  return (
    <Page title={t.discover.title} actions={<AnswerPrivacyLink t={t} />}>
      <DayWatcher day={daily.day} timeZone={daily.timeZone} />
      <SegmentedTabs current="/discover" items={[{ href: "/discover", label: t.nav.todayQuestions }, { href: "/discover/chapters", label: t.discover.chaptersTab }, { href: "/discover/history", label: t.nav.history }]} />
      <p className="text-sm text-stone-600">{t.discover.intro}</p>
      {/* The way in to answering many at once: a filled call to action, unlike the question cards below. */}
      <Link href="/discover/all" className="flex items-center justify-between gap-3 rounded-3xl bg-linear-to-br from-teal-600 to-violet-600 px-5 py-4 text-white shadow-md shadow-teal-900/15 transition hover:shadow-lg active:scale-[0.99]">
        <span className="min-w-0">
          <span className="block font-bold">⚡ {t.discover.allLink}</span>
          <span className="block text-xs text-white/85">{t.discover.allLinkSub(all.left)}</span>
        </span>
        {all.left > 0 && <span className="shrink-0 rounded-full bg-white px-3.5 py-1.5 text-sm font-bold text-teal-800">{t.discover.allStart} →</span>}
      </Link>
      <Flash t={t} sp={sp} />
      {!changed && <FeedbackPrompt sp={sp} back="/discover" t={t} />}
      {!changed && <LikesFollowUp sp={sp} back="/discover" t={t} locale={locale} />}
      {changed && (
        <Card title={t.discover.changedTitle} className="border-amber-200 bg-amber-50">
          <p className="text-sm">{changed.prompt}</p>
          <p className="text-sm text-stone-600">{t.discover.previous(changed.before)} → {changed.after}</p>
          <p className="mt-2 text-sm font-medium">{t.discover.changedQuestion}</p>
          <form action={changeKindAction} className="mt-2 flex flex-wrap gap-2">
            <input type="hidden" name="responseId" value={changed.id} />
            <Button name="kind" value="changed_mind">{t.discover.changedMind}</Button>
            <Button name="kind" value="correction" variant="secondary">{t.discover.correction}</Button>
            <Button name="kind" value="reanswer" variant="ghost">{t.discover.reanswer}</Button>
          </form>
        </Card>
      )}
      {daily.followUp && (
        <Card title={t.discover.followUp}>
          <QuestionForm q={daily.followUp} t={t} locale={locale} back="/discover" />
        </Card>
      )}
      {daily.slots.length === 0 && <Notice>{t.discover.noQuestion}</Notice>}
      {daily.slots.map((s) =>
        s.doneToday ? (
          // Answered (or skipped) today: an answer, quieter than a question waiting to be answered.
          <section key={s.slot} className="space-y-1.5 rounded-3xl bg-stone-100/80 p-5" data-testid="answered-card">
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${s.latest?.status === "skipped" ? "bg-stone-200 text-stone-600" : "bg-teal-100 text-teal-800"}`}>
              {s.latest?.status === "skipped" ? t.discover.skippedBadge : `✓ ${t.discover.answeredBadge}`}
            </span>
            <p className="text-sm text-stone-500">Q. {s.question.prompt[locale]}</p>
            {s.latest?.status !== "skipped" && (
              <p className="emoji-color text-base font-semibold text-stone-900">A. {answerLabel(s.question.options, s.latest?.answer ?? null, locale)}</p>
            )}
          </section>
        ) : (
          <Card key={s.slot} className="ring-2 ring-teal-200">
            <span className="mb-2 inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-900">❓ {t.discover.toAnswer}</span>
            {s.latest?.status === "answered" && (
              <p className="mb-2 text-xs text-stone-500">{t.discover.lastAnswer(answerLabel(s.question.options, s.latest.answer, locale), s.latest.answeredAt.toISOString().slice(0, 10))}</p>
            )}
            <QuestionForm q={s.question} t={t} locale={locale} back="/discover" />
          </Card>
        ),
      )}
      {daily.canRequestMore && (
        <form action={anotherQuestionAction}>
          <Button variant="secondary" className="w-full">{t.discover.another}</Button>
        </form>
      )}
    </Page>
  );
}
