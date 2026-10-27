"use client";

import { useState } from "react";
import { openEnvelopeAction } from "@/app/actions/works";
import { Gather } from "./intro-film";

export interface EnvelopeText {
  from: string;
  lead: string;
  about: string;
  open: string;
}

/**
 * Before the work: an envelope, like a letter that just arrived. Who it's from (and their note),
 * what MOSAIC is in two lines, and "open the story". Opening it is what tells the writer it was
 * read (a link preview fetching the page doesn't). `skip` goes straight to the work.
 */
export function WorkEnvelope({ token, text: tx, note, skip, children }: { token: string; text: EnvelopeText; note: string | null; skip: boolean; children: React.ReactNode }) {
  const [state, setState] = useState<"closed" | "opening" | "open">(skip ? "open" : "closed");
  const open = () => {
    if (state !== "closed") return;
    setState("opening");
    void openEnvelopeAction(token);
    window.setTimeout(() => {
      setState("open");
      window.scrollTo({ top: 0 });
    }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 900);
  };
  if (state === "open") return <div className="motion-safe:animate-[fadeUp_.6s_ease-out]">{children}</div>;
  const opening = state === "opening";
  return (
    <section className="relative -mx-3 -my-6 flex min-h-[calc(100dvh+3rem)] flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#fdf0f4] via-[#f4f0ff] to-[#fbf8f2] px-6 py-12 text-center sm:-my-10" data-testid="envelope">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/4 h-[55vmax] w-[55vmax] -translate-x-1/2 rounded-full bg-rose-200/40 blur-3xl motion-safe:animate-[drift_20s_ease-in-out_infinite_alternate]" />
        <div className="absolute -right-1/4 bottom-0 h-[45vmax] w-[45vmax] rounded-full bg-violet-200/40 blur-3xl motion-safe:animate-[drift_24s_ease-in-out_-5s_infinite_alternate-reverse]" />
      </div>

      <p className="relative text-[11px] font-semibold tracking-[0.4em] text-violet-900/60 motion-safe:animate-[fadeUp_.8s_ease-out_both]">MOSAIC</p>
      <h1 className="relative mt-3 font-serif text-2xl font-bold leading-snug text-stone-900 [text-wrap:balance] motion-safe:animate-[fadeUp_.8s_ease-out_.2s_both]">{tx.from}</h1>

      {/* The envelope: its flap folds back when opened. */}
      <div className={`relative mt-10 w-64 transition duration-700 ease-out ${opening ? "-translate-y-4 scale-105 opacity-0 delay-300" : "motion-safe:animate-[fadeUp_.9s_ease-out_.4s_both]"}`} aria-hidden>
        <div className="relative h-40 rounded-2xl bg-gradient-to-br from-white to-amber-50 shadow-xl ring-1 ring-violet-100">
          <div className={`absolute inset-x-0 top-0 h-24 origin-top bg-gradient-to-b from-violet-100 to-rose-50 transition-transform duration-500 [clip-path:polygon(0_0,100%_0,50%_100%)] ${opening ? "[transform:rotateX(180deg)]" : ""}`} />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-amber-50/90 to-white/60 [clip-path:polygon(0_100%,50%_15%,100%_100%)]" />
          <span className="absolute left-1/2 top-[5.2rem] flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-br from-rose-300 to-violet-400 text-sm text-white shadow-md">✦</span>
        </div>
      </div>
      {note && <p className="relative mt-6 max-w-xs whitespace-pre-line font-serif text-[15px] leading-7 text-stone-700 motion-safe:animate-[fadeUp_.8s_ease-out_.7s_both]">“{note}”</p>}

      <div className="relative mt-10 max-w-sm space-y-2 motion-safe:animate-[fadeUp_.8s_ease-out_1s_both]">
        <p className="font-serif text-[15px] leading-7 text-stone-800">{tx.lead}</p>
        <p className="text-xs leading-6 text-stone-600">{tx.about}</p>
      </div>
      <div className="relative mt-6 motion-safe:animate-[fadeUp_.8s_ease-out_1.2s_both]">
        <Gather s size="h-3 w-3" />
      </div>
      <button
        type="button"
        onClick={open}
        disabled={opening}
        className="relative mt-8 rounded-full bg-violet-700 px-8 py-3.5 font-bold text-white shadow-lg transition hover:bg-violet-800 active:scale-95 motion-safe:animate-[fadeUp_.8s_ease-out_1.4s_both]"
      >
        ✉️ {tx.open}
      </button>
    </section>
  );
}
