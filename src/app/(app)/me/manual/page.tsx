import Link from "next/link";
import { AXIS_CHAPTER, type Chapter } from "@/content/axes";
import { PrintButton } from "@/components/print-button";
import { KnowledgeCard } from "@/components/knowledge-card";
import { knowledge } from "@/server/services/knowledge";
import { MANUAL_PRESETS, SHARED_TEXT } from "@/content/manual-text";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { buildManual, type ManualBlock } from "@/server/services/manual";

// Literal class strings (Tailwind only generates classes it can see).
const HUE: Record<Chapter, { chip: string; ring: string }> = {
  self: { chip: "bg-teal-100 text-teal-900", ring: "border-l-teal-400" },
  mind: { chip: "bg-sky-100 text-sky-900", ring: "border-l-sky-400" },
  people: { chip: "bg-rose-100 text-rose-900", ring: "border-l-rose-400" },
  life: { chip: "bg-amber-100 text-amber-900", ring: "border-l-amber-400" },
  likes: { chip: "bg-violet-100 text-violet-900", ring: "border-l-violet-400" },
  story: { chip: "bg-violet-100 text-violet-900", ring: "border-l-violet-400" },
};
const BADGE = {
  consistent: "bg-stone-800 text-white",
  emerging: "bg-stone-100 text-stone-700 ring-1 ring-stone-300",
  mixed: "bg-linear-to-r from-teal-100 to-rose-100 text-stone-700",
};

