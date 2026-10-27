import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { WorkView } from "@/components/work-view";
import { getT } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/locales";
import { currentUserId } from "@/server/auth/session";
import { acceptOfferAction, dismissOfferAction } from "@/app/actions/works";
import { dmOpenForConnectionAction } from "@/app/actions/dm";
import { getAccount } from "@/server/services/account";
import { myOffers, openWork, recordOffer } from "@/server/services/works";

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
  const o = t.offer;
  // Signed in and reading a work I was handed: keep the writer's offer to connect.
  const offerId = viewer && work.status === "open" && !work.mine ? await recordOffer(viewer, token) : null;
  const offer = offerId ? (await myOffers(viewer!)).find((x) => x.id === offerId) ?? null : null;
  const onboarded = viewer ? !!(await getAccount(viewer)).profile.onboardedAt : false;
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
              <section id="start" className="scroll-mt-4 bg-gradient-to-b from-violet-50 to-amber-50 px-6 py-10 text-center" data-testid="work-start">
                <div className="mosaic-mark mx-auto mb-3 h-10 w-10 rounded-xl" aria-hidden />
                {offer && !offer.accepted && (
                  // Signed in (or just signed up from here): the writer's offer, taken in one tap.
                  <div className="mx-auto mb-8 max-w-sm rounded-3xl bg-white/90 p-5 shadow-sm ring-1 ring-violet-100" data-testid="offer">
                    <h2 className="font-serif text-lg font-bold text-stone-900">{o.askTitle(offer.ownerName)}</h2>
                    <p className="mt-2 text-xs leading-6 text-stone-600">{o.askLead}</p>
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                      <form action={acceptOfferAction}>
                        <input type="hidden" name="offerId" value={offer.id} />
                        <input type="hidden" name="back" value={`/w/${token}`} />
                        <button type="submit" className="rounded-full bg-violet-700 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-violet-800">{o.connect}</button>
                      </form>
                      {!offer.dismissed && (
                        <form action={dismissOfferAction}>
                          <input type="hidden" name="offerId" value={offer.id} />
                          <input type="hidden" name="back" value={`/w/${token}`} />
                          <button type="submit" className="text-sm font-semibold text-stone-500 underline underline-offset-4">{o.later}</button>
                        </form>
                      )}
                    </div>
                    {offer.dismissed && <p className="mt-3 text-[11px] leading-5 text-stone-500">{o.laterNote}</p>}
                  </div>
                )}
                {offer?.accepted && offer.sessionId && (
                  <div className="mx-auto mb-8 max-w-sm rounded-3xl bg-white/90 p-5 shadow-sm ring-1 ring-teal-100" data-testid="offer-connected">
                    <p className="font-bold text-teal-900">🤝 {o.connected(offer.ownerName)}</p>
                    <form action={dmOpenForConnectionAction} className="mt-3">
                      <input type="hidden" name="sessionId" value={offer.sessionId} />
                      <input type="hidden" name="draft" value={o.replyDraft} />
                      <input type="hidden" name="back" value={`/w/${token}`} />
                      <button type="submit" className="rounded-full bg-teal-700 px-5 py-2 text-sm font-bold text-white hover:bg-teal-800">💬 {o.reply}</button>
                    </form>
                  </div>
                )}
                <h2 className="font-serif text-lg font-bold text-stone-900 [text-wrap:balance]">{w.startTitle}</h2>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-stone-600">{w.startLead}</p>
                <Link href={viewer ? (onboarded ? "/home" : "/welcome") : `/register?next=${encodeURIComponent(`/w/${token}`)}`} className="mt-5 inline-block rounded-full bg-violet-700 px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-violet-800">
                  {viewer && onboarded ? w.openApp : w.start}
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
