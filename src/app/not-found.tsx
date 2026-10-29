import Link from "next/link";
import { BrandMark } from "@/components/brand";
import { getT } from "@/lib/i18n/server";

/** A page that isn't there (or isn't yours to see), said in the reader's language. */
export default async function NotFound() {
  const { t } = await getT();
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center px-4 text-center" data-testid="not-found">
      <BrandMark className="h-10 w-10" />
      <h1 className="mt-4 text-lg font-bold text-stone-900">{t.common.notFoundTitle}</h1>
      <p className="mt-2 text-sm leading-6 text-stone-600">{t.common.notFoundLead}</p>
      <Link href="/" className="mt-5 inline-flex min-h-10 items-center rounded-full bg-teal-700 px-5 text-sm font-semibold text-white hover:bg-teal-800">{t.common.notFoundHome}</Link>
    </main>
  );
}
