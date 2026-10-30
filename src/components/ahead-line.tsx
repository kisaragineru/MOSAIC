import Link from "next/link";
import type { Dict } from "@/lib/i18n/messages/en";
import type { Locale } from "@/lib/i18n/locales";
import { KIND_ICON, timelineDay, type TimelineEntry } from "@/lib/timeline";
import { RememberedDetails } from "./remembered-details";

/** How many of the soonest are shown when opened; the rest wait behind "more". */
const SHOWN = 5;

const dayNumber = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))) / 86_400_000;
const dayOf = (e: TimelineEntry) => timelineDay(e) ?? e.createdAt.toISOString().slice(0, 10);
/** "12/25", with the year when it isn't this year's. */
const shortDate = (iso: string, today: string, locale: Locale) =>
  new Intl.DateTimeFormat(locale, { ...(iso.slice(0, 4) === today.slice(0, 4) ? {} : { year: "numeric" }), month: "numeric", day: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
const what = (e: TimelineEntry) => (e.title || e.body || "").split("\n")[0]!.slice(0, 40);

/** "In n days" for a record ahead, its date and first words (Home's one line and the list). */
export function aheadSummary(entries: TimelineEntry[], today: string, locale: Locale) {
  const next = entries[0];
  if (!next) return null;
  const day = dayOf(next);
  return { n: entries.length, date: shortDate(day, today, locale), what: what(next), days: dayNumber(day) - dayNumber(today) };
}

/**
 * Records dated after today, as the timeline's continuation above "today": a dotted line and
 * hollow dots, closed to one line at first (remembered once opened). The soonest sits right
 * above today, further ones higher up, and only the five soonest show until asked for more.
 */
export function AheadLine({ entries, today, t, locale }: { entries: TimelineEntry[]; today: string; t: Dict; locale: Locale }) {
  if (entries.length === 0) return null;
  const a = t.memories.timeline.ahead;
  const s = aheadSummary(entries, today, locale)!;
  const shown = entries.slice(0, SHOWN);
  const later = entries.slice(SHOWN);
  const item = (e: TimelineEntry) => {
    const day = dayOf(e);
    return (
      <li key={`${e.mine ? "m" : "f"}-${e.id}`} className="relative">
        <span aria-hidden className={`absolute -left-[1.6rem] top-3 h-3 w-3 rounded-full border-2 bg-white ${e.mine ? "border-teal-400" : "border-rose-300"}`} />
        <Link href={e.mine ? `/memories/${e.id}` : `/memories/shared/${e.id}`} className="flex items-baseline gap-2 rounded-xl px-2 py-1.5 text-sm text-stone-600 transition hover:bg-white/80" data-testid="ahead-item">
          <time dateTime={day} className="w-20 shrink-0 text-xs tabular-nums text-stone-500">{shortDate(day, today, locale)}</time>
          <span className="min-w-0 flex-1 truncate">
            <span aria-hidden className="mr-1">{KIND_ICON[e.kind] ?? "•"}</span>
            {!e.mine && e.ownerName && <span className="mr-1 text-xs font-semibold text-rose-800">{e.ownerName}</span>}
            {what(e)}
          </span>
          <span className="shrink-0 text-[11px] text-stone-400">{a.daysLeft(dayNumber(day) - dayNumber(today))}</span>
        </Link>
      </li>
    );
  };
  return (
    <div data-testid="ahead">
      <RememberedDetails id="ahead" storageKey="mosaic.ahead.open" className="group">
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl px-1 py-1 text-sm text-stone-600 [&::-webkit-details-marker]:hidden">
          <span aria-hidden className="ml-[0.4rem] h-5 border-l-2 border-dotted border-stone-300" />
          <span className="font-semibold text-stone-700">{a.title}</span>
          <span className="text-xs text-stone-500">{a.count(s.n)}</span>
          <span className="min-w-0 flex-1 truncate text-xs text-stone-500 group-open:hidden">{a.next(s.days, s.date, s.what)}</span>
          <span aria-hidden className="ml-auto text-stone-400 transition-transform group-open:rotate-180">▾</span>
        </summary>
        <div className="ml-2 border-l-2 border-dotted border-stone-300 pl-5 pt-1">
          {later.length > 0 && (
            <details className="mb-1">
              <summary className="cursor-pointer px-2 py-1 text-xs text-teal-700">{a.more(later.length)}</summary>
              <ol className="space-y-0.5">{[...later].reverse().map(item)}</ol>
            </details>
          )}
          {/* Furthest on top, the soonest right above today. */}
          <ol className="space-y-0.5">{[...shown].reverse().map(item)}</ol>
        </div>
      </RememberedDetails>
      <div className="mt-1 flex items-center gap-2" data-testid="ahead-today">
        <span aria-hidden className="ml-[0.2rem] h-3 w-3 rounded-full bg-teal-600 ring-4 ring-teal-100" />
        <span className="h-0.5 flex-1 bg-teal-600/70" />
        <span className="text-xs font-semibold text-teal-800">{a.today(shortDate(today, today, locale))}</span>
        <span className="h-0.5 w-6 bg-teal-600/70" />
      </div>
    </div>
  );
}
