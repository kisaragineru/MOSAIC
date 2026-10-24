import Link from "next/link";
import { finishOnboardingAction } from "@/app/actions/onboarding";
import { updateProfileAction } from "@/app/actions/settings";
import { BrandMark } from "@/components/brand";
import { KnowledgeCard } from "@/components/knowledge-card";
import { QuestionForm } from "@/components/question-form";
import { Button, Card, Textarea } from "@/components/ui";
import { AXIS_LABEL } from "@/content/axes";
import { MANUAL } from "@/content/manual-axes";
import { TENDENCY_TEXT } from "@/content/questions";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { getAccount } from "@/server/services/account";
import { getQuestion } from "@/server/services/discovery";
import { knowledge } from "@/server/services/knowledge";
import { onboardingState, SEED_AXIS } from "@/server/services/onboarding";

const STEPS = 4;

/** The first-run guide: what MOSAIC is, three questions to a first tile, a bio, then home. */
export default async function WelcomePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const sp = await searchParams;
  const { t, locale } = await getT();
  const w = t.welcome;
  const step = Math.min(STEPS, Math.max(1, Number(sp.step) || 1));
  const acc = await getAccount(uid);
  const st = await onboardingState(uid);

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
        {step < STEPS && skip}
      </div>

      {step === 1 && (
        <section className="space-y-5 motion-safe:animate-[fadeUp_.4s_ease-out]">
          <div className="text-center">
            <BrandMark className="mx-auto h-16 w-16" />
            <h1 className="mt-4 text-2xl font-bold text-stone-900">{w.hello(acc.profile.displayName)}</h1>
            <p className="mt-2 leading-7 text-stone-600">{w.lead}</p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {w.cards.map(([icon, title, body]) => (
              <li key={title} className="rounded-3xl bg-white/85 p-4 shadow-sm ring-1 ring-white/80">
                <p className="text-2xl" aria-hidden>{icon}</p>
                <p className="mt-1 font-semibold text-stone-900">{title}</p>
                <p className="mt-1 text-sm leading-6 text-stone-600">{body}</p>
              </li>
            ))}
          </ul>
          <Link href="/welcome?step=2" className="block rounded-full bg-teal-700 py-3 text-center font-semibold text-white shadow-sm hover:bg-teal-800">{w.start}</Link>
        </section>
      )}

      {step === 2 && (st.left.length > 0 ? (
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
          <Link href="/welcome?step=3" className="block rounded-full bg-teal-700 py-3 text-center font-semibold text-white">{w.next}</Link>
        </section>
      ))}

      {step === 3 && (
        <section className="space-y-4">
          <h1 className="text-2xl font-bold text-stone-900">{w.aboutTitle}</h1>
          <p className="text-sm leading-7 text-stone-600">{w.aboutLead}</p>
          <form action={updateProfileAction} className="space-y-3">
            <input type="hidden" name="back" value="/welcome?step=4" />
            <Textarea name="bio" rows={4} maxLength={2000} defaultValue={st.bio ?? ""} placeholder={w.bioPlaceholder} aria-label={t.settings.bio} />
            <div className="flex items-center gap-4">
              <Button type="submit">{w.saveAndNext}</Button>
              <Link href="/welcome?step=4" className="text-sm text-stone-500 underline underline-offset-4">{w.skip}</Link>
            </div>
          </form>
          <Card>
            <p className="text-sm leading-6 text-stone-700">🌌 {w.tuviHint}</p>
            <Link href="/tuvi" className="mt-2 inline-block text-sm font-semibold text-teal-700 underline underline-offset-4">{w.tuviLink} →</Link>
          </Card>
        </section>
      )}

      {step === 4 && (
        <section className="space-y-4">
          <h1 className="text-2xl font-bold text-stone-900">🎉 {w.doneTitle}</h1>
          <p className="leading-7 text-stone-600">{w.doneLead}</p>
          <KnowledgeCard k={await knowledge(uid)} t={t} locale={locale} />
          <form action={finishOnboardingAction}>
            <input type="hidden" name="next" value="/home" />
            <Button type="submit" className="w-full">{w.goHome}</Button>
          </form>
        </section>
      )}
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
        <QuestionForm q={q.question} t={t} locale={locale} back="/welcome?step=2" allowSkip={false} />
      </Card>
    </section>
  );
}
