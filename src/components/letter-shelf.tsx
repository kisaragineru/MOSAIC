import Link from "next/link";
import type { Locale } from "@/lib/i18n/locales";
import type { Dict } from "@/lib/i18n/messages/en";
import { pairDate } from "./pair-history";

const dayNumber = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))) / 86_400_000;

/**
 * Letters to the future, in one place above the records: those that have arrived and wait to be
 * read (each leaves once opened), then those not here yet — only when each was written and when
 * it arrives; what they say stays sealed.
 */
export function LetterShelf({ letters, arrived, today, t, locale }: { letters: { id: string; writtenOn: string; revealOn: string }[]; arrived: { id: string; writtenOn: string }[]; today: string; t: Dict; locale: Locale }) {
  if (letters.length === 0 && arrived.length === 0) return null;
  const l = t.memories.letters;
  const next = letters[0];
  return (
    <details open={arrived.length > 0} className="group rounded-3xl bg-linear-to-br from-violet-50 to-amber-50 px-5 py-4 ring-1 ring-violet-100" data-testid="letter-shelf">
      <summary className="flex cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
        <span aria-hidden className="text-2xl">✉</span>
        <span className="min-w-0 flex-1">
          {arrived.length > 0 && <span className="block text-sm font-bold text-violet-950" data-testid="letter-arrived">{l.arrived(arrived.length)}</span>}
          {next && <span className={`block ${arrived.length > 0 ? "text-xs text-violet-900/80" : "text-sm font-bold text-violet-950"}`}>{l.shelf(letters.length)}</span>}
          {next && <span className="block text-xs text-violet-900/80">{l.next(dayNumber(next.revealOn) - dayNumber(today), pairDate(next.revealOn, locale))}</span>}
        </span>
        <span aria-hidden className="text-violet-400 transition-transform group-open:rotate-90">›</span>
      </summary>
      {arrived.length > 0 && (
        <ul className="mt-3 space-y-1.5 border-t border-violet-100 pt-3">
          {arrived.map((x) => (
            <li key={x.id}>
              <Link href={`/memories/${x.id}`} className="flex items-center justify-between gap-2 rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-violet-950 ring-1 ring-violet-200 hover:bg-violet-50">
                <span>{l.fromYou(pairDate(x.writtenOn, locale))}</span>
                <span className="shrink-0 text-xs text-violet-700">{l.open} →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <ul className="mt-3 space-y-1.5 border-t border-violet-100 pt-3 empty:hidden">
        {letters.map((x) => (
          <li key={x.id}>
            <Link href={`/memories/${x.id}`} className="block rounded-2xl bg-white/70 px-3 py-2 text-sm text-stone-700 hover:bg-white">
              {l.item(pairDate(x.writtenOn, locale), pairDate(x.revealOn, locale))}
            </Link>
          </li>
        ))}
      </ul>
      {letters.length > 0 && <p className="mt-2 text-[11px] text-violet-900/70">{l.note}</p>}
    </details>
  );
}
