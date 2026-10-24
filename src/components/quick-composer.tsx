"use client";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { quickMemoryAction, type QuickState } from "@/app/actions/memories";
import { KIND_ICON } from "@/lib/timeline";
import { CIRCLE_ICON } from "./circle-icon";

export interface ComposerText {
  write: string;
  title: string;
  placeholder: string;
  body: string;
  kind: string;
  kinds: Record<string, string>;
  audience: string;
  private: string;
  connections: string;
  circles: Record<string, string>;
  save: string;
  saveShared: string;
  saving: string;
  close: string;
  discard: string;
  more: string;
  errors: Record<string, string>;
}

const KINDS = ["thought", "feeling", "memory", "decision", "goal", "dream", "regret", "achievement", "value"];
const chip =
  "cursor-pointer select-none rounded-full border border-stone-200 bg-white px-3 py-1 text-sm text-stone-700 transition has-[:checked]:border-teal-600 has-[:checked]:bg-teal-600 has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-teal-400";
const fab =
  "animate-[floatIn_.5s_cubic-bezier(.2,.8,.2,1)_backwards] fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-[max(1rem,calc(50%-20rem))] z-30 inline-flex items-center gap-2 rounded-full bg-linear-to-br from-teal-600 to-violet-600 px-6 py-4 text-base font-bold text-white shadow-lg shadow-teal-900/25 ring-4 ring-white/80 transition hover:shadow-xl active:scale-95 print:hidden";

const noop = () => () => {};

/**
 * The journal's floating "Write": it opens a sheet right here to write a few lines and save
 * without leaving the page (✕ closes it). Before the page is interactive it is a plain link to
 * the full form.
 */
export function QuickComposer({ tx, canShare }: { tx: ComposerText; canShare: boolean }) {
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [state, action, pending] = useActionState<QuickState, FormData>(quickMemoryAction, null);
  const [handled, setHandled] = useState<number | null>(null);
  // The button says whether this goes to others' timelines too.
  const [shared, setShared] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);

  // Saved: close and start the next one empty (the list refreshes from the server).
  if (state?.ok && state.at !== handled) {
    setHandled(state.at);
    setOpen(false);
    setText("");
    setShared(false);
  }

  useEffect(() => {
    if (open) area.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function close() {
    if (text.trim() && !window.confirm(tx.discard)) return;
    setText("");
    setOpen(false);
  }

  const label = (
    <>
      <span aria-hidden className="text-xl leading-none">✎</span>
      {tx.write}
    </>
  );
  if (!hydrated) return <Link href="/memories/new" className={fab}>{label}</Link>;
  if (!open) {
    return (
      <button type="button" className={fab} onClick={() => setOpen(true)} aria-haspopup="dialog">
        {label}
      </button>
    );
  }
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center print:hidden">
      <button type="button" aria-label={tx.close} tabIndex={-1} onClick={close} className="absolute inset-0 animate-[fadeIn_.2s_ease-out] bg-stone-900/30 backdrop-blur-[2px] motion-reduce:animate-none" />
      <div role="dialog" aria-modal="true" aria-labelledby="composer-title" className="relative w-full max-w-2xl animate-[sheetUp_.25s_ease-out] rounded-t-3xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl motion-reduce:animate-none">
        <div className="mb-2 flex items-center justify-between">
          <h2 id="composer-title" className="text-base font-semibold text-stone-900">{tx.title}</h2>
          <button type="button" onClick={close} aria-label={tx.close} className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-stone-500 hover:bg-stone-100">✕</button>
        </div>
        <form action={action} className="space-y-3">
          <textarea
            ref={area}
            name="body"
            required
            maxLength={20000}
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={tx.placeholder}
            aria-label={tx.body}
            className="w-full resize-none rounded-2xl border border-stone-200 bg-stone-50/60 px-3.5 py-3 text-base leading-relaxed text-stone-900 placeholder:text-stone-500 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
          />
          <fieldset>
            <legend className="sr-only">{tx.kind}</legend>
            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
              {KINDS.map((k, i) => (
                <label key={k} className={`${chip} shrink-0`}>
                  <input type="radio" name="kind" value={k} defaultChecked={i === 0} className="sr-only" />
                  <span aria-hidden className="mr-1">{KIND_ICON[k]}</span>{tx.kinds[k]}
                </label>
              ))}
            </div>
          </fieldset>
          {canShare && (
            <fieldset className="flex flex-wrap items-center gap-1.5" onChange={(e) => setShared((e.target as unknown as HTMLInputElement).value !== "private")}>
              <legend className="sr-only">{tx.audience}</legend>
              <label className={chip}><input type="radio" name="visibility" value="private" defaultChecked className="sr-only" />🔒 {tx.private}</label>
              <label className={chip}><input type="radio" name="visibility" value="connections" className="sr-only" />🔗 {tx.connections}</label>
              {Object.entries(tx.circles).map(([c, name]) => (
                <label key={c} className={chip}><input type="radio" name="visibility" value={`circle:${c}`} className="sr-only" />{CIRCLE_ICON[c]} {name}</label>
              ))}
            </fieldset>
          )}
          {state && !state.ok && <p role="alert" className="text-sm text-rose-700">{tx.errors[state.error] ?? tx.errors.generic}</p>}
          <div className="flex items-center justify-between gap-3">
            <Link href="/memories/new" className="shrink-0 rounded-full px-2 py-2 text-sm text-stone-500 hover:bg-stone-100 hover:text-stone-800">{tx.more}</Link>
            <button type="submit" disabled={pending || !text.trim()} className="min-h-12 flex-1 whitespace-nowrap rounded-full bg-teal-700 px-6 text-base font-bold text-white shadow-md shadow-teal-900/15 transition hover:bg-teal-800 active:scale-[0.98] disabled:opacity-40 disabled:shadow-none sm:flex-none sm:px-10">
              {pending ? tx.saving : shared ? tx.saveShared : tx.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
