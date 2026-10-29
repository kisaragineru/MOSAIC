import { notFound } from "next/navigation";
import { Page } from "@/components/page";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { getDaily } from "@/server/services/discovery";
import { yearStory } from "@/server/services/year-story";

/** The story of a year, given on the birthday that ends it (written the first time it's opened). */
export default async function YearStoryPage({ params }: { params: Promise<{ year: string }> }) {
  const uid = await requireUser();
  const year = Number((await params).year);
  if (!Number.isInteger(year)) notFound();
  const { t, locale } = await getT();
  const story = await yearStory(uid, year, locale, (await getDaily(uid)).day);
  if (!story) notFound();
  const y = t.yearStory;
  return (
    <Page title={y.pageTitle} back="/home">
      <article className="overflow-hidden rounded-[2rem] bg-[#fbf8f2] shadow-xl ring-1 ring-stone-200/70" data-testid="year-story">
        <header className="relative overflow-hidden bg-gradient-to-br from-amber-100 via-rose-100 to-violet-200 px-6 pb-8 pt-10 text-center">
          <p aria-hidden className="text-4xl">🎂</p>
          <p className="mt-3 text-xs font-semibold tracking-[0.3em] text-violet-900/70">{y.eyebrow(story.year)}</p>
          <h1 className="mt-2 font-serif text-2xl font-bold leading-snug text-stone-900 [text-wrap:balance]">{story.title}</h1>
        </header>
        <div className="space-y-5 px-6 py-10 font-serif text-[15px] leading-8 text-stone-800 sm:px-10">
          {story.paragraphs.map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}
        </div>
        <p className="border-t border-stone-200/80 bg-white/70 px-6 py-4 text-center text-[11px] leading-5 text-stone-500">{story.ai ? y.byAi : y.byRecords}</p>
      </article>
    </Page>
  );
}
