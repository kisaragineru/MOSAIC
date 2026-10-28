"use client";

import { useActionState } from "react";
import { pickTryTypeAction, tryTypeAction, type TryState } from "@/app/actions/try-type";
import { DateSelect, type DateSelectText } from "./date-select";
import { Select } from "./ui";

export interface TypeTryText {
  title: string;
  lead: string;
  date: string;
  hour: string;
  hourUnknown: string;
  go: string;
  yours: string;
  noTime: string;
  /** Without the hour: picking the type that feels most like them. */
  pickYours: string;
  picked: string;
  needs: string;
  invalid: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

/**
 * After reading someone's story: "what's your type?" in a moment, without an account. Their type
 * sits beside yours. The date is only used for the reading (see tryTypeAction).
 */
export function TypeTry({ text: tx, date: dt, theirs, choices }: { text: TypeTryText; date: DateSelectText; theirs: { id: string; persona: string } | null; choices: { id: string; persona: string }[] }) {
  const [tried, act, pending] = useActionState<TryState, FormData>(tryTypeAction, { status: "idle" });
  const [chosen, pick, picking] = useActionState<TryState, FormData>(pickTryTypeAction, { status: "idle" });
  const state = chosen.status === "type" ? chosen : tried;
  const mine = state.status === "type" ? state.types[0] : null;
  return (
    <div className="mx-auto max-w-sm rounded-3xl bg-white/90 p-5 text-left shadow-sm ring-1 ring-violet-100" data-testid="type-try">
      <h3 className="text-center font-serif text-lg font-bold text-stone-900">✨ {tx.title}</h3>
      <p className="mt-1 text-center text-xs leading-5 text-stone-600">{tx.lead}</p>
      {mine ? (
        <div className="mt-5 grid grid-cols-2 gap-3 text-center" data-testid="type-try-result">
          {theirs && <TypeCard id={theirs.id} label={theirs.persona} />}
          <TypeCard id={mine.id} label={tx.yours.replace("{persona}", mine.persona)} glow className={theirs ? "" : "col-span-2 mx-auto w-1/2"} />
          <p className="col-span-2 text-xs leading-5 text-stone-600">{mine.plain}</p>
          {state.status === "type" && state.picked && <p className="col-span-2 text-[11px] leading-5 text-violet-800">{tx.picked}</p>}
        </div>
      ) : tried.status === "no_time" ? (
        // No hour: the type that feels most like them, picked from the fourteen (kept for sign-up).
        <form action={pick} className="mt-4 space-y-3" data-testid="type-try-pick">
          <p className="rounded-2xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">{tx.noTime}</p>
          <p className="text-sm font-semibold text-stone-800">{tx.pickYours}</p>
          <input type="hidden" name="date" value={tried.date} />
          <ul className="grid grid-cols-3 gap-2">
            {choices.map((c) => (
              <li key={c.id}>
                <button type="submit" name="pick" value={c.id} disabled={picking} className="block w-full overflow-hidden rounded-xl bg-white text-center ring-1 ring-stone-200 transition hover:ring-2 hover:ring-violet-400 active:scale-95 disabled:opacity-60">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/tuvi-types/${c.id}-sm.webp`} alt="" width={300} height={594} className="block h-auto w-full" />
                  <span className="block px-1 py-1 text-[10px] font-bold leading-tight text-stone-900">{c.persona}</span>
                </button>
              </li>
            ))}
          </ul>
        </form>
      ) : (
        <form action={act} className="mt-4 space-y-3">
          <DateSelect name="date" label={tx.date} text={dt} min="1900-01-01" max={`${new Date().getUTCFullYear()}-12-31`} required />
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-stone-700">{tx.hour}</span>
            <Select name="hour" defaultValue="">
              <option value="">{tx.hourUnknown}</option>
              {HOURS.map((h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00〜</option>)}
            </Select>
          </label>
          {state.status === "needs" && <p className="rounded-2xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">{tx.needs}</p>}
          {state.status === "invalid" && <p className="rounded-2xl bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-800">{tx.invalid}</p>}
          <button type="submit" disabled={pending} className="w-full rounded-full bg-violet-700 py-3 text-sm font-bold text-white shadow-sm hover:bg-violet-800 disabled:opacity-60">{tx.go}</button>
        </form>
      )}
    </div>
  );
}

function TypeCard({ id, label, glow = false, className = "" }: { id: string; label: string; glow?: boolean; className?: string }) {
  return (
    <figure className={`motion-safe:animate-[zoomIn_.7s_ease-out_both] ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/tuvi-types/${id}-sm.webp`} alt="" width={300} height={594} className={`mx-auto block h-auto w-full rounded-2xl ${glow ? "shadow-[0_0_28px_rgba(139,92,246,0.45)] ring-2 ring-violet-300" : "ring-1 ring-stone-200"}`} />
      <figcaption className="mt-2 text-xs font-semibold leading-5 text-stone-800">{label}</figcaption>
    </figure>
  );
}
