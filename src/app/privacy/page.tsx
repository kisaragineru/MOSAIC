import type { Metadata } from "next";
import Link from "next/link";
import { BrandLockup } from "@/components/brand";
import { PRIVACY } from "@/content/privacy";
import { LOCALE_NAMES, SUPPORTED_LOCALES, type Locale } from "@/lib/i18n/locales";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Privacy Policy — MOSAIC" };

const pick = (v: string | undefined): Locale | null => (SUPPORTED_LOCALES as readonly string[]).includes(v ?? "") ? (v as Locale) : null;

/** The privacy policy: open to everyone (no sign-in, outside the site's shared password), in each language. */
export default async function PrivacyPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { locale: mine } = await getT();
  const locale = pick(sp.lang) ?? mine;
  const p = PRIVACY[locale];
  const contact = process.env.CONTACT_EMAIL?.trim() || null;
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10" lang={locale}>
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link href="/" aria-label="MOSAIC"><BrandLockup /></Link>
        <nav className="flex gap-1 text-sm" aria-label="Language">
          {SUPPORTED_LOCALES.map((l) => (
            <Link key={l} href={`/privacy?lang=${l}`} aria-current={l === locale ? "page" : undefined} className={`rounded-lg px-2 py-1 ${l === locale ? "bg-stone-200 font-semibold" : "text-stone-500"}`}>
              {LOCALE_NAMES[l]}
            </Link>
          ))}
        </nav>
      </div>
      <article className="space-y-6 rounded-3xl bg-white/90 p-6 shadow-sm ring-1 ring-stone-100" data-testid="privacy-policy">
        <header>
          <h1 className="text-2xl font-bold text-stone-900">{p.title}</h1>
          <p className="mt-1 text-xs text-stone-500">{p.updated}</p>
          <p className="mt-4 text-sm leading-7 text-stone-700">{p.intro}</p>
        </header>
        {p.sections.map((s) => (
          <section key={s.h}>
            <h2 className="text-base font-bold text-stone-900">{s.h}</h2>
            {s.p?.map((x) => <p key={x} className="mt-2 text-sm leading-7 text-stone-700">{x}</p>)}
            {s.list && (
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-7 text-stone-700">
                {s.list.map((x) => <li key={x}>{x}</li>)}
              </ul>
            )}
          </section>
        ))}
        <p className="border-t border-stone-100 pt-4 text-sm text-stone-700">{p.contact(contact)}</p>
      </article>
    </main>
  );
}
