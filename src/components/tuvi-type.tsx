import type { MainStarId } from "@/lib/tuvi/stars";

export interface TypeView {
  id: MainStarId;
  /** The star's own (Vietnamese) name. */
  name: string;
  /** The type in the reader's words, e.g. "まわりを照らす太陽タイプ". */
  persona: string;
}

/** One type's illustration (a pair of figures drawn for that star), sized by the caller. */
export function TypeImage({ t, small = false, className = "" }: { t: TypeView; small?: boolean; className?: string }) {
  return (
    <img
      src={`/tuvi-types/${t.id}${small ? "-sm" : ""}.webp`}
      srcSet={small ? undefined : `/tuvi-types/${t.id}-sm.webp 300w, /tuvi-types/${t.id}.webp 600w`}
      sizes={small ? undefined : "(max-width: 640px) 50vw, 280px"}
      width={small ? 300 : 600}
      height={small ? 583 : 1166}
      alt={t.persona}
      loading="lazy"
      decoding="async"
      className={`block h-auto w-full bg-amber-50/60 ${className}`}
    />
  );
}

/**
 * "Your essence" as pictures: the main star(s) of the Self palace, each with its illustration,
 * its type in plain words and the star's own name. Two stars sit side by side; one stands with
 * its words beside it. `note` explains a borrowed reading (no main star of its own).
 */
export function TypePortraits({ types, note, children }: { types: TypeView[]; note?: string | null; children?: React.ReactNode }) {
  if (types.length === 0) return <div className="space-y-2">{children}</div>;
  // Alone, the words beside the picture already name the type: the caption keeps to the star.
  const solo = types.length === 1;
  const card = (x: TypeView, i: number) => (
    <figure
      key={x.id}
      className={`overflow-hidden rounded-2xl bg-white shadow-md ring-2 ring-white ${i ? "motion-safe:animate-[riseIn_.6s_ease-out_.12s_both]" : "motion-safe:animate-[riseIn_.6s_ease-out_both]"}`}
    >
      <TypeImage t={x} />
      <figcaption className="px-2.5 py-2 text-center [word-break:auto-phrase]">
        {!solo && <span className="block text-[13px] font-bold leading-snug text-stone-900">{x.persona}</span>}
        <span className={`block ${solo ? "text-xs font-semibold text-stone-700" : "text-[11px] text-stone-500"}`}>{x.name}</span>
      </figcaption>
    </figure>
  );
  return (
    <div className="space-y-2" data-testid="type-portraits">
      {solo ? (
        <div className="flex items-center gap-4">
          <div className="w-[46%] max-w-56 shrink-0">{card(types[0]!, 0)}</div>
          <div className="min-w-0 flex-1 space-y-2">{children}</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">{types.map(card)}</div>
          {children}
        </>
      )}
      {note && <p className="text-xs leading-5 text-teal-900/80">{note}</p>}
    </div>
  );
}
