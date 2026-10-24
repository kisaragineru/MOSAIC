import Link from "next/link";
import type { Dict } from "@/lib/i18n/messages/en";

/**
 * The same entry, top right on every Questions tab: who can see your answers. A small pill with
 * an eye, not an underlined sentence.
 */
export function AnswerPrivacyLink({ t }: { t: Dict }) {
  return (
    <Link
      href="/me/preview"
      aria-label={t.discover.privacyLinkLabel}
      className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-white px-3.5 text-sm font-semibold text-stone-700 shadow-sm ring-1 ring-stone-200 hover:ring-teal-300"
    >
      <span aria-hidden>👁</span>
      {t.discover.privacyShort}
    </Link>
  );
}
