"use client";
import { useEffect, useRef, useState } from "react";
import { BRANCHES } from "@/lib/tuvi/canchi";
import type { Chart } from "@/lib/tuvi/engine";
import type { PalaceDetail } from "@/lib/tuvi/interpret";
import type { HoaId } from "@/lib/tuvi/stars";

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
  loc: "bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-300",
  quyen: "bg-rose-100 text-rose-800 ring-1 ring-inset ring-rose-300",
  khoa: "bg-sky-100 text-sky-800 ring-1 ring-inset ring-sky-300",
  ky: "bg-stone-200 text-stone-800 ring-1 ring-inset ring-stone-400",
};
// Floating cards stay anchored at their palace and grow toward the middle of the board,
// so the four cards of a palace and its related palaces never cover each other.
const ANCHOR: Record<number, string> = {
  5: "left-0 top-0 origin-top-left", 6: "left-[25%] top-0 origin-top-left",
  7: "right-[25%] top-0 origin-top-right", 8: "right-0 top-0 origin-top-right",
  4: "left-0 top-[25%] origin-top-left", 9: "right-0 top-[25%] origin-top-right",
  3: "left-0 bottom-[25%] origin-bottom-left", 10: "right-0 bottom-[25%] origin-bottom-right",
  2: "left-0 bottom-0 origin-bottom-left", 1: "left-[25%] bottom-0 origin-bottom-left",
  0: "right-[25%] bottom-0 origin-bottom-right", 11: "right-0 bottom-0 origin-bottom-right",
};
/** Centre of each floating card in a 0–100 box (card: 35% wide, 32% tall). */
const FLOAT_CENTER: Record<number, [number, number]> = Object.fromEntries(
  Object.entries(POS).map(([b, [c, r]]) => [Number(b), [c < 2 ? c * 25 + 17.5 : 100 - (3 - c) * 25 - 17.5, r < 2 ? r * 25 + 16 : 100 - (3 - r) * 25 - 16]]),
);
// Two related palaces can sit on either side of a corner (e.g. Mão and Sửu around Dần); their cards
// then share a small corner. The card whose text-bearing left side is in that corner goes on top.
const FLOAT_Z: Record<number, string> = { 6: "z-20", 1: "z-20", 9: "z-20", 10: "z-20" };
const FLOAT_DELAY = ["[animation-delay:0ms]", "[animation-delay:160ms]", "[animation-delay:320ms]", "[animation-delay:480ms]"];

export interface ChartLabels {
  help: string;
  menh: string;
  than: string;
  now: string;
  ageNow: string;
  related: string;
  noMain: string;
  borrow: string;
  main: string;
  lucky: string;
  malefic: string;
  none: string;
  age: string;
  relatedTitle: string;
  /** Contains "{x}" for the selected palace's name. */
  focusTitle: string;
  self: string;
  trine: string;
  opposite: string;
  close: string;
  tapForDetails: string;
  hoa: Record<HoaId, string>;
}

export interface ChartCenter {
  pillar: string;
  lines: string[];
  hoa: { kind: HoaId; plain: string; star: string }[];
}

/** One palace in everyday words (prepared on the server in the reader's language). */
export interface ChartCell {
  /** Short, for the cell. */
  plain: string;
  /** Fuller, for the panel. */
  long: string;
  trad: string;
  tradShort: string;
  stars: { word: string; name: string; hoa: HoaId | null }[];
  lucky: string[];
  malefic: string[];
  hoaTips: string[];
}

type Detail = PalaceDetail & { borrowedText: string | null; ageText: string | null };

const MARK = "w-fit rounded-md px-1.5 py-px text-[10px] font-bold";

/**
 * The chart, kept simple: each area of life in everyday words with its lead stars as kinds of
 * person, and only "self" and "this decade" marked. Tapping a palace lifts it and the palaces
 * read with it out of the board, and opens everything about it in a readable panel below.
 */
