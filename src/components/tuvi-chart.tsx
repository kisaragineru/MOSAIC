"use client";
import { useEffect, useState } from "react";
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
  loc: "bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-300",
  quyen: "bg-rose-100 text-rose-800 ring-1 ring-inset ring-rose-300",
  khoa: "bg-sky-100 text-sky-800 ring-1 ring-inset ring-sky-300",
  ky: "bg-stone-200 text-stone-800 ring-1 ring-inset ring-stone-400",
};
// Classes rather than inline styles: the CSP blocks style attributes in server-rendered HTML.
const DELAY = ["[animation-delay:0ms]", "[animation-delay:70ms]", "[animation-delay:140ms]", "[animation-delay:210ms]"];
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
// Where the enlarged view grows from: the centre of the tapped palace on the 4×4 board.
const ORIGIN: Record<number, string> = {
  5: "origin-[12.5%_12.5%]", 6: "origin-[37.5%_12.5%]", 7: "origin-[62.5%_12.5%]", 8: "origin-[87.5%_12.5%]",
  4: "origin-[12.5%_37.5%]", 9: "origin-[87.5%_37.5%]",
  3: "origin-[12.5%_62.5%]", 10: "origin-[87.5%_62.5%]",
  2: "origin-[12.5%_87.5%]", 1: "origin-[37.5%_87.5%]", 0: "origin-[62.5%_87.5%]", 11: "origin-[87.5%_87.5%]",
};
const MENH_BADGE = "rounded-full bg-teal-100 px-1.5 text-[9px] font-bold text-teal-800";
const THAN_BADGE = "rounded-full bg-violet-100 px-1.5 text-[9px] font-bold text-violet-800";
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
  /** Contains "{x}" for the selected palace's name. */
  focusTitle: string;
  self: string;
  trine: string;
  opposite: string;
  close: string;
  back: string;
  tapForDetails: string;
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
  const [selected, setSelected] = useState<number | null>(null);
  const [detailed, setDetailed] = useState(false);
  // Floating view first; tapping the centre card opens the full details of that palace.
  const [detail, setDetail] = useState(false);
  const pick = (b: number | null) => {
    setSelected(b);
    setDetail(false);
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
          className="grid grid-cols-4 grid-rows-4 gap-px overflow-hidden rounded-3xl border border-stone-200 bg-stone-200/80 shadow-[0_8px_30px_-16px_rgba(91,70,160,0.35)]"
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
                onClick={() => pick(isSel ? null : p.branch)}
                aria-pressed={isSel}
                aria-label={`${name}${localNames[p.branch] ? ` ${localNames[p.branch]}` : ""} ${BRANCHES[p.branch]}`}
                className={`${COL[c]} ${ROW[r]} relative flex min-h-32 flex-col p-1.5 text-left leading-tight transition-colors duration-150 motion-reduce:transition-none ${
                  isSel
                    ? "z-10 bg-teal-50 ring-2 ring-inset ring-teal-400"
                    : isRel
                      ? "bg-violet-50"
                      : "bg-white hover:bg-stone-50"
                }`}
              >
                {now && <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-amber-300" />}
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
                    {isMenh && <span className={MENH_BADGE}>{labels.menh}</span>}
                    {p.isThan && <span className={THAN_BADGE}>{labels.than}</span>}
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
                  {now && <span className="rounded-full bg-amber-100 px-1.5 text-[9px] font-bold text-amber-800">{labels.now}</span>}
                  {chart.tuan.includes(p.branch) && <span className="rounded bg-stone-200 px-0.5 text-[9px] font-semibold text-stone-700">Tuần</span>}
                  {chart.triet.includes(p.branch) && <span className="rounded bg-stone-200 px-0.5 text-[9px] font-semibold text-stone-700">Triệt</span>}
                </span>
              </button>
            );
          })}
          <div className="col-span-2 col-start-2 row-span-2 row-start-2 flex flex-col items-center justify-center gap-1 bg-linear-to-br from-teal-50 via-white to-violet-100 p-2 text-center text-teal-950">
            <span className="mosaic-mark h-6 w-6 rounded-md opacity-90" aria-hidden />
            <p className="text-base font-bold tracking-wide">{center.pillar}</p>
            {center.lines.map((line) => <p key={line} className="text-[10px] leading-snug text-teal-900/75">{line}</p>)}
            <div className="mt-1 flex flex-wrap justify-center gap-1">
              {center.hoa.map((h) => (
                <span key={h.kind} className={`rounded px-1 text-[9px] font-semibold ${HOA_CHIP[h.kind]}`}>{HOA_SHORT[h.kind]} · {h.star}</span>
              ))}
            </div>
          </div>
        </div>
        {sel && !detail && (
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
              const pal = chart.palaces[b]!;
              if (!d) return null;
              const self = i === 0;
              return (
                <button
                  key={b}
                  type="button"
                  onClick={() => (self ? setDetail(true) : pick(b))}
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
                    {d.ageText && <span className="min-w-0 truncate text-[10px] font-semibold text-amber-800">{d.ageText}</span>}
                  </span>
                  <span className="mt-1 block text-[14px] font-bold leading-tight text-stone-900">
                    {pal.palace ? PALACE_INFO[pal.palace].vi : BRANCHES[b]}
                    {localNames[b] && <span className="ml-1 inline-block whitespace-nowrap text-[10px] font-normal text-stone-500">{localNames[b]}</span>}
                  </span>
                  <span className="mt-1 block space-y-0.5">
                    {pal.mainStars.length === 0 && <span className="block text-[11px] italic text-stone-400">{labels.noMain}</span>}
                    {pal.mainStars.map((st) => (
                      <span key={st.id} className="flex flex-wrap items-center gap-0.5">
                        <span className="text-[14px] font-bold leading-tight text-rose-800">{STAR_INFO[st.id].vi}</span>
                        {st.hoa && <span className={`rounded-full px-1 text-[9px] font-semibold ${HOA_CHIP[st.hoa]}`}>{HOA_SHORT[st.hoa]}</span>}
                      </span>
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
        {sel && detail && (
          <div
            key={`detail-${sel.branch}`}
            role="dialog"
            aria-label={labels.focusTitle.replace("{x}", sel.label)}
            className={`${ORIGIN[sel.branch]} absolute inset-0 z-30 flex animate-[zoomFrom_.5s_cubic-bezier(.2,.8,.2,1)] flex-col gap-2 rounded-3xl bg-white/70 p-2 backdrop-blur-md motion-reduce:animate-none`}
          >
            <div className="flex shrink-0 items-center gap-2 px-1">
              <button
                type="button"
                onClick={() => setDetail(false)}
                aria-label={labels.back}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-base leading-none text-stone-600 shadow-sm ring-1 ring-stone-200 hover:text-stone-900"
              >
                ←
              </button>
              <p className="min-w-0 flex-1 truncate text-xs font-semibold text-stone-600">{labels.focusTitle.replace("{x}", sel.label)}</p>
              <button
                type="button"
                onClick={() => pick(null)}
                aria-label={labels.close}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-lg leading-none text-stone-600 shadow-sm ring-1 ring-stone-200 hover:text-stone-900"
              >
                ×
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto rounded-3xl border border-teal-200 bg-linear-to-br from-teal-50 via-white to-violet-50 p-3 text-sm shadow-[0_8px_24px_-14px_rgba(15,118,110,0.5)]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-800">{labels.self}</span>
                <p className="text-base font-bold text-stone-900">{sel.label}</p>
                {sel.ageText && <span className="text-[11px] font-semibold text-amber-800">{sel.ageText}</span>}
              </div>
              {sel.role && <p className="mt-1.5 text-stone-700">{sel.role}</p>}
              {sel.borrowedText && <p className="mt-1.5 text-xs text-stone-600">{sel.borrowedText}</p>}
              {sel.mains.length > 0 && (
                <ul className="mt-2 space-y-1.5">
                  {sel.mains.map((m) => (
                    <li key={m.name}>
                      <span className="text-lg font-bold leading-tight text-rose-800">{m.name}</span>
                      {m.hoa && <span className="ml-1.5 rounded-full bg-violet-100 px-1.5 text-[11px] text-violet-800">{m.hoa}</span>}
                      <span className="block text-[13px] text-stone-700">{m.keywords}</span>
                    </li>
                  ))}
                </ul>
              )}
              {sel.aux.length > 0 && <p className="mt-2 text-xs text-stone-600"><span className="block text-stone-500">{labels.auxStars}</span>{sel.aux.join(", ")}</p>}
              {sel.notes.length > 0 && (
                <ul className="mt-2 list-disc space-y-0.5 pl-4 text-xs text-stone-700">
                  {sel.notes.map((n, i) => <li key={i}>{n}</li>)}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>

      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-stone-600">
        <li className="flex items-center gap-1"><span className={MENH_BADGE}>{labels.menh}</span>{labels.menhName}</li>
        <li className="flex items-center gap-1"><span className={THAN_BADGE}>{labels.than}</span>{labels.thanName}</li>
        <li className="flex items-center gap-1"><span className="h-1.5 w-4 rounded bg-amber-300" />{labels.now}</li>
        <li className="flex items-center gap-1"><span className="h-3 w-4 rounded border border-violet-500 bg-violet-50" />{labels.related}</li>
        <li className="flex items-center gap-1"><span className="text-teal-600">●</span>{labels.lucky}</li>
        <li className="flex items-center gap-1"><span className="text-red-600">●</span>{labels.malefic}</li>
        {(Object.keys(HOA_SHORT) as HoaId[]).map((h) => (
          <li key={h} className="flex items-center"><span className={`rounded px-1 text-[9px] font-semibold ${HOA_CHIP[h]}`}>Hóa {HOA_SHORT[h]}</span></li>
        ))}
      </ul>

    </div>
  );
}
