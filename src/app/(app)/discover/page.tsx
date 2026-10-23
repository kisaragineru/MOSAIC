import Link from "next/link";
import { anotherQuestionAction, changeKindAction } from "@/app/actions/discovery";
import { DayWatcher } from "@/components/day-watcher";
import { Flash } from "@/components/flash";
import { QuestionForm } from "@/components/question-form";
import { Button, Card, Notice, Page, Pill, SegmentedTabs } from "@/components/ui";
import { answerLabel } from "@/lib/discovery/format";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { getDaily, getHistory } from "@/server/services/discovery";

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const sp = await searchParams;
  const { t, locale } = await getT();
  const daily = await getDaily(uid);

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
    <Page title={t.discover.title}>
      <DayWatcher day={daily.day} timeZone={daily.timeZone} />
      <SegmentedTabs current="/discover" items={[{ href: "/discover", label: t.nav.todayQuestions }, { href: "/discover/history", label: t.nav.history }]} />
      <p className="text-sm text-stone-600">{t.discover.intro}</p>
      <Link href="/me/preview" className="inline-block text-sm text-teal-700 underline">{t.discover.privacyLink} →</Link>
      <Flash t={t} sp={sp} />
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
      {daily.slots.map((s) => (
        <Card key={s.slot}>
          {s.doneToday ? (
            <div className="space-y-1">
              <p className="text-stone-900">{s.question.prompt[locale]}</p>
              <p className="text-sm text-stone-600">
                {s.latest?.status === "skipped" ? <Pill>{t.history.skipped}</Pill> : <>✓ {answerLabel(s.question.options, s.latest?.answer ?? null, locale)}</>}
              </p>
            </div>
          ) : (
            <>
              {s.latest?.status === "answered" && (
                <p className="mb-2 text-xs text-stone-500">{t.discover.lastAnswer(answerLabel(s.question.options, s.latest.answer, locale), s.latest.answeredAt.toISOString().slice(0, 10))}</p>
              )}
              <QuestionForm q={s.question} t={t} locale={locale} back="/discover" />
            </>
          )}
        </Card>
      ))}
      {daily.canRequestMore && (
        <form action={anotherQuestionAction}>
          <Button variant="secondary" className="w-full">{t.discover.another}</Button>
        </form>
      )}
    </Page>
  );
}
