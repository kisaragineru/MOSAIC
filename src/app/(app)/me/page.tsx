import Link from "next/link";
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
      <Card title={t.settings.bio}>
        <form action={updateProfileAction} className="space-y-2">
          <input type="hidden" name="back" value="/me" />
          <Field label={t.settings.bio}><Textarea name="bio" defaultValue={acc.profile.bio ?? ""} maxLength={2000} rows={3} /></Field>
          <Button type="submit" variant="secondary">{t.common.save}</Button>
        </form>
      </Card>
      <Card title={t.me.selfPreferences}>
        <PreferenceSection t={t} locale={locale} prefs={prefs} categories={categories} personId={null} back="/me" />
      </Card>
      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/insights" className="text-teal-700 underline">{t.me.tendencies} →</Link>
        <Link href="/tuvi" className="text-teal-700 underline">{t.nav.tuvi} →</Link>
        <Link href="/discover/history" className="text-teal-700 underline">{t.nav.history} →</Link>
      </div>
    </Page>
  );
}
