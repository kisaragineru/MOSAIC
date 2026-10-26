import Link from "next/link";
import { finishOnboardingAction } from "@/app/actions/onboarding";
import { updateProfileAction } from "@/app/actions/settings";
import { BrandMark } from "@/components/brand";
import { KnowledgeCard } from "@/components/knowledge-card";
import { QuestionForm } from "@/components/question-form";
import { BirthForm } from "@/components/birth-form";
import { ChartTour } from "@/components/chart-tour";
import { Flash } from "@/components/flash";
import { TuviChart } from "@/components/tuvi-chart";
import { Button, Card, Textarea } from "@/components/ui";
import { AXIS_LABEL } from "@/content/axes";
import { MANUAL } from "@/content/manual-axes";
import { TENDENCY_TEXT } from "@/content/questions";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { getAccount } from "@/server/services/account";
import { getQuestion } from "@/server/services/discovery";
import { knowledge } from "@/server/services/knowledge";
import { finishOnboarding, onboardingState, SEED_AXIS } from "@/server/services/onboarding";
import { buildManual } from "@/server/services/manual";
import { getTuvi } from "@/server/services/tuvi";
import { chartView } from "@/lib/tuvi/chart-view";

const STEPS = 6;

/**
 * The first-run guide, following what MOSAIC is for — know yourself, share it, know the people
 * who matter, grow closer: what MOSAIC is; your Tử Vi chart (asked for, not skippable: it is
 * the most a new account can learn at once); the chart's result and a hands-on tour; three
 * questions to a first tile; a few words for the people who matter; then connecting with one.
 */
