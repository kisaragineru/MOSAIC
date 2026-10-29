import Link from "next/link";
import type { Dict } from "@/lib/i18n/messages/en";

/**
 * The same entry, top right on every Questions tab: who can see your answers. On a phone a round
 * eye button (so the page title keeps its line), with its words from wider screens up.
 */
export function AnswerPrivacyLink({ t }: { t: Dict }) {
  return (
    <Link
      href="/me/privacy/answers"
      aria-label={t.discover.privacyLinkLabel}
      title={t.discover.privacyLinkLabel}
      className="inline-flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-full bg-white text-sm font-semibold text-stone-700 shadow-sm ring-1 ring-stone-200 hover:ring-teal-300 sm:px-3.5"
    >
      <span aria-hidden className="text-lg sm:text-base">👁</span>
      <span className="hidden sm:inline">{t.discover.privacyShort}</span>
    </Link>
  );
}
