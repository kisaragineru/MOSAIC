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
import { companionAsks, companionConnected, companionPending, devToolsEnabled, listCompanions } from "@/server/services/dev-companion";
import { companionAnswersAction, companionWritesAction, createCompanionAction, deleteCompanionAction, enrichCompanionAction, reconnectCompanionAction } from "@/app/actions/dev";


export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const sp = await searchParams;
  const { t } = await getT();
  const acc = await getAccount(uid);
  const np = await getNotificationPrefs(uid);
  const companions = await Promise.all((await listCompanions(uid)).map(async (c) => ({ ...c, pending: await companionPending(c.id), connected: await companionConnected(c.id), asks: (await companionAsks(c.id)).length })));
  const td = t.settings.dev;
  return (
    <Page title={t.settings.title}>
      <Flash t={t} sp={sp} />
      <Card title={t.settings.profile}>
        <form action={updateProfileAction} className="space-y-3">
          <Field label={t.settings.displayName}><Input name="displayName" defaultValue={acc.profile.displayName} required maxLength={80} /></Field>
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
        <form action={aiOptInAction} className="space-y-2">
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
      {devToolsEnabled() && (
        <section id="dev" className="scroll-mt-20 space-y-3 rounded-3xl border-2 border-dashed border-amber-300 bg-amber-50/70 p-5">
          <h2 className="font-semibold text-amber-950">🧪 {td.title}</h2>
          <p className="text-xs leading-5 text-amber-900">{td.help}</p>
          {companions.length > 0 && (
            <ul className="space-y-2">
              {companions.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-2 rounded-2xl bg-white p-3 text-sm">
                  <span className="flex-1 font-medium">{c.name}{!c.connected && <span className="ml-2 text-xs font-normal text-rose-700">{td.ended}</span>}</span>
                  {!c.connected && (
                    <form action={reconnectCompanionAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <Button type="submit" className="min-h-8 px-3 py-1 text-xs">🔗 {td.reconnect}</Button>
                    </form>
                  )}
                  <form action={enrichCompanionAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <Button type="submit" variant="secondary" className="min-h-8 px-3 py-1 text-xs">{c.pending > 0 ? `✨ ${td.enrich(c.pending)}` : `✓ ${td.enriched}`}</Button>
                  </form>
                  {c.asks > 0 && (
                    <form action={companionAnswersAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <Button type="submit" className="min-h-8 px-3 py-1 text-xs">💭 {td.answerAsks(c.asks)}</Button>
                    </form>
                  )}
                  <form action={companionWritesAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <Button type="submit" variant="secondary" className="min-h-8 px-3 py-1 text-xs">✎ {td.write}</Button>
                  </form>
                  <form action={deleteCompanionAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <ConfirmButton message={td.deleteConfirm}>{td.delete}</ConfirmButton>
                  </form>
                </li>
              ))}
            </ul>
          )}
          {companions.length < 3 && (
            <form action={createCompanionAction} className="flex flex-wrap items-end gap-2">
              <Field label={td.relationship}>
                <Select name="relationship" defaultValue="friend">
                  {(["partner", "family", "friend", "colleague", "other"] as const).map((r) => <option key={r} value={r}>{t.people.relationships[r]}</option>)}
                </Select>
              </Field>
              <Button type="submit">＋ {td.create}</Button>
            </form>
          )}
        </section>
      )}
    </Page>
  );
}