export default async function WelcomePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const sp = await searchParams;
  const { t, locale } = await getT();
  const w = t.welcome;
  const step = Math.min(STEPS, Math.max(1, Number(sp.step) || 1));
  const acc = await getAccount(uid);
  const st = await onboardingState(uid);
  const tv = step === 2 || step === 3 ? await getTuvi(uid, locale) : null;

  const skip = (
    <form action={finishOnboardingAction}>
      <input type="hidden" name="next" value="/home" />
      <button type="submit" className="text-sm text-stone-500 underline underline-offset-4 hover:text-stone-800">{w.later}</button>
    </form>
  );

  return (
    <main className="mx-auto w-full max-w-xl space-y-5 px-4 pb-28 pt-6">
      <div className="flex items-center justify-between">
        <ol className="flex gap-1.5" aria-label={w.stepOf(step, STEPS)}>
          {Array.from({ length: STEPS }, (_, i) => (
            <li key={i} className={`h-1.5 w-8 rounded-full ${i < step ? "bg-teal-600" : "bg-stone-200"}`} />
          ))}
        </ol>
        {/* No way out before the chart is made: it is what everything after builds on. */}
        {step >= 3 && step < STEPS && skip}
      </div>

      {step === 1 && (
        <section className="space-y-5 motion-safe:animate-[fadeUp_.4s_ease-out]">
          <div className="text-center">
            <BrandMark className="mx-auto h-16 w-16" />
            <h1 className="mt-4 text-2xl font-bold text-stone-900">{w.hello(acc.profile.displayName)}</h1>
            <p className="mt-2 leading-7 text-stone-600">{w.lead}</p>
          </div>
          <ol className="grid gap-3 sm:grid-cols-2">
            {w.cards.map(([icon, title, body], i) => (
              <li key={title} className="rounded-3xl bg-white/85 p-4 shadow-sm ring-1 ring-white/80">
                <p className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-700 text-xs font-bold text-white">{i + 1}</span>
                  <span className="text-xl" aria-hidden>{icon}</span>
                  <span className="font-semibold text-stone-900">{title}</span>
                </p>
                <p className="mt-1 text-sm leading-6 text-stone-600">{body}</p>
              </li>
            ))}
          </ol>
          <p className="text-center text-xs text-stone-500">{w.privacyLine}</p>
          <Link href={st.hasChart ? "/welcome?step=3" : "/welcome?step=2"} className="block rounded-full bg-teal-700 py-3 text-center font-semibold text-white shadow-sm hover:bg-teal-800">{w.start}</Link>
        </section>
      )}

      {(step === 2 || (step === 3 && !tv?.chart)) && tv && (
        <section className="space-y-4">
          <Flash t={t} sp={sp} />
          <div>
            <h1 className="text-2xl font-bold text-stone-900">{w.tuviTitle}</h1>
            <p className="mt-2 text-sm leading-7 text-stone-600">{w.tuviLead}</p>
          </div>
          {/* What the chart gives, shown before it is asked for. */}
          <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-teal-100 via-sky-50 to-violet-200 p-5 text-teal-950" data-testid="tuvi-preview">
            <p className="text-xs font-semibold text-teal-700">{w.tuviPreviewTitle}</p>
            <ul className="mt-2 space-y-1.5">
              {w.tuviPreview.map((x) => (
                <li key={x} className="flex items-center gap-2 text-sm font-semibold">
                  <span aria-hidden className="text-violet-600">✦</span>
                  {x}
                </li>
              ))}
            </ul>
            <p className="mt-3 inline-block rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-violet-800">🔓 {w.tuviPreviewLock}</p>
          </div>
          <p className="rounded-2xl bg-rose-50/70 px-4 py-3 text-sm leading-6 text-rose-950">{w.tuviWhy}</p>
          <Card>
            <p className="mb-1 text-sm font-semibold text-stone-800">⏱ {w.tuviQuick}</p>
            <p className="mb-4 text-xs leading-5 text-stone-500">{w.tuviPrivacy}</p>
            <BirthForm t={t} p={tv.profile} needs={tv.needs} back="/welcome?step=3" simple />
          </Card>
        </section>
      )}

      {step === 3 && tv?.chart && <ChartResult t={t} locale={locale} tv={tv} />}

      {step === 4 && (st.left.length > 0 ? (
        <SeedQuestion id={st.left[0]!} answered={3 - st.left.length} t={t} locale={locale} />
      ) : (
        <section className="space-y-5 text-center motion-safe:animate-[zoomIn_.5s_ease-out]">
          <h1 className="text-2xl font-bold text-stone-900">✨ {w.revealTitle}</h1>
          <p className="text-stone-600">{w.revealLead}</p>
          <div className="relative mx-auto flex aspect-square w-40 items-end justify-center overflow-hidden rounded-3xl shadow-lg ring-4 ring-white" aria-hidden>
            <span className={`absolute inset-0 [clip-path:polygon(0_0,100%_0,0_100%)] ${st.tile?.direction === -1 ? "bg-teal-100" : "bg-teal-500"}`} />
            <span className={`absolute inset-0 [clip-path:polygon(100%_0,100%_100%,0_100%)] ${st.tile?.state === "mixed" ? "bg-rose-300" : st.tile?.direction === -1 ? "bg-teal-500" : "bg-teal-100"}`} />
            <span className="relative mb-3 rounded-lg bg-white/90 px-2 py-0.5 text-sm font-bold text-stone-800">{AXIS_LABEL[SEED_AXIS].name[locale]}</span>
          </div>
          {st.tile && (
            <Card>
              <p className="font-semibold text-stone-900">
                {st.tile.state === "mixed" ? MANUAL[SEED_AXIS]!.mixed[locale] : TENDENCY_TEXT[SEED_AXIS][st.tile.direction === 1 ? "pos" : "neg"][locale]}
              </p>
              {st.tile.state !== "mixed" && <p className="mt-2 text-sm leading-7 text-stone-600">{(st.tile.direction === 1 ? MANUAL[SEED_AXIS]!.pos : MANUAL[SEED_AXIS]!.neg).portrait[locale]}</p>}
            </Card>
          )}
          <Link href="/welcome?step=5" className="block rounded-full bg-teal-700 py-3 text-center font-semibold text-white">{w.next}</Link>
        </section>
      ))}

      {step === 5 && (
        <section className="space-y-4">
          <h1 className="text-2xl font-bold text-stone-900">{w.aboutTitle}</h1>
          <p className="text-sm leading-7 text-stone-600">{w.aboutLead}</p>
          <form action={updateProfileAction} className="space-y-3">
            <input type="hidden" name="back" value="/welcome?step=6" />
            <Textarea name="bio" rows={4} maxLength={2000} defaultValue={st.bio ?? ""} placeholder={w.bioPlaceholder} aria-label={t.settings.bio} />
            <div className="flex items-center gap-4">
              <Button type="submit">{w.saveAndNext}</Button>
              <Link href="/welcome?step=6" className="text-sm text-stone-500 underline underline-offset-4">{w.skip}</Link>
            </div>
          </form>
        </section>
      )}

      {step === 6 && <Finished uid={uid} t={t} locale={locale} tile={st.tile} />}
    </main>
  );
}

