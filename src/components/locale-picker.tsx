import { setLocaleCookieAction } from "@/app/actions/auth";
import { LOCALE_NAMES, SUPPORTED_LOCALES, type Locale } from "@/lib/i18n/locales";

/**
 * The language, top right before signing in: someone who can't read the page's language finds it
 * first. A small "🌐 日本語" that opens the three languages, each in its own name. `className`
 * places it and must position it (absolute / fixed / relative): the list opens under it.
 */
export function LocalePicker({ locale, back, label, className = "relative" }: { locale: Locale; back: string; label: string; className?: string }) {
  return (
    <details className={`group w-max ${className}`} data-testid="locale-picker">
      <summary aria-label={label} className="flex min-h-10 cursor-pointer list-none items-center gap-1.5 rounded-full bg-white/85 px-3 text-sm font-medium text-stone-700 shadow-sm ring-1 ring-stone-200 backdrop-blur hover:ring-teal-300 [&::-webkit-details-marker]:hidden">
        <span aria-hidden>🌐</span>
        {LOCALE_NAMES[locale]}
        <span aria-hidden className="text-[10px] text-stone-400 transition group-open:rotate-180">▼</span>
      </summary>
      <form action={setLocaleCookieAction} className="absolute right-0 top-full z-30 mt-1.5 flex min-w-36 flex-col rounded-2xl bg-white p-1.5 shadow-lg ring-1 ring-stone-200">
        <input type="hidden" name="back" value={back} />
        {SUPPORTED_LOCALES.map((l) => (
          <button key={l} name="locale" value={l} lang={l} aria-current={l === locale ? "true" : undefined} className={`rounded-xl px-3 py-2 text-left text-sm ${l === locale ? "bg-teal-50 font-semibold text-teal-900" : "text-stone-700 hover:bg-stone-50"}`}>
            {l === locale ? "✓ " : ""}
            {LOCALE_NAMES[l]}
          </button>
        ))}
      </form>
    </details>
  );
}
