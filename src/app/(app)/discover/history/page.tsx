import Link from "next/link";
import { deleteResponseAction, privacyAction } from "@/app/actions/discovery";
import { ConfirmButton } from "@/components/confirm-button";
import { Flash } from "@/components/flash";
import { Button, Card, Empty, Page, Pill, SegmentedTabs } from "@/components/ui";
import { answerLabel } from "@/lib/discovery/format";
import type { Answer } from "@/lib/discovery/answers";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { getHistory } from "@/server/services/discovery";
import { AnswerPrivacyLink } from "@/components/answer-privacy-link";

export default async function HistoryPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const sp = await searchParams;
  const { t, locale } = await getT();
  const items = await getHistory(uid);
  return (
    <Page title={t.discover.title} actions={<AnswerPrivacyLink t={t} />}>
      <SegmentedTabs current="/discover/history" items={[{ href: "/discover", label: t.nav.todayQuestions }, { href: "/discover/chapters", label: t.discover.chaptersTab }, { href: "/discover/history", label: t.nav.history }]} />
      <Flash t={t} sp={sp} />
      {items.length === 0 && <Empty>{t.history.empty}</Empty>}
      <ul className="stagger space-y-4">
        {items.map((h) => (
          <li key={h.question.id}>
            <Card title={h.question.prompt[locale]}>
              <ol className="space-y-2">
                {h.responses.map((r, i) => {
                  const latest = i === 0;
                  const answer = r.answer as Answer | null;
                  return (
                    <li key={r.id} className={latest ? "rounded-2xl border border-teal-200 bg-teal-50/40 p-3" : "rounded-2xl border border-stone-200 bg-white/60 px-3 py-2"}>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-stone-500">
                        <span>{r.answeredAt.toISOString().slice(0, 10)}</span>
                        <Pill>{t.history.changeKinds[r.changeKind as keyof typeof t.history.changeKinds]}</Pill>
                        {r.status === "answered" &&
                          (h.question.comparable ? (
                            <Pill tone={r.privacy === "comparable" ? "amber" : "stone"}>{r.privacy === "comparable" ? `🔗 ${t.history.comparable}` : `🔒 ${t.history.private}`}</Pill>
                          ) : (
                            <Pill>🔒 {t.history.alwaysPrivate}</Pill>
                          ))}
                      </div>
                      {r.status === "skipped" ? (
                        <p className="mt-1.5 text-sm text-stone-500">{t.history.skipped}</p>
                      ) : answer && "scale" in answer ? (
                        <p className="mt-1.5 flex items-center gap-2 text-sm text-stone-900">
                          <span aria-hidden className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((n) => <span key={n} className={`h-2.5 w-2.5 rounded-full ${n <= answer.scale ? "bg-teal-600" : "bg-stone-200"}`} />)}
                          </span>
                          <span>{t.history.scale(answer.scale)}</span>
                        </p>
                      ) : (
                        <p className={`mt-1.5 text-stone-900 ${latest ? "text-base font-medium" : "text-sm"}`}>{answerLabel(h.question.options, answer, locale)}</p>
                      )}
                      {r.note && <p className="emoji-color mt-1.5 whitespace-pre-line rounded-xl bg-white/70 px-2 py-1 text-xs text-stone-600">🔒 {r.note}</p>}
                      {!latest && <p className="sr-only">{t.history.earlier}</p>}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {latest && (
                          <Link href={`/discover/q/${encodeURIComponent(h.question.id)}`} className="inline-flex min-h-8 items-center rounded-full bg-teal-700 px-3.5 py-1 text-xs font-semibold text-white hover:bg-teal-800">
                            ↻ {t.discover.answerAgain}
                          </Link>
                        )}
                        {r.status === "answered" && h.question.comparable && (
                          <form action={privacyAction}>
                            <input type="hidden" name="responseId" value={r.id} />
                            <input type="hidden" name="privacy" value={r.privacy === "comparable" ? "private" : "comparable"} />
                            <Button variant="secondary" className="min-h-8 px-3 py-1 text-xs">{r.privacy === "comparable" ? `🔒 ${t.history.makePrivate}` : `🔗 ${t.history.makeComparable}`}</Button>
                          </form>
                        )}
                        <form action={deleteResponseAction} className="ml-auto">
                          <input type="hidden" name="responseId" value={r.id} />
                          <ConfirmButton quiet message={t.common.confirmDelete} aria-label={t.history.deleteAnswer} className="min-h-8 rounded-full px-3 py-1 text-xs">🗑 {t.common.delete}</ConfirmButton>
                        </form>
                      </div>
                      {latest && r.status === "answered" && !h.question.comparable && <p className="mt-2 text-[11px] leading-5 text-stone-500">{t.history.alwaysPrivateHelp}</p>}
                    </li>
                  );
                })}
              </ol>
            </Card>
          </li>
        ))}
      </ul>
    </Page>
  );
}
