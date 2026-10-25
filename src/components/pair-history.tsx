import type { Locale } from "@/lib/i18n/locales";
import type { Dict } from "@/lib/i18n/messages/en";
import type { PairEvent, PairHistory } from "@/server/services/pair-history";

/** "12 Oct 2026" in the reader's language (the date is already local). */
export function pairDate(iso: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
}

export function pairEventText(e: PairEvent, t: Dict) {
  const ev = t.pair.events;
  return e.kind === "years" ? ev.years(e.n ?? 1) : ev[e.kind];
}

const MARK: Record<PairEvent["kind"], string> = {
  connected: "🤝",
  agreed: "🔓",
  firstMessage: "💬",
  messages100: "💬",
  messages500: "💬",
  messages1000: "💬",
  firstComment: "✏️",
  days100: "🎉",
  years: "🎉",
};

/** Our story: four numbers, what both share, and the moments along the way (the same for both). */
export function PairHistoryCard({ h, t, locale }: { h: PairHistory; t: Dict; locale: Locale }) {
  const p = t.pair;
  const tiles = [
    { label: p.daysLabel, value: h.days === 0 ? p.today : p.days(h.days) },
    { label: p.messagesLabel, value: p.messages(h.messages) },
    { label: p.commonLabel, value: p.common(h.common) },
    { label: p.commentsLabel, value: p.comments(h.comments) },
  ];
  const shared = [...(h.sharedAnswers > 0 ? [p.sharedAnswers(h.sharedAnswers)] : []), ...h.scopes.filter((s) => s !== "preferences" && s !== "values").map((s) => t.compare.scopeNames[s as keyof Dict["compare"]["scopeNames"]] ?? s)];
  const row = (e: PairEvent) => (
    <li key={`${e.kind}-${e.on}`} className="flex items-baseline gap-3 py-1.5">
      <span className="w-24 shrink-0 text-xs text-stone-500">{pairDate(e.on, locale)}</span>
      <span className="text-sm text-stone-800">
        <span aria-hidden className="mr-1.5">{MARK[e.kind]}</span>
        {pairEventText(e, t)}
      </span>
    </li>
  );
  return (
    <section className="space-y-4 rounded-3xl bg-white/85 p-5 shadow-sm ring-1 ring-stone-200/60" data-testid="pair-history" aria-labelledby="pair-title">
      <div>
        <h2 id="pair-title" className="text-base font-bold text-stone-900">🌱 {p.title}</h2>
        <p className="text-xs text-stone-500">{p.lead}</p>
      </div>
      <dl className="grid grid-cols-4 gap-2">
        {tiles.map((x) => (
          <div key={x.label} className="rounded-2xl bg-teal-50/70 px-1 py-2.5 text-center">
            <dt className="text-[10px] font-semibold text-teal-800">{x.label}</dt>
            <dd className="mt-0.5 text-lg font-bold leading-tight text-stone-900">{x.value}</dd>
          </div>
        ))}
      </dl>
      <div>
        <p className="mb-1.5 text-xs font-semibold text-stone-500">{p.shared}</p>
        {shared.length > 0 ? (
          <p className="flex flex-wrap gap-1.5">{shared.map((s) => <span key={s} className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-800">{s}</span>)}</p>
        ) : (
          <p className="text-xs text-stone-400">{p.nothingShared}</p>
        )}
      </div>
      <div>
        <p className="text-xs font-semibold text-stone-500">{p.eventsTitle}</p>
        <ol className="divide-y divide-stone-100">{h.events.slice(0, 4).map(row)}</ol>
        {h.events.length > 4 && (
          <details className="group">
            <summary className="cursor-pointer list-none pt-1 text-xs font-semibold text-teal-700 group-open:hidden [&::-webkit-details-marker]:hidden">{p.more(h.events.length)} ›</summary>
            <ol className="divide-y divide-stone-100 border-t border-stone-100">{h.events.slice(4).map(row)}</ol>
          </details>
        )}
      </div>
    </section>
  );
}
