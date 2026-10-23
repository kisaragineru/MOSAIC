import type { ReactNode } from "react";
import { setLocaleCookieAction } from "@/app/actions/auth";
import { LOCALE_NAMES, SUPPORTED_LOCALES, type Locale } from "@/lib/i18n/locales";
import type { Dict } from "@/lib/i18n/messages/en";

export function AuthShell({ t, locale, back, children }: { t: Dict; locale: Locale; back: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-8 text-center">
        <div className="mosaic-mark mx-auto mb-3 h-12 w-12 rounded-xl" aria-hidden />
        <p className="text-3xl font-semibold tracking-[0.2em] text-stone-900">MOSAIC</p>
        <p className="mt-1 text-sm text-stone-600">{t.common.tagline}</p>
        <p className="text-xs text-stone-500">{t.common.brand}</p>
      </div>
      {children}
      <form action={setLocaleCookieAction} className="mt-6 flex items-center justify-center gap-2 text-sm">
        <input type="hidden" name="back" value={back} />
        {SUPPORTED_LOCALES.map((l) => (
          <button key={l} name="locale" value={l} className={`rounded-lg px-2 py-1 ${l === locale ? "bg-stone-200 font-semibold" : "text-stone-500"}`}>
            {LOCALE_NAMES[l]}
          </button>
        ))}
      </form>
    </main>
  );
}
