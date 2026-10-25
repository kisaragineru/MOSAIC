import Link from "next/link";
import type { Locale } from "@/lib/i18n/locales";
import type { Dict } from "@/lib/i18n/messages/en";
import { pairDate } from "./pair-history";

const dayNumber = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))) / 86_400_000;

/**
 * Letters to the future that haven't arrived: kept off the flow of days, waiting here. Only when
 * each was written and when it arrives; what it says stays sealed.
 */
export function LetterShelf({ letters, today, t, locale }: { letters: { id: string; writtenOn: string; revealOn: string }[]; today: string; t: Dict; locale: Locale }) {
  if (letters.length === 0) return null;
  const l = t.memories.letters;
  const next = letters[0]!;
  return (
    <details className="group rounded-3xl bg-linear-to-br from-violet-50 to-amber-50 px-5 py-4 ring-1 ring-violet-100" data-testid="letter-shelf">
      <summary className="flex cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
        <span aria-hidden className="text-2xl">✉</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-violet-950">{l.shelf(letters.length)}</span>
          <span className="block text-xs text-violet-900/80">{l.next(dayNumber(next.revealOn) - dayNumber(today), pairDate(next.revealOn, locale))}</span>
        </span>
        <span aria-hidden className="text-violet-400 transition-transform group-open:rotate-90">›</span>
      </summary>
      <ul className="mt-3 space-y-1.5 border-t border-violet-100 pt-3">
        {letters.map((x) => (
          <li key={x.id}>
            <Link href={`/memories/${x.id}`} className="block rounded-2xl bg-white/70 px-3 py-2 text-sm text-stone-700 hover:bg-white">
              {l.item(pairDate(x.writtenOn, locale), pairDate(x.revealOn, locale))}
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-violet-900/70">{l.note}</p>
    </details>
  );
}
