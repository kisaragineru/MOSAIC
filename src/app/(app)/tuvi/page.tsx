import { deleteBirthAction, saveBirthAction } from "@/app/actions/tuvi";
import { ConfirmButton } from "@/components/confirm-button";
import { Flash } from "@/components/flash";
import { TuviChart } from "@/components/tuvi-chart";
import { Button, Card, Checkbox, Field, Input, Notice, Page, Select } from "@/components/ui";
import { BRANCHES } from "@/lib/tuvi/canchi";
import { STAR_INFO } from "@/lib/tuvi/stars";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { exploreHours, getTuvi } from "@/server/services/tuvi";

const ZONES = Intl.supportedValuesOf("timeZone");

export default async function TuviPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const sp = await searchParams;
  const { t, locale } = await getT();
  const v = await getTuvi(uid, locale);
  const p = v.profile;
  const hours = sp.explore === "1" && p && !p.timeKnown ? await exploreHours(uid) : null;
  const needsLate = v.needs.includes("late_rat_hour") || !!p?.lateRatHour;
  const needsLeap = v.needs.includes("leap_month_rule") || !!p?.leapMonthRule;
  return (
    <Page title={t.tuvi.title}>
      <Notice kind="info">{t.tuvi.disclaimer}</Notice>
      <Flash t={t} sp={sp} />
      {v.error && <Flash t={t} sp={{ e: v.error }} />}
      <Card title={t.tuvi.birthTitle}>
        <p className="mb-3 text-xs text-stone-500">🔒 {t.tuvi.birthPrivate}</p>
        <form action={saveBirthAction} className="space-y-3">
          <fieldset className="flex gap-4 text-sm">
            <legend className="mb-1 text-sm font-medium text-stone-700">{t.tuvi.calendar}</legend>
            <label className="flex items-center gap-1"><input type="radio" name="calendarInput" value="solar" defaultChecked={(p?.calendarInput ?? "solar") === "solar"} className="accent-teal-700" /> {t.tuvi.solar}</label>
            <label className="flex items-center gap-1"><input type="radio" name="calendarInput" value="lunar" defaultChecked={p?.calendarInput === "lunar"} className="accent-teal-700" /> {t.tuvi.lunar}</label>
          </fieldset>
          <Field label={`${t.tuvi.solarDate} (${t.tuvi.solar})`}>
            <Input type="date" name="solarDate" defaultValue={p?.solarDate ?? ""} min="1900-01-01" max="2100-12-31" />
          </Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label={t.tuvi.lunarYear}><Input type="number" name="lunarYear" min={1900} max={2100} defaultValue={p?.lunarYear ?? ""} /></Field>
            <Field label={t.tuvi.lunarMonth}><Input type="number" name="lunarMonth" min={1} max={12} defaultValue={p?.lunarMonth ?? ""} /></Field>
            <Field label={t.tuvi.lunarDay}><Input type="number" name="lunarDay" min={1} max={30} defaultValue={p?.lunarDay ?? ""} /></Field>
          </div>
          <Checkbox name="lunarLeap" defaultChecked={p?.lunarLeap} label={t.tuvi.lunarLeap} />
          <Checkbox name="timeKnown" defaultChecked={p ? p.timeKnown : true} label={t.tuvi.timeKnown} />
          <Field label={t.tuvi.time}><Input type="time" name="birthTime" defaultValue={p?.birthTime?.slice(0, 5) ?? ""} /></Field>
          <Field label={t.tuvi.timeZone}>
            <Select name="timeZone" defaultValue={p?.timeZone ?? "Asia/Ho_Chi_Minh"}>
              {ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
            </Select>
          </Field>
          <Field label={t.tuvi.place}><Input name="placeLabel" defaultValue={p?.placeLabel ?? ""} maxLength={120} /></Field>
          <Field label={t.tuvi.sex} hint={t.tuvi.sexHelp}>
            <Select name="sex" defaultValue={p?.sex ?? "unspecified"}>
              {(["male", "female", "unspecified"] as const).map((s) => <option key={s} value={s}>{t.tuvi.sexes[s]}</option>)}
            </Select>
          </Field>
          {v.needs.length > 0 && <Notice kind="warning"><b>{t.tuvi.needsTitle}</b></Notice>}
          {needsLate && (
            <Field label={t.tuvi.lateRatQ}>
              <Select name="lateRatHour" defaultValue={p?.lateRatHour ?? ""} required={v.needs.includes("late_rat_hour")}>
                <option value="">—</option>
                {(["next_day", "same_day"] as const).map((x) => <option key={x} value={x}>{t.tuvi.lateRat[x]}</option>)}
              </Select>
            </Field>
          )}
          {needsLeap && (
            <Field label={t.tuvi.leapQ}>
              <Select name="leapMonthRule" defaultValue={p?.leapMonthRule ?? ""} required={v.needs.includes("leap_month_rule")}>
                <option value="">—</option>
                {(["same_month", "next_month", "split_15"] as const).map((x) => <option key={x} value={x}>{t.tuvi.leapRules[x]}</option>)}
              </Select>
            </Field>
          )}
          <Button type="submit" className="w-full">{t.tuvi.compute}</Button>
        </form>
      </Card>
      {v.chart && (
        <>
          <Card title={t.tuvi.chart}>
            <TuviChart chart={v.chart} t={t} locale={locale} currentAge={v.currentAge} />
            {v.currentAge !== null && <p className="mt-2 text-xs text-stone-500">{t.tuvi.currentAge(v.currentAge)}</p>}
            {v.chart.warnings.length > 0 && (
              <ul className="mt-3 space-y-1">
                {v.chart.warnings.map((w) => <li key={w.code}><Notice kind="warning">{t.tuvi.warnings[w.code]}</Notice></li>)}
              </ul>
            )}
            <details className="mt-3 text-xs text-stone-500">
              <summary className="cursor-pointer">{t.tuvi.notComputed}</summary>
              <p className="mt-1">{v.chart.notComputed.join(", ")}</p>
            </details>
            <p className="mt-2 text-xs text-stone-400">{t.tuvi.rulesetInfo(v.chart.rulesetId, v.chart.engineVersion)}</p>
          </Card>
          {p && !p.timeKnown && (
            <Card title={t.tuvi.exploreHours}>
              <p className="text-sm text-stone-600">{t.tuvi.exploreHelp}</p>
              {hours ? (
                <ul className="mt-2 space-y-1 text-sm">
                  {hours.map((h) => (
                    <li key={h.hourBranch}>
                      {t.tuvi.hourBranches} {BRANCHES[h.hourBranch]} → {t.tuvi.menh} {h.menh !== null ? BRANCHES[h.menh] : "?"}: {h.mainStars.map((s) => STAR_INFO[s as keyof typeof STAR_INFO].vi).join(", ") || "—"}
                    </li>
                  ))}
                </ul>
              ) : (
                <form method="get" className="mt-2"><input type="hidden" name="explore" value="1" /><Button variant="secondary">{t.tuvi.exploreHours}</Button></form>
              )}
            </Card>
          )}
          <Card title={t.tuvi.interpretation}>
            <div className="space-y-4">
              {v.sections.map((s) => (
                <section key={s.section}>
                  <h3 className="mb-1 font-medium text-stone-900">{s.title}</h3>
                  <ul className="space-y-1 text-sm text-stone-700">
                    {s.paragraphs.map((para, i) => <li key={i}>{para.text}</li>)}
                  </ul>
                </section>
              ))}
            </div>
          </Card>
        </>
      )}
      {p && (
        <form action={deleteBirthAction}>
          <ConfirmButton message={t.common.confirmDelete}>{t.tuvi.deleteBirth}</ConfirmButton>
        </form>
      )}
    </Page>
  );
}
