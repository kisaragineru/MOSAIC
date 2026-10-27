"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export interface FilmText {
  open: string[];
  /** Under "A lifetime, piece by piece." in the reader's language (empty in English). */
  tagline: string;
  typesEyebrow: string;
  typesTitle: string;
  typesBody: string;
  /** The sample person's type: "{persona}" is replaced with its name. */
  typesMio: string;
  pieceQ: string;
  pieceA: string[];
  piecesEyebrow: string;
  piecesTitle: string;
  piecesBody: string;
  selfEyebrow: string;
  selfTitle: string;
  selfBody: string;
  selfCardTitle: string;
  selfCard: string[];
  selfQuote: string;
  recordsEyebrow: string;
  recordsTitle: string;
  recordsBody: string;
  recordItems: string[];
  recordDates: string[];
  /** The scene's one line: that these small notes become your story. */
  recordsLine: string;
  connectEyebrow: string;
  connectTitle: string;
  connectBody: string;
  chat: string[];
  storyEyebrow: string;
  storyTitle: string;
  sampleLabel: string;
  sampleName: string;
  sample: string[];
  storyClose: string;
  handEyebrow: string;
  handTitle: string;
  handBody: string;
  handCard: string;
  handNote: string;
  privacy: string;
  startTitle: string;
  startNote: string;
  start: string;
  scroll: string;
}

/** A scene comes in as it scrolls into view (once). With reduced motion it is simply there. */
function useShown<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, shown] as const;
}

const IN = "transition duration-700 ease-out motion-reduce:transition-none";
const fade = (shown: boolean, delay = "") => `${IN} ${delay} ${shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 motion-reduce:opacity-100 motion-reduce:translate-y-0"}`;

/** Soft backgrounds, one per scene, so the film moves from dawn to a warm close. */
const TONE = {
  dawn: "bg-gradient-to-b from-[#fdf0f4] via-[#f4f0ff] to-[#fbf8f2]",
  paper: "bg-[#fbf8f2]",
  mist: "bg-gradient-to-b from-[#fbf8f2] via-[#eef6f6] to-[#fbf8f2]",
  blush: "bg-gradient-to-b from-[#fbf8f2] via-[#fdf1ec] to-[#fbf8f2]",
  warm: "bg-gradient-to-b from-[#fbf8f2] via-[#fdf3e3] to-[#f6eefc]",
} as const;

function Scene({ children, tone = "paper", tall, id }: { children: (shown: boolean) => React.ReactNode; tone?: keyof typeof TONE; tall: string; id?: string }) {
  const [ref, shown] = useShown<HTMLElement>();
  return (
    <section ref={ref} id={id} className={`relative flex ${tall} snap-start flex-col items-center justify-center overflow-hidden px-6 py-16 text-center text-stone-900 ${TONE[tone]}`}>
      {children(shown)}
    </section>
  );
}

