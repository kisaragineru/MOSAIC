import { notFound } from "next/navigation";
import { dmOpenForConnectionAction } from "@/app/actions/dm";
import { acceptOfferAction } from "@/app/actions/works";
import { Flash } from "@/components/flash";
import { Page } from "@/components/page";
import { WorkView } from "@/components/work-view";
import { getT } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/locales";
import { uuid } from "@/lib/validation/common";
import { requireUser } from "@/server/auth/session";
import { myOffers, readOffer } from "@/server/services/works";

/** A story someone handed me, read in the app (also after its link ran out, while we're connected). */
export default async function ReceivedWorkPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const sp = await searchParams;
  const { t } = await getT();
  const o = t.offer;
  const offer = (await myOffers(uid)).find((x) => x.id === id);
  const work = offer ? await readOffer(uid, id) : null;
  if (!offer || !work) notFound();
  const back = `/me/work/received/${id}`;
  return (
    <Page title={offer.title} back="/me/work">
      <Flash t={t} sp={sp} />
      {work.status === "closed" ? (
        <p className="rounded-3xl bg-white/90 p-6 text-center text-sm leading-6 text-stone-600 ring-1 ring-stone-200" data-testid="work-closed">{t.work.closedTitle}</p>
      ) : (
        <WorkView t={t} content={work.content} title={work.title} note={work.note} locale={work.locale as Locale}>
          <section className="bg-gradient-to-b from-violet-50 to-amber-50 px-6 py-8 text-center">
            {offer.sessionId ? (
              <>
                <p className="font-bold text-teal-900">🤝 {o.connected(offer.ownerName)}</p>
                <form action={dmOpenForConnectionAction} className="mt-3">
                  <input type="hidden" name="sessionId" value={offer.sessionId} />
                  <input type="hidden" name="draft" value={o.replyDraft} />
                  <input type="hidden" name="back" value={back} />
                  <button type="submit" className="rounded-full bg-teal-700 px-5 py-2 text-sm font-bold text-white hover:bg-teal-800">💬 {o.reply}</button>
                </form>
              </>
            ) : (
              <>
                <h2 className="font-serif text-lg font-bold text-stone-900">{o.askTitle(offer.ownerName)}</h2>
                <p className="mx-auto mt-2 max-w-sm text-xs leading-6 text-stone-600">{o.askLead}</p>
                <form action={acceptOfferAction} className="mt-4">
                  <input type="hidden" name="offerId" value={offer.id} />
                  <input type="hidden" name="back" value={back} />
                  <button type="submit" className="rounded-full bg-violet-700 px-6 py-2.5 text-sm font-bold text-white hover:bg-violet-800">{o.connect}</button>
                </form>
              </>
            )}
          </section>
        </WorkView>
      )}
    </Page>
  );
}
