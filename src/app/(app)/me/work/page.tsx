import Link from "next/link";
import { extendLinkAction, handOverAction, makeWorkAction, revokeLinkAction } from "@/app/actions/works";
import { ConfirmButton } from "@/components/confirm-button";
import { Flash } from "@/components/flash";
import { PickLimit } from "@/components/pick-limit";
import { ShareLink } from "@/components/share-link";
import { Card, Page, Pill } from "@/components/ui";
import { WorkView } from "@/components/work-view";
import { getT } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/locales";
import { requireUser } from "@/server/auth/session";
import { getAccount } from "@/server/services/account";
import { appOrigin } from "@/server/services/sharing";
import { answerChoices, draftWork, LINK_DAYS, latestWork, myLinks, myOffers } from "@/server/services/works";

/**
 * Hand your story to someone close: read it as it would be, fix it as a work, then make a link of
 * their own for each person (shown once), and see who has opened it.
 */
export default async function WorkPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const sp = await searchParams;
  const { t, locale } = await getT();
  const w = t.work;
  const tz = (await getAccount(uid)).profile.timeZone;
  const date = (d: Date) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: tz }).format(d);
  const work = await latestWork(uid);
  const draft = await draftWork(uid, locale);
  const choices = draft ? await answerChoices(uid, locale) : [];
  const links = work ? await myLinks(uid) : [];
  const received = await myOffers(uid);
  const handed = sp.link && /^[A-Za-z0-9_-]{16,64}$/.test(sp.link) ? sp.link : null;
  const input = "w-full rounded-2xl border border-stone-200 bg-white px-3.5 py-2.5 text-base focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20";

  return (
    <Page title={w.title} back="/me/manual">
      <Flash t={t} sp={sp} />
      <p className="text-sm leading-6 text-stone-600">{w.lead}</p>

      {handed && (
        <section id="handed" className="scroll-mt-24 rounded-3xl bg-teal-50 p-4 ring-1 ring-teal-200" data-testid="work-handed">
          <p className="font-bold text-teal-950">✉️ {w.linkReady(sp.who?.trim() || null)}</p>
          <p className="mt-1 text-xs leading-5 text-teal-900">{w.linkOnce}</p>
          <div className="mt-3">
            <ShareLink url={`${appOrigin()}/w/${handed}`} title={work?.title ?? ""} text={w.from(work?.content.name ?? "")} labels={{ share: w.share, copy: w.copy, copied: w.copied }} />
          </div>
        </section>
      )}

      {work && (
        <section id="work" className="scroll-mt-24 space-y-3">
          <Card title={`📖 ${w.yourWork}`}>
            <p className="font-semibold text-stone-900">{work.title}</p>
            <p className="text-xs text-stone-500">{w.madeOn(date(work.createdAt))}</p>
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-semibold text-teal-800">{w.read}</summary>
              <div className="mt-3">
                <WorkView t={t} content={work.content} title={work.title} locale={work.locale as Locale} />
              </div>
            </details>
          </Card>

          <Card title={`✉️ ${w.giveTitle}`}>
            <form id="give" action={handOverAction} className="scroll-mt-24 space-y-3">
              <input type="hidden" name="workId" value={work.id} />
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-stone-700">{w.recipient}</span>
                <input name="recipient" maxLength={60} placeholder={w.recipientPh} className={input} />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-stone-700">{w.note}</span>
                <textarea name="note" maxLength={300} rows={2} placeholder={w.notePh} className={`${input} field-sizing-content resize-none`} />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-stone-700">{w.days}</span>
                <select name="days" defaultValue="14" className={`${input} w-auto`}>
                  {LINK_DAYS.map((n) => <option key={n} value={n}>{w.daysOpt(n)}</option>)}
                </select>
              </label>
              <button type="submit" className="rounded-full bg-teal-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-teal-800">{w.give}</button>
            </form>
          </Card>

          <Card title={w.links}>
            <div id="links" className="scroll-mt-24">
              {links.length === 0 ? (
                <p className="text-sm text-stone-500">{w.noLinks}</p>
              ) : (
                <ul className="divide-y divide-stone-100" data-testid="work-links">
                  {links.map((l) => (
                    <li key={l.id} className="py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={l.recipient ? "font-semibold text-stone-900" : "text-stone-500"}>{l.recipient ?? w.noRecipient}</span>
                        {l.state === "open" ? <Pill tone="teal">{w.until(date(l.expiresAt))}</Pill> : <Pill>{l.state === "expired" ? w.expired : w.revoked}</Pill>}
                        <span className="text-xs text-stone-500">{l.openedAt ? `✓ ${w.opened}` : w.notOpened}</span>
                      </div>
                      {l.note && <p className="mt-1 line-clamp-1 text-xs text-stone-500">“{l.note}”</p>}
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <form action={extendLinkAction}>
                          <input type="hidden" name="linkId" value={l.id} />
                          <button type="submit" className="text-xs font-semibold text-teal-800 underline underline-offset-4">{w.extend}</button>
                        </form>
                        {l.state === "open" && (
                          <form action={revokeLinkAction}>
                            <input type="hidden" name="linkId" value={l.id} />
                            <ConfirmButton bare message={w.revokeConfirm} className="text-xs font-semibold text-rose-700 underline underline-offset-4">{w.revoke}</ConfirmButton>
                          </form>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </section>
      )}

      {received.length > 0 && (
        <Card title={`📬 ${t.offer.receivedTitle}`}>
          <ul className="divide-y divide-stone-100" data-testid="received">
            {received.map((x) => (
              <li key={x.id} className="flex items-center justify-between gap-3 py-3">
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-stone-900">{x.title}</span>
                  <span className="block text-xs text-stone-500">{t.offer.fromWho(x.ownerName)} · {x.sessionId ? t.offer.stateConnected : t.offer.stateNot}</span>
                </span>
                <Link href={`/me/work/received/${x.id}`} className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-violet-800 ring-1 ring-violet-200">{t.offer.read} →</Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {!draft ? (
        <p className="rounded-3xl bg-white/80 p-6 text-center text-sm leading-6 text-stone-600 ring-1 ring-stone-200/60">{w.noStory}</p>
      ) : (
        <section className="space-y-3" data-testid="work-draft">
          <h2 className="px-1 text-base font-bold text-stone-900">{w.previewTitle}</h2>
          <p className="px-1 text-xs leading-5 text-stone-600">{w.previewNote}</p>
          <WorkView t={t} content={draft} title={draft.storyTitle} locale={locale} />
          <Card>
            <form action={makeWorkAction} className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-stone-700">{w.workTitle}</span>
                <input name="title" required maxLength={80} defaultValue={draft.storyTitle} className={input} />
              </label>
              {choices.length > 0 && (
                <fieldset>
                  <legend className="text-sm font-medium text-stone-700">{w.answersTitle}</legend>
                  <p className="text-xs text-stone-500">{w.answersHelp}</p>
                  <PickLimit max={5} note={w.answersHelp}>
                  <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto">
                    {choices.map((c) => (
                      <li key={c.id}>
                        <label className="flex cursor-pointer items-start gap-3 rounded-2xl px-2 py-2 hover:bg-stone-50 has-[:checked]:bg-teal-50/70">
                          <input type="checkbox" name="answer" value={c.id} className="mt-0.5 h-5 w-5 shrink-0 accent-teal-700" />
                          <span className="min-w-0 text-sm">
                            <span className="block text-xs text-stone-500">{c.q}</span>
                            <span className="block font-semibold text-stone-900">{c.a}</span>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                  </PickLimit>
                </fieldset>
              )}
              <button type="submit" className="rounded-full bg-violet-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-violet-800">{work ? w.remake : w.make}</button>
            </form>
          </Card>
        </section>
      )}
    </Page>
  );
}
