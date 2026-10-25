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

// Literal class strings (Tailwind only generates classes it can see). Flat: one hue per chapter,
// deeper as the tendency gets clearer; the ink is that hue's dark tone, white on the deepest.
const SHADE: Record<Hue, { strong: string; mid: string; soft: string; faint: string; ink: string }> = {
  self: { strong: "bg-teal-500", mid: "bg-teal-200", soft: "bg-teal-100", faint: "bg-teal-50", ink: "text-teal-800" },
  mind: { strong: "bg-sky-500", mid: "bg-sky-200", soft: "bg-sky-100", faint: "bg-sky-50", ink: "text-sky-800" },
  people: { strong: "bg-rose-500", mid: "bg-rose-200", soft: "bg-rose-100", faint: "bg-rose-50", ink: "text-rose-800" },
  life: { strong: "bg-amber-500", mid: "bg-amber-200", soft: "bg-amber-100", faint: "bg-amber-50", ink: "text-amber-800" },
  extra: { strong: "bg-violet-500", mid: "bg-violet-200", soft: "bg-violet-100", faint: "bg-violet-50", ink: "text-violet-800" },
};
const DELAY = ["[animation-delay:0ms]", "[animation-delay:40ms]", "[animation-delay:80ms]", "[animation-delay:120ms]", "[animation-delay:160ms]"];

/** One colour for the whole tile and one for what is on it. */
function look(t: TileView): string {
  const s = SHADE[t.hue];
  switch (t.level) {
    case "empty":
      return "bg-stone-100 text-stone-400";
    case "gathering":
      return `${s.faint} ${s.ink} [&>*]:opacity-60`;
    case "mixed":
      return `${s.soft} ${s.ink}`;
    case "emerging":
      return `${s.mid} ${s.ink}`;
    case "consistent":
      return `${s.strong} text-white`;
  }
}

function Tile({ t, i, selected }: { t: TileView; i: number; selected?: boolean }) {
  return (
    <span className="flex flex-col items-center gap-1">
      <span
        className={`flex aspect-square w-full animate-[zoomIn_.45s_ease-out_both] flex-col items-center justify-center gap-1 rounded-2xl motion-reduce:animate-none ${DELAY[i % 5]} ${look(t)} ${
          selected ? "ring-2 ring-stone-800 ring-offset-2" : ""
        } ${t.rejected ? "opacity-45" : ""}`}
      >
        {t.icons.length > 1 ? (
          <span aria-hidden className="flex items-center gap-1">
            <Glyph name={t.icons[0]!} className="h-5 w-5" />
            {t.level === "mixed" && <span className="text-[10px] font-bold">⇄</span>}
            <Glyph name={t.icons[1]!} className="h-5 w-5" />
          </span>
        ) : (
          <Glyph name={t.icons[0]!} className="h-8 w-8" />
        )}
        {t.badge && <span className="max-w-full truncate px-1 text-[10px] font-semibold leading-tight">{t.badge}</span>}
      </span>
      <span className={`line-clamp-2 w-full text-center text-[11px] font-semibold leading-tight ${t.level === "empty" ? "text-stone-400" : "text-stone-800"}`}>{t.label}</span>
    </span>
  );
}

/** The pictograms a tile can use, by the name the server gives it. */
const GLYPHS: Record<string, LucideIcon> = {
  BookOpen, Bird, Calculator, CalendarCheck, Coffee, Compass, Droplet, Globe, HandHeart, HandHelping, Handshake, Heart, House, Landmark, Lightbulb,
  Map: MapIcon, Megaphone, MessageCircle, Moon, Mountain, Palette, PartyPopper, PiggyBank, Rocket, Scale, Search, Shell, Shield, Sparkles, Star, Target,
  TreePine, Turtle, User, Users, Waves, Zap,
};

function Glyph({ name, className }: { name: string; className: string }) {
  const Icon = GLYPHS[name] ?? Sparkles;
  return <Icon aria-hidden className={className} strokeWidth={2} />;
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
