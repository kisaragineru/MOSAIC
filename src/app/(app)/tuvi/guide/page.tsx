import Link from "next/link";
import { TypeImage } from "@/components/tuvi-type";
import { Card, Page } from "@/components/ui";
import { GUIDE } from "@/content/tuvi-guide";
import { getT } from "@/lib/i18n/server";
import { BRANCHES } from "@/lib/tuvi/canchi";
import { PALACE_JA } from "@/lib/tuvi/interpret-detail";
import { GLOSSARY, PALACE_PLAIN, STAR_PLAIN, type GlossaryKey } from "@/lib/tuvi/plain";
import { MAIN_STARS, PALACE_INFO, PALACES, STAR_INFO } from "@/lib/tuvi/stars";
import { requireUser } from "@/server/auth/session";

// Where each earthly branch sits on the 4×4 chart (literal classes for Tailwind).
const CELL: Record<number, string> = {
  5: "row-start-1 col-start-1", 6: "row-start-1 col-start-2", 7: "row-start-1 col-start-3", 8: "row-start-1 col-start-4",
  4: "row-start-2 col-start-1", 9: "row-start-2 col-start-4",
  3: "row-start-3 col-start-1", 10: "row-start-3 col-start-4",
  2: "row-start-4 col-start-1", 1: "row-start-4 col-start-2", 0: "row-start-4 col-start-3", 11: "row-start-4 col-start-4",
};
/** The example: Mệnh in Dần; palaces follow in branch order. */
const EXAMPLE_MENH = 2;
const RELATED = new Set([4, 6, 8]); // Quan Lộc, Thiên Di, Tài Bạch: offsets from Mệnh

function P({ children }: { children: React.ReactNode }) {
  return <p className="leading-8 text-stone-800">{children}</p>;
}

const SECTIONS = ["what", "chart", "palaces", "stars", "steps", "mosaic", "care", "glossary"] as const;

