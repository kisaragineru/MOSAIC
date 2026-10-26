import Link from "next/link";
import { notFound } from "next/navigation";
import { saveLookBackAction } from "@/app/actions/monthly";
import { Flash } from "@/components/flash";
import { Button, Card, Page, Textarea } from "@/components/ui";
import { AXIS_LABEL, CHAPTER_INFO, PEER_POLES } from "@/content/axes";
import type { Dict } from "@/lib/i18n/messages/en";
import type { Locale } from "@/lib/i18n/locales";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { activeMonths, monthKey, monthReport, parseMonth, shiftMonth, thisMonth, type AnsweredInMonth, type Month } from "@/server/services/monthly";
import { listTendencies } from "@/server/services/tendencies";

/** Answers shown before "show all". */
const SHOWN = 5;

/** One month, looked back on: numbers, highlights, answers, and a look back. */
export default async function MonthPage({ params, searchParams }: { params: Promise<{ month: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const { month } = await params;
  const sp = await searchParams;
  const m = parseMonth(month);
  if (!m) notFound();
  const { t, locale } = await getT();
  const mo = t.monthly;
  const r = await monthReport(uid, m, locale);
  const months = await activeMonths(uid);
  const now = await thisMonth(uid);
  const next = shiftMonth(m, 1);
  const claims = await listTendencies(uid);
  const stats = [
    [mo.stats.pieces, r.pieces],
    [mo.stats.answers, r.answers],
    [mo.stats.records, r.records],
    [mo.stats.days, r.days],
  ] as const;
  return (
    <Page title={mo.title} back="/insights">
      <Flash t={t} sp={sp} />
      <nav className="flex items-center justify-between text-sm">
        <Link href={`/reflection/${monthKey(shiftMonth(m, -1))}`} className="text-teal-700">← {mo.prev}</Link>
        {monthKey(next) <= monthKey(now) && <Link href={`/reflection/${monthKey(next)}`} className="text-teal-700">{mo.nextMonth} →</Link>}
      </nav>

      <section className="rounded-3xl bg-linear-to-br from-sky-50 via-white to-amber-50 p-5 shadow-sm ring-1 ring-white/80">
        <h2 className="text-2xl font-bold text-stone-900">{mo.monthTitle(m.year, m.month)}</h2>
        <p className="mt-1 text-sm text-stone-600">{mo.lead}</p>
        <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stats.map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-white/90 p-3 text-center ring-1 ring-stone-100">
              <dt className="text-[11px] text-stone-500">{k}</dt>
              <dd className="text-2xl font-bold text-stone-900">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-right text-xs text-stone-500">{mo.vsLast(r.pieces - r.previousPieces)}</p>
      </section>

      <Card title={mo.highlights}>
        {r.highlights.length === 0 ? (
          <p className="text-sm text-stone-500">{mo.highlightsNone}</p>
        ) : (
          <ul className="space-y-2">
            {r.highlights.map((h) => (
              <li key={h.id}>
                <Link href={`/memories/${h.id}`} className="block rounded-2xl border border-stone-200 bg-white/80 px-4 py-2.5 hover:border-teal-300">
                  <span className="text-[11px] text-stone-500">{h.occurredOn ?? h.createdAt.toISOString().slice(0, 10)}</span>
                  <span className="emoji-color block text-sm font-semibold text-stone-900">{h.title ?? h.body?.slice(0, 60)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {r.deepened.length > 0 && (
        <Card title={`🧩 ${mo.tiles}`}>
          <ul className="flex flex-wrap gap-1.5">
            {r.deepened.map((k) => {
              const c = claims.find((x) => x.claimKey === k)!;
              return <li key={k} className="rounded-full bg-teal-50 px-3 py-1 text-xs text-teal-900 ring-1 ring-teal-100">{AXIS_LABEL[k].name[locale]}{t.common.colon}{(c.direction === 1 ? PEER_POLES[k].pos : PEER_POLES[k].neg)[locale]}</li>;
            })}
          </ul>
        </Card>
      )}

      {r.answered.length > 0 && (
        <Card title={`💬 ${mo.answeredTitle(r.answered.length)}`}>
          <ul className="space-y-2">{r.answered.slice(0, SHOWN).map((a) => <Answered key={a.questionId} a={a} mo={mo} locale={locale} />)}</ul>
          {r.answered.length > SHOWN && (
            <details className="group mt-2">
              <summary className="cursor-pointer list-none rounded-full py-2 text-center text-sm font-semibold text-teal-700 hover:bg-teal-50 group-open:hidden">{mo.showAll(r.answered.length - SHOWN)}</summary>
              <ul className="space-y-2">{r.answered.slice(SHOWN).map((a) => <Answered key={a.questionId} a={a} mo={mo} locale={locale} />)}</ul>
            </details>
          )}
          <Link href="/discover/history" className="mt-3 block text-right text-sm text-teal-700">{mo.toHistory} →</Link>
        </Card>
      )}

      <section id="lookback" className="scroll-mt-24">
        {r.lookBacks.length > 0 ? (
          <Card title={`📝 ${mo.yourLookBack}`}>
            <div className="space-y-4">
              {r.lookBacks.map((lb) => (
                <article key={lb.id} className="space-y-3">
                  {lb.sections.map((x, i) => (
                    <div key={i}>
                      {x.prompt && <p className="text-xs font-semibold text-violet-800">{x.prompt}</p>}
                      <p className="emoji-color mt-0.5 whitespace-pre-line text-base leading-relaxed text-stone-900">{x.answer}</p>
                    </div>
                  ))}
                  <p className="flex items-center justify-between text-xs text-stone-500">
                    <span>{mo.writtenOn(new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: r.timeZone }).format(lb.createdAt))}</span>
                    <Link href={`/memories/${lb.id}`} className="rounded-full px-2 py-1 font-semibold text-teal-700 hover:bg-teal-50">{mo.edit}</Link>
                  </p>
                </article>
              ))}
            </div>
            <details className="group mt-4 border-t border-violet-100 pt-3">
              <summary className="cursor-pointer list-none text-sm font-semibold text-teal-700 group-open:mb-3">＋ {mo.writeMore}</summary>
              <LookBackForm m={m} mo={mo} />
            </details>
          </Card>
        ) : (
          <Card title={`📝 ${mo.write}`}>
            <LookBackForm m={m} mo={mo} />
          </Card>
        )}
      </section>

      {months.length > 1 && (
        <Card title={mo.archive}>
          <ul className="flex flex-wrap gap-2">
            {months.map((x) => (
              <li key={monthKey(x)}>
                <Link href={`/reflection/${monthKey(x)}`} aria-current={monthKey(x) === monthKey(m) ? "page" : undefined} className={`rounded-full px-3 py-1 text-sm ${monthKey(x) === monthKey(m) ? "bg-teal-700 text-white" : "border border-stone-200 bg-white text-stone-700"}`}>
                  {monthKey(x)}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </Page>
  );
}

function LookBackForm({ m, mo }: { m: Month; mo: Dict["monthly"] }) {
  return (
    <form action={saveLookBackAction} className="space-y-3">
      <input type="hidden" name="month" value={monthKey(m)} />
      {mo.prompts.map((p, i) => (
        <label key={p} className="block">
          <span className="mb-1 block text-sm font-medium text-stone-800">{p}</span>
          <Textarea name={`p${i}`} rows={2} maxLength={2000} />
        </label>
      ))}
      <Button type="submit">{mo.writeButton}</Button>
    </form>
  );
}

function Answered({ a, mo, locale }: { a: AnsweredInMonth; mo: Dict["monthly"]; locale: Locale }) {
  const info = CHAPTER_INFO[a.chapter];
  const badge = { first: ["bg-amber-50 text-amber-800", `✨ ${mo.how.first}`], changed: ["bg-violet-50 text-violet-800", `🔄 ${mo.how.changed}`], again: ["bg-stone-100 text-stone-600", `↻ ${mo.how.again}`] }[a.how];
  return (
    <li className="rounded-2xl border border-stone-200 bg-white/80 px-4 py-3">
      <p className="flex flex-wrap items-center gap-1.5 text-[11px] text-stone-500">
        <span aria-hidden>{info.icon}</span>
        {info.title[locale]}
        <span className={`rounded-full px-2 py-0.5 font-semibold ${badge[0]}`}>{badge[1]}</span>
      </p>
      <p className="mt-1 text-sm text-stone-700">{a.prompt}</p>
      <p className="mt-0.5 font-semibold text-stone-900">
        {a.before && <span className="mr-1 font-normal text-stone-400 line-through">{a.before}</span>}
        {a.before && <span aria-hidden className="mr-1 text-stone-400">→</span>}
        {a.answer}
      </p>
      {a.note && <p className="mt-1.5 rounded-xl bg-stone-50 px-3 py-2 text-xs text-stone-600">🔒 {a.note}</p>}
    </li>
  );
}
