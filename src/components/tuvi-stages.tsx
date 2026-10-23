"use client";
import { useEffect, useRef, useState } from "react";
import type { LifeStage } from "@/lib/tuvi/interpret";

export function TuviStages({
  stages,
  labels,
}: {
  stages: (LifeStage & { ageText: string })[];
  labels: { help: string; state: Record<LifeStage["state"], string> };
}) {
  const start = Math.max(0, stages.findIndex((s) => s.state === "current"));
  const [selected, setSelected] = useState(start);
  const rail = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    // Bring the current stage into view once, without moving the page itself.
    const el = cards.current[start];
    const box = rail.current;
    if (el && box) box.scrollLeft = el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2;
  }, [start]);

  const s = stages[selected];
  if (!s) return null;
  return (
    <div className="space-y-3">
      <p className="text-xs text-stone-500">{labels.help}</p>
      <div ref={rail} className="scrollbar-none -mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2">
        {stages.map((x, i) => {
          const active = i === selected;
          const tone =
            x.state === "current"
              ? "border-amber-200 bg-linear-to-br from-amber-50 to-orange-50"
              : x.state === "past"
                ? "border-stone-200 bg-stone-50 text-stone-500"
                : "border-stone-200 bg-white";
          return (
            <button
              key={x.branch}
              ref={(el) => { cards.current[i] = el; }}
              type="button"
              onClick={() => setSelected(i)}
              aria-pressed={active}
              className={`relative w-32 shrink-0 snap-center rounded-2xl border p-2.5 text-left transition-all motion-reduce:transition-none ${tone} ${active ? "-translate-y-0.5 ring-2 ring-teal-300 shadow-md" : "hover:-translate-y-0.5"}`}
            >
              <span className="block text-[11px] font-semibold text-amber-800">{x.ageText}</span>
              <span className="mt-0.5 block line-clamp-2 text-xs font-semibold text-stone-900">{x.label}</span>
              <span className="mt-0.5 block truncate text-[11px] text-rose-800">{x.stars.join("・") || "—"}</span>
              {labels.state[x.state] && (
                <span className={`mt-1 inline-block rounded-full px-1.5 text-[10px] ${x.state === "current" ? "bg-amber-100 font-bold text-amber-800" : "bg-stone-100 text-stone-600"}`}>{labels.state[x.state]}</span>
              )}
            </button>
          );
        })}
      </div>
      <div key={s.branch} className="animate-[fadeUp_.2s_ease-out] rounded-3xl border border-stone-200/80 bg-white/80 p-4 text-sm motion-reduce:animate-none">
        <p className="text-xs font-semibold text-amber-800">{s.ageText}</p>
        <p className="mt-0.5 font-semibold text-stone-900">{s.label}</p>
        {s.theme && <p className="mt-2 leading-relaxed text-stone-800">{s.theme}</p>}
        {s.stars.length > 0 && (
          <ul className="mt-2 space-y-0.5">
            {s.stars.map((name, i) => (
              <li key={name}><span className="font-semibold text-rose-800">{name}</span><span className="text-stone-600"> — {s.keywords[i]}</span></li>
            ))}
          </ul>
        )}
        {s.hoa.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {s.hoa.map((h) => <span key={h} className="rounded bg-violet-100 px-1.5 py-0.5 text-[11px] text-violet-800">{h}</span>)}
          </div>
        )}
      </div>
    </div>
  );
}
