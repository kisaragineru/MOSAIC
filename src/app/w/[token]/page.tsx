import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TypeTry } from "@/components/type-try";
import { WorkEnvelope } from "@/components/work-envelope";
import { WorkView } from "@/components/work-view";
import { dateText } from "@/lib/i18n/date-text";
import { typesById } from "@/lib/tuvi/type-view";
import { getT } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/locales";
import { currentUserId } from "@/server/auth/session";
import { acceptOfferAction, dismissOfferAction, translateWorkAction } from "@/app/actions/works";
import { SubmitButton } from "@/components/submit-button";
import { LOCALE_NAMES } from "@/lib/i18n/locales";
import { dmOpenForConnectionAction } from "@/app/actions/dm";
import { getAccount } from "@/server/services/account";
import { myOffers, openWork, recordOffer, translatedWork } from "@/server/services/works";

// A private page: never indexed, and the link isn't passed on to other sites. Its preview (LINE,
// messages…) says who it's from, like the outside of a letter; looking doesn't count as opening.
export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const work = await openWork(token, null);
  const base: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };
  if (!work || work.status !== "open") return { ...base, title: "MOSAIC" };
  const { t } = await getT();
  const title = `${t.work.ogTitle(work.content.name)} — MOSAIC`;
  const description = t.work.ogDesc(work.content.name);
  return { ...base, title, description, openGraph: { title, description, siteName: "MOSAIC", type: "article" }, twitter: { card: "summary_large_image", title, description } };
}

const WHY_ICON = ["🌱", "🔒", "✉️"];

/** A work someone handed over, read without signing in; then an invitation to start one's own. */
export default async function WorkLinkPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { token } = await params;
  const sp = await searchParams;
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
  // In the reader's language: a kept translation shows unless they asked for the original.
  const translation = work.status === "open" && !work.mine && work.locale !== locale ? await translatedWork(token, viewer, locale, false) : null;
  const shown = translation && sp.orig !== "1" ? translation : null;
  const writerType = work.status === "open" ? typesById(work.content.types, locale)[0] : undefined;
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
          <WorkEnvelope token={token} note={work.note} skip={sp.open === "1" || !!offer} text={{ from: w.envFrom(work.content.name), lead: w.envLead(work.content.name), about: w.envAbout, open: w.envOpen }}>
          {/* Written in another language: read it in yours (translated by AI, once), or the original. */}
          {work.locale !== locale && !work.mine && (
            <div className="mb-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-2xl bg-white/80 px-4 py-3 text-center text-xs text-stone-600 ring-1 ring-stone-200" data-testid="work-translate">
              {shown ? (
                <>
                  <span>🌐 {w.translated(LOCALE_NAMES[locale])}</span>
                  <Link href={`/w/${token}?open=1&orig=1`} className="font-semibold text-violet-800 underline underline-offset-4">{w.readOriginal(LOCALE_NAMES[work.locale as Locale])}</Link>
                </>
              ) : (
                <>
                  <span>{w.writtenIn(LOCALE_NAMES[work.locale as Locale])}</span>
                  {translation ? (
                    <Link href={`/w/${token}?open=1`} className="font-semibold text-violet-800 underline underline-offset-4">{w.readIn(LOCALE_NAMES[locale])}</Link>
                  ) : (
                    <form action={translateWorkAction}>
                      <input type="hidden" name="token" value={token} />
                      <SubmitButton pending={w.translating} className="min-h-8 bg-violet-700 px-4 py-1.5 text-xs hover:bg-violet-800">🌐 {w.readIn(LOCALE_NAMES[locale])}</SubmitButton>
                    </form>
                  )}
                  {sp.e === "translate_failed" && <span className="w-full text-rose-700">{w.translateFailed}</span>}
                </>
              )}
            </div>
          )}
          <WorkView t={t} content={shown?.content ?? work.content} title={shown?.title ?? work.title} note={shown ? shown.note : work.note} locale={shown ? locale : (work.locale as Locale)}>
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
                {/* Not signed up yet: their own type in a moment, beside the writer's. */}
                {!viewer && (
                  <div className="mb-10">
                    <TypeTry
                      date={dateText(t)}
                      theirs={writerType ? { id: writerType.id, persona: `${work.content.name} · ${writerType.persona}` } : null}
                      text={{ title: w.tryTitle, lead: w.tryLead, date: w.tryDate, hour: w.tryHour, hourUnknown: w.tryHourUnknown, go: w.tryGo, yours: w.tryYours, noTime: w.tryNoTime, needs: w.tryNeeds, invalid: w.tryInvalid }}
                    />
                  </div>
                )}
                <h2 className="font-serif text-lg font-bold text-stone-900 [text-wrap:balance]">{w.whyTitle}</h2>
                <ul className="mx-auto mt-4 max-w-sm space-y-2 text-left" data-testid="work-why">
                  {w.why.map((x, i) => (
                    <li key={i} className="flex items-start gap-3 rounded-2xl bg-white/80 px-4 py-3 text-sm leading-6 text-stone-700 ring-1 ring-white">
                      <span aria-hidden className="mt-0.5">{WHY_ICON[i]}</span>
                      <span>{x}</span>
                    </li>
                  ))}
                </ul>
                <p className="mx-auto mt-5 max-w-sm text-sm leading-6 text-stone-600">{w.startLead}</p>
                <Link href={viewer ? (onboarded ? "/home" : "/welcome") : `/register?next=${encodeURIComponent(`/w/${token}?open=1`)}`} className="mt-5 inline-block rounded-full bg-violet-700 px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-violet-800">
                  {viewer && onboarded ? w.openApp : w.start}
                </Link>
              </section>
            )}
          </WorkView>
          <p className="mt-4 text-center text-[11px] text-stone-400">🔒 {w.privacy}</p>
          </WorkEnvelope>
        </>
      )}
      <p className="mt-2 text-center text-[11px] tracking-[0.3em] text-stone-400">MOSAIC · {locale.toUpperCase()}</p>
    </main>
  );
}
