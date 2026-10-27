"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TYPE_THEME as THEME } from "@/lib/tuvi/type-theme";
import type { TypeView } from "./tuvi-type";

export interface TypeViewerLabels {
  /** "View {name} full screen" (a template: functions can't cross to the client). */
  open: string;
  close: string;
  prev: string;
  next: string;
  /** The small caps word before the number ("TYPE 04"). */
  label: string;
  hint: string;
  /** The quotation marks around a type's name in the list (「」 in Japanese). */
  quote: [string, string];
}

/**
 * The fourteen types, each picture a button that opens the character full screen like a game's
 * character card: the number, the star's name in gold, the type in large letters, what it is like.
 * Swipe, the arrows or the keyboard go to the next type; Escape or ✕ closes.
 */
export function TypeViewer({
  types,
  labels,
  layout = "list",
  mine = [],
}: {
  types: TypeView[];
  labels: TypeViewerLabels;
  /** "list": cards with the picture and the description; "strip": a row of small cards to swipe through. */
  layout?: "list" | "strip";
  mine?: string[];
}) {
  const [open, setOpen] = useState<number | null>(null);
  const ref = useRef<HTMLDialogElement>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const n = types.length;
  const go = useCallback((d: number) => setOpen((i) => (i === null ? i : (i + d + n) % n)), [n]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open !== null && !d.open) {
      d.showModal();
      document.documentElement.classList.add("overflow-hidden");
    }
    if (open === null && d.open) d.close();
  }, [open]);

  const onClose = () => {
    document.documentElement.classList.remove("overflow-hidden");
    setOpen(null);
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") go(1);
    if (e.key === "ArrowLeft") go(-1);
  };
  const x = open === null ? null : types[open]!;
  const theme = x ? THEME[x.id] : null;
  const num = (i: number) => String(i + 1).padStart(2, "0");

  return (
    <>
      {layout === "list" ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {types.map((t, i) => (
            <li key={t.id} className="flex gap-3 rounded-2xl bg-white/85 p-3 ring-1 ring-stone-200/60">
              <Thumb t={t} label={labels.open.replace("{name}", t.persona)} onOpen={() => setOpen(i)} className="w-20 rounded-xl ring-1 ring-stone-200/60" />
              <span className="min-w-0">
                <span className="block font-semibold text-stone-900">{t.name}</span>
                <span className="block text-sm font-semibold text-violet-800">{labels.quote[0]}{t.persona}{labels.quote[1]}</span>
                <span className="mt-1 block text-sm leading-6 text-stone-700">{t.plain}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:none]">
          {types.map((t, i) => (
            <li key={t.id} className={`w-[6.5rem] shrink-0 snap-start overflow-hidden rounded-xl bg-white shadow-sm ${mine.includes(t.id) ? "ring-2 ring-violet-500" : "ring-1 ring-stone-200/70"}`}>
              <Thumb t={t} label={labels.open.replace("{name}", t.persona)} onOpen={() => setOpen(i)} />
              <p className="px-1.5 pb-1.5 pt-1 text-center leading-tight">
                <span className="block text-[11px] font-bold text-stone-900">
                  {t.lines.map((l, j) => (
                    <span key={j} className={`block ${j === t.lines.length - 1 && t.lines.length > 1 ? "whitespace-nowrap" : ""}`}>{l}</span>
                  ))}
                </span>
                <span className="block text-[10px] text-stone-500">{t.name}</span>
              </p>
            </li>
          ))}
        </ul>
      )}

      <dialog
        ref={ref}
        onClose={onClose}
        onKeyDown={onKey}
        aria-label={x?.persona}
        data-testid="type-viewer"
        className="m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden bg-[#0f0d1c] p-0 text-white backdrop:bg-black/80"
      >
        {x && open !== null && (
          <div
            className={`relative flex h-full flex-col transition-colors duration-700 ${theme!.bg}`}
            onPointerDown={(e) => (swipe.current = { x: e.clientX, y: e.clientY })}
            onPointerUp={(e) => {
              const s = swipe.current;
              swipe.current = null;
              if (!s) return;
              const dx = e.clientX - s.x;
              if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - s.y)) go(dx < 0 ? 1 : -1);
            }}
          >
            {/* The stage, in the picture's own colours: soft light drifting behind the character, a thin
                mist and a few faint stars. Quiet on purpose; it changes with the type. */}
            <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className={`absolute -left-1/4 top-[8%] h-[70vmax] w-[70vmax] rounded-full opacity-60 blur-3xl transition-colors duration-1000 motion-safe:animate-[drift_18s_ease-in-out_infinite_alternate] ${theme!.glow1}`} />
              <div className={`absolute -right-1/4 top-[35%] h-[60vmax] w-[60vmax] rounded-full opacity-45 blur-3xl transition-colors duration-1000 motion-safe:animate-[drift_22s_ease-in-out_-6s_infinite_alternate-reverse] ${theme!.glow2}`} />
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/45 to-transparent" />
              {STARS.map((c, i) => (
                <span key={i} className={`absolute h-[3px] w-[3px] rounded-full ${theme!.star} ${c}`} />
              ))}
            </div>

            <header className="relative z-10 flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),0.5rem)]">
              <p className="font-mono text-xs font-bold tracking-[0.3em] text-amber-200/90">
                {labels.label} <span className="text-base text-amber-100">{num(open)}</span>
                <span className="text-amber-200/50"> / {num(n - 1)}</span>
              </p>
              <button
                type="button"
                onClick={() => setOpen(null)}
                aria-label={labels.close}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-lg ring-1 ring-white/25 backdrop-blur hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-amber-200"
              >
                ✕
              </button>
            </header>

            {/* The picture takes every bit of height left; the arrows sit on its sides. */}
            <div className="relative z-0 flex min-h-0 flex-1 items-center justify-center px-2 pt-1">
              <div key={x.id} className="relative h-full max-w-full motion-safe:animate-[zoomIn_.9s_ease-out_both]">
                <img
                  src={`/tuvi-types/${x.id}.webp`}
                  width={600}
                  height={1188}
                  alt={x.persona}
                  className={`h-full max-h-full w-auto max-w-full rounded-3xl object-contain ring-1 ring-white/40 ${theme!.halo}`}
                />
                {/* A faint sheen passes across once. */}
                <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
                  <span className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 motion-safe:animate-[shine_2.2s_ease-in-out_.5s_both] motion-safe:opacity-100" />
                </span>
              </div>
              <NavButton onClick={() => go(-1)} label={labels.prev} className="absolute left-1 top-1/2 -translate-y-1/2">‹</NavButton>
              <NavButton onClick={() => go(1)} label={labels.next} className="absolute right-1 top-1/2 -translate-y-1/2">›</NavButton>
            </div>

            <div className="relative z-10 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2">
              <div key={x.id} className="mx-auto max-w-md rounded-3xl bg-gradient-to-b from-white/12 to-white/5 px-4 py-3 ring-1 ring-amber-200/30 backdrop-blur-md motion-safe:animate-[riseIn_.45s_ease-out_.1s_both]">
                <div className="flex items-center gap-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 font-black ring-1 ring-white/30 backdrop-blur ${theme!.accent}`}>{num(open)}</span>
                  <div className="min-w-0">
                    <p className={`text-sm font-black tracking-wide ${theme!.accent}`}>{x.name}</p>
                    <p className="text-xl font-black leading-snug text-white [text-shadow:0_0_12px_rgba(255,255,255,0.35)]">{x.persona}</p>
                  </div>
                </div>
                <p className="mt-2 text-[13px] leading-5 text-violet-100/90">{x.plain}</p>
              </div>
              <p className="mt-1.5 text-center text-[10px] text-white/45">{labels.hint}</p>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}

function Thumb({ t, label, onOpen, className = "" }: { t: TypeView; label: string; onOpen: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={label}
      data-testid={`type-open-${t.id}`}
      className={`group relative block shrink-0 self-start overflow-hidden transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 ${className}`}
    >
      <img
        src={`/tuvi-types/${t.id}-sm.webp`}
        width={300}
        height={594}
        alt=""
        loading="lazy"
        decoding="async"
        className="block aspect-[300/594] h-auto w-full bg-amber-50/60 object-cover object-top transition duration-300 group-hover:scale-105"
      />
      <span aria-hidden className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/45 text-[10px] text-white">⤢</span>
    </button>
  );
}

function NavButton({ onClick, label, children, className = "" }: { onClick: () => void; label: string; children: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`flex h-11 w-11 items-center justify-center rounded-full bg-black/30 text-3xl font-light leading-none ring-1 ring-white/30 backdrop-blur-sm hover:bg-black/45 active:scale-95 focus-visible:outline-2 focus-visible:outline-amber-200 ${className}`}
    >
      {children}
    </button>
  );
}

// Fixed star positions (literal classes for Tailwind), twinkling slowly at different times.
const STARS = [
  "left-[8%] top-[12%] opacity-50 motion-safe:animate-[twinkle_5s_ease-in-out_infinite]",
  "left-[22%] top-[30%] opacity-30",
  "left-[85%] top-[16%] opacity-50 motion-safe:animate-[twinkle_6s_ease-in-out_-2s_infinite]",
  "left-[72%] top-[42%] opacity-25",
  "left-[12%] top-[55%] opacity-40 motion-safe:animate-[twinkle_7s_ease-in-out_-4s_infinite]",
  "left-[90%] top-[60%] opacity-30",
  "left-[45%] top-[8%] opacity-30 motion-safe:animate-[twinkle_5.5s_ease-in-out_-1s_infinite]",
  "left-[60%] top-[24%] opacity-40",
  "left-[30%] top-[66%] opacity-25 motion-safe:animate-[twinkle_6.5s_ease-in-out_-3s_infinite]",
  "left-[78%] top-[70%] opacity-35",
];
