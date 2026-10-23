"use client";
import { useState } from "react";
import { BRANCHES, STEMS } from "@/lib/tuvi/canchi";
import type { Chart } from "@/lib/tuvi/engine";
import type { PalaceDetail } from "@/lib/tuvi/interpret";
import { PALACE_INFO, STAR_INFO } from "@/lib/tuvi/stars";

// Traditional layout: Tỵ Ngọ Mùi Thân across the top, Dần Sửu Tý Hợi across the bottom.
const CELL: Record<number, string> = {
  5: "col-start-1 row-start-1", 6: "col-start-2 row-start-1", 7: "col-start-3 row-start-1", 8: "col-start-4 row-start-1",
  4: "col-start-1 row-start-2", 9: "col-start-4 row-start-2",
  3: "col-start-1 row-start-3", 10: "col-start-4 row-start-3",
  2: "col-start-1 row-start-4", 1: "col-start-2 row-start-4", 0: "col-start-3 row-start-4", 11: "col-start-4 row-start-4",
};
const HOA_SHORT = { loc: "Lộc", quyen: "Quyền", khoa: "Khoa", ky: "Kỵ" } as const;

export interface ChartLabels {
  help: string;
  palaceRole: string;
  mainStars: string;
  auxStars: string;
  decade: string;
}

export function TuviChart({
  chart,
  details,
  center,
  labels,
  currentAge,
}: {
  chart: Chart;
  details: (PalaceDetail & { borrowedText: string | null; ageText: string | null })[];
  center: string[];
  labels: ChartLabels;
  currentAge: number | null;
}) {
  const [selected, setSelected] = useState<number | null>(chart.menh);
  const sel = selected === null ? null : details.find((d) => d.branch === selected) ?? null;
  const related = new Set(sel?.related ?? []);
  return (
    <div className="space-y-3">
      <p className="text-xs text-stone-500">{labels.help}</p>
      <div className="grid grid-cols-4 grid-rows-4 gap-px overflow-hidden rounded-xl border border-stone-300 bg-stone-300 text-[10px] leading-tight sm:text-xs" data-testid="tuvi-chart">
        {chart.palaces.map((p) => {
          const isMenh = chart.menh === p.branch;
          const now = currentAge !== null && p.daiHan && currentAge >= p.daiHan.from && currentAge <= p.daiHan.to;
          const isSel = selected === p.branch;
          const isRel = related.has(p.branch);
          return (
            <button
              type="button"
              key={p.branch}
              onClick={() => setSelected(isSel ? null : p.branch)}
              aria-pressed={isSel}
              className={`${CELL[p.branch]} relative min-h-28 p-1 text-left transition-colors duration-150 motion-reduce:transition-none ${
                isSel ? "z-10 bg-teal-50 ring-2 ring-inset ring-teal-600" : isRel ? "bg-violet-50" : now ? "bg-amber-50" : "bg-white hover:bg-stone-50"
              }`}
            >
              <div className="flex justify-between gap-1 font-semibold text-stone-800">
                <span>
                  {p.palace ? PALACE_INFO[p.palace].vi : "—"}
                  {p.isThan ? " (Thân)" : ""}
                  {isMenh && <span className="ml-0.5 text-teal-700">●</span>}
                </span>
                <span className="text-stone-500">{p.stem !== null ? `${STEMS[p.stem]} ` : ""}{BRANCHES[p.branch]}</span>
              </div>
              <ul className="mt-0.5">
                {p.mainStars.map((s) => (
                  <li key={s.id} className="font-semibold text-rose-800">
                    {STAR_INFO[s.id].vi}
                    {s.hoa && <span className="ml-0.5 rounded bg-violet-100 px-0.5 text-violet-800">{HOA_SHORT[s.hoa]}</span>}
                  </li>
                ))}
              </ul>
              <p className="mt-0.5 line-clamp-3 text-stone-600">
                {p.auxStars.map((s) => `${STAR_INFO[s.id].vi}${s.hoa ? ` (${HOA_SHORT[s.hoa]})` : ""}`).join(", ")}
              </p>
              <div className="mt-0.5 text-stone-500">
                {[p.trangSinh, p.bacSi, p.thaiTue].filter(Boolean).join(" · ")}
                {chart.tuan.includes(p.branch) && <span className="ml-1 font-semibold text-stone-700">Tuần</span>}
                {chart.triet.includes(p.branch) && <span className="ml-1 font-semibold text-stone-700">Triệt</span>}
              </div>
              {p.daiHan && <div className={`mt-0.5 font-semibold ${now ? "text-amber-700" : "text-amber-800/70"}`}>{p.daiHan.from}–{p.daiHan.to}</div>}
            </button>
          );
        })}
        <div className="col-span-2 col-start-2 row-span-2 row-start-2 flex flex-col justify-center gap-0.5 bg-stone-50 p-2 text-center">
          {center.map((line, i) => (
            <p key={i} className={i === 0 ? "text-sm font-semibold" : i === center.length - 1 ? "text-stone-500" : ""}>{line}</p>
          ))}
        </div>
      </div>
      {sel && (
        <div key={sel.branch} className="animate-[fadeUp_.2s_ease-out] rounded-xl border border-teal-200 bg-teal-50/60 p-3 text-sm motion-reduce:animate-none" aria-live="polite">
          <p className="font-semibold text-stone-900">{sel.label}</p>
          {sel.role && (
            <p className="mt-1 text-stone-700"><span className="block text-xs text-stone-500">{labels.palaceRole}</span>{sel.role}</p>
          )}
          {sel.mains.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-stone-500">{labels.mainStars}</p>
              <ul className="mt-1 space-y-1">
                {sel.mains.map((m) => (
                  <li key={m.name}>
                    <span className="font-semibold text-rose-800">{m.name}</span>
                    {m.hoa && <span className="ml-1 rounded bg-violet-100 px-1 text-xs text-violet-800">{m.hoa}</span>}
                    <span className="text-stone-700"> — {m.keywords}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {sel.borrowedText && <p className="mt-1 text-xs text-stone-600">{sel.borrowedText}</p>}
          {sel.aux.length > 0 && <p className="mt-2 text-xs text-stone-600"><span className="block text-stone-500">{labels.auxStars}</span>{sel.aux.join(", ")}</p>}
          {sel.notes.length > 0 && (
            <ul className="mt-2 list-disc space-y-0.5 pl-4 text-xs text-stone-700">
              {sel.notes.map((n, i) => <li key={i}>{n}</li>)}
            </ul>
          )}
          {sel.ageText && <p className="mt-2 text-xs text-amber-800"><span className="block text-stone-500">{labels.decade}</span><span className="font-semibold">{sel.ageText}</span></p>}
        </div>
      )}
    </div>
  );
}
