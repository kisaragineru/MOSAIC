"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export interface FilmText {
  open: string[];
  typesEyebrow: string;
  typesTitle: string;
  typesBody: string;
  piecesEyebrow: string;
  piecesTitle: string;
  piecesBody: string;
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
  privacy: string;
  startTitle: string;
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

function Scene({ children, dark = false, tall, id }: { children: (shown: boolean) => React.ReactNode; dark?: boolean; tall: string; id?: string }) {
  const [ref, shown] = useShown<HTMLElement>();
  return (
    <section ref={ref} id={id} className={`relative flex ${tall} snap-start flex-col items-center justify-center overflow-hidden px-6 py-16 text-center ${dark ? "bg-[#14112a] text-white" : ""}`}>
      {children(shown)}
    </section>
  );
}

const TYPES = ["tu_vi", "thien_co", "thai_duong", "vu_khuc", "thien_dong", "liem_trinh", "thien_phu", "thai_am", "tham_lang", "cu_mon", "thien_tuong", "thien_luong", "that_sat", "pha_quan"];
const TILE_DELAY = ["delay-[1395ms]", "delay-[1080ms]", "delay-[450ms]", "delay-[225ms]", "delay-[1305ms]", "delay-[1215ms]", "delay-[360ms]", "delay-[1035ms]", "delay-[630ms]", "delay-[540ms]", "delay-[1260ms]", "delay-[990ms]", "delay-[1530ms]", "delay-[675ms]", "delay-[0ms]", "delay-[855ms]", "delay-[1350ms]", "delay-[315ms]", "delay-[945ms]", "delay-[1575ms]", "delay-[585ms]", "delay-[90ms]", "delay-[1485ms]", "delay-[270ms]", "delay-[720ms]", "delay-[45ms]", "delay-[810ms]", "delay-[495ms]", "delay-[1440ms]", "delay-[765ms]", "delay-[1170ms]", "delay-[180ms]", "delay-[135ms]", "delay-[1125ms]", "delay-[405ms]", "delay-[900ms]"];
const TILE_COLOR = ["bg-teal-300", "bg-rose-400", "bg-rose-300", "bg-sky-200", "bg-sky-300", "bg-fuchsia-300", "bg-sky-200", "bg-sky-300", "bg-fuchsia-300", "bg-violet-500", "bg-violet-300", "bg-amber-300", "bg-violet-500", "bg-violet-300", "bg-amber-300", "bg-amber-200", "bg-emerald-300", "bg-teal-500", "bg-amber-200", "bg-emerald-300", "bg-teal-500", "bg-teal-300", "bg-rose-400", "bg-rose-300", "bg-teal-300", "bg-rose-400", "bg-rose-300", "bg-sky-200", "bg-sky-300", "bg-fuchsia-300", "bg-sky-200", "bg-sky-300", "bg-fuchsia-300", "bg-violet-500", "bg-violet-300", "bg-amber-300"];
const OPEN_DELAY = ["delay-0", "delay-[700ms]", "delay-[1400ms]"];
const STORY_DELAY = ["delay-[200ms]", "delay-[700ms]", "delay-[1200ms]", "delay-[1700ms]"];

/**
 * MOSAIC told as a short film you scroll through, in the order of its idea: you may know yourself
 * least; a birth date gives a type; answers add pieces; records turn them into a story; and when you
 * want someone to know you, you hand it to them. Ends with where to begin.
 */
