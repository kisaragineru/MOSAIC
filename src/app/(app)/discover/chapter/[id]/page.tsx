import Link from "next/link";
import { notFound } from "next/navigation";
import { FeedbackPrompt } from "@/components/feedback-prompt";
import { LikesFollowUp } from "@/components/likes-follow-up";
import { Flash } from "@/components/flash";
import { QuestionForm } from "@/components/question-form";
import { Card, LinkButton, Page, ProgressBar } from "@/components/ui";
import { AXES, AXIS_CHAPTER, AXIS_LABEL, CHAPTER_INFO, CHAPTERS, type Chapter } from "@/content/axes";
import type { TendencyKey } from "@/content/questions";
import { portrait } from "@/server/services/mosaic";
import { answerLabel } from "@/lib/discovery/format";
import type { Answer } from "@/lib/discovery/answers";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { axisProgress, chapterProgress, getQuestion } from "@/server/services/discovery";
import { listCategories, listPreferences } from "@/server/services/people";
import { PreferenceSection } from "@/components/preferences";

/** One question at a time from a chapter; after each answer the next one appears here. */
export default async function ChapterPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  if (!(CHAPTERS as readonly string[]).includes(id)) notFound();
  const chapter = id as Chapter;
  const { t, locale } = await getT();
  const d = t.discover;
  const all = await chapterProgress(uid);
  const c = all.find((x) => x.chapter === chapter)!;
  const info = CHAPTER_INFO[chapter];
  // The pieces (axes) this chapter fills; ?axis= focuses the questions on one of them.
  const pieces = AXES.filter((k) => AXIS_CHAPTER[k] === chapter);
  const focus = pieces.find((k) => k === sp.axis) as TendencyKey | undefined;
  const ap = focus ? await axisProgress(uid, focus) : null;
  const levels = pieces.length ? new Map((await portrait(uid)).tiles.flatMap((x) => (x.kind === "axis" ? [[x.key, x.level] as const] : []))) : new Map();
  const followUp = sp.f ? await getQuestion(uid, sp.f).catch(() => null) : null;
  const nextId = ap?.nextId ?? c.nextId;
  const next = followUp ?? (nextId ? await getQuestion(uid, nextId).catch(() => null) : null);
  const back = `/discover/chapter/${chapter}${focus ? `?axis=${focus}` : ""}`;
  const dot = (k: TendencyKey) => {
    const l = levels.get(k);
    return l === "consistent" ? "bg-teal-600" : l === "emerging" ? "bg-teal-300" : l === "gathering" ? "bg-sky-100 ring-1 ring-sky-300" : l === "mixed" ? "bg-linear-to-br from-sky-300 to-rose-300" : "bg-white ring-1 ring-stone-300";
  };
  return (
    <Page title={`${info.icon} ${info.title[locale]}`} back="/discover/chapters">
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-stone-500">
          <span>{info.intro[locale]}</span>
          <span className="shrink-0 pl-2 font-semibold text-teal-800">{d.chapterProgress(c.answered, c.total)}</span>
        </div>
        <ProgressBar value={c.answered} max={c.total} label={info.title[locale]} />
      </div>
      {pieces.length > 0 && (
        <nav aria-label={d.pieces} className="space-y-1.5">
          <p className="text-xs font-semibold text-stone-600">🧩 {d.pieces}</p>
          <div className="flex flex-wrap gap-1.5">
            <Link href={`/discover/chapter/${chapter}`} aria-current={!focus ? "page" : undefined} className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${!focus ? "bg-teal-700 text-white ring-teal-700" : "bg-white text-stone-700 ring-stone-200"}`}>{d.allPieces}</Link>
            {pieces.map((k) => (
              <Link key={k} href={`/discover/chapter/${chapter}?axis=${k}`} aria-current={focus === k ? "page" : undefined} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ${focus === k ? "bg-teal-700 text-white ring-teal-700" : "bg-white text-stone-700 ring-stone-200"}`}>
                <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${dot(k)}`} />
                {AXIS_LABEL[k].name[locale]}
              </Link>
            ))}
          </div>
        </nav>
      )}
      {focus && ap && (
        <div className="rounded-2xl bg-teal-50 px-4 py-2.5 text-sm text-teal-900 ring-1 ring-teal-100">
          <p className="font-semibold">🧩 {d.focusing(AXIS_LABEL[focus].name[locale])} <span className="font-normal text-teal-700">· {d.focusProgress(ap.answered, ap.total)}</span></p>
          {!ap.nextId && <p className="mt-1 text-xs text-teal-800">{d.focusDone(AXIS_LABEL[focus].name[locale])}</p>}
        </div>
      )}
      <Flash t={t} sp={sp} />
      <FeedbackPrompt sp={sp} back={back} t={t} />
      <LikesFollowUp sp={sp} back={back} t={t} locale={locale} />
      {next ? (
        <Card key={next.question.id} className="animate-[fadeUp_.35s_ease-out] motion-reduce:animate-none">
          {followUp && <p className="mb-2 inline-block rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-900">↳ {d.followUpBadge}</p>}
          {next.latest?.status === "answered" && (
            <p className="mb-2 text-xs text-stone-500">{d.lastAnswer(answerLabel(next.question.options, next.latest.answer as Answer, locale), next.latest.answeredAt.toISOString().slice(0, 10))}</p>
          )}
          <QuestionForm q={next.question} t={t} locale={locale} back={back} />
        </Card>
      ) : (
        <Card className="text-center">
          <p className="text-3xl" aria-hidden>🎉</p>
          <p className="mt-2 font-semibold text-stone-900">{d.chapterDoneTitle}</p>
          <p className="mt-1 text-sm text-stone-600">{d.chapterDoneText}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <LinkButton href="/insights" variant="primary">{t.insights.title} →</LinkButton>
            <LinkButton href="/discover/chapters" variant="secondary">{d.otherChapters}</LinkButton>
          </div>
        </Card>
      )}
      {chapter === "likes" && (
        <Card title={`🍀 ${d.likesOwnTitle}`}>
          <p className="mb-3 text-xs leading-5 text-stone-500">{d.likesOwnHelp}</p>
          <PreferenceSection t={t} locale={locale} prefs={await listPreferences(uid, null)} categories={await listCategories()} personId={null} back={back} editing={sp.edit ?? null} />
        </Card>
      )}
      <p className="text-center text-xs">
        <Link href="/me/preview" className="text-teal-700 underline">{d.privacyLink}</Link>
      </p>
    </Page>
  );
}