async function SeedQuestion({ id, answered, t, locale }: { id: string; answered: number; t: Awaited<ReturnType<typeof getT>>["t"]; locale: Awaited<ReturnType<typeof getT>>["locale"] }) {
  const w = t.welcome;
  const uid = await requireUser();
  const q = await getQuestion(uid, id);
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">{w.firstTitle}</h1>
        <p className="mt-1 text-sm text-stone-600">{w.firstLead}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-200">
          <div className={`h-full rounded-full bg-teal-500 transition-all ${["w-0", "w-1/3", "w-2/3", "w-full"][answered]}`} />
        </div>
        <span className="text-xs font-semibold text-teal-800">{w.progress(answered)}</span>
      </div>
      <Card key={id} className="motion-safe:animate-[fadeUp_.35s_ease-out]">
        <QuestionForm q={q.question} t={t} locale={locale} back="/welcome?step=4" allowSkip={false} />
      </Card>
    </section>
  );
}

/** The chart's first result in a sentence, then the board itself with a hands-on tour. */
async function ChartResult({ t, locale, tv }: { t: Awaited<ReturnType<typeof getT>>["t"]; locale: Awaited<ReturnType<typeof getT>>["locale"]; tv: Awaited<ReturnType<typeof getTuvi>> }) {
  const w = t.welcome;
  const c = tv.chart!;
  const view = chartView(c, locale, t, { birth: true });
  const persona = tv.sections.find((x) => x.section === "personality")?.persona;
  // The plain reading opens with what the palace is and how many faces it has; the star portraits follow.
  const plain = tv.sections.find((x) => x.section === "personality")?.plain?.slice(2, 4) ?? [];
  const hasNow = tv.currentAge !== null && c.palaces.some((p) => p.daiHan && tv.currentAge! >= p.daiHan.from && tv.currentAge! <= p.daiHan.to);
  return (
    <section className="space-y-4">
      <div className="rounded-3xl bg-linear-to-br from-teal-100 via-sky-50 to-violet-200 p-5 text-teal-950 shadow-[0_10px_30px_-14px_rgba(91,70,160,0.35)] motion-safe:animate-[zoomIn_.5s_ease-out]" data-testid="chart-result">
        <p className="text-xs font-semibold text-teal-700">✨ {w.resultEyebrow}</p>
        {persona && <p className="mt-2 text-xl font-bold leading-snug">{w.resultPersona(persona)}</p>}
        {plain.map((x) => <p key={x} className="mt-2 text-sm leading-7 text-teal-950/90">{x}</p>)}
        <p className="mt-3 text-xs leading-5 text-rose-900">{w.resultShare}</p>
      </div>
      {c.menh !== null ? (
        <>
          <h2 className="text-lg font-bold text-stone-900">{w.tourTitle}</h2>
          <ChartTour steps={w.tourSteps} hasNow={hasNow} closeLabel={view.labels.close} done={w.tourDone} next={w.tourNext} nextHref="/welcome?step=4">
            <TuviChart chart={c} details={view.details} center={view.center} currentAge={tv.currentAge} cells={view.cells} labels={view.labels} />
          </ChartTour>
        </>
      ) : (
        <Link href="/welcome?step=4" className="block rounded-full bg-teal-700 py-3 text-center font-semibold text-white">{w.tourNext} →</Link>
      )}
    </section>
  );
}

