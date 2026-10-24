import Link from "next/link";
import { Page, ProgressBar, SegmentedTabs } from "@/components/ui";
import { CHAPTER_INFO } from "@/content/axes";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { allProgress, chapterProgress } from "@/server/services/discovery";

export default async function ChaptersPage() {
  const uid = await requireUser();
  const { t, locale } = await getT();
  const d = t.discover;
  const chapters = await chapterProgress(uid);
  const all = await allProgress(uid);
  return (
    <Page title={t.discover.title}>
      <SegmentedTabs
        current="/discover/chapters"
        items={[
          { href: "/discover", label: t.nav.todayQuestions },
          { href: "/discover/chapters", label: d.chaptersTab },
          { href: "/discover/history", label: t.nav.history },
        ]}
      />
      <p className="text-sm text-stone-600">{d.chaptersIntro}</p>
      <Link href="/discover/all" className="flex items-center justify-between gap-3 rounded-3xl bg-linear-to-br from-teal-50 to-violet-50 px-5 py-4 shadow-sm ring-1 ring-teal-100 transition hover:shadow-md">
        <span>
          <span className="block font-semibold text-teal-900">⚡ {t.discover.allLink}</span>
          <span className="block text-xs text-stone-600">{t.discover.allLinkSub(all.left)}</span>
        </span>
        <span aria-hidden className="text-teal-700">→</span>
      </Link>
      <ul className="grid gap-3 sm:grid-cols-2">
        {chapters.map((c) => {
          const info = CHAPTER_INFO[c.chapter];
          const done = c.answered === c.total;
          return (
            <li key={c.chapter}>
              <Link
                href={`/discover/chapter/${c.chapter}`}
                className="group block h-full rounded-3xl border border-stone-200/80 bg-white/80 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md motion-reduce:transition-none"
              >
                <div className="flex items-center gap-2">
                  <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-2xl bg-linear-to-br from-teal-100 to-violet-100 text-lg text-teal-900">{info.icon}</span>
                  <span className="font-semibold text-stone-900">{info.title[locale]}</span>
                </div>
                <p className="mt-2 text-sm text-stone-600">{info.intro[locale]}</p>
                <ProgressBar value={c.answered} max={c.total} label={info.title[locale]} className="mt-3" />
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-stone-500">{d.chapterProgress(c.answered, c.total)}</span>
                  <span className="font-semibold text-teal-800 group-hover:underline">
                    {done ? (c.nextId ? d.chapterRevisit : `✓ ${d.chapterDone}`) : c.answered ? d.chapterContinue : d.chapterStart} →
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </Page>
  );
}