export function IntroFilm({ tx, start, after, embedded = false }: { tx: FilmText; start: string; after?: React.ReactNode; embedded?: boolean }) {
  const tall = embedded ? "min-h-[78dvh]" : "min-h-dvh";
  return (
    <div className={`${embedded ? "-mx-4 overflow-hidden rounded-[2rem]" : ""} bg-[#fbf8f2]`} data-testid="intro-film">
      {/* 1. Quiet opening */}
      <Scene dark tall={tall}>
        {(s) => (
          <>
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <div className="absolute left-1/2 top-1/3 h-[60vmax] w-[60vmax] -translate-x-1/2 rounded-full bg-violet-700/30 blur-3xl motion-safe:animate-[drift_20s_ease-in-out_infinite_alternate]" />
            </div>
            <div className="mosaic-mark relative mb-10 h-12 w-12 rounded-xl opacity-90" aria-hidden />
            <p className="relative font-serif text-xl leading-[2.2] tracking-wide">
              {tx.open.map((line, i) => (
                <span key={i} className={`block ${fade(s, OPEN_DELAY[i])}`}>{line}</span>
              ))}
            </p>
            <p aria-hidden className={`absolute bottom-8 text-[11px] tracking-[0.3em] text-white/50 ${fade(s, "delay-[1800ms]")}`}>{tx.scroll} ↓</p>
          </>
        )}
      </Scene>

      {/* 2. A birth date, a type */}
      <Scene tall={tall}>
        {(s) => (
          <>
            <p className={`text-xs font-bold tracking-[0.25em] text-violet-700 ${fade(s)}`}>{tx.typesEyebrow}</p>
            <h2 className={`mt-2 text-2xl font-black text-stone-900 ${fade(s, "delay-150")}`}>{tx.typesTitle}</h2>
            <div className={`relative mt-8 w-full max-w-md overflow-hidden ${fade(s, "delay-300")}`} aria-hidden>
              <div className="flex w-max gap-2 motion-safe:animate-[filmReel_28s_linear_infinite]">
                {[...TYPES, ...TYPES].map((id, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={`/tuvi-types/${id}-sm.webp`} alt="" width={300} height={594} className="h-40 w-auto shrink-0 rounded-xl ring-1 ring-stone-200" />
                ))}
              </div>
              <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-[#fbf8f2] to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-[#fbf8f2] to-transparent" />
            </div>
            <p className={`mt-8 max-w-sm text-sm leading-7 text-stone-600 ${fade(s, "delay-500")}`}>{tx.typesBody}</p>
          </>
        )}
      </Scene>

      {/* 3. Answers add pieces */}
      <Scene tall={tall}>
        {(s) => (
          <>
            <p className={`text-xs font-bold tracking-[0.25em] text-teal-700 ${fade(s)}`}>{tx.piecesEyebrow}</p>
            <h2 className={`mt-2 text-2xl font-black text-stone-900 ${fade(s, "delay-150")}`}>{tx.piecesTitle}</h2>
            <div aria-hidden className="mt-8 grid w-56 grid-cols-6 gap-1.5">
              {TILE_COLOR.map((c, i) => (
                <span key={i} className={`aspect-square rounded-md ${c} transition duration-500 ease-out motion-reduce:transition-none ${TILE_DELAY[i]} ${s ? "scale-100 opacity-100" : "scale-50 opacity-0 motion-reduce:scale-100 motion-reduce:opacity-100"}`} />
              ))}
            </div>
            <p className={`mt-8 max-w-sm text-sm leading-7 text-stone-600 ${fade(s, "delay-[1600ms]")}`}>{tx.piecesBody}</p>
          </>
        )}
      </Scene>

      {/* 4. Records become a story (an example) */}
      <Scene tall={tall}>
        {(s) => (
          <>
            <p className={`text-xs font-bold tracking-[0.25em] text-rose-700 ${fade(s)}`}>{tx.storyEyebrow}</p>
            <h2 className={`mt-2 text-2xl font-black text-stone-900 [text-wrap:balance] ${fade(s, "delay-150")}`}>{tx.storyTitle}</h2>
            <figure className={`relative mt-8 w-full max-w-sm rounded-2xl bg-white px-6 py-7 text-left shadow-lg ring-1 ring-stone-200/80 ${fade(s, "delay-300")}`}>
              <span className="absolute right-4 top-3 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-500">{tx.sampleLabel}</span>
              <figcaption className="text-center font-serif text-sm font-bold text-stone-900">{tx.sampleName}</figcaption>
              <div className="mt-4 space-y-2 font-serif text-[15px] leading-8 text-stone-700">
                {tx.sample.map((line, i) => <p key={i} className={fade(s, STORY_DELAY[i])}>{line}</p>)}
              </div>
            </figure>
            <p className={`mt-8 max-w-sm whitespace-pre-line font-serif text-sm leading-7 text-stone-600 ${fade(s, "delay-[2200ms]")}`}>{tx.storyClose}</p>
          </>
        )}
      </Scene>

      {/* 5. When you want someone to know you */}
      <Scene tall={tall}>
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
            <p className={`mt-4 max-w-sm text-xs leading-6 text-stone-500 ${fade(s, "delay-1000")}`}>{tx.privacy}</p>
          </>
        )}
      </Scene>

      {/* 6. Where to begin */}
      <Scene dark tall={embedded ? "min-h-[60dvh]" : "min-h-[80dvh]"}>
        {(s) => (
          <>
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <div className="absolute -bottom-1/4 left-1/2 h-[50vmax] w-[50vmax] -translate-x-1/2 rounded-full bg-amber-500/20 blur-3xl" />
            </div>
            <div className="mosaic-mark relative mb-6 h-12 w-12 rounded-xl" aria-hidden />
            <h2 className={`relative whitespace-pre-line font-serif text-xl font-bold leading-relaxed [text-wrap:balance] ${fade(s)}`}>{tx.startTitle}</h2>
            <Link href={start} className={`relative mt-8 inline-block rounded-full bg-white px-8 py-3.5 font-bold text-[#14112a] shadow-lg hover:bg-amber-50 ${fade(s, "delay-300")}`}>{tx.start}</Link>
            {after && <div className={`relative mt-6 ${fade(s, "delay-500")}`}>{after}</div>}
          </>
        )}
      </Scene>
    </div>
  );
}
