import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLockup } from "@/components/brand";
import { setLocaleCookieAction } from "@/app/actions/auth";
import { LOCALE_NAMES, SUPPORTED_LOCALES, type Locale } from "@/lib/i18n/locales";
import type { Dict } from "@/lib/i18n/messages/en";
import { LocalePicker } from "./locale-picker";
import { TrialBar } from "./trial-bar";

export function AuthShell({ t, locale, back, trial = false, children }: { t: Dict; locale: Locale; back: string; trial?: boolean; children: ReactNode }) {
  return (
    <>
    {trial && <TrialBar t={t} inAuth />}
    <main className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-14">
      {/* The language, where it's seen first (it's also at the bottom). */}
      <LocalePicker locale={locale} back={back} label={t.common.language} className="absolute right-4 top-4" />
      <div className="mb-8 text-center">
        <h1><BrandLockup /></h1>
        <p className="mt-4 text-sm text-stone-600">{t.common.tagline}</p>
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
      <p className="mt-3 text-center text-xs">
        <Link href="/terms" className="text-stone-500 underline underline-offset-4 hover:text-stone-800">{t.common.terms}</Link>
        <span aria-hidden className="mx-2 text-stone-300">·</span>
        <Link href="/privacy" className="text-stone-500 underline underline-offset-4 hover:text-stone-800">{t.common.privacyPolicy}</Link>
      </p>
    </main>
    </>
  );
}
