import Link from "next/link";
import { notFound } from "next/navigation";
import { saveLookBackAction } from "@/app/actions/monthly";
import { Flash } from "@/components/flash";
import { Button, Card, Page, Textarea } from "@/components/ui";
import { AXIS_LABEL, PEER_POLES } from "@/content/axes";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { activeMonths, monthKey, monthReport, parseMonth, shiftMonth, thisMonth } from "@/server/services/monthly";
import { listTendencies } from "@/server/services/tendencies";

// Literal classes for the mood bars (Tailwind only generates classes it can see).
const BAR = ["h-0", "h-1/5", "h-2/5", "h-3/5", "h-4/5", "h-full"];

/** One month, looked back on: numbers, mood, highlights, first answers, changes, and a note. */
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

      <Card title={mo.moodTitle}>
        {r.moodAverage === null ? (
          <p className="text-sm text-stone-500">{mo.moodNone}</p>
        ) : (
          <>
            <div className="flex h-24 items-end gap-3" role="img" aria-label={mo.moodAvg(r.moodAverage.toFixed(1))}>
              {r.moodWeeks.map((w, i) => (
                <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                  <div className={`w-full rounded-t-lg ${w === null ? "h-0" : BAR[Math.round(w)]} bg-linear-to-t from-sky-300 to-amber-200`} />
                  <span className="text-[10px] text-stone-400">{i + 1}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-stone-500">{mo.moodAvg(r.moodAverage.toFixed(1))}</p>
          </>
        )}
      </Card>

      <Card title={mo.highlights}>
        {r.highlights.length === 0 ? (
          <p className="text-sm text-stone-500">{mo.highlightsNone}</p>
        ) : (
          <ul className="space-y-2">
            {r.highlights.map((h) => (
              <li key={h.id}>
                <Link href={`/memories/${h.id}`} className="block rounded-2xl border border-stone-200 bg-white/80 px-4 py-2.5 hover:border-teal-300">
                  <span className="text-[11px] text-stone-500">{h.occurredOn ?? h.createdAt.toISOString().slice(0, 10)}</span>
                  <span className="block text-sm font-semibold text-stone-900">{h.title ?? h.body?.slice(0, 60)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {(r.deepened.length > 0 || r.firstAnswers.length > 0 || r.changed.length > 0) && (
        <Card>
          {r.deepened.length > 0 && (
            <>
              <h3 className="mb-2 text-sm font-semibold text-stone-800">🧩 {mo.tiles}</h3>
              <ul className="mb-4 flex flex-wrap gap-1.5">
                {r.deepened.map((k) => {
                  const c = claims.find((x) => x.claimKey === k)!;
                  return <li key={k} className="rounded-full bg-teal-50 px-3 py-1 text-xs text-teal-900 ring-1 ring-teal-100">{AXIS_LABEL[k].name[locale]}：{(c.direction === 1 ? PEER_POLES[k].pos : PEER_POLES[k].neg)[locale]}</li>;
                })}
              </ul>
            </>
          )}
          {r.firstAnswers.length > 0 && (
            <>
              <h3 className="mb-2 text-sm font-semibold text-stone-800">✨ {mo.newAnswers}</h3>
              <ul className="mb-4 space-y-1.5 text-sm">{r.firstAnswers.map((a, i) => <li key={i} className="text-stone-700">{a.prompt} — <b className="text-stone-900">{a.answer}</b></li>)}</ul>
            </>
          )}
          {r.changed.length > 0 && (
            <>
              <h3 className="mb-2 text-sm font-semibold text-stone-800">🔄 {mo.changed}</h3>
              <ul className="space-y-1.5 text-sm">{r.changed.map((a, i) => <li key={i} className="text-stone-700">{a.prompt} — <b className="text-stone-900">{a.answer}</b></li>)}</ul>
            </>
          )}
        </Card>
      )}

      <Card title={`✍️ ${mo.write}`}>
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
      </Card>

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
