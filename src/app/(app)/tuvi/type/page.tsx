import Link from "next/link";
import { Flash } from "@/components/flash";
import { redirect } from "next/navigation";
import { Card, Page } from "@/components/ui";
import { QuestionForm } from "@/components/question-form";
import { TypeImage, TypeName, TypePortraits } from "@/components/tuvi-type";
import { getT } from "@/lib/i18n/server";
import { typesById } from "@/lib/tuvi/type-view";
import { requireUser } from "@/server/auth/session";
import { getQuestion } from "@/server/services/discovery";
import { getTuvi } from "@/server/services/tuvi";
import { nextTypeQuestion, typeInsight } from "@/server/services/tuvi-type";
import { safeNext } from "@/app/actions/util";

/** Questions in a quiz before the result is shown anyway (the user can always answer more). */
const QUIZ_LENGTH = 5;
const MAX_ASKED = 10;

/**
 * The type quiz (no birth time): a few one-tap questions chosen to tell the user's own picks apart
 * — or, without picks, the current leaders — then MOSAIC's provisional or settled judgment, set
 * beside what they picked. Never a guess from the date.
 */
export default async function TypeQuizPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const sp = await searchParams;
  const { t, locale } = await getT();
  const q = t.tuvi.quiz;
  const s = t.tuvi.type;
  const next = safeNext(sp.next, "/tuvi");
  const n = Math.max(0, Math.min(MAX_ASKED, Number(sp.n) || 0));
  const more = sp.more === "1";
  const tv = await getTuvi(uid, locale);
  const insight = await typeInsight(uid, tv.chart);
  if (insight.source === "chart") redirect("/tuvi");

  const picked = typesById(insight.selfTypes, locale);
  const result = insight.types.length ? { kind: "settled" as const, types: typesById(insight.types, locale) } : insight.provisional.length ? { kind: "provisional" as const, types: typesById(insight.provisional, locale) } : null;
  const qid = n < MAX_ASKED && (insight.source !== "answers") ? await nextTypeQuestion(uid, insight.selfTypes) : null;
  const showResult = !qid || insight.source === "answers" || (result && n >= 3 && !more) || n >= QUIZ_LENGTH && !more;
  const self = (`/tuvi/type?next=${encodeURIComponent(next)}`);

  if (showResult) {
    const same = result && picked.length > 0 && result.types.some((x) => insight.selfTypes.includes(x.id));
    return (
      <Page title={q.title} back={next}>
        <Card>
          <div className="space-y-3" data-testid="quiz-result">
            {result ? (
              <>
                <p className="text-xs font-bold tracking-wide text-violet-700">✨ {result.kind === "settled" ? s.judgedEyebrow : q.provisionalEyebrow}</p>
                <p className="text-xl font-black leading-snug text-stone-900">{result.types.map((x) => x.persona).join(" × ")}{result.kind === "provisional" ? q.maybe : ""}</p>
                <TypePortraits types={result.types} />
                <p className="text-xs leading-5 text-stone-600">{result.kind === "settled" ? s.judgedNote : q.provisionalNote}</p>
              </>
            ) : (
              <>
                <p className="font-bold text-stone-900">{q.notYet}</p>
                <p className="text-xs leading-5 text-stone-600">{q.notYetLead}</p>
              </>
            )}
            {/* What they picked, beside MOSAIC's reading. */}
            {picked.length > 0 && (
              <div className="rounded-2xl bg-violet-50/70 p-3 ring-1 ring-violet-100" data-testid="quiz-compare">
                <p className="text-xs font-semibold text-stone-700">{s.pickedTitle}</p>
                <ul className="mt-2 flex flex-wrap gap-3">
                  {picked.map((x) => (
                    <li key={x.id} className="flex items-center gap-2">
                      <span className="w-10 overflow-hidden rounded-lg ring-1 ring-stone-200"><TypeImage t={x} small /></span>
                      <span className="text-xs font-bold leading-tight text-stone-900"><TypeName t={x} /></span>
                    </li>
                  ))}
                </ul>
                {result && <p className="mt-2 text-sm font-semibold text-violet-900">{same ? q.matches : q.differs}</p>}
              </div>
            )}
          </div>
        </Card>
        <div className="flex flex-col gap-2">
          <Link href={next} className="block rounded-full bg-teal-700 py-3 text-center font-semibold text-white">{q.done} →</Link>
          {qid && insight.source !== "answers" && <Link href={`${self}&n=${n}&more=1`} className="block text-center text-sm font-semibold text-violet-800 underline underline-offset-4">{q.more}</Link>}
          <Link href="/tuvi?edit=birth#birth" className="block text-center text-xs text-stone-500 underline underline-offset-4">{s.timeExact}</Link>
        </div>
      </Page>
    );
  }

  const { question } = await getQuestion(uid, qid!);
  const total = more ? n + 3 : QUIZ_LENGTH;
  return (
    <Page title={q.title} back={next}>
      {/* Only errors: each answer moving on is the confirmation. */}
      <Flash t={t} sp={{ e: sp.e }} />
      <p className="text-sm leading-6 text-stone-600">{picked.length >= 2 ? q.leadPicked(picked[0]!.persona, picked[1]!.persona) : q.lead}</p>
      <div className="flex items-center gap-3" aria-label={q.step(n + 1, total)}>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-violet-100">
          <div className={`h-full rounded-full bg-violet-600 ${STEP_W[Math.min(10, Math.round((n / total) * 10))]}`} />
        </div>
        <span className="text-xs font-semibold text-violet-900">{q.step(n + 1, total)}</span>
      </div>
      <Card key={qid!} className="motion-safe:animate-[fadeUp_.35s_ease-out]">
        <QuestionForm q={question} t={t} locale={locale} back={`${self}&n=${n + 1}${more ? "&more=1" : ""}`} allowSkip={false} />
      </Card>
      <p className="text-center"><Link href={`${self}&n=${QUIZ_LENGTH}`} className="text-xs text-stone-500 underline underline-offset-4">{q.stop}</Link></p>
    </Page>
  );
}

const STEP_W = ["w-0", "w-[10%]", "w-[20%]", "w-[30%]", "w-[40%]", "w-[50%]", "w-[60%]", "w-[70%]", "w-[80%]", "w-[90%]", "w-full"];