const TILE_DELAY = ["delay-[1395ms]", "delay-[1080ms]", "delay-[450ms]", "delay-[225ms]", "delay-[1305ms]", "delay-[1215ms]", "delay-[360ms]", "delay-[1035ms]", "delay-[630ms]", "delay-[540ms]", "delay-[1260ms]", "delay-[990ms]", "delay-[1530ms]", "delay-[675ms]", "delay-[0ms]", "delay-[855ms]", "delay-[1350ms]", "delay-[315ms]", "delay-[945ms]", "delay-[1575ms]", "delay-[585ms]", "delay-[90ms]", "delay-[1485ms]", "delay-[270ms]", "delay-[720ms]", "delay-[45ms]", "delay-[810ms]", "delay-[495ms]", "delay-[1440ms]", "delay-[765ms]", "delay-[1170ms]", "delay-[180ms]", "delay-[135ms]", "delay-[1125ms]", "delay-[405ms]", "delay-[900ms]"];
const TILE_COLOR = ["bg-teal-300", "bg-rose-400", "bg-rose-300", "bg-sky-200", "bg-sky-300", "bg-fuchsia-300", "bg-sky-200", "bg-sky-300", "bg-fuchsia-300", "bg-violet-500", "bg-violet-300", "bg-amber-300", "bg-violet-500", "bg-violet-300", "bg-amber-300", "bg-amber-200", "bg-emerald-300", "bg-teal-500", "bg-amber-200", "bg-emerald-300", "bg-teal-500", "bg-teal-300", "bg-rose-400", "bg-rose-300", "bg-teal-300", "bg-rose-400", "bg-rose-300", "bg-sky-200", "bg-sky-300", "bg-fuchsia-300", "bg-sky-200", "bg-sky-300", "bg-fuchsia-300", "bg-violet-500", "bg-violet-300", "bg-amber-300"];
const OPEN_DELAY = ["delay-0", "delay-[700ms]", "delay-[1400ms]"];
/** The opening's nine tiles: each starts scattered and turned, then settles into one small mosaic. */
const GATHER = [
  { c: "bg-sky-300", from: "-translate-x-24 -translate-y-16 -rotate-45", d: "delay-[0ms]" },
  { c: "bg-violet-300", from: "translate-x-6 -translate-y-28 rotate-12", d: "delay-[120ms]" },
  { c: "bg-amber-200", from: "translate-x-28 -translate-y-12 rotate-45", d: "delay-[60ms]" },
  { c: "bg-violet-400", from: "-translate-x-32 translate-y-2 rotate-[30deg]", d: "delay-[200ms]" },
  { c: "bg-rose-300", from: "scale-50", d: "delay-[320ms]" },
  { c: "bg-amber-300", from: "translate-x-32 translate-y-4 -rotate-[30deg]", d: "delay-[160ms]" },
  { c: "bg-teal-300", from: "-translate-x-20 translate-y-24 rotate-45", d: "delay-[260ms]" },
  { c: "bg-fuchsia-200", from: "translate-x-2 translate-y-28 -rotate-12", d: "delay-[100ms]" },
  { c: "bg-rose-400", from: "translate-x-24 translate-y-20 -rotate-45", d: "delay-[220ms]" },
];
const RECORD_ICON = ["☕", "🍞", "🌙"];
const CHAT_DELAY = ["delay-[700ms]", "delay-[1500ms]", "delay-[2300ms]"];

/**
 * The opening, in three beats once it's in view: the poem line by line; then the nine pieces fly
 * together; then they give way to the logo, the name, the line under it (and, in the guide, the
 * greeting). With reduced motion it is all simply there.
 */
