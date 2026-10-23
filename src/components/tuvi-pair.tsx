"use client";
import { useState } from "react";
import type { PairLens, PairReadings, PairStar } from "@/lib/compare/tuvi-pair";

export interface PairLabels {
  lenses: Record<PairLens, string>;
  menhPalace: string;
  prompts: string;
  menhTitle: string;
  timingTitle: string;
  noMain: string;
}

const ICON: Record<PairLens, string> = { love: "♡", friends: "∞", collaborators: "✦" };

function Stars({ items, shared, noMain }: { items: PairStar[]; shared: string[]; noMain: string }) {
  if (items.length === 0) return <p className="text-xs text-stone-500">{noMain}</p>;
  return (
    <ul className="space-y-1">
      {items.map((s) => (
        <li key={s.name} className="text-xs leading-snug">
          <span className={`mr-1 inline-block rounded-full px-2 py-0.5 font-bold ${shared.includes(s.name) ? "bg-amber-200 text-amber-900 ring-2 ring-amber-300" : "bg-white text-rose-800"}`}>{s.name}</span>
          <span className="text-stone-600">{s.keywords}</span>
        </li>
      ))}
    </ul>
  );
}

/** Two charts read together through a chosen relationship; no score, just facts side by side. */
export function TuviPair({ readings, labels }: { readings: PairReadings; labels: PairLabels }) {
  const [lens, setLens] = useState<PairLens>("love");
  const r = readings.lenses.find((x) => x.lens === lens) ?? readings.lenses[0]!;
  return (
    <div className="space-y-4">
      <div role="tablist" className="grid grid-cols-3 gap-1 rounded-full bg-stone-100 p-1">
        {readings.lenses.map((x) => (
          <button
            key={x.lens}
            type="button"
            role="tab"
            aria-selected={x.lens === lens}
            onClick={() => setLens(x.lens)}
            className={`rounded-full px-2 py-1.5 text-xs font-semibold transition-all motion-reduce:transition-none ${x.lens === lens ? "bg-white text-rose-800 shadow-sm" : "text-stone-600"}`}
          >
            <span aria-hidden>{ICON[x.lens]}</span> {labels.lenses[x.lens]}
          </button>
        ))}
      </div>
      <div key={lens} role="tabpanel" className="animate-[fadeUp_.3s_ease-out] space-y-3 motion-reduce:animate-none">
        <p className="text-sm leading-relaxed text-stone-700">{r.intro}</p>
        {r.sides.map((s) => (
          <div key={s.from} className="rounded-2xl bg-linear-to-br from-rose-50 to-violet-50 p-3">
            <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
              <div>
                <p className="mb-1 text-[11px] font-semibold text-stone-500">{s.from} · {s.palace}</p>
                <Stars items={s.lensStars} shared={s.shared} noMain={labels.noMain} />
              </div>
              <span aria-hidden className={`mt-5 text-lg ${s.shared.length ? "text-amber-500" : "text-stone-300"}`}>{s.shared.length ? "✦" : "↔"}</span>
              <div>
                <p className="mb-1 text-[11px] font-semibold text-stone-500">{s.to} · {labels.menhPalace}</p>
                <Stars items={s.menhStars} shared={s.shared} noMain={labels.noMain} />
              </div>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-stone-800">{s.text}</p>
          </div>
        ))}
        {r.prompts.length > 0 && (
          <div className="rounded-2xl border border-teal-200 bg-teal-50/60 p-3">
            <p className="mb-1 text-xs font-semibold text-teal-800">💬 {labels.prompts}</p>
            <ul className="list-disc space-y-1 pl-4 text-sm text-stone-800">{r.prompts.map((p) => <li key={p}>{p}</li>)}</ul>
          </div>
        )}
      </div>
      <div className="rounded-2xl bg-white/80 p-3 ring-1 ring-stone-200/70">
        <p className="mb-1 text-xs font-semibold text-stone-500">{labels.menhTitle}</p>
        <p className="text-sm text-stone-800">{readings.menh.text}</p>
      </div>
      {readings.timing.lines.length > 0 && (
        <div className="rounded-2xl bg-white/80 p-3 ring-1 ring-stone-200/70">
          <p className="mb-1 text-xs font-semibold text-stone-500">⏳ {labels.timingTitle}</p>
          <ul className="space-y-1 text-sm text-stone-800">{readings.timing.lines.map((x) => <li key={x}>{x}</li>)}</ul>
          {readings.timing.note && <p className="mt-1 text-sm text-teal-800">{readings.timing.note}</p>}
        </div>
      )}
    </div>
  );
}
