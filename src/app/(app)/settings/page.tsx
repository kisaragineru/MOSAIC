import Link from "next/link";
import { aiOptInAction, changePasswordAction, deleteAccountAction, notificationsAction, updateProfileAction } from "@/app/actions/settings";
import { ConfirmButton } from "@/components/confirm-button";
import { Flash } from "@/components/flash";
import { TimeZoneSelect } from "@/components/time-zone-select";
import { Button, Card, Checkbox, Field, Input, Page, Select } from "@/components/ui";
import { preferredZone, timeZoneOptions } from "@/lib/timezones";
import { LOCALE_NAMES, SUPPORTED_LOCALES } from "@/lib/i18n/locales";
import { getT } from "@/lib/i18n/server";
import { DEFAULT_RULESET, ENGINE_VERSION } from "@/lib/tuvi/ruleset";
import { requireUser } from "@/server/auth/session";
import { aiConfigured } from "@/server/ai/claude";
import { getAccount, getNotificationPrefs } from "@/server/services/account";
import { devToolsFor, isAdmin } from "@/server/services/admin";


export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const sp = await searchParams;
  const { t } = await getT();
  const acc = await getAccount(uid);
  const np = await getNotificationPrefs(uid);
  const dev = await devToolsFor(uid);
  const admin = await isAdmin(uid);
  return (
    <Page title={t.settings.title}>
      <Flash t={t} sp={sp} />
      <Card title={t.settings.profile}>
        <form action={updateProfileAction} className="space-y-3">
          <Field label={t.common.language}>
            <Select name="locale" defaultValue={acc.profile.locale}>
              {SUPPORTED_LOCALES.map((l) => <option key={l} value={l}>{LOCALE_NAMES[l]}</option>)}
            </Select>
          </Field>
          <Field label={t.settings.timeZone}>
            <TimeZoneSelect name="timeZone" defaultValue={preferredZone(acc.profile.timeZone)} options={timeZoneOptions(preferredZone(acc.profile.timeZone))} useDevice={t.settings.useDeviceZone} />
          </Field>
          <Button type="submit">{t.common.save}</Button>
        </form>
      </Card>
      <Card title={t.settings.notifications}>
        <form action={notificationsAction} className="space-y-2">
          <Checkbox name="dailyQuestion" defaultChecked={np.dailyQuestion} label={t.settings.dailyQuestion} />
          <Checkbox name="dateReminders" defaultChecked={np.dateReminders} label={t.settings.dateReminders} />
          <p className="text-xs text-stone-500">{t.settings.channelNote}</p>
          <Button type="submit" variant="secondary">{t.common.save}</Button>
        </form>
      </Card>
      <Card title={t.settings.privacy}>
        <Link href="/me/privacy" className="mb-3 flex items-center justify-between rounded-2xl bg-teal-50/70 px-4 py-3 text-sm font-semibold text-teal-900 hover:bg-teal-50">
          <span>🛡 {t.privacyHub.link}</span><span aria-hidden>→</span>
        </Link>
        <form id="ai" action={aiOptInAction} className="scroll-mt-20 space-y-2">
          <Checkbox name="aiOptIn" defaultChecked={acc.profile.aiOptIn} label={t.settings.aiOptIn} />
          <p className="text-xs text-stone-500">{t.settings.aiHelp}</p>
          {!aiConfigured() && <p className="text-xs text-amber-700">{t.insights.aiReasons.not_configured}</p>}
          <Button type="submit" variant="secondary">{t.common.save}</Button>
        </form>
        <p className="mt-3 text-xs text-stone-500">{t.settings.comparableHelp}</p>
      </Card>
      <Card title={t.settings.security}>
        <form action={changePasswordAction} className="space-y-2">
          <Field label={t.settings.currentPassword}><Input type="password" name="currentPassword" autoComplete="current-password" required /></Field>
          <Field label={t.settings.newPassword} hint={t.auth.passwordHint}><Input type="password" name="newPassword" autoComplete="new-password" minLength={10} required /></Field>
          <Button type="submit" variant="secondary">{t.settings.changePassword}</Button>
        </form>
      </Card>
      <Card title={t.settings.data}>
        <p className="mb-2 text-sm text-stone-600">{t.settings.exportHelp}</p>
        <form action="/api/export" method="post">
          <Button type="submit">{t.settings.export}</Button>
        </form>
      </Card>
      <Card title={t.settings.deleteTitle} className="border-rose-200">
        <p className="mb-2 text-sm text-stone-600">{t.settings.deleteHelp}</p>
        <form action={deleteAccountAction} className="space-y-2">
          <Field label={t.auth.password}><Input type="password" name="password" autoComplete="current-password" required /></Field>
          <Field label={t.settings.typeDelete}><Input name="confirm" required pattern="DELETE" autoComplete="off" /></Field>
          <ConfirmButton message={t.common.confirmDelete}>{t.settings.deleteAccount}</ConfirmButton>
        </form>
      </Card>
      <p className="text-center text-xs text-stone-500">
        MOSAIC · {t.tuvi.rulesetInfo(DEFAULT_RULESET.id, ENGINE_VERSION)}
      </p>
      {(admin || dev) && (
        <Link href="/admin" className="block rounded-3xl bg-stone-900 px-5 py-4 text-sm font-semibold text-white shadow-sm hover:bg-stone-800" data-testid="admin-link">🛠 {t.admin.title} →</Link>
      )}
    </Page>
  );
}
