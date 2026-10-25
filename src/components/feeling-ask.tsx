"use client";
import { useEffect, useState, useTransition } from "react";
import { quickFeelingAction } from "@/app/actions/memories";
import { FEELINGS, FEELING_EMOJI } from "@/lib/labels";

export interface FeelingText {
  question: string;
  skip: string;
  thanks: string;
  names: Record<string, string>;
}

/**
 * Right after posting: one optional question, answered with a tap (or skipped). It closes by
 * itself if left alone.
 */
export function FeelingAsk({ tx, id, onDone }: { tx: FeelingText; id: string; onDone: () => void }) {
  const [done, setDone] = useState(false);
  const [, start] = useTransition();
  useEffect(() => {
    const t = window.setTimeout(onDone, done ? 1800 : 20_000);
    return () => window.clearTimeout(t);
  }, [done, onDone]);
  return (
    <div role="dialog" aria-label={tx.question} data-testid="feeling-ask" className="fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 mx-auto w-[min(100%-2rem,28rem)] animate-[sheetUp_.25s_ease-out] rounded-3xl bg-white p-4 shadow-2xl ring-1 ring-stone-200 motion-reduce:animate-none print:hidden">
      {done ? (
        <p className="text-center text-sm font-semibold text-teal-800">{tx.thanks}</p>
      ) : (
        <>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-stone-900">{tx.question}</p>
            <button type="button" onClick={onDone} className="rounded-full px-2 py-1 text-xs text-stone-500 hover:bg-stone-100">{tx.skip}</button>
          </div>
          <div className="grid grid-cols-6 gap-1">
            {FEELINGS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => start(async () => { if (await quickFeelingAction(id, f)) setDone(true); })}
                className="flex flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[10px] text-stone-600 transition hover:bg-teal-50 active:scale-95"
              >
                <span aria-hidden className="emoji-color text-2xl">{FEELING_EMOJI[f]}</span>
                {tx.names[f]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
