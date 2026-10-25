import Link from "next/link";
import { deleteResponseAction, privacyAction } from "@/app/actions/discovery";
import { ConfirmButton } from "@/components/confirm-button";
import { Flash } from "@/components/flash";
import { Button, Empty, Page, Pill, SegmentedTabs } from "@/components/ui";
import { answerLabel } from "@/lib/discovery/format";
import type { Answer } from "@/lib/discovery/answers";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { getHistory } from "@/server/services/discovery";
import { AnswerPrivacyLink } from "@/components/answer-privacy-link";
import { CHAPTERS, CHAPTER_INFO, chapterOf, type Chapter } from "@/content/axes";
import type { QuestionDef } from "@/content/questions";

export default async function HistoryPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const sp = await searchParams;
  const { t, locale } = await getT();
  const everything = await getHistory(uid);
  const h = t.history;
  // Split by chapter (the same themes as the Chapters tab), plus the questions whose answer changed.
  const chapterOfItem = (q: (typeof everything)[number]["question"]) => chapterOf({ category: q.category, signals: q.signals ?? undefined } as Pick<QuestionDef, "category" | "signals">);
  const changed = (x: (typeof everything)[number]) => x.responses.filter((r) => r.status === "answered").length > 1;
  const counts = new Map<Chapter, number>();
  for (const x of everything) counts.set(chapterOfItem(x.question), (counts.get(chapterOfItem(x.question)) ?? 0) + 1);
  const filter = sp.ch === "changed" ? "changed" : CHAPTERS.includes(sp.ch as Chapter) ? (sp.ch as Chapter) : "all";
  const items = everything.filter((x) => (filter === "all" ? true : filter === "changed" ? changed(x) : chapterOfItem(x.question) === filter));
  const chips: { id: string; label: string; n: number }[] = [
    { id: "all", label: h.all, n: everything.length },
    ...CHAPTERS.filter((c) => counts.get(c)).map((c) => ({ id: c, label: CHAPTER_INFO[c].title[locale], n: counts.get(c)! })),
    { id: "changed", label: h.changedOnly, n: everything.filter(changed).length },
  ];
  const summary = (x: (typeof everything)[number]) => {
    const r = x.responses[0]!;
    const a = r.answer as Answer | null;
    if (r.status === "skipped") return <span className="text-stone-500">{h.skipped}</span>;
    if (a && "scale" in a)
      return (
        <span className="flex items-center gap-2">
          <span aria-hidden className="flex gap-1">{[1, 2, 3, 4, 5].map((n) => <span key={n} className={`h-2 w-2 rounded-full ${n <= a.scale ? "bg-teal-600" : "bg-stone-200"}`} />)}</span>
          {h.scale(a.scale)}
        </span>
      );
    return <span className="emoji-color">{answerLabel(x.question.options, a, locale)}</span>;
  };
  return (
    <Page title={t.discover.title} actions={<AnswerPrivacyLink t={t} />}>
      <SegmentedTabs current="/discover/history" items={[{ href: "/discover", label: t.nav.todayQuestions }, { href: "/discover/chapters", label: t.discover.chaptersTab }, { href: "/discover/history", label: t.nav.history }]} />
      <Flash t={t} sp={sp} />
      {everything.length === 0 && <Empty>{h.empty}</Empty>}
      {everything.length > 0 && (
        <nav aria-label={h.filterLabel} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" data-testid="history-chips">
          {chips.map((c) => (
            <Link
              key={c.id}
              href={c.id === "all" ? "/discover/history" : `/discover/history?ch=${c.id}`}
              aria-current={filter === c.id ? "page" : undefined}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm transition ${filter === c.id ? "bg-teal-700 font-bold text-white" : "bg-white/90 text-stone-700 ring-1 ring-stone-200 hover:ring-teal-300"}`}
            >
              {c.label}
              <span className={`text-xs ${filter === c.id ? "text-white/80" : "text-stone-400"}`}>{c.n}</span>
            </Link>
          ))}
        </nav>
      )}
      {everything.length > 0 && <p className="text-xs text-stone-500">{filter === "changed" ? h.changedHint(items.length) : h.countHint(items.length)}</p>}
      {everything.length > 0 && items.length === 0 && <Empty>{h.noneHere}</Empty>}
      <ul className="divide-y divide-stone-100 overflow-hidden rounded-3xl bg-white/90 shadow-sm ring-1 ring-stone-200/60" data-testid="history-list">
        {items.map((x) => (
          <li key={x.question.id}>
            {/* One row per question; open it for the earlier answers and what can be done with them. */}
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-stone-50 [&::-webkit-details-marker]:hidden">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs text-stone-500">Q. {x.question.prompt[locale]}</span>
                  <span className="mt-0.5 block text-[15px] font-semibold leading-snug text-stone-900">{summary(x)}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-0.5 text-[11px] text-stone-400">
                  <span aria-label={x.responses[0]!.privacy === "comparable" ? h.comparable : h.private}>{x.responses[0]!.privacy === "comparable" ? "🔗" : "🔒"}</span>
                  <span>{x.responses[0]!.answeredAt.toISOString().slice(5, 10).replace("-", "/")}</span>
                </span>
                <span aria-hidden className="text-stone-300 transition-transform group-open:rotate-90">›</span>
              </summary>
              <div className="bg-stone-50/70 px-4 pb-4 pt-2">
              <p className="mb-2 text-sm font-semibold text-stone-800">{x.question.prompt[locale]}</p>
              <ol className="space-y-2">
                {x.responses.map((r, i) => {
                  const latest = i === 0;
                  const answer = r.answer as Answer | null;
                  return (
                    <li key={r.id} className={latest ? "rounded-2xl border border-teal-200 bg-teal-50/40 p-3" : "rounded-2xl border border-stone-200 bg-white/60 px-3 py-2"}>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-stone-500">
                        <span>{r.answeredAt.toISOString().slice(0, 10)}</span>
                        <Pill>{h.changeKinds[r.changeKind as keyof typeof h.changeKinds]}</Pill>
                        {r.status === "answered" &&
                          (x.question.comparable ? (
                            <Pill tone={r.privacy === "comparable" ? "amber" : "stone"}>{r.privacy === "comparable" ? `🔗 ${h.comparable}` : `🔒 ${h.private}`}</Pill>
                          ) : (
                            <Pill>🔒 {h.alwaysPrivate}</Pill>
                          ))}
                      </div>
                      {r.status === "skipped" ? (
                        <p className="mt-1.5 text-sm text-stone-500">{h.skipped}</p>
                      ) : answer && "scale" in answer ? (
                        <p className="mt-1.5 flex items-center gap-2 text-sm text-stone-900">
                          <span aria-hidden className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((n) => <span key={n} className={`h-2.5 w-2.5 rounded-full ${n <= answer.scale ? "bg-teal-600" : "bg-stone-200"}`} />)}
                          </span>
                          <span>{h.scale(answer.scale)}</span>
                        </p>
                      ) : (
                        <p className={`mt-1.5 text-stone-900 ${latest ? "text-base font-medium" : "text-sm"}`}>{answerLabel(x.question.options, answer, locale)}</p>
                      )}
                      {r.note && <p className="emoji-color mt-1.5 whitespace-pre-line rounded-xl bg-white/70 px-2 py-1 text-xs text-stone-600">🔒 {r.note}</p>}
                      {!latest && <p className="sr-only">{h.earlier}</p>}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {latest && (
                          <Link href={`/discover/q/${encodeURIComponent(x.question.id)}`} className="inline-flex min-h-8 items-center rounded-full bg-teal-700 px-3.5 py-1 text-xs font-semibold text-white hover:bg-teal-800">
                            ↻ {t.discover.answerAgain}
                          </Link>
                        )}
                        {r.status === "answered" && x.question.comparable && (
                          <form action={privacyAction}>
                            <input type="hidden" name="responseId" value={r.id} />
                            <input type="hidden" name="privacy" value={r.privacy === "comparable" ? "private" : "comparable"} />
                            <Button variant="secondary" className="min-h-8 px-3 py-1 text-xs">{r.privacy === "comparable" ? `🔒 ${h.makePrivate}` : `🔗 ${h.makeComparable}`}</Button>
                          </form>
                        )}
                        <form action={deleteResponseAction} className="ml-auto">
                          <input type="hidden" name="responseId" value={r.id} />
                          <ConfirmButton quiet message={t.common.confirmDelete} aria-label={h.deleteAnswer} className="min-h-8 rounded-full px-3 py-1 text-xs">🗑 {t.common.delete}</ConfirmButton>
                        </form>
                      </div>
                      {latest && r.status === "answered" && !x.question.comparable && <p className="mt-2 text-[11px] leading-5 text-stone-500">{h.alwaysPrivateHelp}</p>}
                    </li>
                  );
                })}
              </ol>
              </div>
            </details>
          </li>
        ))}
      </ul>
    </Page>
  );
}
