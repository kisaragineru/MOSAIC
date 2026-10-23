"use client";
import { useState } from "react";
import { BRANCHES, STEMS } from "@/lib/tuvi/canchi";
import type { Chart } from "@/lib/tuvi/engine";
import type { PalaceDetail } from "@/lib/tuvi/interpret";
import { PALACE_INFO, STAR_INFO, type HoaId } from "@/lib/tuvi/stars";

// Traditional layout: Tỵ Ngọ Mùi Thân across the top, Dần Sửu Tý Hợi across the bottom.
// [column, row] of each earthly branch on the 4×4 board.
const POS: Record<number, [number, number]> = {
  5: [0, 0], 6: [1, 0], 7: [2, 0], 8: [3, 0],
  4: [0, 1], 9: [3, 1],
  3: [0, 2], 10: [3, 2],
  2: [0, 3], 1: [1, 3], 0: [2, 3], 11: [3, 3],
};
const COL = ["col-start-1", "col-start-2", "col-start-3", "col-start-4"];
const ROW = ["row-start-1", "row-start-2", "row-start-3", "row-start-4"];

const HOA_SHORT: Record<HoaId, string> = { loc: "Lộc", quyen: "Quyền", khoa: "Khoa", ky: "Kỵ" };
// Conventional colours of the four transformations on Vietnamese charts: Lộc green, Quyền red, Khoa blue, Kỵ black.
const HOA_CHIP: Record<HoaId, string> = {
  loc: "bg-emerald-600 text-white",
  quyen: "bg-rose-600 text-white",
  khoa: "bg-sky-600 text-white",
  ky: "bg-stone-800 text-white",
};
const GROUP_TEXT = { lucky: "text-teal-700", malefic: "text-red-700", other: "text-stone-600", main: "text-rose-800" } as const;

export interface ChartLabels {
  help: string;
  palaceRole: string;
  mainStars: string;
  auxStars: string;
  decade: string;
  simple: string;
  detailed: string;
  menh: string;
  than: string;
  menhName: string;
  thanName: string;
  now: string;
  related: string;
  lucky: string;
  malefic: string;
  noMain: string;
}

export interface ChartCenter {
  pillar: string;
  lines: string[];
  hoa: { kind: HoaId; star: string }[];
}

type Detail = PalaceDetail & { borrowedText: string | null; ageText: string | null };

