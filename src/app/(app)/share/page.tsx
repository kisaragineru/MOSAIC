import Link from "next/link";
import { revokeShareAction } from "@/app/actions/sharing";
import { ConfirmButton } from "@/components/confirm-button";
import { Flash } from "@/components/flash";
import { ShareCreator } from "@/components/share-creator";
import { Card, Empty, Page, Pill } from "@/components/ui";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { listComparisons, listShares } from "@/server/services/sharing";
import { latestWork } from "@/server/services/works";
import { handOverAction } from "@/app/actions/works";
import { makeInviteCodeAction, revokeInviteCodeAction } from "@/app/actions/invites";
import { InviteCodeSend } from "@/components/invite-code-send";
import { QrFromImage } from "@/components/qr-from-image";
import { registrationCodeRequired } from "@/server/services/account";
import { myInviteCodes } from "@/server/services/invite-codes";

export default async function SharePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const sp = await searchParams;
  const { t } = await getT();
  const shares = await listShares(uid);
  const comps = await listComparisons(uid);
  const work = await latestWork(uid);
  // While sign-up is by invitation: invite codes anyone can make and send.
  const inviting = registrationCodeRequired();
  const codes = inviting ? await myInviteCodes(uid) : [];
  const origin = process.env.APP_ORIGIN ?? "";
  const w = t.work;
  const s = t.share;
  return (
    <Page title={s.title}>
      <Flash t={t} sp={sp} />
      {/* Two ways, two kinds of people: pick by whether they use MOSAIC. */}
      <p className="text-sm text-stone-600">{s.pick}</p>
      <nav className={`grid gap-2 ${inviting ? "grid-cols-3" : "grid-cols-2"}`} aria-label={s.title} data-testid="share-pick">
        <a href="#story" className="rounded-2xl bg-violet-50 p-3 ring-1 ring-violet-100 hover:ring-violet-300">
          <span aria-hidden className="text-xl">✉️</span>
          <span className="mt-1 block text-[11px] font-semibold text-violet-700">{s.storyFor}</span>
          <span className="block text-sm font-bold text-stone-900">{s.storyTitle} ↓</span>
        </a>
        <a href="#connect" className="rounded-2xl bg-teal-50 p-3 ring-1 ring-teal-100 hover:ring-teal-300">
          <span aria-hidden className="text-xl">🔗</span>
          <span className="mt-1 block text-[11px] font-semibold text-teal-700">{s.connectFor}</span>
          <span className="block text-sm font-bold text-stone-900">{s.connectTitle} ↓</span>
        </a>
        {inviting && (
          <a href="#invite" className="rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-100 hover:ring-amber-300">
            <span aria-hidden className="text-xl">🎟</span>
            <span className="mt-1 block text-[11px] font-semibold text-amber-700">{s.inviteFor}</span>
            <span className="block text-sm font-bold text-stone-900">{s.inviteTitle} ↓</span>
          </a>
        )}
      </nav>

      {/* Handing over the story: for anyone, MOSAIC or not. */}
      <section id="story" className="scroll-mt-20 rounded-3xl bg-gradient-to-br from-violet-50 to-amber-50 p-5 shadow-sm ring-1 ring-violet-100" data-testid="share-work">
        <span className="inline-block rounded-full bg-violet-700 px-2.5 py-0.5 text-[11px] font-bold text-white">{s.storyTag}</span>
        <h2 className="mt-2 text-lg font-bold text-stone-900">✉️ {s.storyTitle}</h2>
        <p className="mt-1 text-xs leading-5 text-stone-600">{w.shareLead}</p>
        <ul className="mt-3 space-y-1">
          {s.storyPoints.map((x) => (
            <li key={x} className="flex gap-2 text-sm text-stone-700"><span aria-hidden className="text-violet-600">✓</span>{x}</li>
          ))}
        </ul>
        {work ? (
          <form action={handOverAction} className="mt-4 flex flex-wrap gap-2">
            <input type="hidden" name="workId" value={work.id} />
            <input type="hidden" name="days" value="14" />
            <input name="recipient" maxLength={60} placeholder={w.recipientPh} aria-label={w.recipient} className="min-w-0 flex-1 rounded-full border border-violet-200 bg-white px-4 py-2 text-sm focus:border-violet-500 focus:outline-none" />
            <button type="submit" className="shrink-0 rounded-full bg-violet-700 px-4 py-2 text-sm font-bold text-white hover:bg-violet-800">{w.give}</button>
          </form>
        ) : (
          <p className="mt-4 text-sm text-stone-600">{w.shareNoWork} <Link href="/me/work" className="font-semibold text-violet-800 underline underline-offset-4">{w.shareMake} →</Link></p>
        )}
        {work && <Link href="/me/work#links" className="mt-2 inline-block text-xs font-semibold text-violet-800 underline underline-offset-4">{w.links} →</Link>}
      </section>

      {/* Connecting by QR: for people who already use MOSAIC. */}
      <section id="connect" className="scroll-mt-20 rounded-3xl bg-gradient-to-br from-teal-50 to-sky-50 p-5 shadow-sm ring-1 ring-teal-100" data-testid="share-connect">
        <span className="inline-block rounded-full bg-teal-700 px-2.5 py-0.5 text-[11px] font-bold text-white">{s.connectTag}</span>
        <h2 className="mt-2 text-lg font-bold text-stone-900">🔗 {s.connectTitle}</h2>
        <ul className="mt-3 space-y-1">
          {s.connectPoints.map((x) => (
            <li key={x} className="flex gap-2 text-sm text-stone-700"><span aria-hidden className="text-teal-600">✓</span>{x}</li>
          ))}
        </ul>
        <div className="mt-4 rounded-2xl bg-white/80 p-4">
          <ShareCreator
            tx={{
              create: s.create,
              advanced: s.advanced,
              createCustom: s.createCustom,
              label: s.label,
              expires: s.expires,
              maxUses: s.maxUses,
              once: s.once,
              qrAlt: s.qrAlt,
              copy: s.copy,
              copied: s.copied,
              errors: t.errors,
            }}
          />
        </div>
        {/* Their QR as a picture (a screenshot, a photo): read it here and connect. */}
        <div className="mt-3">
          <QrFromImage tx={{ button: s.qrImage, hint: s.qrImageHint, reading: s.qrReading, notFound: s.qrNotFound, notMosaic: s.qrNotMosaic }} />
        </div>
      </section>

      {inviting && (
        <section id="invite" className="scroll-mt-20 rounded-3xl bg-gradient-to-br from-amber-50 to-rose-50 p-5 shadow-sm ring-1 ring-amber-100" data-testid="share-invite">
          <span className="inline-block rounded-full bg-amber-600 px-2.5 py-0.5 text-[11px] font-bold text-white">{s.inviteTag}</span>
          <h2 className="mt-2 text-lg font-bold text-stone-900">🎟 {s.inviteTitle}</h2>
          <p className="mt-1 text-xs leading-5 text-stone-600">{s.inviteLead}</p>
          <form action={makeInviteCodeAction} className="mt-3 flex flex-wrap gap-2">
            <input name="label" maxLength={60} placeholder={s.inviteLabelPh} aria-label={s.inviteLabel} className="min-w-0 flex-1 rounded-full border border-amber-200 bg-white px-4 py-2 text-sm focus:border-amber-500 focus:outline-none" />
            <button type="submit" className="rounded-full bg-amber-600 px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-amber-700">{s.inviteMake}</button>
          </form>
          <h3 className="mt-4 text-xs font-bold text-stone-600">{s.inviteMine}</h3>
          {codes.length === 0 ? (
            <p className="mt-1 text-xs text-stone-500">{s.inviteNone}</p>
          ) : (
            <ul className="mt-2 space-y-2" data-testid="invite-codes">
              {codes.map((c) => (
                <li key={c.id} className={`rounded-2xl p-3 ring-1 ${c.state === "open" ? "bg-white/90 ring-amber-100" : "bg-white/50 ring-stone-100"} ${sp.made === c.id ? "ring-2 ring-amber-400" : ""}`}>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className={c.label ? "font-semibold text-stone-900" : "text-stone-500"}>{c.label ?? s.inviteNoName}</span>
                    <Pill tone={c.state === "open" ? "amber" : c.state === "used" ? "teal" : "stone"}>{s.inviteState[c.state]}</Pill>
                    {c.state === "open" && <span className="text-xs text-stone-500">{s.inviteUntil(c.expiresAt.toISOString().slice(0, 10))}</span>}
                  </div>
                  {c.state === "open" && (
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <InviteCodeSend code={c.code} message={s.inviteMessage(`${origin}/register?code=${c.code}`, c.code)} tx={{ copy: s.inviteCopy, copied: s.inviteCopied, send: s.inviteSend }} />
                      <form action={revokeInviteCodeAction}>
                        <input type="hidden" name="id" value={c.id} />
                        <ConfirmButton message={t.common.confirmDelete} bare className="text-xs text-stone-500 underline underline-offset-4 hover:text-rose-700">{s.inviteRevoke}</ConfirmButton>
                      </form>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <h2 className="pt-2 text-xs font-bold uppercase tracking-wider text-stone-500">{s.history}</h2>
      <Card title={t.share.comparisons}>
        {comps.length === 0 ? (
          <Empty>{t.share.noComparisons}</Empty>
        ) : (
          <ul className="divide-y divide-stone-100">
            {comps.map((c) => (
              <li key={c.id}>
                <Link href={`/compare/${c.id}`} className="flex items-center justify-between py-2">
                  <span>{t.share.with(c.otherName)}</span>
                  <Pill tone={c.status === "active" ? "teal" : c.waitingOn === "you" ? "rose" : c.status === "pending" ? "amber" : "stone"}>
                    {t.share.compStatus[c.waitingOn ? (`awaiting_${c.waitingOn}` as const) : (c.status as "active" | "revoked")]}
                  </Pill>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title={t.share.links}>
        {shares.length === 0 ? (
          <Empty>{t.share.noLinks}</Empty>
        ) : (
          <ul className="space-y-2">
            {shares.map((s) => {
              const status = s.status;
              return (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200 p-2 text-sm">
                  <div>
                    <p className="font-medium">{s.label ?? s.createdAt.toISOString().slice(0, 10)}</p>
                    <p className="text-xs text-stone-500">{t.share.uses(s.useCount, s.maxUses)} · {t.share.expiresOn(s.expiresAt.toISOString().slice(0, 10))}</p>
                  </div>
                  <Pill tone={status === "active" ? "teal" : "stone"}>{t.share.status[status]}</Pill>
                  {status !== "revoked" && (
                    <form action={revokeShareAction}>
                      <input type="hidden" name="shareId" value={s.id} />
                      <ConfirmButton message={t.common.confirmDelete} className="min-h-8 px-2 py-1 text-xs">{t.share.revoke}</ConfirmButton>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </Page>
  );
}
