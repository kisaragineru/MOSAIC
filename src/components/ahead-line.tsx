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

interface Row {
  key: string;
  day: string;
  href: string;
  icon: string;
  owner: string | null;
  text: string;
  /** Hollow dot colour: mine, theirs, a letter. */
  tone: "mine" | "theirs" | "letter";
}

const DOT = { mine: "border-teal-400", theirs: "border-rose-300", letter: "border-violet-400" } as const;

/**
 * Records dated after today (and letters to the future not yet arrived), as the timeline's
 * continuation above "today": a dotted line and hollow dots on the same line as the timeline
 * below, closed to one line at first (remembered once opened). The soonest sits right above
 * today, further ones higher up, and only the five soonest show until asked for more.
 */
export function AheadLine({ entries, letters = [], today, t, locale }: { entries: TimelineEntry[]; letters?: { id: string; writtenOn: string; revealOn: string }[]; today: string; t: Dict; locale: Locale }) {
  const a = t.memories.timeline.ahead;
  const rows: Row[] = [
    ...entries.map((e): Row => ({ key: `${e.mine ? "m" : "f"}-${e.id}`, day: dayOf(e), href: e.mine ? `/memories/${e.id}` : `/memories/shared/${e.id}`, icon: KIND_ICON[e.kind] ?? "•", owner: e.mine ? null : e.ownerName, text: what(e), tone: e.mine ? "mine" : "theirs" })),
    ...letters.map((l): Row => ({ key: `l-${l.id}`, day: l.revealOn, href: `/memories/${l.id}`, icon: "", owner: null, text: a.letter(shortDate(l.writtenOn, today, locale)), tone: "letter" })),
  ].sort((x, y) => (x.day < y.day ? -1 : x.day > y.day ? 1 : 0));
  if (rows.length === 0) return null;
  const next = rows[0]!;
  const shown = rows.slice(0, SHOWN);
  const later = rows.slice(SHOWN);
  const days = (d: string) => dayNumber(d) - dayNumber(today);
  // The line sits 9px from the left, like the timeline's below (ml-2 + half its 2px border).
  const dot = "absolute left-[9px] -translate-x-1/2 rounded-full";
  const item = (r: Row) => (
    <li key={r.key} className="relative pl-7">
      <span aria-hidden className={`${dot} top-1/2 h-3 w-3 -translate-y-1/2 border-2 bg-white ${DOT[r.tone]}`} />
      <Link href={r.href} className="flex items-baseline gap-2 rounded-xl px-2 py-1.5 text-sm text-stone-600 transition hover:bg-white/80" data-testid="ahead-item">
        <time dateTime={r.day} className="w-20 shrink-0 text-xs tabular-nums text-stone-500">{shortDate(r.day, today, locale)}</time>
        <span className={`min-w-0 flex-1 truncate ${r.tone === "letter" ? "text-violet-900" : ""}`}>
          {r.icon && <span aria-hidden className="mr-1">{r.icon}</span>}
          {r.owner && <span className="mr-1 text-xs font-semibold text-rose-800">{r.owner}</span>}
          {r.text}
        </span>
        <span className="shrink-0 text-[11px] text-stone-400">{a.daysLeft(days(r.day))}</span>
      </Link>
    </li>
  );
  return (
    <div className="relative" data-testid="ahead">
      <span aria-hidden className="absolute bottom-3 left-2 top-4 border-l-2 border-dotted border-stone-300" />
      <RememberedDetails id="ahead" storageKey="mosaic.ahead.open" className="group">
        <summary className="relative flex cursor-pointer list-none items-center gap-2 py-1 pl-7 text-sm text-stone-600 [&::-webkit-details-marker]:hidden">
          <span className="font-semibold text-stone-700">{a.title}</span>
          <span className="text-xs text-stone-500">{a.count(rows.length)}</span>
          <span className="min-w-0 flex-1 truncate text-xs text-stone-500 group-open:invisible">{a.next(days(next.day), shortDate(next.day, today, locale), next.text)}</span>
          <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-lg leading-none text-stone-600 shadow-sm ring-1 ring-stone-200 transition-transform group-open:rotate-180">⌄</span>
        </summary>
        <div className="pt-1">
          {later.length > 0 && (
            <details className="mb-1">
              <summary className="cursor-pointer py-1 pl-9 text-xs text-teal-700">{a.more(later.length)}</summary>
              <ol className="space-y-0.5">{[...later].reverse().map(item)}</ol>
            </details>
          )}
          {/* Furthest on top, the soonest right above today. */}
          <ol className="space-y-0.5">{[...shown].reverse().map(item)}</ol>
        </div>
      </RememberedDetails>
      <div className="relative mt-1 flex items-center gap-2 pl-7" data-testid="ahead-today">
        <span aria-hidden className={`${dot} top-1/2 h-3.5 w-3.5 -translate-y-1/2 bg-teal-600 ring-4 ring-teal-100`} />
        <span className="h-0.5 flex-1 bg-teal-600/70" />
        <span className="text-xs font-semibold text-teal-800">{a.today(shortDate(today, today, locale))}</span>
        <span className="h-0.5 w-6 bg-teal-600/70" />
      </div>
    </div>
  );
}
