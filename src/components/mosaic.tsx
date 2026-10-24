"use client";
import Link from "next/link";
import { useState } from "react";

export type Hue = "self" | "mind" | "people" | "life" | "extra";
export type Level = "empty" | "gathering" | "emerging" | "consistent" | "mixed";

/** A tile as shown: all text is prepared on the server in the reader's language. */
export interface TileView {
  id: string;
  hue: Hue;
  level: Level;
  /** +1 fills the upper-left triangle (first pole), -1 the lower-right; null fills both alike. */
  direction: 1 | -1 | null;
  label: string;
  title: string;
  /** What MOSAIC can say, or what is needed before it can. */
  body: string;
  meta: string;
  rejected: boolean;
  /** Answers so far toward the three needed (gathering tiles). */
  dots: number;
  href: string;
  hrefLabel: string;
  evidenceHref: string | null;
}

export interface MosaicLabels {
  hint: string;
  evidence: string;
  levels: Record<Level, string>;
}

// Literal class strings (Tailwind only generates classes it can see).
const SHADE: Record<Hue, { strong: string; mid: string; soft: string; faint: string }> = {
  self: { strong: "bg-teal-500", mid: "bg-teal-300", soft: "bg-teal-100", faint: "bg-teal-50" },
  mind: { strong: "bg-sky-500", mid: "bg-sky-300", soft: "bg-sky-100", faint: "bg-sky-50" },
  people: { strong: "bg-rose-400", mid: "bg-rose-300", soft: "bg-rose-100", faint: "bg-rose-50" },
  life: { strong: "bg-amber-400", mid: "bg-amber-300", soft: "bg-amber-100", faint: "bg-amber-50" },
  extra: { strong: "bg-violet-400", mid: "bg-violet-300", soft: "bg-violet-100", faint: "bg-violet-50" },
};
const DELAY = ["[animation-delay:0ms]", "[animation-delay:40ms]", "[animation-delay:80ms]", "[animation-delay:120ms]", "[animation-delay:160ms]"];

function halves(t: TileView): [string, string] {
  const s = SHADE[t.hue];
  switch (t.level) {
    case "empty":
      return ["bg-white/70", "bg-white/70"];
    case "gathering":
      return [s.soft, s.faint];
    case "mixed":
      return [s.mid, s.mid];
    case "emerging":
      return t.direction === -1 ? [s.faint, s.mid] : t.direction === 1 ? [s.mid, s.faint] : [s.soft, s.soft];
    case "consistent":
      return t.direction === -1 ? [s.soft, s.strong] : t.direction === 1 ? [s.strong, s.soft] : [s.strong, s.strong];
  }
}

function Tile({ t, i, selected }: { t: TileView; i: number; selected?: boolean }) {
  const [upper, lower] = halves(t);
  return (
    <span
      className={`relative flex aspect-square animate-[zoomIn_.45s_ease-out_both] items-end justify-center overflow-hidden rounded-xl motion-reduce:animate-none ${DELAY[i % 5]} ${
        t.level === "empty" ? "border border-dashed border-stone-300" : "shadow-sm ring-1 ring-white/70"
      } ${selected ? "ring-2 ring-stone-800 ring-offset-2" : ""} ${t.rejected ? "opacity-45" : ""}`}
    >
      <span aria-hidden className={`absolute inset-0 [clip-path:polygon(0_0,100%_0,0_100%)] ${upper}`} />
      <span aria-hidden className={`absolute inset-0 [clip-path:polygon(100%_0,100%_100%,0_100%)] ${lower}`} />
      {t.level === "gathering" && t.dots > 0 && (
        <span aria-hidden className="absolute right-1.5 top-1.5 z-10 flex gap-0.5">
          {Array.from({ length: 3 }, (_, k) => <span key={k} className={`h-1.5 w-1.5 rounded-full ${k < t.dots ? "bg-stone-500" : "bg-stone-300/60"}`} />)}
        </span>
      )}
      <span className="relative z-10 mb-1 line-clamp-2 max-w-[94%] rounded-md bg-white/85 px-1 text-center text-[10px] font-bold leading-[1.15] text-stone-800">{t.label}</span>
    </span>
  );
}

/** The portrait. Compact (Home): a link to the full view. Full: tap a tile for what it says. */
export function Mosaic({ tiles, labels, compact = false }: { tiles: TileView[]; labels: MosaicLabels; compact?: boolean }) {
  const [sel, setSel] = useState<string | null>(null);
  if (compact) {
    return (
      <div className="grid grid-cols-5 gap-1.5">
        {tiles.map((t, i) => <Tile key={t.id} t={t} i={i} />)}
      </div>
    );
  }
  const s = tiles.find((t) => t.id === sel) ?? null;
  return (
    <div className="space-y-3">
      <ul className="grid grid-cols-5 gap-1.5">
        {tiles.map((t, i) => (
          <li key={t.id}>
            <button
              type="button"
              aria-label={`${t.title}: ${labels.levels[t.level]}`}
              aria-pressed={sel === t.id}
              onClick={() => setSel(sel === t.id ? null : t.id)}
              className="block w-full rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
            >
              <Tile t={t} i={i} selected={sel === t.id} />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-stone-500">
        {(["empty", "gathering", "emerging", "consistent", "mixed"] as const).map((l) => (
          <span key={l} className="flex items-center gap-1">
            <span className={`inline-block h-2.5 w-2.5 rounded-sm ${l === "empty" ? "border border-dashed border-stone-300" : l === "gathering" ? "bg-teal-50 ring-1 ring-teal-100" : l === "emerging" ? "bg-teal-300" : l === "consistent" ? "bg-teal-500" : "bg-linear-to-br from-teal-300 to-rose-300"}`} />
            {labels.levels[l]}
          </span>
        ))}
      </div>
      {s ? (
        <div key={s.id} className="animate-[fadeUp_.3s_ease-out] space-y-2 rounded-2xl bg-white/85 p-4 text-sm ring-1 ring-stone-200/70 motion-reduce:animate-none" aria-live="polite">
          <p className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-semibold text-stone-900">{s.title}</span>
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-600">{labels.levels[s.level]}</span>
          </p>
          <p className="leading-relaxed text-stone-800">{s.body}</p>
          {s.meta && <p className="text-xs text-stone-500">{s.meta}</p>}
          <div className="flex flex-wrap gap-3 pt-1">
            <Link href={s.href} className="font-semibold text-teal-700 underline">{s.hrefLabel} →</Link>
            {s.evidenceHref && <Link href={s.evidenceHref} className="text-stone-600 underline">{labels.evidence}</Link>}
          </div>
        </div>
      ) : (
        <p className="text-center text-xs text-stone-500">{labels.hint}</p>
      )}
    </div>
  );
}
