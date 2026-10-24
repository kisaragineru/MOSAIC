import { notFound } from "next/navigation";
import Link from "next/link";
import { SharedManualView } from "@/components/shared-manual";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { sharedManualFor } from "@/server/services/manual-share";

/** The other participant's manual, as much as they chose to show. */
export default async function TheirManualPage({ params }: { params: Promise<{ id: string }> }) {
  const uid = await requireUser();
  const { id } = await params;
  const { t, locale } = await getT();
  const m = await sharedManualFor(uid, id, locale).catch(() => null);
  if (!m) notFound();
  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 px-4 pb-28 pt-4">
      <Link href={`/compare/${id}`} className="inline-block rounded-full px-2 py-1 text-stone-500 hover:bg-stone-200" aria-label="Back">←</Link>
      <SharedManualView m={m} locale={locale} levels={{ consistent: t.manual.levelConsistent, emerging: t.manual.levelEmerging, mixed: t.manual.levelMixed }} />
    </main>
  );
}
