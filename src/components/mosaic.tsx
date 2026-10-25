"use client";
import Link from "next/link";
import { useState } from "react";
import {
  Bird, BookOpen, Calculator, CalendarCheck, Coffee, Compass, Droplet, Globe, HandHeart, HandHelping, Handshake, Heart, House, Landmark, Lightbulb,
  Map as MapIcon, Megaphone, MessageCircle, Moon, Mountain, Palette, PartyPopper, PiggyBank, Rocket, Scale, Search, Shell, Shield, Sparkles, Star, Target,
  TreePine, Turtle, User, Users, Waves, Zap, type LucideIcon,
} from "lucide-react";

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
  /** Pictogram names: the side it leans to, or both sides while the question is still open. */
  icons: string[];
  /** A short word on the tile: answers left, or how clearly it shows. */
  badge: string | null;
  /** Answered / needed, while still on the way. */
  progress: [number, number] | null;
  href: string;
  hrefLabel: string;
  evidenceHref: string | null;
}

export interface MosaicLabels {
  hint: string;
  evidence: string;
  levels: Record<Level, string>;
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

function Tile({ t, i, selected }: { t: TileView; i: number; selected?: boolean }) {
  const quiet = t.level === "empty" || t.level === "gathering";
  return (
    <span className="flex flex-col items-center gap-1">
      <span
        className={`relative flex aspect-square w-full animate-[zoomIn_.45s_ease-out_both] flex-col items-center justify-center overflow-hidden rounded-2xl motion-reduce:animate-none ${DELAY[i % 5]} ${fill(t)} ${
          t.level === "empty" ? "border border-dashed border-stone-300" : "shadow-sm ring-1 ring-black/5"
        } ${selected ? "ring-2 ring-stone-800 ring-offset-2" : ""} ${t.rejected ? "opacity-45" : ""}`}
      >
        <span aria-hidden className={`flex items-center justify-center ${INK[t.level]}`}>
          {t.icons.length > 1 ? (
            <>
              <Glyph name={t.icons[0]!} className="h-5 w-5" />
              <span className="px-0.5 text-[10px] font-bold">{t.level === "mixed" ? "⇄" : "?"}</span>
              <Glyph name={t.icons[1]!} className="h-5 w-5" />
            </>
          ) : (
            <Glyph name={t.icons[0]!} className={t.level === "consistent" ? "h-9 w-9" : quiet ? "h-7 w-7" : "h-8 w-8"} />
          )}
        </span>
        {t.progress && quiet && (
          <span aria-hidden className="mt-1.5 flex gap-0.5">
            {dots(t.progress).map((on, k) => <span key={k} className={`h-1.5 w-1.5 rounded-full ${on ? "bg-stone-600" : "bg-stone-300/80"}`} />)}
          </span>
        )}
        {t.badge && (
          <span className="absolute inset-x-1 bottom-1 truncate rounded-full bg-white/85 px-1 py-px text-center text-[9px] font-bold leading-tight text-stone-700 shadow-sm">{t.badge}</span>
        )}
      </span>
      <span className={`line-clamp-2 w-full text-center text-[11px] font-semibold leading-tight ${t.level === "empty" ? "text-stone-400" : "text-stone-800"}`}>{t.label}</span>
    </span>
  );
}

// One colour per state, never more: pale while open, white on the filled tiles.
const INK: Record<Level, string> = {
  empty: "text-stone-300",
  gathering: "text-stone-400",
  mixed: "text-stone-600",
  emerging: "text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.12)]",
  consistent: "text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.15)]",
};

/** The pictograms a tile can use, by the name the server gives it. */
const GLYPHS: Record<string, LucideIcon> = {
  BookOpen, Bird, Calculator, CalendarCheck, Coffee, Compass, Droplet, Globe, HandHeart, HandHelping, Handshake, Heart, House, Landmark, Lightbulb,
  Map: MapIcon, Megaphone, MessageCircle, Moon, Mountain, Palette, PartyPopper, PiggyBank, Rocket, Scale, Search, Shell, Shield, Sparkles, Star, Target,
  TreePine, Turtle, User, Users, Waves, Zap,
};

function Glyph({ name, className }: { name: string; className: string }) {
  const Icon = GLYPHS[name] ?? Sparkles;
  return <Icon className={className} strokeWidth={2.2} />;
}

/** Progress as at most five dots: one per answer when few are needed, else a share of five. */
function dots([done, total]: [number, number]): boolean[] {
  const n = Math.min(total, 5);
  const on = total <= 5 ? done : Math.min(n - 1, Math.max(1, Math.round((done / total) * n)));
  return Array.from({ length: n }, (_, k) => k < on);
}

/** The portrait. Compact (Home): a link to the full view. Full: tap a tile for what it says. */
export function Mosaic({ tiles, labels, compact = false }: { tiles: TileView[]; labels: MosaicLabels; compact?: boolean }) {
  const [sel, setSel] = useState<string | null>(null);
  if (compact) {
    return (
      <div className="grid grid-cols-4 gap-x-2.5 gap-y-3">
        {tiles.map((t, i) => <Tile key={t.id} t={t} i={i} />)}
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
              <Tile t={t} i={i} selected={sel === t.id} />
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
