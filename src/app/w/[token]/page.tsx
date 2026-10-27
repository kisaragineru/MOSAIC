import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { WorkView } from "@/components/work-view";
import { getT } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/locales";
import { currentUserId } from "@/server/auth/session";
import { openWork } from "@/server/services/works";

// A private page: never indexed, and the link isn't passed on to other sites.
export const metadata: Metadata = {
  title: "MOSAIC",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

/** A work someone handed over, read without signing in; then an invitation to start one's own. */
export default async function WorkLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const viewer = await currentUserId();
  const work = await openWork(token, viewer);
  if (!work) notFound();
  const { t, locale } = await getT();
  const w = t.work;
  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-3 py-6 sm:py-10">
      {work.status === "closed" ? (
        <div className="mx-auto mt-24 max-w-sm rounded-3xl bg-white/90 p-6 text-center shadow-sm ring-1 ring-stone-200" data-testid="work-closed">
          <div className="mosaic-mark mx-auto mb-3 h-10 w-10 rounded-xl" aria-hidden />
          <h1 className="font-bold text-stone-900">{w.closedTitle}</h1>
          <p className="mt-2 text-sm leading-6 text-stone-600">{w.closedLead}</p>
        </div>
      ) : (
        <>
          <WorkView t={t} content={work.content} title={work.title} note={work.note} locale={work.locale as Locale}>
            {!work.mine && (
              <section className="bg-gradient-to-b from-violet-50 to-amber-50 px-6 py-10 text-center" data-testid="work-start">
                <div className="mosaic-mark mx-auto mb-3 h-10 w-10 rounded-xl" aria-hidden />
                <h2 className="font-serif text-lg font-bold text-stone-900 [text-wrap:balance]">{w.startTitle}</h2>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-stone-600">{w.startLead}</p>
                <Link href={viewer ? "/home" : `/register?work=${encodeURIComponent(token)}`} className="mt-5 inline-block rounded-full bg-violet-700 px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-violet-800">
                  {viewer ? w.openApp : w.start}
                </Link>
              </section>
            )}
          </WorkView>
          <p className="mt-4 text-center text-[11px] text-stone-400">🔒 {w.privacy}</p>
        </>
      )}
      <p className="mt-2 text-center text-[11px] tracking-[0.3em] text-stone-400">MOSAIC · {locale.toUpperCase()}</p>
    </main>
  );
}
