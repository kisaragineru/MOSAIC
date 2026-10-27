import type { Dict } from "@/lib/i18n/messages/en";
import type { Locale } from "@/lib/i18n/locales";
import { TYPE_THEME } from "@/lib/tuvi/type-theme";
import { typesById } from "@/lib/tuvi/type-view";
import type { WorkContent } from "@/server/services/works";
import { TypeImage } from "./tuvi-type";

const HOW_ICON = ["⭐", "💬", "✏️"];

/**
 * A work, read like a small book: a cover in the colours of the writer's type (their picture, the
 * story's title, the note they added), the story chapter by chapter on quiet paper, then how the
 * story came to be. `children` close it (the invitation to start one's own, on the shared page).
 */
export function WorkView({ t, content, title, note, locale, children }: { t: Dict; content: WorkContent; title: string; note?: string | null; locale: Locale; children?: React.ReactNode }) {
  const w = t.work;
  const types = typesById(content.types, locale);
  const lead = types[0];
  const theme = lead ? TYPE_THEME[lead.id] : null;
  return (
    <article className="overflow-hidden rounded-[2rem] bg-[#fbf8f2] shadow-xl ring-1 ring-stone-200/70" data-testid="work">
      {/* The cover */}
      <header className={`relative overflow-hidden px-6 pb-8 pt-10 text-center text-white ${theme?.bg ?? "bg-[#1b1830]"}`}>
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className={`absolute -left-1/4 -top-1/4 h-[120%] w-[120%] rounded-full opacity-40 blur-3xl ${theme?.glow1 ?? "bg-violet-700"}`} />
          <div className={`absolute -bottom-1/3 -right-1/4 h-[90%] w-[90%] rounded-full opacity-30 blur-3xl ${theme?.glow2 ?? "bg-amber-600"}`} />
        </div>
        <div className="relative">
          {types.length > 0 && (
            <div className="mx-auto mb-6 flex justify-center gap-3">
              {types.slice(0, 2).map((x) => (
                <span key={x.id} className={`block w-32 overflow-hidden rounded-2xl ring-1 ring-white/40 motion-safe:animate-[zoomIn_.9s_ease-out_both] ${theme?.halo ?? ""}`}>
                  <TypeImage t={x} />
                </span>
              ))}
            </div>
          )}
          <h1 className="font-serif text-2xl font-bold leading-snug tracking-wide [text-wrap:balance]">{title}</h1>
          {content.subtitle && <p className={`mt-2 font-serif text-sm ${theme?.accent ?? "text-amber-200"}`}>{content.subtitle}</p>}
          <p className="mt-4 text-xs tracking-[0.3em] text-white/70">{content.name}</p>
          {note && (
            <figure className="mx-auto mt-6 max-w-xs rounded-2xl bg-white/10 px-4 py-3 text-left ring-1 ring-white/20 backdrop-blur-sm" data-testid="work-note">
              <figcaption className="text-[11px] font-semibold text-white/70">{w.from(content.name)}</figcaption>
              <p className="mt-1 whitespace-pre-line font-serif text-sm leading-6">{note}</p>
            </figure>
          )}
        </div>
      </header>

      {/* The story */}
      <div className="space-y-10 px-6 py-10 sm:px-10">
        {content.episodes.map((e, i) => (
          <section key={e.key} aria-labelledby={`ep-${i}`}>
            <p aria-hidden className="text-center text-[11px] tracking-[0.4em] text-stone-400">{String(i + 1).padStart(2, "0")}</p>
            <h2 id={`ep-${i}`} className="mt-1 text-center font-serif text-lg font-bold text-stone-900">{e.title}</h2>
            <div className="mt-5 space-y-4 font-serif text-[15px] leading-8 text-stone-800">
              {e.paragraphs.map((p, j) => <p key={j} className="whitespace-pre-line">{p}</p>)}
            </div>
            {i < content.episodes.length - 1 && <p aria-hidden className="mt-10 text-center text-stone-300">◆</p>}
          </section>
        ))}
      </div>

      {/* How it came to be */}
      <section className="border-t border-stone-200/80 bg-white/70 px-6 py-8 sm:px-10" data-testid="work-backstage">
        <h2 className="text-center text-sm font-bold tracking-wide text-stone-900">{w.backstageTitle}</h2>
        <p className="mx-auto mt-3 max-w-md text-xs leading-6 text-stone-600">{w.backstageLead(content.name)}</p>
        {/* How it was made, at a glance: three kinds of pieces, one story. */}
        <div className="mx-auto mt-5 max-w-md" data-testid="work-how">
          <ul className="grid grid-cols-3 gap-2">
            {w.howParts.map((x, i) => (
              <li key={i} className="flex flex-col items-center gap-1 rounded-2xl bg-white px-2 py-3 text-center ring-1 ring-stone-200/80">
                <span aria-hidden className="text-xl">{HOW_ICON[i]}</span>
                <span className="text-[11px] leading-4 text-stone-700">{x}</span>
              </li>
            ))}
          </ul>
          <p aria-hidden className="my-1 text-center text-stone-300">↓</p>
          <p className="rounded-2xl bg-gradient-to-r from-violet-50 to-amber-50 px-3 py-2 text-center text-xs font-semibold text-violet-900 ring-1 ring-violet-100">📖 {w.howInto}</p>
        </div>
        <div className="mt-6 space-y-5">
          {lead && (
            <div className="flex items-center gap-3">
              <span className="w-14 shrink-0 overflow-hidden rounded-xl ring-1 ring-stone-200"><TypeImage t={lead} small /></span>
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold text-stone-500">{w.backstageType}</span>
                <span className="block text-sm font-bold text-stone-900">{types.map((x) => x.persona).join(" × ")}</span>
              </span>
            </div>
          )}
          {content.backstage.summary.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-stone-500">{w.backstageSummary}</p>
              <div className="mt-1 space-y-2 border-l-2 border-violet-200 pl-3 text-sm leading-7 text-stone-700">
                {content.backstage.summary.map((s, i) => <p key={i}>{s}</p>)}
              </div>
            </div>
          )}
          {content.backstage.answers.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-stone-500">{w.backstageAnswers}</p>
              <dl className="mt-1 space-y-2">
                {content.backstage.answers.map((a, i) => (
                  <div key={i} className="rounded-2xl bg-stone-50 px-3 py-2 ring-1 ring-stone-100">
                    <dt className="text-xs text-stone-500">{a.q}</dt>
                    <dd className="text-sm font-semibold text-stone-900">{a.a}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </section>
      {children}
    </article>
  );
}
