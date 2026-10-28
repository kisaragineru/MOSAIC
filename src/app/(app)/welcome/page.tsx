import type { TuviView } from "@/server/services/tuvi";
import { cookies } from "next/headers";
import { TRY_COOKIE, triedBirth } from "@/server/services/tuvi-try";
import Link from "next/link";
import { IntroFilm } from "@/components/intro-film";
import { finishOnboardingAction } from "@/app/actions/onboarding";
import { updateProfileAction } from "@/app/actions/settings";
import { KnowledgeCard } from "@/components/knowledge-card";
import { QuestionForm } from "@/components/question-form";
import { BirthForm } from "@/components/birth-form";
import { Confetti } from "@/components/confetti";
import { ChartTour } from "@/components/chart-tour";
import { Flash } from "@/components/flash";
import { ConfirmButton } from "@/components/confirm-button";
import { TuviChart } from "@/components/tuvi-chart";
import { TypeViewer } from "@/components/type-viewer";
import { viewerLabels } from "@/lib/tuvi/viewer-labels";
import { TypeImage, TypeName, TypePortraits } from "@/components/tuvi-type";
import { allTypes, essenceTypes, typesById } from "@/lib/tuvi/type-view";
import { TypeStatus } from "@/components/type-status";
import { typeInsight } from "@/server/services/tuvi-type";
import { Button, Card, Textarea } from "@/components/ui";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { getAccount } from "@/server/services/account";
import { getQuestion } from "@/server/services/discovery";
import { knowledge } from "@/server/services/knowledge";
import { finishOnboarding, onboardingState, seedPieces, type SeedPiece } from "@/server/services/onboarding";
import { buildManual } from "@/server/services/manual";
import { getTuvi } from "@/server/services/tuvi";
import { chartView } from "@/lib/tuvi/chart-view";

const STEPS = 6;

