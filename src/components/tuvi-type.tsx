import type { MainStarId } from "@/lib/tuvi/stars";

export interface TypeView {
  id: MainStarId;
  /** The star's own (Vietnamese) name. */
  name: string;
  /** The type in the reader's words, e.g. "まわりを照らす太陽タイプ". */
  persona: string;
  /** The type in a word or two, e.g. "照らす人" (captions under a pair). */
  short: string;
  /** What the type is like, in a sentence or two. */
  plain: string;
}

/** One type's illustration (a pair of figures drawn for that star), always the same shape. */
export function TypeImage({ t, small = false, className = "" }: { t: Pick<TypeView, "id" | "persona">; small?: boolean; className?: string }) {
  return (
    <img
      src={`/tuvi-types/${t.id}${small ? "-sm" : ""}.webp`}
      srcSet={small ? undefined : `/tuvi-types/${t.id}-sm.webp 300w, /tuvi-types/${t.id}.webp 600w`}
      sizes={small ? undefined : "(max-width: 640px) 50vw, 300px"}
      width={small ? 300 : 600}
      height={small ? 594 : 1188}
      alt={t.persona}
      loading="lazy"
      decoding="async"
      className={`block aspect-[300/594] h-auto w-full bg-amber-50/60 object-cover object-top ${className}`}
    />
  );
}

/**
 * "Your essence" as pictures. One main star: its picture beside what the type is like. Two main
 * stars share the Self palace as equals (the chart gives no ground to rank them), so they stand
 * side by side, joined by "×", each with its own name. `children` (keywords, notes) follow.
 */
export function TypePortraits({ types, children }: { types: TypeView[]; children?: React.ReactNode }) {
  if (types.length === 0) return children ? <div className="space-y-3">{children}</div> : null;
  if (types.length === 1) {
    const x = types[0]!;
    return (
      <div className="space-y-3" data-testid="type-portraits">
        <div className="flex items-start gap-4">
          <figure className="w-[40%] max-w-52 shrink-0 overflow-hidden rounded-2xl bg-white shadow-md ring-2 ring-white motion-safe:animate-[riseIn_.6s_ease-out_both]">
            <TypeImage t={x} />
          </figure>
          <div className="min-w-0 flex-1 space-y-2 pt-1">
            <p className="text-[11px] font-semibold tracking-wide text-teal-700">{x.name}</p>
            <p className="text-sm leading-7 text-stone-700">{x.plain}</p>
          </div>
        </div>
        {children}
      </div>
    );
  }
  return (
    <div className="space-y-3" data-testid="type-portraits">
      <div className="relative grid grid-cols-2 gap-2.5">
        {types.slice(0, 2).map((x, i) => (
          <figure
            key={x.id}
            className={`flex flex-col overflow-hidden rounded-2xl bg-white shadow-md ring-2 ring-white ${i ? "motion-safe:animate-[riseIn_.6s_ease-out_.12s_both]" : "motion-safe:animate-[riseIn_.6s_ease-out_both]"}`}
          >
            <TypeImage t={x} />
            <figcaption className="flex flex-1 flex-col justify-center px-2 py-2 text-center [word-break:auto-phrase]">
              <span className="block text-[13px] font-bold leading-snug text-stone-900">{x.short}</span>
              <span className="mt-0.5 block text-[11px] text-stone-500">{x.name}</span>
            </figcaption>
          </figure>
        ))}
        <span aria-hidden className="absolute left-1/2 top-[38%] flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full bg-white text-lg font-black text-violet-700 shadow-md ring-2 ring-violet-100">×</span>
      </div>
      {children}
    </div>
  );
}

/**
 * The fourteen types as a strip to swipe through: a hook before the chart is made, and a teaser
 * when the birth time (and so the type) is still unknown. `mine` marks the reader's own.
 */
export function TypeGallery({ types, mine = [], hint }: { types: TypeView[]; mine?: string[]; hint?: string }) {
  return (
    <div data-testid="type-gallery">
      <ul className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:none]">
        {types.map((x) => (
          <li key={x.id} className={`w-[5.75rem] shrink-0 snap-start overflow-hidden rounded-xl bg-white shadow-sm ${mine.includes(x.id) ? "ring-2 ring-violet-500" : "ring-1 ring-stone-200/70"}`}>
            <TypeImage t={x} small />
            <p className="px-1.5 pb-1.5 pt-1 text-center leading-tight">
              <span className="block text-[11px] font-bold text-stone-900">{x.short}</span>
              <span className="block text-[10px] text-stone-500">{x.name}</span>
            </p>
          </li>
        ))}
      </ul>
      {hint && <p className="text-right text-[11px] text-stone-500">{hint}</p>}
    </div>
  );
}
