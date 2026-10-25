import Link from "next/link";
import { deleteBirthAction } from "@/app/actions/tuvi";
import { BirthForm } from "@/components/birth-form";
import { ConfirmButton } from "@/components/confirm-button";
import { Flash } from "@/components/flash";
import { TuviChart } from "@/components/tuvi-chart";
import { TuviStages, type StageView } from "@/components/tuvi-stages";
import { TuviThemes } from "@/components/tuvi-themes";
import { themeLabels } from "@/lib/tuvi/theme-labels";
import { Button, Card, Checkbox, Field, Input, Notice, Page, Select } from "@/components/ui";
import { BRANCHES } from "@/lib/tuvi/canchi";
import { timeZoneOptions, preferredZone } from "@/lib/timezones";
import { chartView } from "@/lib/tuvi/chart-view";
import { lifeStages } from "@/lib/tuvi/interpret";
import { STAR_INFO } from "@/lib/tuvi/stars";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { countMemoriesInRanges } from "@/server/services/memories";
import { exploreHours, getTuvi } from "@/server/services/tuvi";


export default async function TuviPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const sp = await searchParams;
  const { t, locale } = await getT();
  const v = await getTuvi(uid, locale);
  const p = v.profile;
  const hours = sp.explore === "1" && p && !p.timeKnown ? await exploreHours(uid) : null;
  const ui = t.tuvi.ui;
  const c = v.chart;
  const view = c ? chartView(c, locale, t, { birth: true }) : null;
  const details = view?.details ?? [];
  const rawStages = c ? lifeStages(c, locale, v.currentAge) : [];
  // D. Lived decades link to the user's own records from that time; decades ahead invite a letter.
  const lived = rawStages.map((x) => (x.state === "past" || x.state === "current") && !!x.startDate && !!x.endDate);
  const counts = await countMemoriesInRanges(uid, rawStages.filter((_, i) => lived[i]).map((x) => ({ from: x.startDate!, to: x.endDate! })));
  let k = 0;
  const stages: StageView[] = rawStages.map((x, i) => {
    const count = lived[i] ? counts[k++]! : 0;
    return {
      ...x,
      ageText: ui.ageRange(x.from, x.to),
      borrowedText: x.borrowedFrom ? ui.borrowedFrom(x.borrowedFrom) : null,
      yearText: ui.yearsAbout(x.yearFrom, x.yearTo),
      records: lived[i]
        ? {
            count,
            countText: ui.recordsCount(count),
            href: `/memories?from=${x.startDate}&to=${x.endDate}`,
            writeHref: `/memories/new?occurred=${x.startDate}`,
          }
        : null,
      letterHref: x.state === "future" && x.phase !== "beyond" && x.startDate ? `/memories/new?kind=letter_to_future&reveal=${x.startDate}` : null,
    };
  });
  const now = stages.find((x) => x.state === "current");
  const menh = c && c.menh !== null ? details.find((d) => d.branch === c.menh) : undefined;
  const ORDER = ["personality", "love", "career", "family", "wealth", "relationships"];
  const persona = v.sections.find((x) => x.section === "personality")?.persona;
  const cyclesPlain = v.sections.find((x) => x.section === "cycles")?.plain ?? [];
  const themes = v.sections.filter((x) => x.section !== "cycles").sort((a, b) => ORDER.indexOf(a.section) - ORDER.indexOf(b.section));
  return (
    <Page title={t.tuvi.title}>
      <Flash t={t} sp={sp} />
      {v.error && <Flash t={t} sp={{ e: v.error }} />}
      {c && (
        <section className="overflow-hidden rounded-3xl bg-linear-to-br from-teal-100 via-sky-50 to-violet-200 p-5 text-teal-950 shadow-[0_10px_30px_-14px_rgba(91,70,160,0.35)]">
          <p className="text-xs uppercase tracking-[0.2em] text-teal-700">{ui.heroEyebrow}</p>
          <p className="mt-1 text-sm text-teal-900/80">{c.yearPillar.name} · {t.tuvi.napAm} {c.napAm.name}</p>
          {menh ? (
            <>
              <p className="mt-3 text-xs text-teal-700">{ui.menhStars}</p>
              <p className="text-2xl font-semibold tracking-tight">{menh.mains.map((m) => m.name).join(" · ") || "—"}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {menh.mains.map((m) => <span key={m.name} className="rounded-full bg-white/70 px-2.5 py-0.5 text-xs text-violet-900">{m.keywords}</span>)}
              </div>
              {persona && <p className="mt-3 text-sm text-teal-950"><span className="text-xs text-teal-700">{ui.personaLead}：</span><b>「{persona}」</b></p>}
            </>
          ) : (
            <p className="mt-3 text-sm text-teal-900/80">{v.sections[0]?.paragraphs[0]?.text}</p>
          )}
          {now && (
            <a href="#stages" className="mt-4 block rounded-2xl bg-white/60 p-3 text-sm transition-colors hover:bg-white/80">
              <span className="block text-xs text-amber-700">{ui.nowStage} · {now.ageText}</span>
              <span className="font-semibold">{now.label}</span>
              {now.role && <span className="block text-teal-900/80">{now.role}</span>}
            </a>
          )}
        </section>
      )}
      <Link href="/tuvi/guide" className="flex items-center justify-between gap-3 rounded-3xl bg-white/85 px-5 py-4 shadow-sm ring-1 ring-violet-100 transition hover:shadow-md">
        <span>
          <span className="block font-semibold text-violet-900">🔰 {ui.guideLink}</span>
          <span className="block text-xs text-stone-600">{ui.guideSub}</span>
        </span>
        <span aria-hidden className="text-violet-700">→</span>
      </Link>
      <Notice kind="info">{t.tuvi.disclaimer}</Notice>
      {c && themes.length > 0 && (
        <Card title={ui.themesTitle}>
          <p className="mb-3 text-xs text-stone-500">{ui.themesHelp}</p>
          <TuviThemes sections={themes} labels={themeLabels(t)} />
        </Card>
      )}
      {c && c.menh !== null && (
        <div id="stages" className="scroll-mt-16">
          <Card title={ui.stagesTitle}>
            {cyclesPlain.length > 0 && (
              <div className="mb-4 space-y-1.5 rounded-2xl bg-linear-to-br from-amber-50 to-violet-50 p-4 ring-1 ring-amber-100">
                <p className="text-xs font-semibold text-amber-800">💡 {ui.plain}</p>
                {cyclesPlain.map((x, i) => <p key={i} className="text-sm leading-7 text-stone-800">{x}</p>)}
              </div>
            )}
            {stages.length > 0 ? (
              <TuviStages
                stages={stages}
                currentAge={v.currentAge}
                labels={{
                  help: ui.stagesHelp,
                  state: ui.stateLabel,
                  mapTitle: ui.mapTitle,
                  mapHelp: ui.mapHelp,
                  hintsTitle: ui.hintsTitle,
                  strength: ui.strength,
                  caution: ui.caution,
                  starNotes: ui.starNotes,
                  support: ui.support,
                  recordsTitle: ui.recordsTitle,
                  recordsOpen: ui.recordsOpen,
                  recordsNone: ui.recordsNone,
                  recordsWrite: ui.recordsWrite,
                  letterTitle: ui.letterTitle,
                  letterHelp: ui.letterHelp,
                  letterCta: ui.letterCta,
                  reflectTitle: ui.reflectTitle,
                  aheadTitle: ui.aheadTitle,
                  reference: ui.reference,
                  noMain: ui.noMain,
                }}
              />
            ) : (
              <Notice kind="info">{ui.stagesUnavailable}</Notice>
            )}
          </Card>
        </div>
      )}
      {c && (
        <Card title={t.tuvi.chart}>
          <TuviChart chart={c} details={details} center={view!.center} currentAge={v.currentAge} localNames={view!.localNames} labels={view!.labels} />
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
          <BirthForm t={t} p={p} needs={v.needs} back="/tuvi" />
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
