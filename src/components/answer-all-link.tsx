import Link from "next/link";
import type { Dict } from "@/lib/i18n/messages/en";

/** The way in to answering many questions at once: a filled call to action, unlike the question cards. */
export function AnswerAllLink({ t, left }: { t: Dict; left: number }) {
  return (
    <Link href="/discover/all" className="flex items-center justify-between gap-3 rounded-3xl bg-linear-to-br from-teal-600 to-violet-600 px-5 py-4 text-white shadow-md shadow-teal-900/15 transition hover:shadow-lg active:scale-[0.99]">
      <span className="min-w-0">
        <span className="block font-bold">⚡ {t.discover.allLink}</span>
        <span className="block text-xs text-white/85">{t.discover.allLinkSub(left)}</span>
      </span>
      {left > 0 && <span className="shrink-0 rounded-full bg-white px-3.5 py-1.5 text-sm font-bold text-teal-800">{t.discover.allStart} →</span>}
    </Link>
  );
}
