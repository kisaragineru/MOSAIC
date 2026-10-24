import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import { updateProfileAction } from "@/app/actions/settings";
import { Flash } from "@/components/flash";
import { PreferenceSection } from "@/components/preferences";
import { Button, Card, Field, Page, Textarea } from "@/components/ui";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { getAccount } from "@/server/services/account";
import { listCategories, listPreferences } from "@/server/services/people";

export default async function MePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const sp = await searchParams;
  const { t, locale } = await getT();
  const acc = await getAccount(uid);
  const prefs = await listPreferences(uid, null);
  const categories = await listCategories();
  return (
    <Page title={acc.profile.displayName}>
      <Flash t={t} sp={sp} />
      <p className="text-xs text-stone-500">{t.me.joined(acc.createdAt.toISOString().slice(0, 10))}</p>
      <Link href="/me/preview" className="flex items-center justify-between rounded-3xl bg-linear-to-br from-teal-50 to-violet-50 px-5 py-4 font-semibold text-teal-900 shadow-sm transition hover:shadow-md">
        <span>👁 {t.me.preview}</span><span aria-hidden>→</span>
      </Link>
      <Link href="/me/manual" className="flex items-center justify-between rounded-3xl bg-linear-to-br from-amber-50 to-teal-50 px-5 py-4 shadow-sm transition hover:shadow-md">
        <span>
          <span className="block font-semibold text-stone-900">📖 {t.manual.meLink}</span>
          <span className="block text-xs text-stone-600">{t.manual.teaser}</span>
        </span>
        <span aria-hidden>→</span>
      </Link>
      <Link href="/me/others" className="flex items-center justify-between rounded-3xl bg-linear-to-br from-violet-50 to-rose-50 px-5 py-4 font-semibold text-violet-900 shadow-sm transition hover:shadow-md">
        <span>💭 {t.peers.meLink}</span><span aria-hidden>→</span>
      </Link>
      <Card title={t.settings.bio}>
        <form action={updateProfileAction} className="space-y-2">
          <input type="hidden" name="back" value="/me" />
          <Field label={t.settings.bio}><Textarea name="bio" defaultValue={acc.profile.bio ?? ""} maxLength={2000} rows={3} /></Field>
          <p className="text-xs text-stone-500">🔗 {t.me.bioShared}</p>
          <Button type="submit" variant="secondary">{t.common.save}</Button>
        </form>
      </Card>
      <Card title={t.me.selfPreferences}>
        <PreferenceSection t={t} locale={locale} prefs={prefs} categories={categories} personId={null} back="/me" editing={sp.edit ?? null} />
      </Card>
      <Card>
        <ul className="divide-y divide-stone-100">
          {([
            ["/settings", t.nav.settings],
            ["/share", t.nav.share],
            ["/discover/history", t.nav.history],
          ] as const).map(([href, label]) => (
            <li key={href}>
              <Link href={href} className="flex items-center justify-between py-3 text-stone-800 transition-colors hover:text-teal-700">
                {label}<span aria-hidden className="text-stone-400">→</span>
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
