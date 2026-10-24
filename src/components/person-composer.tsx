"use client";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useFormStatus } from "react-dom";
import { createPersonAction } from "@/app/actions/people";

export interface PersonComposerText {
  add: string;
  title: string;
  name: string;
  relationship: string;
  relationships: Record<string, string>;
  close: string;
  adding: string;
}

const RELS = ["family", "partner", "friend", "colleague", "other"];
const chip =
  "cursor-pointer select-none rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-700 transition has-[:checked]:border-teal-600 has-[:checked]:bg-teal-600 has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-teal-400";
const fab =
  "fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-[max(1rem,calc(50%-20rem))] z-30 inline-flex items-center gap-2 rounded-full bg-linear-to-br from-rose-500 to-amber-500 px-6 py-4 text-base font-bold text-white shadow-lg shadow-rose-900/25 ring-4 ring-white/80 transition hover:shadow-xl active:scale-95 print:hidden";
const noop = () => () => {};

function Submit({ tx }: { tx: PersonComposerText }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="min-h-12 w-full rounded-full bg-teal-700 text-base font-bold text-white shadow-md transition hover:bg-teal-800 disabled:opacity-50">
      {pending ? tx.adding : tx.add}
    </button>
  );
}

/** People's floating "add": a sheet asking just the name and relationship (✕ to close). */
export function PersonComposer({ tx }: { tx: PersonComposerText }) {
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  const label = (
    <>
      <span aria-hidden className="text-xl leading-none">＋</span>
      {tx.add}
    </>
  );
  if (!hydrated) return <Link href="/people/new" className={fab}>{label}</Link>;
  if (!open) return <button type="button" className={fab} onClick={() => setOpen(true)} aria-haspopup="dialog">{label}</button>;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center print:hidden">
      <button type="button" aria-label={tx.close} tabIndex={-1} onClick={() => setOpen(false)} className="absolute inset-0 animate-[fadeIn_.2s_ease-out] bg-stone-900/30 backdrop-blur-[2px] motion-reduce:animate-none" />
      <div role="dialog" aria-modal="true" aria-labelledby="person-title" className="relative w-full max-w-2xl animate-[sheetUp_.25s_ease-out] rounded-t-3xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl motion-reduce:animate-none">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="person-title" className="text-base font-semibold text-stone-900">{tx.title}</h2>
          <button type="button" onClick={() => setOpen(false)} aria-label={tx.close} className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-stone-500 hover:bg-stone-100">✕</button>
        </div>
        <form action={createPersonAction} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-stone-700">{tx.name}</span>
            <input ref={input} name="nickname" required maxLength={80} className="w-full rounded-2xl border border-stone-200 bg-stone-50/60 px-3.5 py-3 text-base text-stone-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20" />
          </label>
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium text-stone-700">{tx.relationship}</legend>
            <div className="flex flex-wrap gap-1.5">
              {RELS.map((r) => (
                <label key={r} className={chip}>
                  <input type="radio" name="relationship" value={r} defaultChecked={r === "friend"} className="sr-only" />
                  {tx.relationships[r]}
                </label>
              ))}
            </div>
          </fieldset>
          <Submit tx={tx} />
        </form>
      </div>
    </div>
  );
}
