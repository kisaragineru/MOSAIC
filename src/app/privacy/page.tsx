import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { PRIVACY } from "@/content/privacy";
import { SUPPORTED_LOCALES, type Locale } from "@/lib/i18n/locales";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Privacy Policy — MOSAIC" };

const pick = (v: string | undefined): Locale | null => ((SUPPORTED_LOCALES as readonly string[]).includes(v ?? "") ? (v as Locale) : null);

/** The privacy policy: open to everyone (no sign-in, outside the site's shared password), in each language. */
export default async function PrivacyPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const locale = pick(sp.lang) ?? (await getT()).locale;
  return <LegalPage path="/privacy" locale={locale} doc={PRIVACY[locale]} testId="privacy-policy" />;
}