/**
 * The end of the guide: a clear "done", then what the few minutes made — the chart's word on you,
 * the first tile, the manual — to read now. Connecting is offered, lightly, for later. Reaching
 * this page finishes the guide.
 */
async function Finished({ uid, t, locale, tile }: { uid: string; t: Awaited<ReturnType<typeof getT>>["t"]; locale: Awaited<ReturnType<typeof getT>>["locale"]; tile: Awaited<ReturnType<typeof onboardingState>>["tile"] }) {
  const w = t.welcome;
  await finishOnboarding(uid);
  const tv = await getTuvi(uid, locale);
  const persona = tv.sections.find((x) => x.section === "personality")?.persona;
  const manual = await buildManual(uid, locale);
  const summary = manual.sections.find((x) => x.id === "summary")?.blocks.find((b) => b.t === "list");
  return (
    <section className="space-y-4" data-testid="guide-finished">
      <div className="rounded-3xl bg-linear-to-br from-teal-600 to-violet-600 px-5 py-6 text-center text-white shadow-lg motion-safe:animate-[zoomIn_.5s_ease-out]">
        <p className="text-4xl" aria-hidden>🎉</p>
        <h1 className="mt-2 text-2xl font-bold">{w.doneTitle}</h1>
        <p className="mt-2 text-sm leading-6 text-white/90">{w.doneLead}</p>
      </div>

      {tv.chart && (
        <Link href="/tuvi" className="block rounded-3xl bg-linear-to-br from-teal-100 via-sky-50 to-violet-200 p-5 text-teal-950 shadow-sm">
          <p className="text-xs font-semibold text-teal-700">⭐ {w.achTuvi}</p>
          {persona ? <p className="mt-1 text-lg font-bold leading-snug">{w.resultPersona(persona)}</p> : <p className="mt-1 text-lg font-bold">{w.resultEyebrow}</p>}
          <p className="mt-2 text-right text-sm font-semibold text-teal-800">{w.openTuvi} →</p>
        </Link>
      )}

      {tile && (
        <div className="rounded-3xl bg-white/85 p-5 shadow-sm ring-1 ring-stone-200/60">
          <p className="text-xs font-semibold text-teal-700">🧩 {w.achTile}</p>
          <p className="mt-1 font-semibold text-stone-900">
            {AXIS_LABEL[SEED_AXIS].name[locale]}：{tile.state === "mixed" ? MANUAL[SEED_AXIS]!.mixed[locale] : TENDENCY_TEXT[SEED_AXIS][tile.direction === 1 ? "pos" : "neg"][locale]}
          </p>
        </div>
      )}

      <Link href="/me/manual" className="block rounded-3xl bg-linear-to-br from-amber-50 to-teal-50 p-5 shadow-sm ring-1 ring-amber-100">
        <p className="text-xs font-semibold text-amber-800">📖 {w.achManual}</p>
        <p className="mt-1 text-lg font-bold text-stone-900">{w.manualStats(manual.chars, manual.stats.written)}</p>
        {summary && summary.t === "list" && (
          <ul className="mt-2 space-y-1 text-sm text-stone-700">
            {summary.items.slice(0, 3).map((x) => <li key={x}>・{x}</li>)}
          </ul>
        )}
        <p className="mt-2 text-right text-sm font-semibold text-amber-800">{w.readManual} →</p>
      </Link>

      <KnowledgeCard k={await knowledge(uid)} t={t} locale={locale} />

      <Link href="/home" className="block rounded-full bg-teal-700 py-3 text-center font-semibold text-white shadow-sm hover:bg-teal-800">{w.goHome}</Link>
      {/* Connecting is where MOSAIC leads, but it can wait: offered lightly, never in the way. */}
      <div className="rounded-2xl bg-white/70 px-4 py-3 text-center ring-1 ring-stone-200">
        <p className="text-xs leading-5 text-stone-600">{w.connectLater}</p>
        <Link href="/share" className="mt-1 inline-block text-sm font-semibold text-teal-700 underline underline-offset-4">🤝 {w.connectNow}</Link>
      </div>
    </section>
  );
}
