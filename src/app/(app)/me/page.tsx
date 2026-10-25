import { Avatar } from "@/components/avatar";
import { myAvatarUrl } from "@/server/services/avatars";
import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import { updateProfileAction } from "@/app/actions/settings";
import { Flash } from "@/components/flash";
import { Button, Card, Field, Page, Textarea } from "@/components/ui";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { getAccount } from "@/server/services/account";
import { draftIntro, introGrowth, INTRO_UPDATE_AFTER } from "@/server/services/intro";
import { saveIntroAction } from "@/app/actions/intro";
import { ConfirmButton } from "@/components/confirm-button";
import { headers } from "next/headers";
import { BirthForm } from "@/components/birth-form";
import { getBirthForm } from "@/server/services/tuvi";

const pill =
  "cursor-pointer rounded-full border border-stone-200 bg-white px-3 py-1 text-stone-700 has-[:checked]:border-teal-600 has-[:checked]:bg-teal-600 has-[:checked]:text-white";

/** Profile: who you are to others, and your settings. Reading about yourself lives in Insights. */
export default async function MePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const sp = await searchParams;
  const { t, locale } = await getT();
  const acc = await getAccount(uid);
  const ti = t.intro;
  // Drafting with AI sends data to the provider: only for a form submitted from this site.
  const sameOrigin = (await headers()).get("sec-fetch-site") === "same-origin";
  const draft = sp.draft ? await draftIntro(uid, { length: sp.len, tone: sp.tone, ai: sp.ai === "1" && sameOrigin }, locale) : null;
  const growth = await introGrowth(uid, acc.profile.introPieces);
  const avatar = await myAvatarUrl(uid);
  const birth = await getBirthForm(uid);
  const bp = birth.profile;
  const birthText = bp
    ? [
        bp.calendarInput === "lunar" && bp.lunarYear ? t.me.birthLunar(bp.lunarYear, bp.lunarMonth ?? 0, bp.lunarDay ?? 0, !!bp.lunarLeap) : bp.solarDate ? new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${bp.solarDate}T00:00:00Z`)) : "",
        bp.timeKnown && bp.birthTime ? bp.birthTime.slice(0, 5) : t.me.birthTimeUnknown,
      ].filter(Boolean).join(" · ")
    : null;
  return (
    <Page title={t.me.title}>
      <Flash t={t} sp={sp} />
      <section className="flex items-center gap-4 rounded-3xl bg-white/85 p-5 shadow-sm ring-1 ring-white/80">
        <Link href="/me/photo" aria-label={t.avatar.title} className="group relative shrink-0">
          <Avatar name={acc.profile.displayName} src={avatar} className="h-16 w-16 text-2xl ring-4 ring-white" />
          <span aria-hidden className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-teal-700 text-xs text-white ring-2 ring-white transition group-hover:scale-110">📷</span>
        </Link>
        <div className="min-w-0">
          <p className="truncate text-xl font-bold text-stone-900">{acc.profile.displayName}</p>
          <p className="text-xs text-stone-500">{t.me.joined(acc.createdAt.toISOString().slice(0, 10))}</p>
          {!avatar && <Link href="/me/photo" className="mt-1 inline-block text-xs font-semibold text-teal-700">📷 {t.avatar.edit} →</Link>}
        </div>
      </section>

      <section id="intro" aria-labelledby="intro-title" className="scroll-mt-20 space-y-4 rounded-3xl bg-white/85 p-5 shadow-sm ring-1 ring-white/80">
        <div>
          <h2 id="intro-title" className="text-base font-semibold text-stone-900">{ti.title}</h2>
          <p className="mt-1 text-xs leading-5 text-stone-500">{ti.help}</p>
        </div>

        <form action={updateProfileAction} className="space-y-2">
          <input type="hidden" name="back" value="/me" />
          <Field label={`📝 ${ti.ownTitle}`}><Textarea name="bio" defaultValue={acc.profile.bio ?? ""} maxLength={2000} rows={3} placeholder={ti.ownPlaceholder} /></Field>
          <Button type="submit" variant="secondary">{t.common.save}</Button>
        </form>

        <div className="space-y-3 border-t border-stone-100 pt-4">
          <p className="text-sm font-semibold text-stone-800">🧩 {ti.mosaicTitle}</p>
          <p className="text-xs leading-5 text-stone-500">{ti.mosaicHelp}</p>
          {acc.profile.intro ? (
            <blockquote className="rounded-2xl bg-linear-to-br from-sky-50 to-violet-50 p-4 text-sm leading-7 text-stone-800 ring-1 ring-sky-100">
              {acc.profile.intro}
              {acc.profile.introUpdatedAt && <footer className="mt-1 text-[11px] text-stone-500">{ti.savedOn(acc.profile.introUpdatedAt.toISOString().slice(0, 10))}</footer>}
            </blockquote>
          ) : (
            <p className="text-sm text-stone-500">{ti.none}</p>
          )}
          {growth >= INTRO_UPDATE_AFTER && !draft && <p className="rounded-2xl bg-amber-50 px-4 py-2.5 text-sm text-amber-900">✨ {ti.growth(growth)}</p>}

          {draft ? (
            <form action={saveIntroAction} className="space-y-2 rounded-2xl border border-teal-200 bg-teal-50/40 p-4">
              <p className="text-xs font-semibold text-teal-800">{ti.draftTitle}</p>
              {draft.source === "ai" && <p className="text-xs text-violet-800">🤖 {ti.draftAi}</p>}
              {draft.aiUnavailable && <p className="text-xs text-amber-800">{draft.aiUnavailable === "not_opted_in" ? ti.aiOff : ti.aiFallback}</p>}
              <Textarea name="intro" defaultValue={draft.text} rows={5} maxLength={2000} aria-label={ti.draftTitle} />
              <p className="text-[11px] text-stone-500">{ti.draftNote}</p>
              <div className="flex items-center gap-3">
                <Button type="submit">{ti.save}</Button>
                <Link href="/me#intro" className="text-sm text-stone-500 underline">{ti.cancel}</Link>
              </div>
            </form>
          ) : (
            <form method="get" action="/me#intro" className="space-y-2">
              <input type="hidden" name="draft" value="1" />
              <fieldset className="flex flex-wrap items-center gap-1.5 text-xs">
                <legend className="sr-only">{ti.length}</legend>
                <span className="w-10 text-stone-500">{ti.length}</span>
                {(["one", "short", "long"] as const).map((x) => (
                  <label key={x} className={pill}><input type="radio" name="len" value={x} defaultChecked={x === "short"} className="sr-only" />{ti.lengths[x]}</label>
                ))}
              </fieldset>
              <fieldset className="flex flex-wrap items-center gap-1.5 text-xs">
                <legend className="sr-only">{ti.tone}</legend>
                <span className="w-10 text-stone-500">{ti.tone}</span>
                {(["polite", "casual"] as const).map((x) => (
                  <label key={x} className={pill}><input type="radio" name="tone" value={x} defaultChecked={x === "polite"} className="sr-only" />{ti.tones[x]}</label>
                ))}
              </fieldset>
              <label className="flex items-start gap-2 text-xs text-stone-600">
                <input type="checkbox" name="ai" value="1" className="mt-0.5 accent-teal-700" disabled={!acc.profile.aiOptIn} />
                <span>{ti.useAi}{!acc.profile.aiOptIn && <span className="block text-stone-400">{ti.aiOff}</span>}</span>
              </label>
              <Button type="submit" variant="secondary">✨ {ti.makeDraft}</Button>
            </form>
          )}
          {acc.profile.intro && !draft && (
            <form action={saveIntroAction}>
              <input type="hidden" name="intro" value="" />
              <ConfirmButton message={ti.withdrawConfirm}>{ti.withdraw}</ConfirmButton>
            </form>
          )}
          <p className="text-xs text-stone-500">🔗 {t.me.bioShared}</p>
        </div>
      </section>

      <section id="birth" aria-labelledby="birth-title" className="scroll-mt-20 space-y-3 rounded-3xl bg-white/85 p-5 shadow-sm ring-1 ring-white/80">
        <div>
          <h2 id="birth-title" className="text-base font-semibold text-stone-900">⭐ {t.me.birthTitle}</h2>
          <p className="mt-1 text-xs leading-5 text-stone-500">🔒 {t.tuvi.birthPrivate}</p>
        </div>
        {bp && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-violet-50/70 px-4 py-3">
            <p className="text-sm font-medium text-stone-800">{birthText}</p>
            {birth.hasChart && <Link href="/tuvi" className="text-sm font-semibold text-teal-700">{t.me.birthOpen} →</Link>}
          </div>
        )}
        {birth.needs.length > 0 && <p className="text-sm text-amber-800">{t.me.birthNeeds}</p>}
        <details open={!bp || birth.needs.length > 0} className="group">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-full border border-stone-200 px-3 py-1 text-sm text-stone-700 hover:border-teal-300">
            {bp ? `✎ ${t.common.edit}` : t.me.birthAdd}
          </summary>
          <div className="mt-3">
            <BirthForm t={t} p={bp} needs={birth.needs} back="/me" />
          </div>
        </details>
      </section>

      <Link href="/me/privacy" className="flex items-center justify-between rounded-3xl bg-white/85 px-5 py-4 shadow-sm ring-1 ring-white/80 transition hover:shadow-md">
        <span>
          <span className="block font-semibold text-stone-900">🛡 {t.privacyHub.link}</span>
          <span className="block text-xs text-stone-600">{t.privacyHub.linkSub}</span>
        </span>
        <span aria-hidden className="text-teal-700">→</span>
      </Link>
      <Link href="/me/preview" className="flex items-center justify-between rounded-3xl bg-linear-to-br from-sky-50 to-violet-50 px-5 py-4 shadow-sm transition hover:shadow-md">
        <span>
          <span className="block font-semibold text-stone-900">👁 {t.me.preview}</span>
          <span className="block text-xs text-stone-600">{t.me.previewSub}</span>
        </span>
        <span aria-hidden className="text-teal-700">→</span>
      </Link>

      <Card>
        <ul className="divide-y divide-stone-100">
          {([
            ["/settings", "⚙️", t.nav.settings],
            ["/share", "🔗", t.nav.share],
            ["/gifts", "🎁", t.giftBox.meLink],
            ["/discover/history", "🗂", t.nav.history],
          ] as const).map(([href, icon, label]) => (
            <li key={href}>
              <Link href={href} className="flex items-center justify-between py-3 text-stone-800 transition-colors hover:text-teal-700">
                <span><span aria-hidden className="mr-2">{icon}</span>{label}</span><span aria-hidden className="text-stone-400">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
      <form action={logoutAction}>
        <Button variant="secondary" className="w-full">{t.nav.logout}</Button>
      </form>
    </Page>
  );
}
