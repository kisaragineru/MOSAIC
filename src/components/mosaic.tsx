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
  /** "{n} more" on a tile still gathering answers. */
  need: string;
  /** What each colour stands for. */
  hues: { hue: Hue; name: string }[];
  deeper: string;
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

/** One colour for the whole tile: the clearer the tendency, the deeper the colour. */
function fill(t: TileView): string {
  const s = SHADE[t.hue];
  switch (t.level) {
    case "empty":
      return "bg-white/70";
    case "gathering":
      return s.faint;
    case "mixed":
      return s.soft;
    case "emerging":
      return s.mid;
    case "consistent":
      return s.strong;
  }
}

function Tile({ t, i, selected, need }: { t: TileView; i: number; selected?: boolean; need: (n: number) => string }) {
  return (
    <span className="flex flex-col items-center gap-1">
      <span
        className={`relative flex aspect-square w-full animate-[zoomIn_.45s_ease-out_both] items-center justify-center overflow-hidden rounded-2xl motion-reduce:animate-none ${DELAY[i % 5]} ${fill(t)} ${
          t.level === "empty" ? "border border-dashed border-stone-300" : "shadow-sm ring-1 ring-black/5"
        } ${selected ? "ring-2 ring-stone-800 ring-offset-2" : ""} ${t.rejected ? "opacity-45" : ""}`}
      >
        {t.level === "empty" && <span aria-hidden className="text-lg font-bold text-stone-300">?</span>}
        {t.level === "gathering" && <span className="px-1 text-center text-[10px] font-semibold leading-tight text-stone-600">{need(Math.max(1, 3 - t.dots))}</span>}
        {t.level === "mixed" && <span aria-hidden className="text-base text-stone-600">⇄</span>}
      </span>
      <span className={`line-clamp-2 w-full text-center text-[11px] font-semibold leading-tight ${t.level === "empty" ? "text-stone-400" : "text-stone-800"}`}>{t.label}</span>
    </span>
  );
}

/** The portrait. Compact (Home): a link to the full view. Full: tap a tile for what it says. */
export function Mosaic({ tiles, labels, compact = false }: { tiles: TileView[]; labels: MosaicLabels; compact?: boolean }) {
  const [sel, setSel] = useState<string | null>(null);
  const need = (n: number) => labels.need.replace("{n}", String(n));
  if (compact) {
    return (
      <div className="grid grid-cols-4 gap-x-2.5 gap-y-3">
        {tiles.map((t, i) => <Tile key={t.id} t={t} i={i} need={need} />)}
      </div>
    );
  }
  const s = tiles.find((t) => t.id === sel) ?? null;
  return (
    <div className="space-y-3">
      <ul className="grid grid-cols-4 gap-x-2.5 gap-y-3">
        {tiles.map((t, i) => (
          <li key={t.id}>
            <button
              type="button"
              aria-label={`${t.title}: ${labels.levels[t.level]}`}
              aria-pressed={sel === t.id}
              onClick={() => setSel(sel === t.id ? null : t.id)}
              className="block w-full rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
            >
              <Tile t={t} i={i} selected={sel === t.id} need={need} />
            </button>
          </li>
        ))}
      </ul>
      <div className="space-y-1 text-[11px] text-stone-600" data-testid="mosaic-legend">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {labels.hues.map((h) => (
            <span key={h.hue} className="flex items-center gap-1">
              <span aria-hidden className={`inline-block h-2.5 w-2.5 rounded-sm ${SHADE[h.hue].strong}`} />
              {h.name}
            </span>
          ))}
        </div>
        <p className="text-stone-500">{labels.deeper}</p>
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