export function TuviChart({
  chart,
  details,
  center,
  localNames,
  labels,
  currentAge,
}: {
  chart: Chart;
  details: Detail[];
  center: ChartCenter;
  /** Palace name in the reader's language, by branch (null when not needed, e.g. Vietnamese). */
  localNames: (string | null)[];
  labels: ChartLabels;
  currentAge: number | null;
}) {
  const [selected, setSelected] = useState<number | null>(chart.menh);
  const [detailed, setDetailed] = useState(false);
  const sel = selected === null ? null : details.find((d) => d.branch === selected) ?? null;
  const related = new Set(sel?.related ?? []);
  const trine = sel && sel.related.length === 3 ? [sel.branch, sel.related[0]!, sel.related[1]!] : null;
  const opposite = sel && sel.related.length === 3 ? sel.related[2]! : null;
  const center4 = (b: number) => `${POS[b]![0] + 0.5},${POS[b]![1] + 0.5}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 flex-1 text-xs text-stone-500">{labels.help}</p>
        <div role="group" className="flex rounded-full bg-stone-200/70 p-0.5 text-xs">
          {[false, true].map((d) => (
            <button
              key={String(d)}
              type="button"
              aria-pressed={detailed === d}
              onClick={() => setDetailed(d)}
              className={`rounded-full px-3 py-1 transition-all ${detailed === d ? "bg-white font-semibold text-teal-800 shadow-sm" : "text-stone-600"}`}
            >
              {d ? labels.detailed : labels.simple}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <div
          className="grid grid-cols-4 grid-rows-4 gap-px overflow-hidden rounded-2xl border border-stone-300 bg-stone-300 shadow-sm"
          data-testid="tuvi-chart"
        >
          {chart.palaces.map((p) => {
            const [c, r] = POS[p.branch]!;
            const isMenh = chart.menh === p.branch;
            const now = currentAge !== null && !!p.daiHan && currentAge >= p.daiHan.from && currentAge <= p.daiHan.to;
            const isSel = selected === p.branch;
            const isRel = related.has(p.branch);
            const lucky = p.auxStars.filter((s) => STAR_INFO[s.id].group === "lucky").length;
            const malefic = p.auxStars.filter((s) => STAR_INFO[s.id].group === "malefic").length;
            const name = p.palace ? PALACE_INFO[p.palace].vi : "—";
            return (
              <button
                type="button"
                key={p.branch}
                onClick={() => setSelected(isSel ? null : p.branch)}
                aria-pressed={isSel}
                aria-label={`${name}${localNames[p.branch] ? ` ${localNames[p.branch]}` : ""} ${BRANCHES[p.branch]}`}
                className={`${COL[c]} ${ROW[r]} relative flex min-h-32 flex-col p-1.5 text-left leading-tight transition-colors duration-150 motion-reduce:transition-none ${
                  isSel ? "z-10 bg-teal-50 ring-2 ring-inset ring-teal-600" : isRel ? "bg-violet-50" : "bg-white hover:bg-stone-50"
                }`}
              >
                {now && <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-amber-400" />}
                <span className="flex items-start justify-between gap-0.5">
                  <span className="min-w-0">
                    <span className="block text-[11px] font-bold text-stone-900">{name}</span>
                    {localNames[p.branch] && <span className="block text-[9px] text-stone-500">{localNames[p.branch]}</span>}
                  </span>
                  <span className="shrink-0 text-right text-[9px] text-stone-400">
                    {p.stem !== null && <span className="block">{STEMS[p.stem]}</span>}
                    <span className="block">{BRANCHES[p.branch]}</span>
                  </span>
                </span>
                {(isMenh || p.isThan) && (
                  <span className="mt-0.5 flex gap-0.5">
                    {isMenh && <span className="rounded bg-teal-700 px-1 text-[9px] font-bold text-white">{labels.menh}</span>}
                    {p.isThan && <span className="rounded bg-violet-700 px-1 text-[9px] font-bold text-white">{labels.than}</span>}
                  </span>
                )}
                <span className="mt-1 block space-y-0.5">
                  {p.mainStars.length === 0 && <span className="block text-[10px] italic text-stone-400">{labels.noMain}</span>}
                  {p.mainStars.map((s) => (
                    <span key={s.id} className="flex flex-wrap items-center gap-0.5">
                      <span className="whitespace-nowrap text-[12px] font-bold text-rose-800">{STAR_INFO[s.id].vi}</span>
                      {s.hoa && <span className={`rounded px-0.5 text-[9px] font-semibold ${HOA_CHIP[s.hoa]}`}>{HOA_SHORT[s.hoa]}</span>}
                    </span>
                  ))}
                </span>
                {detailed ? (
                  <span className="mt-1 block text-[10px]">
                    {p.auxStars.map((s, i) => (
                      <span key={s.id} className={GROUP_TEXT[STAR_INFO[s.id].group]}>
                        {i > 0 && <span className="text-stone-300">, </span>}
                        {STAR_INFO[s.id].vi}
                        {s.hoa && <span className={`ml-0.5 rounded px-0.5 text-[9px] font-semibold ${HOA_CHIP[s.hoa]}`}>{HOA_SHORT[s.hoa]}</span>}
                      </span>
                    ))}
                    <span className="mt-0.5 block text-[9px] text-stone-400">{[p.trangSinh, p.bacSi, p.thaiTue].filter(Boolean).join(" · ")}</span>
                  </span>
                ) : (
                  <span className="mt-1 flex flex-wrap items-center gap-x-1 text-[9px]" aria-hidden>
                    {p.auxStars.filter((s) => s.hoa).map((s) => (
                      <span key={s.id} className={`rounded px-0.5 font-semibold ${HOA_CHIP[s.hoa!]}`}>{HOA_SHORT[s.hoa!]}</span>
                    ))}
                    {lucky > 0 && <span className="tracking-tighter text-teal-600">{"●".repeat(Math.min(lucky, 6))}</span>}
                    {malefic > 0 && <span className="tracking-tighter text-red-600">{"●".repeat(Math.min(malefic, 6))}</span>}
                  </span>
                )}
                <span className="mt-auto flex flex-wrap items-center gap-1 pt-1">
                  {p.daiHan && <span className={`text-[10px] font-bold ${now ? "text-amber-700" : "text-stone-400"}`}>{p.daiHan.from}–{p.daiHan.to}</span>}
                  {now && <span className="rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white">{labels.now}</span>}
                  {chart.tuan.includes(p.branch) && <span className="rounded bg-stone-200 px-0.5 text-[9px] font-semibold text-stone-700">Tuần</span>}
                  {chart.triet.includes(p.branch) && <span className="rounded bg-stone-200 px-0.5 text-[9px] font-semibold text-stone-700">Triệt</span>}
                </span>
              </button>
            );
          })}
          <div className="col-span-2 col-start-2 row-span-2 row-start-2 flex flex-col items-center justify-center gap-1 bg-linear-to-br from-teal-900 via-teal-800 to-violet-900 p-2 text-center text-white">
            <span className="mosaic-mark h-6 w-6 rounded-md opacity-90" aria-hidden />
            <p className="text-base font-bold tracking-wide">{center.pillar}</p>
            {center.lines.map((line) => <p key={line} className="text-[10px] leading-snug text-teal-50">{line}</p>)}
            <div className="mt-1 flex flex-wrap justify-center gap-1">
              {center.hoa.map((h) => (
                <span key={h.kind} className={`rounded px-1 text-[9px] font-semibold ${HOA_CHIP[h.kind]}`}>{HOA_SHORT[h.kind]} · {h.star}</span>
              ))}
            </div>
          </div>
        </div>
        {trine && opposite !== null && (
          // Tam phương tứ chính of the selected palace: the trine triangle and the line to the opposite palace.
          <svg viewBox="0 0 4 4" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 z-20 h-full w-full" aria-hidden>
            <polygon points={trine.map(center4).join(" ")} fill="rgb(139 92 246 / 0.06)" stroke="rgb(124 58 237 / 0.5)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
            <line
              x1={POS[sel!.branch]![0] + 0.5}
              y1={POS[sel!.branch]![1] + 0.5}
              x2={POS[opposite]![0] + 0.5}
              y2={POS[opposite]![1] + 0.5}
              stroke="rgb(124 58 237 / 0.5)"
              strokeWidth="1.5"
              strokeDasharray="5 4"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        )}
      </div>

      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-stone-600">
        <li className="flex items-center gap-1"><span className="rounded bg-teal-700 px-1 text-[9px] font-bold text-white">{labels.menh}</span>{labels.menhName}</li>
        <li className="flex items-center gap-1"><span className="rounded bg-violet-700 px-1 text-[9px] font-bold text-white">{labels.than}</span>{labels.thanName}</li>
        <li className="flex items-center gap-1"><span className="h-1.5 w-4 rounded bg-amber-400" />{labels.now}</li>
        <li className="flex items-center gap-1"><span className="h-3 w-4 rounded border border-violet-500 bg-violet-50" />{labels.related}</li>
        <li className="flex items-center gap-1"><span className="text-teal-600">●</span>{labels.lucky}</li>
        <li className="flex items-center gap-1"><span className="text-red-600">●</span>{labels.malefic}</li>
        {(Object.keys(HOA_SHORT) as HoaId[]).map((h) => (
          <li key={h} className="flex items-center"><span className={`rounded px-1 text-[9px] font-semibold ${HOA_CHIP[h]}`}>Hóa {HOA_SHORT[h]}</span></li>
        ))}
      </ul>

      {sel && (
        <div key={sel.branch} className="animate-[fadeUp_.2s_ease-out] rounded-xl border border-teal-200 bg-teal-50/60 p-3 text-sm motion-reduce:animate-none" aria-live="polite">
          <p className="font-semibold text-stone-900">{sel.label}</p>
          {sel.role && (
            <p className="mt-1 text-stone-700"><span className="block text-xs text-stone-500">{labels.palaceRole}</span>{sel.role}</p>
          )}
          {sel.borrowedText && <p className="mt-2 text-xs text-stone-600">{sel.borrowedText}</p>}
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