function Opening({ s, tx, greeting }: { s: boolean; tx: FilmText; greeting?: string }) {
  const [beat, setBeat] = useState(0);
  useEffect(() => {
    if (!s) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = window.setTimeout(() => setBeat(2), 0);
      return () => window.clearTimeout(id);
    }
    const a = window.setTimeout(() => setBeat(1), 2300);
    const b = window.setTimeout(() => setBeat(2), 4000);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, [s]);
  const gathered = beat >= 1;
  const named = beat >= 2;
  return (
    <>
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/4 h-[55vmax] w-[55vmax] -translate-x-1/2 rounded-full bg-rose-200/40 blur-3xl motion-safe:animate-[drift_20s_ease-in-out_infinite_alternate]" />
        <div className="absolute -right-1/4 bottom-0 h-[45vmax] w-[45vmax] rounded-full bg-violet-200/40 blur-3xl motion-safe:animate-[drift_24s_ease-in-out_-5s_infinite_alternate-reverse]" />
      </div>
      <p className="relative font-serif text-xl leading-[2.2] tracking-wide text-stone-800">
        {tx.open.map((line, i) => (
          <span key={i} className={`block ${fade(s, OPEN_DELAY[i])}`}>{line}</span>
        ))}
      </p>
      {/* The pieces gather, then become the mark itself. */}
      <div className="relative mt-12 flex h-24 w-24 items-center justify-center">
        <div className={`absolute transition-opacity duration-700 ${named ? "opacity-0" : "opacity-100"}`}>
          <Gather s={gathered} />
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/mark-lg.png" alt="" width={419} height={395} className={`absolute h-20 w-auto drop-shadow-[0_10px_24px_rgba(120,110,200,0.25)] transition duration-1000 ease-out ${named ? "scale-100 opacity-100" : "scale-90 opacity-0"}`} />
      </div>
      <p className={`relative mt-6 ${IN} delay-300 ${named ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/wordmark.png" alt="MOSAIC" width={337} height={56} className="mx-auto h-6 w-auto" />
      </p>
      <p className={`relative mt-4 font-serif text-sm italic tracking-wide text-stone-600 ${IN} delay-700 ${named ? "opacity-100" : "opacity-0"}`}>A lifetime, piece by piece.</p>
      {tx.tagline && <p className={`relative mt-1 font-serif text-sm text-stone-600 ${IN} delay-1000 ${named ? "opacity-100" : "opacity-0"}`}>{tx.tagline}</p>}
      {greeting && <p className={`relative mt-8 text-sm font-semibold tracking-[0.2em] text-violet-900/80 ${IN} delay-[1500ms] ${named ? "opacity-100" : "opacity-0"}`}>{greeting}</p>}
      <p aria-hidden className={`absolute bottom-8 text-[11px] tracking-[0.3em] text-stone-400 ${IN} delay-[2000ms] ${named ? "opacity-100" : "opacity-0"}`}>{tx.scroll} ↓</p>
    </>
  );
}

/** Nine pieces that come together into one small mosaic as the scene comes in. */
function Gather({ s, size = "h-5 w-5" }: { s: boolean; size?: string }) {
  return (
    <div aria-hidden className="relative grid grid-cols-3 gap-1.5">
      {GATHER.map((g, i) => (
        <span key={i} className={`block ${size} rounded-md ${g.c} shadow-sm transition duration-[1400ms] ease-out motion-reduce:transition-none ${g.d} ${s ? "translate-x-0 translate-y-0 rotate-0 scale-100 opacity-90" : `${g.from} opacity-0 motion-reduce:translate-x-0 motion-reduce:translate-y-0 motion-reduce:rotate-0 motion-reduce:scale-100 motion-reduce:opacity-90`}`} />
      ))}
    </div>
  );
}
const STORY_DELAY = ["delay-[200ms]", "delay-[700ms]", "delay-[1200ms]", "delay-[1700ms]"];

/**
 * MOSAIC told as a short film you scroll through, in the order of its idea: you may know yourself
 * least; a birth date gives a type; answers add pieces, which become your manual; your days, a line
 * at a time, become a story; when you want someone to know you, you hand it to them, and connected
 * you talk and read each other. Ends with where to begin. Light, gentle colours throughout.
 */
/** A type as the reel shows it (plain data, from the server in the reader's language). */
export interface FilmType {
  id: string;
  name: string;
  persona: string;
  lines: string[];
}

const MIO = "thai_am";

export function IntroFilm({ tx, types, start, after, embedded = false, greeting }: { tx: FilmText; types: FilmType[]; start: string; after?: React.ReactNode; embedded?: boolean; greeting?: string }) {
  const mio = types.find((x) => x.id === MIO);
  // Embedded (the guide's first page): edge to edge under the app's header, each scene a screen tall
  // between the header and the tab bar.
  const tall = embedded ? "min-h-[calc(100dvh-8.5rem)]" : "min-h-dvh";
  return (
    <div className={`${embedded ? "-mx-4 -mt-6 overflow-hidden rounded-b-[2rem]" : ""} bg-[#fbf8f2]`} data-testid="intro-film">
      {/* 1. Opening: the poem asks; the pieces answer, gathering into the mark, then the name. */}
      <Scene tone="dawn" tall={tall}>
        {(s) => <Opening s={s} tx={tx} greeting={greeting} />}
      </Scene>

      {/* 2. A birth date, a type: the fourteen turn quietly behind; one steps forward, in its own light. */}
      <Scene tall={tall}>
        {(s) => (
          <>
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <div className={`absolute left-1/2 top-1/2 h-[40vmax] w-[40vmax] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-200/50 blur-3xl transition-opacity duration-[2000ms] delay-700 ${s ? "opacity-100" : "opacity-0"}`} />
            </div>
            <p className={`relative text-xs font-bold tracking-[0.25em] text-violet-700 ${fade(s)}`}>{tx.typesEyebrow}</p>
            <h2 className={`relative mt-2 text-2xl font-black text-stone-900 ${fade(s, "delay-150")}`}>{tx.typesTitle}</h2>
            {/* The fourteen pass by, each with its name; Mio's is the one with the light. */}
            <div className={`relative mt-8 w-full max-w-md overflow-hidden ${fade(s, "delay-300")}`}>
              <ul className="flex w-max gap-2.5 motion-safe:animate-[filmReel_48s_linear_infinite]">
                {[...types, ...types].map((x, i) => (
                  <li key={i} aria-hidden={i >= types.length} className="w-24 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/tuvi-types/${x.id}-sm.webp`} alt="" width={300} height={594} className={`block h-auto w-full rounded-xl ${x.id === MIO ? "shadow-[0_0_24px_rgba(129,140,248,0.6)] ring-2 ring-indigo-300" : "ring-1 ring-stone-200"}`} />
                    <p className="mt-1.5 text-center text-[11px] font-bold leading-tight text-stone-800">
                      {x.lines.map((l, j) => <span key={j} className="block">{l}</span>)}
                    </p>
                    <p className="text-center text-[10px] text-stone-500">{x.name}</p>
                  </li>
                ))}
              </ul>
              <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-[#fbf8f2] to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[#fbf8f2] to-transparent" />
            </div>
            {mio && (
              <div className={`relative mt-8 flex items-center gap-3 rounded-2xl bg-white/80 py-2 pl-2 pr-4 text-left shadow-sm ring-1 ring-indigo-100 ${fade(s, "delay-[1200ms]")}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/tuvi-types/${MIO}-sm.webp`} alt="" width={300} height={594} className="h-14 w-auto rounded-lg object-cover object-top shadow-[0_0_16px_rgba(129,140,248,0.5)]" />
                <p className="font-serif text-base text-indigo-900">{tx.typesMio.replace("{persona}", mio.persona)}</p>
              </div>
            )}
            <p className={`relative mt-4 max-w-sm text-sm leading-7 text-stone-600 ${fade(s, "delay-[1900ms]")}`}>{tx.typesBody}</p>
          </>
        )}
      </Scene>

      {/* 3. Answers add pieces */}
      <Scene tone="mist" tall={tall}>
        {(s) => (
          <>
            <p className={`text-xs font-bold tracking-[0.25em] text-teal-700 ${fade(s)}`}>{tx.piecesEyebrow}</p>
            <h2 className={`mt-2 text-2xl font-black text-stone-900 ${fade(s, "delay-150")}`}>{tx.piecesTitle}</h2>
            <div aria-hidden className={`mt-8 w-full max-w-xs rounded-2xl bg-white/90 px-4 py-4 text-left shadow-sm ring-1 ring-teal-100 ${fade(s, "delay-300")}`}>
              <p className="text-sm font-semibold text-stone-800">{tx.pieceQ}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {tx.pieceA.map((a, i) => (
                  <span key={i} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors duration-500 delay-[900ms] ${i === 0 && s ? "bg-teal-600 text-white" : "bg-stone-100 text-stone-600"}`}>{a}</span>
                ))}
              </div>
            </div>
            <div aria-hidden className="mt-6 grid w-56 grid-cols-6 gap-1.5">
              {TILE_COLOR.map((c, i) => (
                <span key={i} className={`aspect-square rounded-md ${c} transition duration-500 ease-out motion-reduce:transition-none ${TILE_DELAY[i]} ${s ? "scale-100 opacity-100" : "scale-50 opacity-0 motion-reduce:scale-100 motion-reduce:opacity-100"} ${i === 14 ? "ring-2 ring-white shadow-[0_0_16px_rgba(20,184,166,0.8)] motion-safe:animate-[twinkle_3s_ease-in-out_2s_infinite]" : ""}`} />
              ))}
            </div>
            <p className={`mt-8 max-w-sm text-sm leading-7 text-stone-600 ${fade(s, "delay-[1600ms]")}`}>{tx.piecesBody}</p>
          </>
        )}
      </Scene>

      {/* 4. What comes to light becomes a manual */}
      <Scene tall={tall}>
        {(s) => (
          <>
            <p className={`text-xs font-bold tracking-[0.25em] text-sky-700 ${fade(s)}`}>{tx.selfEyebrow}</p>
            <h2 className={`mt-2 text-2xl font-black text-stone-900 [text-wrap:balance] ${fade(s, "delay-150")}`}>{tx.selfTitle}</h2>
            <figure className={`relative mt-8 w-full max-w-sm rounded-2xl bg-white px-5 py-6 text-left shadow-lg ring-1 ring-sky-100 ${fade(s, "delay-300")}`}>
              <span className="absolute right-4 top-3 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-500">{tx.sampleLabel}</span>
              <figcaption className="flex items-center gap-2 text-sm font-bold text-stone-900"><span aria-hidden>📖</span>{tx.selfCardTitle}</figcaption>
              <ul className="mt-4 space-y-2.5">
                {tx.selfCard.map((line, i) => (
                  <li key={i} className={`rounded-xl bg-sky-50/70 px-3 py-2 text-sm leading-6 text-stone-700 ${fade(s, STORY_DELAY[i])}`}>{line}</li>
                ))}
              </ul>
            </figure>
            <p className={`mt-8 font-serif text-lg text-sky-900 ${fade(s, "delay-[1900ms]")}`}>{tx.selfQuote}</p>
            <p className={`mt-4 max-w-sm text-sm leading-7 text-stone-600 ${fade(s, "delay-[2300ms]")}`}>{tx.selfBody}</p>
          </>
        )}
      </Scene>

      {/* 5. Every day, a line at a time */}
      <Scene tone="blush" tall={tall}>
        {(s) => (
          <>
            <p className={`text-xs font-bold tracking-[0.25em] text-rose-600 ${fade(s)}`}>{tx.recordsEyebrow}</p>
            <h2 className={`mt-2 text-2xl font-black text-stone-900 [text-wrap:balance] ${fade(s, "delay-150")}`}>{tx.recordsTitle}</h2>
            <ol className="relative mt-8 w-full max-w-xs space-y-3 border-l-2 border-rose-200 pl-5 text-left">
              {tx.recordItems.map((line, i) => (
                <li key={i} className={`relative rounded-2xl bg-white px-4 py-3 text-sm text-stone-800 shadow-sm ring-1 ring-rose-100 ${fade(s, STORY_DELAY[i])}`}>
                  <span aria-hidden className="absolute -left-[1.9rem] top-3 h-3 w-3 rounded-full bg-rose-300 ring-4 ring-[#fdf1ec]" />
                  <span className="block text-[11px] font-semibold text-rose-400">{tx.recordDates[i]}</span>
                  <span aria-hidden className="mr-2">{RECORD_ICON[i]}</span>{line}
                </li>
              ))}
            </ol>
            <p className={`mt-8 max-w-sm text-sm leading-7 text-stone-600 ${fade(s, "delay-[1500ms]")}`}>{tx.recordsBody}</p>
            <p className={`mt-5 max-w-sm font-serif text-lg leading-8 text-rose-900 [text-wrap:balance] ${fade(s, "delay-[2200ms]")}`}>{tx.recordsLine}</p>
          </>
        )}
      </Scene>

      {/* 6. Records become a story (an example) */}
      <Scene tall={tall}>
        {(s) => (
          <>
            <p className={`text-xs font-bold tracking-[0.25em] text-rose-700 ${fade(s)}`}>{tx.storyEyebrow}</p>
            <h2 className={`mt-2 text-2xl font-black text-stone-900 [text-wrap:balance] ${fade(s, "delay-150")}`}>{tx.storyTitle}</h2>
            <figure className={`relative mt-8 w-full max-w-sm rounded-2xl bg-white px-6 py-7 text-left shadow-lg ring-1 ring-stone-200/80 ${fade(s, "delay-300")}`}>
              <span className="absolute right-4 top-3 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-500">{tx.sampleLabel}</span>
              <figcaption className="text-center font-serif text-sm font-bold text-stone-900">{tx.sampleName}</figcaption>
              <div className="mt-4 space-y-2 font-serif text-[15px] leading-8 text-stone-700">
                {tx.sample.map((line, i) => (
                  <p key={i} className={fade(s, STORY_DELAY[i])}>
                    {line}
                    {i === tx.sample.length - 1 && <span aria-hidden className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 bg-stone-500 motion-safe:animate-[twinkle_1.2s_steps(2)_infinite]" />}
                  </p>
                ))}
              </div>
            </figure>
            <p className={`mt-8 max-w-sm whitespace-pre-line font-serif text-sm leading-7 text-stone-600 ${fade(s, "delay-[2200ms]")}`}>{tx.storyClose}</p>
          </>
        )}
      </Scene>

      {/* 7. When you want someone to know you */}
      <Scene tone="warm" tall={tall}>
        {(s) => (
          <>
            <p className={`text-xs font-bold tracking-[0.25em] text-amber-700 ${fade(s)}`}>{tx.handEyebrow}</p>
            <h2 className={`mt-2 text-2xl font-black text-stone-900 [text-wrap:balance] ${fade(s, "delay-150")}`}>{tx.handTitle}</h2>
            <div className={`relative mt-10 ${IN} delay-500 ${s ? "translate-x-0 opacity-100" : "-translate-x-10 opacity-0 motion-reduce:translate-x-0 motion-reduce:opacity-100"}`}>
              <div className="w-60 -rotate-2 rounded-2xl bg-gradient-to-br from-violet-50 to-amber-50 px-5 py-6 shadow-xl ring-1 ring-violet-100">
                <p aria-hidden className="text-3xl">✉️</p>
                <p className="mt-2 font-serif text-base text-stone-800">{tx.handCard}</p>
              </div>
            </div>
            <p className={`mt-10 max-w-sm text-sm leading-7 text-stone-600 ${fade(s, "delay-700")}`}>{tx.handBody}</p>
            <p className={`mt-3 max-w-sm text-xs leading-6 text-stone-500 ${fade(s, "delay-1000")}`}>{tx.handNote}</p>
            <p className={`mt-1 max-w-sm text-xs leading-6 text-stone-500 ${fade(s, "delay-1000")}`}>{tx.privacy}</p>
          </>
        )}
      </Scene>

      {/* 8. Closer to the people you love */}
      <Scene tone="mist" tall={tall}>
        {(s) => (
          <>
            <p className={`text-xs font-bold tracking-[0.25em] text-teal-700 ${fade(s)}`}>{tx.connectEyebrow}</p>
            <h2 className={`mt-2 text-2xl font-black text-stone-900 [text-wrap:balance] ${fade(s, "delay-150")}`}>{tx.connectTitle}</h2>
            <div aria-hidden className={`mt-8 flex items-center gap-3 ${fade(s, "delay-300")}`}>
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-rose-200 to-amber-100 text-lg font-bold text-stone-700 ring-4 ring-white">ソ</span>
              <span className={`h-0.5 w-16 origin-left rounded-full bg-teal-300 ${IN} delay-500 ${s ? "scale-x-100" : "scale-x-0 motion-reduce:scale-x-100"}`} />
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-sky-200 to-violet-100 text-lg font-bold text-stone-700 ring-4 ring-white">ミ</span>
            </div>
            <div className="mt-6 w-full max-w-xs space-y-2">
              {tx.chat.map((line, i) => (
                <p key={i} className={`w-fit max-w-[85%] rounded-3xl px-4 py-2 text-left text-sm shadow-sm ${i % 2 ? "ml-auto rounded-br-md bg-teal-600 text-white" : "rounded-bl-md bg-white text-stone-800 ring-1 ring-stone-200"} ${fade(s, CHAT_DELAY[i])}`}>{line}</p>
              ))}
            </div>
            <p className={`mt-8 max-w-sm text-sm leading-7 text-stone-600 ${fade(s, "delay-[2800ms]")}`}>{tx.connectBody}</p>
          </>
        )}
      </Scene>

      {/* 9. Where to begin */}
      <Scene tone="dawn" tall={embedded ? "min-h-[60dvh]" : "min-h-[80dvh]"}>
        {(s) => (
          <>
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <div className="absolute -bottom-1/4 left-1/2 h-[50vmax] w-[50vmax] -translate-x-1/2 rounded-full bg-amber-200/50 blur-3xl" />
            </div>
            <div className="mb-8"><Gather s={s} size="h-4 w-4" /></div>
            <h2 className={`relative whitespace-pre-line font-serif text-xl font-bold leading-relaxed text-stone-900 [text-wrap:balance] ${fade(s)}`}>{tx.startTitle}</h2>
            <p className={`relative mt-3 text-sm text-stone-600 ${fade(s, "delay-150")}`}>{tx.startNote}</p>
            <Link href={start} className={`relative mt-8 inline-block rounded-full bg-violet-700 px-8 py-3.5 font-bold text-white shadow-lg hover:bg-violet-800 ${fade(s, "delay-300")}`}>{tx.start}</Link>
            {after && <div className={`relative mt-6 ${fade(s, "delay-500")}`}>{after}</div>}
          </>
        )}
      </Scene>
    </div>
  );
}