function Block({ b }: { b: ManualBlock }) {
  switch (b.t) {
    case "p":
      return <p className="leading-8 text-stone-800">{b.text}</p>;
    case "note":
      return <p className="rounded-2xl bg-stone-100/80 px-4 py-3 text-sm leading-7 text-stone-600">{b.text}</p>;
    case "quote":
      return (
        <blockquote className="border-l-4 border-violet-200 pl-4">
          <p className="whitespace-pre-line leading-8 text-stone-800">{b.text}</p>
          {b.cite && <footer className="mt-1 text-xs text-stone-500">— {b.cite}</footer>}
        </blockquote>
      );
    case "list":
      return (
        <div>
          {b.title && <h3 className="mb-1.5 text-sm font-semibold text-stone-600">{b.title}</h3>}
          <ul className="space-y-2">
            {b.items.map((i, k) => (
              <li key={k} className="flex gap-2.5 leading-7 text-stone-800">
                <span aria-hidden className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
                <span>{i}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    case "kv":
      return (
        <div>
          {b.title && <h3 className="mb-1.5 text-sm font-semibold text-stone-600">{b.title}</h3>}
          <dl className="divide-y divide-stone-100 rounded-2xl bg-white/70 px-4 ring-1 ring-stone-200/60">
            {b.items.map((i, k) => (
              <div key={k} className="py-2.5">
                <dt className="text-xs text-stone-500">{i.k}</dt>
                <dd className="mt-0.5 leading-7 text-stone-900">{i.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      );
    case "locked":
      return (
        <div className="relative overflow-hidden rounded-2xl bg-white/80 ring-1 ring-stone-200/70">
          <p aria-hidden className="pointer-events-none select-none p-4 leading-8 text-stone-700 blur-[5px]">{b.sample}</p>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/40 p-4 text-center">
            <span aria-hidden className="text-2xl">🔒</span>
            <p className="text-sm font-semibold leading-6 text-stone-800">{b.text}</p>
            <Link href={b.href} className="rounded-full bg-teal-700 px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 print:hidden">{b.label} →</Link>
          </div>
        </div>
      );
    case "link":
      return (
        <p className="print:hidden">
          <Link href={b.href} className="text-sm font-semibold text-teal-700 underline underline-offset-4">{b.text} →</Link>
        </p>
      );
    case "axis": {
      const hue = HUE[AXIS_CHAPTER[b.key]];
      return (
        <article id={`axis-${b.key}`} className={`break-inside-avoid space-y-3 rounded-2xl border-l-4 bg-white/85 p-4 shadow-sm ring-1 ring-stone-200/60 ${hue.ring}`}>
          <header className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${hue.chip}`}>{b.name}</span>
            <h3 className="text-lg font-semibold text-stone-900">{b.pole}</h3>
            <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-medium ${BADGE[b.level]}`}>{b.badge}</span>
          </header>
          <p className="leading-8 text-stone-800">{b.portrait}</p>
          {(b.thrive || b.watch) && (
            <div className="grid gap-2 sm:grid-cols-2">
              {b.thrive && (
                <div className="rounded-xl bg-teal-50/80 p-3">
                  <p className="text-xs font-semibold text-teal-800">🌿 {b.labels.thrive}</p>
                  <p className="mt-1 text-sm leading-7 text-stone-800">{b.thrive}</p>
                </div>
              )}
              {b.watch && (
                <div className="rounded-xl bg-amber-50/80 p-3">
                  <p className="text-xs font-semibold text-amber-800">☂ {b.labels.watch}</p>
                  <p className="mt-1 text-sm leading-7 text-stone-800">{b.watch}</p>
                </div>
              )}
            </div>
          )}
          {b.extra.map((e, k) => <p key={k} className="text-sm leading-7 text-violet-900">💭 {e}</p>)}
          <p className="text-[11px] text-stone-400">{b.meta}</p>
        </article>
      );
    }
  }
}

export default async function ManualPage() {
  const uid = await requireUser();
  const { t, locale } = await getT();
  const m = await buildManual(uid, locale);
  const know = await knowledge(uid);
  const tm = t.manual;
  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-28 pt-4 print:pb-0">
      <div className="mb-4 flex items-center gap-3 print:hidden">
        <Link href="/me" className="rounded-full px-2 py-1 text-stone-500 hover:bg-stone-200" aria-label="Back">←</Link>
        <p className="flex-1 text-sm text-stone-500">{tm.title}</p>
        <PrintButton label={tm.print} />
      </div>

      <header className="relative overflow-hidden rounded-3xl bg-linear-to-br from-teal-50 via-white to-violet-50 p-6 shadow-sm ring-1 ring-white/80">
        <span aria-hidden className="mosaic-mark absolute -right-6 -top-6 h-28 w-28 rotate-12 rounded-3xl opacity-25" />
        <h1 className="relative text-2xl font-bold tracking-tight text-stone-900">{tm.heading(m.name)}</h1>
        <p className="relative mt-2 leading-7 text-stone-700">{tm.sub}</p>
        <ul className="relative mt-4 flex flex-wrap gap-2 text-xs">
          <li className="rounded-full bg-white/90 px-3 py-1 font-semibold text-teal-800 ring-1 ring-teal-100">⏱ {tm.minutes(m.minutes)}</li>
          <li className="rounded-full bg-white/90 px-3 py-1 text-stone-600 ring-1 ring-stone-200">{tm.chars(m.chars)}</li>
          <li className="rounded-full bg-white/90 px-3 py-1 text-stone-600 ring-1 ring-stone-200">{tm.axes(m.stats.axesKnown, m.stats.axes)}</li>
          <li className="rounded-full bg-white/90 px-3 py-1 text-stone-600 ring-1 ring-stone-200">{tm.written(m.stats.written, m.stats.sections)}</li>
        </ul>
        <p className="relative mt-3 text-xs text-stone-500 print:hidden">{tm.privateNote}</p>
      </header>

      <nav id="toc" aria-labelledby="toc-title" className="mt-4 scroll-mt-20 rounded-3xl bg-white/85 p-5 shadow-sm ring-1 ring-stone-200/60">
        <h2 id="toc-title" className="mb-2 text-sm font-semibold text-stone-500">{tm.toc}</h2>
        <ol className="grid gap-x-4 gap-y-0.5 sm:grid-cols-2">
          {m.sections.map((s) => (
            <li key={s.id}>
              <a href={`#sec-${s.id}`} className="flex items-center gap-2 rounded-lg px-1 py-1.5 text-sm text-stone-800 transition hover:bg-teal-50 hover:text-teal-800">
                <span aria-hidden className="w-5 text-center">{s.icon}</span>
                <span className={`truncate ${s.locked ? "text-stone-400" : ""}`}>{s.title}</span>
                {s.locked && <span aria-label={tm.lockedLabel} className="ml-auto text-xs">🔒</span>}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-4 print:hidden"><KnowledgeCard k={know} t={t} locale={locale} /></div>
      <section className="mt-4 rounded-3xl bg-white/85 p-5 shadow-sm ring-1 ring-teal-100 print:hidden">
        <h2 className="text-sm font-semibold text-stone-800">🔗 {tm.shareFromManual}</h2>
        <p className="mt-1 text-xs leading-5 text-stone-600">{tm.shareFromManualHelp}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          {MANUAL_PRESETS.map((p) => (
            <Link key={p} href={`/me/manual/shared?preset=${p}`} className="rounded-full border border-teal-200 bg-teal-50/70 px-3 py-1 font-semibold text-teal-800">👁 {SHARED_TEXT.presetName[p][locale]}</Link>
          ))}
          <Link href="/share" className="rounded-full px-3 py-1 text-teal-700 underline">{tm.shareGoConnections} →</Link>
        </div>
      </section>

      <article className="mt-6 space-y-10">
        {m.sections.map((s) => (
          <section key={s.id} id={`sec-${s.id}`} aria-labelledby={`h-${s.id}`} className="scroll-mt-20 space-y-4">
            <h2 id={`h-${s.id}`} className="flex items-center gap-2 border-b border-stone-200 pb-2 text-xl font-bold tracking-tight text-stone-900">
              <span aria-hidden>{s.icon}</span>
              {s.title}
            </h2>
            {s.blocks.map((b, i) => <Block key={i} b={b} />)}
            <p className="text-right print:hidden">
              <a href="#toc" className="text-xs text-stone-400 hover:text-teal-700">↑ {tm.top}</a>
            </p>
          </section>
        ))}
      </article>
      <p className="mt-8 text-center text-xs leading-6 text-stone-500">{tm.grows}</p>
    </main>
  );
}