export default async function TuviGuidePage() {
  await requireUser();
  const { t, locale } = await getT();
  const L = (x: { ja: string; en: string; vi: string }) => x[locale];
  const palaceName = (id: (typeof PALACES)[number]) => (locale === "ja" ? `${PALACE_JA[id]}（${PALACE_INFO[id].vi}）` : PALACE_INFO[id].vi);
  const titles: Record<(typeof SECTIONS)[number], string> = {
    what: L(GUIDE.whatTitle), chart: L(GUIDE.chartTitle), palaces: L(GUIDE.palacesTitle), stars: L(GUIDE.starsTitle),
    steps: L(GUIDE.stepsTitle), mosaic: L(GUIDE.mosaicTitle), care: L(GUIDE.careTitle), glossary: L(GUIDE.glossaryTitle),
  };
  return (
    <Page title={L(GUIDE.title)} back="/tuvi">
      <div className="rounded-3xl bg-linear-to-br from-violet-100 via-sky-50 to-teal-50 p-5 shadow-sm">
        <p className="leading-8 text-stone-800">{L(GUIDE.lead)}</p>
      </div>

      <nav aria-label={L(GUIDE.toc)} className="rounded-3xl bg-white/85 p-4 shadow-sm ring-1 ring-stone-200/60">
        <p className="mb-1 text-xs font-semibold text-stone-500">{L(GUIDE.toc)}</p>
        <ol className="grid gap-x-4 sm:grid-cols-2">
          {SECTIONS.map((s) => (
            <li key={s}><a href={`#g-${s}`} className="block rounded-lg px-1 py-1.5 text-sm text-stone-800 hover:bg-violet-50 hover:text-violet-800">{titles[s]}</a></li>
          ))}
        </ol>
      </nav>

      <section id="g-what" className="scroll-mt-20 space-y-3">
        <h2 className="text-xl font-bold text-stone-900">{titles.what}</h2>
        {GUIDE.what.map((x, i) => <P key={i}>{L(x)}</P>)}
      </section>

      <section id="g-chart" className="scroll-mt-20 space-y-3">
        <h2 className="text-xl font-bold text-stone-900">{titles.chart}</h2>
        {GUIDE.chart.map((x, i) => <P key={i}>{L(x)}</P>)}
        <figure className="space-y-2">
          <div className="grid aspect-square grid-cols-4 grid-rows-4 gap-1 rounded-2xl bg-stone-200/60 p-1 text-center" role="img" aria-label={L(GUIDE.diagramCaption)}>
            {PALACES.map((id, i) => {
              const branch = (EXAMPLE_MENH + i) % 12;
              const tone = i === 0 ? "bg-violet-600 text-white" : RELATED.has(i) ? "bg-rose-100 text-rose-900 ring-1 ring-rose-300" : "bg-white text-stone-700";
              return (
                <div key={id} className={`flex flex-col items-center justify-center rounded-xl p-0.5 ${CELL[branch]} ${tone}`}>
                  <span className="text-[10px] opacity-70">{BRANCHES[branch]}</span>
                  <span className="text-[11px] font-semibold leading-tight">{locale === "ja" ? PALACE_JA[id] : PALACE_INFO[id].vi}</span>
                </div>
              );
            })}
            <div className="col-span-2 col-start-2 row-span-2 row-start-2 flex items-center justify-center whitespace-pre-line rounded-xl bg-violet-50 p-2 text-xs leading-5 text-violet-900">
              {L(GUIDE.diagramCenter)}
            </div>
          </div>
          <figcaption className="text-xs leading-6 text-stone-500">{L(GUIDE.diagramCaption)}</figcaption>
        </figure>
      </section>

      <section id="g-palaces" className="scroll-mt-20 space-y-3">
        <h2 className="text-xl font-bold text-stone-900">{titles.palaces}</h2>
        <P>{L(GUIDE.palacesLead)}</P>
        <ol className="divide-y divide-stone-100 rounded-2xl bg-white/85 px-4 ring-1 ring-stone-200/60">
          {PALACES.map((id, i) => (
            <li key={id} className="flex items-baseline gap-3 py-2.5">
              <span className="w-5 shrink-0 text-right text-xs text-stone-400">{i + 1}</span>
              <span className="w-32 shrink-0 font-semibold text-stone-900">{palaceName(id)}</span>
              <span className="text-sm leading-6 text-stone-700">{L(PALACE_PLAIN[id])}</span>
            </li>
          ))}
        </ol>
      </section>

      <section id="g-stars" className="scroll-mt-20 space-y-3">
        <h2 className="text-xl font-bold text-stone-900">{titles.stars}</h2>
        <P>{L(GUIDE.starsLead)}</P>
        <ul className="grid gap-2 sm:grid-cols-2">
          {MAIN_STARS.map((s) => (
            <li key={s} className="flex gap-3 rounded-2xl bg-white/85 p-3 ring-1 ring-stone-200/60">
              <span className="w-20 shrink-0 self-start overflow-hidden rounded-xl ring-1 ring-stone-200/60">
                <TypeImage t={{ id: s, persona: L(STAR_PLAIN[s].persona) }} small />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-stone-900">{STAR_INFO[s].vi}</span>
                <span className="block text-sm font-semibold text-violet-800">{t.common.quoteOpen}{L(STAR_PLAIN[s].persona)}{t.common.quoteClose}</span>
                <span className="mt-1 block text-sm leading-6 text-stone-700">{L(STAR_PLAIN[s].plain)}</span>
              </span>
            </li>
          ))}
        </ul>
        <Card title={L(GUIDE.auxTitle)}>
          <p className="text-sm leading-7 text-stone-800">{L(GUIDE.aux)}</p>
        </Card>
      </section>

      <section id="g-steps" className="scroll-mt-20 space-y-3">
        <h2 className="text-xl font-bold text-stone-900">{titles.steps}</h2>
        <ol className="space-y-3">
          {GUIDE.steps.map((x, i) => (
            <li key={i} className="flex gap-3 rounded-2xl bg-white/85 p-4 ring-1 ring-stone-200/60">
              <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-600 text-sm font-bold text-white">{i + 1}</span>
              <div>
                <p className="font-semibold text-stone-900">{L(x.title)}</p>
                <p className="mt-1 text-sm leading-7 text-stone-700">{L(x.body)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section id="g-mosaic" className="scroll-mt-20 space-y-3">
        <h2 className="text-xl font-bold text-stone-900">{titles.mosaic}</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-stone-800">{GUIDE.mosaic.map((x, i) => <li key={i}>{L(x)}</li>)}</ul>
      </section>

      <section id="g-care" className="scroll-mt-20 space-y-3">
        <h2 className="text-xl font-bold text-stone-900">{titles.care}</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-stone-800">{GUIDE.care.map((x, i) => <li key={i}>{L(x)}</li>)}</ul>
      </section>

      <section id="g-glossary" className="scroll-mt-20 space-y-3">
        <h2 className="text-xl font-bold text-stone-900">{titles.glossary}</h2>
        <dl className="divide-y divide-stone-100 rounded-2xl bg-white/85 px-4 ring-1 ring-stone-200/60">
          {(Object.keys(GLOSSARY) as GlossaryKey[]).map((k) => (
            <div key={k} className="py-2.5">
              <dt className="font-semibold text-stone-900">{L(GLOSSARY[k].term)}</dt>
              <dd className="mt-0.5 text-sm leading-6 text-stone-700">{L(GLOSSARY[k].meaning)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="text-center">
        <Link href="/tuvi" className="font-semibold text-teal-700 underline underline-offset-4">← {L(GUIDE.back)}</Link>
      </p>
    </Page>
  );
}