export function TuviChart({
  chart,
  details,
  cells,
  center,
  labels,
  currentAge,
}: {
  chart: Chart;
  details: Detail[];
  cells: ChartCell[];
  center: ChartCenter;
  labels: ChartLabels;
  currentAge: number | null;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  // The panel below shows a palace: the tapped one, else the self palace.
  const [shown, setShown] = useState<number | null>(chart.menh);
  const panel = useRef<HTMLElement>(null);
  const pick = (b: number | null) => {
    setSelected(b);
    if (b !== null) setShown(b);
  };
  const openPanel = () => {
    setSelected(null);
    panel.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  useEffect(() => {
    if (selected === null) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSelected(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);
  const sel = selected === null ? null : details.find((d) => d.branch === selected) ?? null;
  const related = new Set(sel?.related ?? []);
  const floatTrine = sel && sel.related.length === 3 ? [sel.branch, sel.related[0]!, sel.related[1]!] : null;
  const floatOpp = sel && sel.related.length === 3 ? sel.related[2]! : null;
  const isNow = (b: number) => {
    const p = chart.palaces[b]!;
    return currentAge !== null && !!p.daiHan && currentAge >= p.daiHan.from && currentAge <= p.daiHan.to;
  };
  const d = shown === null ? null : details.find((x) => x.branch === shown) ?? null;
  const cell = shown === null ? null : cells[shown]!;

  return (
    <div className="space-y-3">
      <p className="text-xs leading-5 text-stone-600">{labels.help}</p>

      <div className="relative">
        <div className="grid grid-cols-4 grid-rows-4 gap-px overflow-hidden rounded-3xl border border-stone-200 bg-stone-200/80 shadow-[0_8px_30px_-16px_rgba(91,70,160,0.35)]" data-testid="tuvi-chart">
          {chart.palaces.map((p) => {
            const [c, r] = POS[p.branch]!;
            const isMenh = chart.menh === p.branch;
            const now = isNow(p.branch);
            const isSel = selected === p.branch || (selected === null && shown === p.branch);
            const isRel = related.has(p.branch);
            const x = cells[p.branch]!;
            return (
              <button
                type="button"
                key={p.branch}
                onClick={() => pick(selected === p.branch ? null : p.branch)}
                aria-pressed={selected === p.branch}
                aria-label={`${x.plain} ${x.trad}`}
                className={`${COL[c]} ${ROW[r]} relative flex min-h-28 min-w-0 flex-col gap-0.5 overflow-hidden p-1.5 text-left leading-tight transition-colors duration-150 motion-reduce:transition-none ${
                  isMenh ? "bg-teal-50/70 shadow-[inset_0_0_0_2px_rgb(20_184_166)]" : now ? "bg-amber-50 shadow-[inset_0_0_0_2px_rgb(245_158_11)]" : isRel ? "bg-violet-50" : "bg-white hover:bg-stone-50"
                } ${isSel && !isMenh && !now ? "bg-teal-50" : ""}`}
              >
                <span className="block truncate text-[13.5px] font-extrabold text-stone-900">{x.plain}</span>
                <span className="block truncate text-[10px] text-stone-500">{x.tradShort}</span>
                {isMenh && <span className={`${MARK} bg-teal-100 text-teal-800`}>{labels.menh}</span>}
                {now && <span className={`${MARK} bg-amber-200 text-amber-900`}>{labels.now}</span>}
                {p.isThan && !isMenh && <span className={`${MARK} bg-violet-100 text-violet-800`}>{labels.than}</span>}
                {x.stars.length === 0 ? (
                  <span className="text-[11px] text-stone-400">{labels.noMain}</span>
                ) : (
                  x.stars.map((st) => <span key={st.name} className="block truncate text-[12.5px] font-bold text-stone-800">{st.word}</span>)
                )}
              </button>
            );
          })}
          <div className="col-span-2 col-start-2 row-span-2 row-start-2 flex flex-col items-center justify-center gap-1 bg-linear-to-br from-teal-50 via-white to-violet-100 p-2 text-center text-teal-950">
            <span className="mosaic-mark h-6 w-6 rounded-md opacity-90" aria-hidden />
            <p className="text-[15px] font-bold leading-snug">{center.pillar}</p>
            {center.lines.map((line) => <p key={line} className="text-[11.5px] leading-snug text-slate-700">{line}</p>)}
          </div>
        </div>
        {sel && (
          // Floating view: the tapped palace and its tam phương tứ chính lift out of the board in place.
          <div key={sel.branch} role="dialog" aria-label={labels.focusTitle.replace("{x}", sel.label)} className="absolute inset-0 z-30">
            <button
              type="button"
              tabIndex={-1}
              aria-hidden
              onClick={() => pick(null)}
              className="absolute inset-0 animate-[fadeIn_.5s_ease-out] cursor-default rounded-3xl bg-white/45 motion-reduce:animate-none"
            />
            {floatTrine && floatOpp !== null && (
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
                <polygon
                  points={floatTrine.map((b) => FLOAT_CENTER[b]!.join(",")).join(" ")}
                  pathLength={1}
                  fill="rgb(167 139 250 / 0.10)"
                  stroke="rgb(139 92 246 / 0.7)"
                  strokeWidth="2"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  className="animate-[draw_1.2s_ease-out_.4s_both] [stroke-dasharray:1] motion-reduce:animate-none"
                />
                <line
                  x1={FLOAT_CENTER[sel.branch]![0]}
                  y1={FLOAT_CENTER[sel.branch]![1]}
                  x2={FLOAT_CENTER[floatOpp]![0]}
                  y2={FLOAT_CENTER[floatOpp]![1]}
                  stroke="rgb(139 92 246 / 0.7)"
                  strokeWidth="2"
                  strokeDasharray="6 5"
                  vectorEffect="non-scaling-stroke"
                  className="animate-[fadeIn_.7s_ease-out_.9s_both] motion-reduce:animate-none"
                />
              </svg>
            )}
            {[sel.branch, ...sel.related].map((b, i) => {
              const d = details.find((x) => x.branch === b);
              const cell = cells[b]!;
              if (!d) return null;
              const self = i === 0;
              return (
                <button
                  key={b}
                  type="button"
                  onClick={() => (self ? openPanel() : pick(b))}
                  className={`${ANCHOR[b]} ${FLOAT_DELAY[i]} ${FLOAT_Z[b] ?? "z-10"} absolute flex h-[32%] w-[35%] animate-[floatIn_.8s_cubic-bezier(.2,.8,.2,1)_both] flex-col overflow-hidden rounded-3xl border p-2.5 text-left transition-transform hover:-translate-y-0.5 motion-reduce:animate-none ${
                    self
                      ? "border-teal-200 bg-linear-to-br from-teal-50 via-white to-teal-100 shadow-[0_18px_40px_-16px_rgba(15,118,110,0.55)]"
                      : "border-violet-100 bg-linear-to-br from-white to-violet-50 shadow-[0_16px_36px_-18px_rgba(91,70,160,0.55)]"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-1">
                    <span className={`shrink-0 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-bold ${self ? "bg-teal-100 text-teal-800" : "bg-violet-100 text-violet-800"}`}>
                      {self ? labels.self : i < 3 ? labels.trine : labels.opposite}
                    </span>
                    
                  </span>
                  <span className="mt-1 block text-[14px] font-bold leading-tight text-stone-900">{cell.plain}</span>
                  <span className="block truncate text-[10px] text-stone-500">{cell.trad}</span>
                  <span className="mt-1 block space-y-0.5">
                    {cell.stars.length === 0 && <span className="block text-[11px] text-stone-400">{labels.noMain}</span>}
                    {cell.stars.map((st) => (
                      <span key={st.name} className="block text-[13px] font-bold leading-tight text-stone-800">{st.word}</span>
                    ))}
                  </span>
                  {d.role && <span className="mt-1 line-clamp-2 block text-[10.5px] leading-snug text-stone-600">{d.role}</span>}
                  {self && <span className="mt-auto block pt-1 text-[10px] font-semibold text-teal-700">{labels.tapForDetails} →</span>}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => pick(null)}
              aria-label={labels.close}
              className="absolute left-1/2 top-1/2 z-30 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 animate-[fadeIn_.5s_ease-out_.5s_both] items-center justify-center rounded-full bg-white text-xl leading-none text-stone-600 shadow-md ring-1 ring-stone-200 hover:text-stone-900 motion-reduce:animate-none"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {d && cell && (
        <section ref={panel} aria-live="polite" data-testid="palace-panel" className={`scroll-mt-20 rounded-3xl bg-white p-4 shadow-sm ring-2 ${chart.menh === d.branch ? "ring-teal-400" : isNow(d.branch) ? "ring-amber-400" : "ring-stone-200"}`}>
          <h3 className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-lg font-extrabold text-stone-900">{cell.long}</span>
            <span className="text-xs text-stone-500">{cell.trad}</span>
            {chart.menh === d.branch && <span className={`${MARK} bg-teal-100 text-teal-800`}>{labels.menh}</span>}
            {isNow(d.branch) && <span className={`${MARK} bg-amber-200 text-amber-900`}>{labels.now}</span>}
          </h3>
          {d.role && <p className="mt-1 text-sm leading-6 text-stone-700">{d.role}</p>}
          <dl className="mt-3 space-y-2 text-[14px] leading-6">
            <div className="flex gap-3">
              <dt className="w-24 shrink-0 pt-0.5 text-xs font-semibold text-stone-500">{labels.main}</dt>
              <dd className="min-w-0 flex-1">
                {cell.stars.length === 0 && <span className="text-stone-600">{labels.borrow}</span>}
                {d.mains.map((m, i) => (
                  <span key={m.name} className="block">
                    <b className="text-stone-900">{cell.stars[i]?.word ?? m.name}</b>
                    <span className="text-stone-500">（{cell.stars[i]?.name ?? m.name}）</span>
                    {cell.stars[i]?.hoa && <span className={`ml-1 rounded-md px-1.5 text-[11px] font-semibold ${HOA_CHIP[cell.stars[i]!.hoa!]}`}>{labels.hoa[cell.stars[i]!.hoa!]}</span>}
                    {m.keywords && <span className="block text-[13px] leading-5 text-stone-600">{m.keywords}</span>}
                  </span>
                ))}
              </dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-24 shrink-0 pt-0.5 text-xs font-semibold text-stone-500">{labels.lucky}</dt>
              <dd className="min-w-0 flex-1 text-stone-800">{cell.lucky.length ? cell.lucky.join("・") : labels.none}</dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-24 shrink-0 pt-0.5 text-xs font-semibold text-stone-500">{labels.malefic}</dt>
              <dd className="min-w-0 flex-1 text-stone-800">{cell.malefic.length ? cell.malefic.join("・") : labels.none}</dd>
            </div>
            {d.ageText && (
              <div className="flex gap-3">
                <dt className="w-24 shrink-0 pt-0.5 text-xs font-semibold text-stone-500">{labels.age}</dt>
                <dd className="min-w-0 flex-1 text-stone-800">{d.ageText}{isNow(d.branch) && <span className="ml-1 font-semibold text-amber-800">（{labels.ageNow}）</span>}</dd>
              </div>
            )}
          </dl>
          {d.notes.length > 0 && (
            <ul className="mt-3 space-y-1 rounded-2xl bg-stone-50 px-3 py-2 text-[13.5px] leading-6 text-stone-700">
              {d.notes.map((n, i) => <li key={i}>・{n}</li>)}
            </ul>
          )}
          {cell.hoaTips.map((tip) => <p key={tip} className="mt-2 rounded-2xl bg-stone-900 px-3 py-2 text-[13px] leading-6 text-white">💡 {tip}</p>)}
          {d.related.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 text-xs font-semibold text-stone-500">{labels.relatedTitle}</p>
              <div className="flex flex-wrap gap-1.5">
                {d.related.map((b) => (
                  <button key={b} type="button" onClick={() => setShown(b)} className="rounded-full bg-violet-50 px-3 py-1 text-sm font-semibold text-violet-900 ring-1 ring-violet-200 hover:bg-violet-100">
                    {cells[b]!.plain}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
