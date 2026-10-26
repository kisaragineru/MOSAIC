import Link from "next/link";
import { saveSelfTypesAction } from "@/app/actions/tuvi";
import type { Dict } from "@/lib/i18n/messages/en";
import { PickLimit } from "./pick-limit";
import { TypeImage, TypeName, TypePortraits, type TypeView } from "./tuvi-type";

/**
 * The type when the chart can't say (no birth time): MOSAIC's judgment once the answers are enough,
 * otherwise how far along it is and what helps — answering, or adding the time. The person can pick
 * up to two types that feel like them; that stays labelled as their own pick.
 */
export function TypeStatus({
  t,
  all,
  judged,
  progress,
  picked,
  addTimeHref,
  back,
  guide = false,
  error,
}: {
  t: Dict;
  /** All fourteen types (for picking). */
  all: TypeView[];
  /** MOSAIC's judgment from the answers (empty until settled). */
  judged: TypeView[];
  progress: number;
  picked: string[];
  addTimeHref: string;
  /** Where the pick form returns to. */
  back: string;
  /** In the welcome guide: little is known yet, so the pick comes first. */
  guide?: boolean;
  /** An error code from the last pick (e.g. too many). */
  error?: string;
}) {
  const s = t.tuvi.type;
  const mine = all.filter((x) => picked.includes(x.id));
  return (
    <div className="space-y-3" data-testid="type-status">
      {judged.length > 0 ? (
        <>
          <p className="text-xs font-bold tracking-wide text-violet-700">✨ {s.judgedEyebrow}</p>
          <p className="text-xl font-black leading-snug text-stone-900">{judged.map((x) => x.persona).join(" × ")}</p>
          <TypePortraits types={judged} />
          <p className="text-xs leading-5 text-stone-600">{s.judgedNote}</p>
        </>
      ) : (
        <>
          <p className="font-bold text-stone-900">🔒 {s.unknownTitle}</p>
          <p className="text-xs leading-5 text-stone-600">{guide ? s.unknownGuide : s.unknownLead}</p>
          {!guide && (
            <div data-testid="type-progress">
              <p className="text-[11px] text-stone-500">{s.progressUntil}</p>
              <p className="text-sm font-bold text-violet-900">{s.progress(progress)}</p>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-violet-100" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                <div className={`h-full rounded-full bg-violet-600 ${PROGRESS_W[Math.floor(progress / 10)] ?? "w-0"}`} />
              </div>
            </div>
          )}
          {!guide && (
            <div className="flex flex-wrap gap-2">
              <Link href="/discover" className="rounded-full bg-violet-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-800">{s.answer} →</Link>
            </div>
          )}
        </>
      )}

      {mine.length > 0 && judged.length === 0 && (
        <div className="rounded-2xl bg-white/70 p-3 ring-1 ring-violet-100" data-testid="self-types">
          <p className="text-xs font-semibold text-stone-700">{s.pickedTitle}</p>
          <ul className="mt-2 flex gap-2">
            {mine.map((x) => (
              <li key={x.id} className="flex items-center gap-2">
                <span className="w-10 overflow-hidden rounded-lg ring-1 ring-stone-200"><TypeImage t={x} small /></span>
                <span className="text-xs font-bold leading-tight text-stone-900"><TypeName t={x} /></span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] leading-4 text-stone-500">{s.pickedNote}</p>
        </div>
      )}

      {judged.length === 0 && (
        <details open={(guide && mine.length === 0) || !!error} className="group rounded-2xl bg-white/70 ring-1 ring-violet-100">
          <summary className="cursor-pointer list-none px-3 py-2.5 text-sm font-semibold text-violet-900">
            {mine.length ? s.pickAgain : s.pickTitle} <span aria-hidden className="text-violet-400 group-open:hidden">▾</span>
          </summary>
          <form action={saveSelfTypesAction} className="space-y-3 px-3 pb-3">
            <input type="hidden" name="back" value={back} />
            <p className="text-xs leading-5 text-stone-600">{s.pickLead}</p>
            {error === "too_many_types" && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">{t.errors.too_many_types}</p>}
            <PickLimit max={2} note={t.errors.too_many_types}>
            <ul className="grid grid-cols-3 gap-2">
              {all.map((x) => (
                <li key={x.id}>
                  <label className="relative block cursor-pointer">
                    <input type="checkbox" name="type" value={x.id} defaultChecked={picked.includes(x.id)} className="peer sr-only" />
                    <span className="relative block overflow-hidden rounded-xl bg-white ring-1 ring-stone-200 transition peer-checked:ring-2 peer-checked:ring-violet-600 peer-focus-visible:ring-2 peer-focus-visible:ring-teal-600">
                      <TypeImage t={x} small />
                      <span className="block px-1 py-1 text-center text-[10px] font-bold leading-tight text-stone-900"><TypeName t={x} /></span>
                    </span>
                    <span aria-hidden className="pointer-events-none absolute left-1.5 top-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-[11px] font-black text-white shadow peer-checked:flex">✓</span>
                  </label>
                </li>
              ))}
            </ul>
            </PickLimit>
            <button type="submit" className="rounded-full bg-violet-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-800">{s.pickSave}</button>
          </form>
        </details>
      )}

      <p className="text-xs leading-5 text-stone-600">
        {s.timeExact}{" "}
        <Link href={addTimeHref} className="font-semibold text-teal-700 underline underline-offset-4">{t.welcome.typesAddTime} →</Link>
      </p>
    </div>
  );
}

// Literal width classes for the progress bar (Tailwind only generates classes it can see).
const PROGRESS_W = ["w-0", "w-[10%]", "w-[20%]", "w-[30%]", "w-[40%]", "w-[50%]", "w-[60%]", "w-[70%]", "w-[80%]", "w-[90%]", "w-full"];
