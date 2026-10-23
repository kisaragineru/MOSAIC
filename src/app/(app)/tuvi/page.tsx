import { deleteBirthAction, saveBirthAction } from "@/app/actions/tuvi";
import { ConfirmButton } from "@/components/confirm-button";
import { Flash } from "@/components/flash";
import { TuviChart, type ChartCenter } from "@/components/tuvi-chart";
import { TuviStages } from "@/components/tuvi-stages";
import { TuviThemes } from "@/components/tuvi-themes";
import { Button, Card, Checkbox, Field, Input, Notice, Page, Select } from "@/components/ui";
import { BRANCHES } from "@/lib/tuvi/canchi";
import { lifeStages, palaceDetails } from "@/lib/tuvi/interpret";
import { PALACE_JA, PALACE_SHORT_EN } from "@/lib/tuvi/interpret-detail";
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
  const ui = t.tuvi.ui;
  const c = v.chart;
  const details = c
    ? palaceDetails(c, locale).map((d) => ({
        ...d,
        borrowedText: d.borrowedFrom ? ui.borrowedFrom(d.borrowedFrom) : null,
        ageText: d.daiHan ? ui.ageRange(d.daiHan.from, d.daiHan.to) : null,
      }))
    : [];
  const stages = c ? lifeStages(c, locale, v.currentAge).map((x) => ({ ...x, ageText: ui.ageRange(x.from, x.to) })) : [];
  const now = stages.find((x) => x.state === "current");
  const menh = c && c.menh !== null ? details.find((d) => d.branch === c.menh) : undefined;
  const ORDER = ["personality", "love", "career", "family", "wealth", "relationships"];
  const themes = v.sections.filter((x) => x.section !== "cycles").sort((a, b) => ORDER.indexOf(a.section) - ORDER.indexOf(b.section));
  const center: ChartCenter = c
    ? {
        pillar: c.yearPillar.name,
        lines: [
          `${t.tuvi.lunarDate}: ${c.lunar.day}/${c.lunar.month}${c.lunar.leap ? " (nhuận)" : ""}/${c.lunar.year}`,
          `${t.tuvi.hour}: ${c.hourBranch !== null ? BRANCHES[c.hourBranch] : "?"}`,
          `${t.tuvi.napAm}: ${c.napAm.name}`,
          ...(c.cuc ? [`${t.tuvi.cuc}: ${c.cuc.number}`] : []),
          ...(c.yinYangSex ? [t.tuvi.yinYang[c.yinYangSex]] : []),
        ],
        hoa: (["loc", "quyen", "khoa", "ky"] as const).map((h) => ({ kind: h, star: STAR_INFO[c.hoaTargets[h]].vi })),
      }
    : { pillar: "", lines: [], hoa: [] };
  const localNames = c
    ? c.palaces.map((x) => (!x.palace || locale === "vi" ? null : locale === "ja" ? PALACE_JA[x.palace] : PALACE_SHORT_EN[x.palace]))
    : [];
  return (
    <Page title={t.tuvi.title}>
      <Flash t={t} sp={sp} />
      {v.error && <Flash t={t} sp={{ e: v.error }} />}
      {c && (
        <section className="overflow-hidden rounded-2xl bg-linear-to-br from-teal-800 via-teal-700 to-violet-800 p-5 text-white shadow-md">
          <p className="text-xs uppercase tracking-[0.2em] text-teal-100">{ui.heroEyebrow}</p>
          <p className="mt-1 text-sm text-teal-50">{c.yearPillar.name} · {t.tuvi.napAm} {c.napAm.name}</p>
          {menh ? (
            <>
              <p className="mt-3 text-xs text-teal-100">{ui.menhStars}</p>
              <p className="text-2xl font-semibold tracking-tight">{menh.mains.map((m) => m.name).join(" · ") || "—"}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {menh.mains.map((m) => <span key={m.name} className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs">{m.keywords}</span>)}
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-teal-50">{v.sections[0]?.paragraphs[0]?.text}</p>
          )}
          {now && (
            <a href="#stages" className="mt-4 block rounded-xl bg-white/10 p-3 text-sm transition-colors hover:bg-white/20">
              <span className="block text-xs text-amber-200">{ui.nowStage} · {now.ageText}</span>
              <span className="font-semibold">{now.label}</span>
              {now.role && <span className="block text-teal-50">{now.role}</span>}
            </a>
          )}
        </section>
      )}
      <Notice kind="info">{t.tuvi.disclaimer}</Notice>
      {c && themes.length > 0 && (
        <Card title={ui.themesTitle}>
          <p className="mb-3 text-xs text-stone-500">{ui.themesHelp}</p>
          <TuviThemes sections={themes} labels={{ related: ui.related, strength: ui.strength, caution: ui.caution, notes: ui.notes }} />
        </Card>
      )}
      {c && c.menh !== null && (
        <div id="stages" className="scroll-mt-16">
          <Card title={ui.stagesTitle}>
            {stages.length > 0 ? <TuviStages stages={stages} labels={{ help: ui.stagesHelp, state: ui.stateLabel }} /> : <Notice kind="info">{ui.stagesUnavailable}</Notice>}
          </Card>
        </div>
      )}
      {c && (
        <Card title={t.tuvi.chart}>
          <TuviChart
            chart={c}
            details={details}
            center={center}
            currentAge={v.currentAge}
            localNames={localNames}
            labels={{
              help: ui.chartHelp,
              palaceRole: ui.palaceRole,
              mainStars: ui.mainStars,
              auxStars: ui.auxStars,
              decade: ui.decade,
              simple: ui.chartSimple,
              detailed: ui.chartDetailed,
              menh: ui.badgeMenh,
              than: ui.badgeThan,
              menhName: ui.menhName,
              thanName: ui.thanName,
              now: ui.now,
              related: ui.relatedLegend,
              lucky: ui.lucky,
              malefic: ui.malefic,
              noMain: ui.noMain,
            }}
          />
          {v.currentAge !== null && <p className="mt-2 text-xs text-stone-500">{t.tuvi.currentAge(v.currentAge)}</p>}
          {c.warnings.length > 0 && (
            <ul className="mt-3 space-y-1">
              {c.warnings.map((w) => <li key={w.code}><Notice kind="warning">{t.tuvi.warnings[w.code]}</Notice></li>)}
            </ul>
          )}
          <details className="mt-3 text-xs text-stone-500">
            <summary className="cursor-pointer">{t.tuvi.notComputed}</summary>
            <p className="mt-1">{c.notComputed.join(", ")}</p>
          </details>
          <p className="mt-2 text-xs text-stone-500">{t.tuvi.rulesetInfo(c.rulesetId, c.engineVersion)}</p>
        </Card>
      )}
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
      <details open={!c} className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-800 shadow-sm">
          {c ? ui.editBirth : t.tuvi.birthTitle}
          <span aria-hidden className="text-stone-400 transition-transform group-open:rotate-180">⌄</span>
        </summary>
        <div className="mt-3">
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
        </div>
      </details>
      {p && (
        <form action={deleteBirthAction}>
          <ConfirmButton message={t.common.confirmDelete}>{t.tuvi.deleteBirth}</ConfirmButton>
        </form>
      )}
    </Page>
  );
}