/**
 * The first-run guide, following what MOSAIC is for — know yourself, share it, know the people
 * who matter, grow closer: what MOSAIC is; your Tử Vi chart (asked for, not skippable: it is
 * the most a new account can learn at once); the chart's result and a hands-on tour; three
 * questions from three chapters; a few words for the people who matter; then connecting with one.
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

  // The guide can be ended at any step; what is left stays on Home's checklist.
  const skip = (
    <form action={finishOnboardingAction} className="shrink-0">
      <input type="hidden" name="next" value="/home" />
      <ConfirmButton bare message={w.endConfirm} className="shrink-0 whitespace-nowrap text-sm text-stone-500 underline underline-offset-4 hover:text-stone-800">{w.endGuide}</ConfirmButton>
    </form>
  );

  return (
    <main className="mx-auto w-full max-w-xl space-y-5 px-4 pb-28 pt-6">
      {/* The step bar only while under way: not over the opening film, and the finish is a page of its own. */}
      {step > 1 && step < STEPS && <div className="flex items-center gap-3">
        <ol className="flex min-w-0 flex-1 gap-1.5" aria-label={w.stepOf(step, STEPS)}>
          {Array.from({ length: STEPS }, (_, i) => (
            <li key={i} className={`h-1.5 max-w-8 flex-1 rounded-full ${i < step ? "bg-teal-600" : "bg-stone-200"}`} />
          ))}
        </ol>
        {skip}
      </div>}

      {step === 1 && (
        <section className="space-y-5">
          {/* MOSAIC as a short film, the greeting inside its first scene; its last scene leads on. */}
          <h1 className="sr-only">{w.hello(acc.profile.displayName)}</h1>
          <IntroFilm tx={t.film} types={allTypes(locale).map(({ id, name, persona, lines }) => ({ id, name, persona, lines }))} start={st.hasChart ? "/welcome?step=3" : "/welcome?step=2"} embedded greeting={w.hello(acc.profile.displayName)} />
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
          {/* The fourteen types: a reason to enter the chart (and the birth time). */}
          <section className="space-y-2 rounded-3xl bg-white/85 p-4 shadow-sm ring-1 ring-violet-100">
            <h2 className="font-bold text-stone-900">{w.typesTitle}</h2>
            <p className="text-xs leading-5 text-stone-600">{w.typesLead}</p>
            <div data-testid="type-gallery">
              <TypeViewer types={allTypes(locale)} labels={viewerLabels(t)} layout="strip" />
              <p className="text-right text-[11px] text-stone-500">{w.typesSwipe}</p>
            </div>
          </section>
          <p className="rounded-2xl bg-rose-50/70 px-4 py-3 text-sm leading-6 text-rose-950">{w.tuviWhy}</p>
          <Card>
            <p className="mb-1 text-sm font-semibold text-stone-800">⏱ {w.tuviQuick}</p>
            <p className="mb-4 text-xs leading-5 text-stone-500">{w.tuviPrivacy}</p>
            <BirthForm t={t} p={tv.profile ?? (await triedProfile(uid))} needs={tv.needs} back="/welcome?step=3" simple />
          </Card>
        </section>
      )}

      {step === 3 && tv?.chart && <ChartResult uid={uid} t={t} locale={locale} tv={tv} error={sp.e} />}

      {step === 4 && (st.left.length > 0 ? (
        <SeedQuestion id={st.left[0]!} answered={3 - st.left.length} t={t} locale={locale} />
      ) : (
        <section className="space-y-5 motion-safe:animate-[zoomIn_.5s_ease-out]">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-stone-900">✨ {w.revealTitle}</h1>
            <p className="mt-2 text-stone-600">{w.revealLead}</p>
          </div>
          <SeedPieces pieces={await seedPieces(uid, locale)} t={t} />
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

      {step === 6 && <Finished uid={uid} t={t} locale={locale} answered={st.left.length === 0} />}
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
async function ChartResult({ uid, t, locale, tv, error }: { error?: string; uid: string; t: Awaited<ReturnType<typeof getT>>["t"]; locale: Awaited<ReturnType<typeof getT>>["locale"]; tv: Awaited<ReturnType<typeof getTuvi>> }) {
  const w = t.welcome;
  const c = tv.chart!;
  const view = chartView(c, locale, t, { birth: true });
  const persona = tv.sections.find((x) => x.section === "personality")?.persona;
  const essence = essenceTypes(c, locale);
  const insight = essence.types.length ? null : await typeInsight(uid, c);
  // The plain reading opens with what the palace is and how many faces it has; the star portraits follow.
  const plain = tv.sections.find((x) => x.section === "personality")?.plain?.slice(2, 4) ?? [];
  const hasNow = tv.currentAge !== null && c.palaces.some((p) => p.daiHan && tv.currentAge! >= p.daiHan.from && tv.currentAge! <= p.daiHan.to);
  return (
    <section className="space-y-4">
      <div className="rounded-3xl bg-linear-to-br from-teal-100 via-sky-50 to-violet-200 p-5 text-teal-950 shadow-[0_10px_30px_-14px_rgba(91,70,160,0.35)] motion-safe:animate-[zoomIn_.5s_ease-out]" data-testid="chart-result">
        <p className="text-xs font-semibold text-teal-700">✨ {w.resultEyebrow}</p>
        {persona && <p className="mt-2 text-xl font-black leading-snug text-stone-900 [word-break:auto-phrase]">{w.resultPersona(persona)}</p>}
        {essence.types.length > 1 && <p className="mt-1 text-xs leading-5 text-stone-600">{t.tuvi.ui.typePair}</p>}
        <div className="mt-3">
          <TypePortraits types={essence.types}>
            {essence.borrowed && <p className="text-xs leading-5 text-stone-600">ℹ️ {t.tuvi.ui.typeBorrowed}</p>}
          </TypePortraits>
        </div>
        {/* One type already has its words beside the picture; two get theirs here. */}
        {essence.types.length !== 1 && plain.map((x) => <p key={x} className="mt-2 text-sm leading-7 text-teal-950/90">{x}</p>)}
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
        <>
          {insight && (
            <section className="rounded-3xl bg-white/85 p-4 shadow-sm ring-1 ring-violet-100">
              <TypeStatus t={t} all={allTypes(locale)} judged={typesById(insight.types, locale)} provisional={typesById(insight.provisional, locale)} progress={insight.progress} picked={insight.selfTypes} suggested={insight.selfTypes.length ? [] : await triedPick()} addTimeHref="/welcome?step=2" back="/welcome?step=3" guide error={error} />
            </section>
          )}
          <Link href="/welcome?step=4" className="block rounded-full bg-teal-700 py-3 text-center font-semibold text-white">{w.tourNext} →</Link>
        </>
      )}
    </section>
  );
}

// One soft colour per chapter the guide asks from (literal classes for Tailwind).
const PIECE_TONE: Partial<Record<SeedPiece["chapter"], string>> = {
  likes: "bg-rose-50 text-rose-800 ring-rose-100",
  mind: "bg-sky-50 text-sky-800 ring-sky-100",
  story: "bg-violet-50 text-violet-800 ring-violet-100",
};

/** The first piece in each chapter: the chapter, what was asked, and the answer in your words. */
function SeedPieces({ pieces, t }: { pieces: SeedPiece[]; t: Awaited<ReturnType<typeof getT>>["t"] }) {
  return (
    <ul className="space-y-2.5" data-testid="seed-pieces">
      {pieces.map((x, i) => (
        <li key={x.chapter} className={`rounded-2xl p-4 text-left ring-1 ${["motion-safe:animate-[riseIn_.5s_ease-out_.1s_both]", "motion-safe:animate-[riseIn_.5s_ease-out_.25s_both]", "motion-safe:animate-[riseIn_.5s_ease-out_.4s_both]"][i] ?? ""} ${PIECE_TONE[x.chapter] ?? "bg-teal-50 text-teal-800 ring-teal-100"}`}>
          <p className="flex items-center gap-1.5 text-xs font-bold"><span aria-hidden>{x.icon}</span>{x.chapterTitle}</p>
          <p className="mt-1 text-xs text-stone-500">{x.prompt}</p>
          <p className="mt-1 font-semibold text-stone-900">{t.common.quoteOpen}{x.answer}{t.common.quoteClose}</p>
        </li>
      ))}
    </ul>
  );
}

/** The first sentence of a short description (for a one-line caption). */
function firstSentence(x: string) {
  const m = x.match(/^.+?[。.!?！？](\s|$)/);
  return (m ? m[0] : x).trim();
}

/**
 * The end of the guide: a clear "done", then what the few minutes made — the chart's word on you,
 * the first pieces in three chapters, the manual — to read now. Connecting is offered, lightly, for later. Reaching
 * this page finishes the guide.
 */
async function Finished({ uid, t, locale, answered }: { uid: string; t: Awaited<ReturnType<typeof getT>>["t"]; locale: Awaited<ReturnType<typeof getT>>["locale"]; answered: boolean }) {
  const w = t.welcome;
  await finishOnboarding(uid);
  const pieces = await seedPieces(uid, locale);
  const tv = await getTuvi(uid, locale);
  const persona = tv.sections.find((x) => x.section === "personality")?.persona;
  const essence = tv.chart ? essenceTypes(tv.chart, locale) : { types: [], borrowed: false };
  const insight = essence.types.length ? null : await typeInsight(uid, tv.chart);
  const manual = await buildManual(uid, locale);
  const summary = manual.sections.find((x) => x.id === "summary")?.blocks.find((b) => b.t === "list");
  return (
    <section className="space-y-4" data-testid="guide-finished">
      {/* Edge to edge: a finish that feels like one. */}
      <div className="relative -mx-4 -mt-6 overflow-hidden bg-linear-to-br from-teal-600 via-indigo-600 to-violet-600 px-6 pb-10 pt-12 text-center text-white shadow-lg">
        <Confetti />
        {/* A medal that pops in, rings that ripple out, and a tick drawn on it. */}
        <div className="relative mx-auto h-28 w-28">
          <span aria-hidden className="absolute inset-0 rounded-full ring-4 ring-white/50 opacity-0 motion-safe:animate-[ripple_1.8s_ease-out_.5s_infinite]" />
          <span aria-hidden className="absolute inset-0 rounded-full ring-2 ring-white/40 opacity-0 motion-safe:animate-[ripple_1.8s_ease-out_1.4s_infinite]" />
          <div className="shine relative flex h-28 w-28 items-center justify-center rounded-full bg-white/15 ring-4 ring-white/40 motion-safe:animate-[popIn_.7s_cubic-bezier(.2,.8,.2,1)_both]">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-xl">
              <svg viewBox="0 0 24 24" className="h-11 w-11 text-teal-600" fill="none" stroke="currentColor" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12.5l4.5 4.5L19 7.5" pathLength={1} className="[stroke-dasharray:1] motion-safe:animate-[drawCheck_.5s_ease-out_.55s_both]" />
              </svg>
            </span>
          </div>
        </div>
        <p className="relative mt-6 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-bold tracking-[0.3em] motion-safe:animate-[riseIn_.5s_ease-out_.7s_both]">COMPLETE</p>
        <h1 className="relative mt-3 break-keep text-[1.75rem] font-black leading-snug drop-shadow-sm motion-safe:animate-[riseIn_.6s_ease-out_.85s_both]">{w.doneTitle}</h1>
        <p className="relative mx-auto mt-3 max-w-sm break-keep text-sm leading-7 text-white/90 motion-safe:animate-[riseIn_.6s_ease-out_1s_both]">{w.doneLead}</p>
        <ul className="relative mx-auto mt-6 grid max-w-sm grid-cols-3 gap-2 text-left" data-testid="guide-achievements">
          {[
            { done: !!tv.chart, label: w.achDone[0]!, delay: "motion-safe:animate-[popIn_.55s_ease-out_1.15s_both]" },
            { done: answered, label: w.achDone[1]!, delay: "motion-safe:animate-[popIn_.55s_ease-out_1.3s_both]" },
            { done: manual.sections.some((x) => x.id === "intro"), label: w.achDone[2]!, delay: "motion-safe:animate-[popIn_.55s_ease-out_1.45s_both]" },
          ].map((x) => (
            <li
              key={x.label}
              data-done={x.done}
              className={`rounded-2xl px-2.5 py-2.5 text-[11px] font-semibold leading-tight ${x.delay} ${
                x.done ? "bg-white text-teal-900 shadow-md" : "border border-dashed border-white/60 text-white"
              }`}
            >
              {x.done ? (
                <span aria-hidden className="mb-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-teal-600 text-[11px] font-black text-white">✓</span>
              ) : (
                <span className="mb-1.5 inline-block rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">{w.achLater}</span>
              )}
              <span className="block">{x.label}</span>
            </li>
          ))}
        </ul>
      </div>

      {tv.chart && (
        <section className="rounded-3xl bg-linear-to-br from-teal-100 via-sky-50 to-violet-200 p-5 text-teal-950 shadow-sm" data-testid="finish-tuvi">
          <p className="text-xs font-semibold text-teal-700">⭐ {w.achTuvi}</p>
          {essence.types.length > 0 ? (
            <>
              {persona && <p className="mt-1 text-lg font-black leading-snug text-stone-900 [word-break:auto-phrase]">{w.resultPersona(persona)}</p>}
              {/* The type straight away, with what it means in a line: the hook into Tử Vi. */}
              <ul className={`mt-3 grid gap-3 ${essence.types.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                {essence.types.map((x) => (
                  <li key={x.id} className={essence.types.length > 1 ? "space-y-1.5" : "flex items-start gap-3"}>
                    <span className={`block overflow-hidden rounded-2xl bg-white shadow-md ring-2 ring-white ${essence.types.length > 1 ? "" : "w-[38%] shrink-0"}`}><TypeImage t={x} small /></span>
                    <span className="block min-w-0">
                      <span className="block text-sm font-bold leading-snug text-stone-900"><TypeName t={x} /><span className="text-[11px] font-normal text-stone-500">{x.name}</span></span>
                      <span className="mt-0.5 block text-xs leading-5 text-stone-700">{firstSentence(x.plain)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            insight && <div className="mt-2"><TypeStatus t={t} all={allTypes(locale)} judged={typesById(insight.types, locale)} provisional={typesById(insight.provisional, locale)} progress={insight.progress} picked={insight.selfTypes} addTimeHref="/tuvi?edit=birth#birth" back="/welcome?step=6" guide /></div>
          )}
          <p className="mt-3 text-right"><Link href="/tuvi" className="text-sm font-semibold text-teal-800">{w.openTuvi} →</Link></p>
        </section>
      )}

      {pieces.length > 0 && (
        <div className="space-y-3 rounded-3xl bg-white/85 p-5 shadow-sm ring-1 ring-stone-200/60">
          <p className="text-xs font-semibold text-teal-700">🧩 {w.achTile}</p>
          <SeedPieces pieces={pieces} t={t} />
        </div>
      )}

      <Link href="/me/manual" className="block rounded-3xl bg-linear-to-br from-amber-50 to-teal-50 p-5 shadow-sm ring-1 ring-amber-100">
        <p className="text-xs font-semibold text-amber-800">📖 {w.achManual}</p>
        <p className="mt-1 text-lg font-bold text-stone-900">{w.manualStats(manual.chars, manual.stats.written)}</p>
        {summary && summary.t === "list" && (
          <ul className="mt-2 space-y-1 text-sm text-stone-700">
            {summary.items.slice(0, 3).map((x) => <li key={x}>• {x}</li>)}
          </ul>
        )}
        <p className="mt-2 text-right text-sm font-semibold text-amber-800">{w.readManual} →</p>
      </Link>

      <KnowledgeCard k={await knowledge(uid)} t={t} locale={locale} />

      <Link href="/home" className="block rounded-full bg-teal-700 py-3 text-center font-semibold text-white shadow-sm hover:bg-teal-800">{w.goHome}</Link>
      {/* Handing the story to someone comes later, when it has grown: mentioned lightly, never a task. */}
      <div className="rounded-2xl bg-white/70 px-4 py-3 text-center ring-1 ring-stone-200">
        <p className="text-xs leading-5 text-stone-600">{w.connectLater}</p>
        <Link href="/me/work" className="mt-1 inline-block text-sm font-semibold text-violet-800 underline underline-offset-4">📖 {w.connectNow}</Link>
      </div>
    </section>
  );
}

/**
 * The date (and hour) tried after reading a work, before signing up: the form starts with them.
 * Only a starting value; nothing is saved until the form is.
 */
/** The type picked after reading a work (without the hour), before signing up: ticked to start with. */
async function triedPick(): Promise<string[]> {
  const pick = triedBirth((await cookies()).get(TRY_COOKIE)?.value)?.pick;
  return pick ? [pick] : [];
}

async function triedProfile(uid: string): Promise<TuviView["profile"]> {
  const tried = triedBirth((await cookies()).get(TRY_COOKIE)?.value);
  if (!tried) return null;
  const now = new Date();
  return {
    id: "", userId: uid, calendarInput: "solar", solarDate: tried.solarDate, lunarYear: null, lunarMonth: null, lunarDay: null, lunarLeap: false,
    birthTime: tried.birthTime, timeKnown: !!tried.birthTime, timeZone: "Asia/Ho_Chi_Minh", placeLabel: null, sex: "unspecified",
    lateRatHour: null, leapMonthRule: null, createdAt: now, updatedAt: now,
  } as TuviView["profile"];
}
