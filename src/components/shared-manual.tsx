import { CHAPTER_INFO, type Chapter } from "@/content/axes";
import type { Locale } from "@/lib/i18n/locales";
import type { SharedManual } from "@/server/services/manual-share";

const HUE: Record<string, string> = {
  self: "border-l-teal-400",
  mind: "border-l-sky-400",
  people: "border-l-rose-400",
  life: "border-l-amber-400",
};
const BADGE = {
  consistent: "bg-stone-800 text-white",
  emerging: "bg-stone-100 text-stone-700 ring-1 ring-stone-300",
  mixed: "bg-linear-to-r from-teal-100 to-rose-100 text-stone-700",
};

/** Someone's manual as they chose to show it (or my own, previewed). */
export function SharedManualView({ m, locale, levels }: { m: SharedManual; locale: Locale; levels: Record<"consistent" | "emerging" | "mixed", string> }) {
  return (
    <article className="space-y-6">
      <header className="rounded-3xl bg-linear-to-br from-amber-50 via-white to-teal-50 p-5 shadow-sm ring-1 ring-white/80">
        <h1 className="text-xl font-bold tracking-tight text-stone-900">{m.heading}</h1>
        <p className="mt-2 text-sm leading-7 text-stone-700">{m.lead}</p>
        {m.bio && <blockquote className="emoji-color mt-3 whitespace-pre-line border-l-4 border-violet-200 pl-3 text-sm leading-7 text-stone-800">{m.bio}</blockquote>}
        {m.intro && <blockquote className="mt-3 whitespace-pre-line rounded-2xl bg-white/70 p-3 text-sm leading-7 text-stone-800 ring-1 ring-sky-100">🧩 {m.intro}</blockquote>}
      </header>
      {m.empty && <p className="rounded-2xl bg-stone-100/80 px-4 py-3 text-sm text-stone-600">{m.empty}</p>}
      {m.summary.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-stone-900">✨ {m.summaryTitle}</h2>
          <ul className="space-y-2">
            {m.summary.map((s) => (
              <li key={s} className="flex gap-2.5 leading-7 text-stone-800">
                <span aria-hidden className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
                {s}
              </li>
            ))}
          </ul>
        </section>
      )}
      {m.chapters.map((c) => {
        const info = CHAPTER_INFO[c.chapter as Chapter];
        return (
          <section key={c.chapter} aria-labelledby={`sh-${c.chapter}`} className="space-y-3">
            <h2 id={`sh-${c.chapter}`} className="border-b border-stone-200 pb-2 text-lg font-bold text-stone-900">{info.icon} {info.title[locale]}</h2>
            {c.traits.map((t) => (
              <div key={t.key} className={`space-y-2 rounded-2xl border-l-4 bg-white/85 p-4 shadow-sm ring-1 ring-stone-200/60 ${HUE[c.chapter] ?? ""}`}>
                <p className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-700">{t.name}</span>
                  <span className="font-semibold text-stone-900">{t.pole}</span>
                  <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-medium ${BADGE[t.level]}`}>{levels[t.level]}</span>
                </p>
                <p className="leading-7 text-stone-800">{t.statement}</p>
                {t.ask && (
                  <blockquote className="rounded-xl bg-amber-50/80 p-3">
                    <p className="text-xs font-semibold text-amber-800">💌 {m.askLabel}</p>
                    <p className="mt-1 text-sm leading-7 text-stone-800">{t.ask}</p>
                  </blockquote>
                )}
              </div>
            ))}
          </section>
        );
      })}
      {m.likes.length > 0 && (
        <section className="space-y-2">
          <h2 className="border-b border-stone-200 pb-2 text-lg font-bold text-stone-900">🍀 {m.likesTitle}</h2>
          <dl className="divide-y divide-stone-100 rounded-2xl bg-white/80 px-4 ring-1 ring-stone-200/60">
            {m.likes.map((l) => (
              <div key={l.k} className="py-2.5">
                <dt className="text-xs text-stone-500">{l.k}</dt>
                <dd className="mt-0.5 text-stone-900">{l.v}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      <p className="text-center text-xs leading-6 text-stone-500">{m.outro}</p>
    </article>
  );
}
