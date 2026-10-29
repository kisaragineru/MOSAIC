"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { LifeStage } from "@/lib/tuvi/interpret";
import type { PalaceId } from "@/lib/tuvi/stars";

/** One soft colour per palace theme (bar segment, chip). */
const TONE: Record<PalaceId, { bar: string; chip: string }> = {
  menh: { bar: "bg-teal-300", chip: "bg-teal-100 text-teal-800" },
  phu_mau: { bar: "bg-indigo-300", chip: "bg-indigo-100 text-indigo-800" },
  phuc_duc: { bar: "bg-purple-300", chip: "bg-purple-100 text-purple-800" },
  dien_trach: { bar: "bg-lime-300", chip: "bg-lime-100 text-lime-800" },
  quan_loc: { bar: "bg-sky-300", chip: "bg-sky-100 text-sky-800" },
  no_boc: { bar: "bg-violet-300", chip: "bg-violet-100 text-violet-800" },
  thien_di: { bar: "bg-cyan-300", chip: "bg-cyan-100 text-cyan-800" },
  tat_ach: { bar: "bg-orange-300", chip: "bg-orange-100 text-orange-800" },
  tai_bach: { bar: "bg-amber-300", chip: "bg-amber-100 text-amber-800" },
  tu_tuc: { bar: "bg-pink-300", chip: "bg-pink-100 text-pink-800" },
  phu_the: { bar: "bg-rose-300", chip: "bg-rose-100 text-rose-800" },
  huynh_de: { bar: "bg-fuchsia-300", chip: "bg-fuchsia-100 text-fuchsia-800" },
};
const NO_TONE = { bar: "bg-stone-300", chip: "bg-stone-100 text-stone-700" };
// The "now" marker sits in a 10-column grid inside the current segment (classes, not inline styles: CSP).
const COL = ["col-start-1", "col-start-2", "col-start-3", "col-start-4", "col-start-5", "col-start-6", "col-start-7", "col-start-8", "col-start-9", "col-start-10"];

export type StageView = LifeStage & {
  ageText: string;
  /** The same years as ages by birthdays, roughly (nominal age n is about n − 1). */
  fullAgeText: string;
  borrowedText: string | null;
  yearText: string;
  records: { count: number; countText: string; href: string; writeHref: string } | null;
  letterHref: string | null;
};

export interface StageLabels {
  help: string;
  state: Record<LifeStage["state"], string>;
  mapTitle: string;
  mapHelp: string;
  hintsTitle: string;
  strength: string;
  caution: string;
  starNotes: string;
  starNotesLead: string;
  support: string;
  supportLead: string;
  supportWhere: { trine: string; opposite: string };
  supportNone: string;
  recordsTitle: string;
  recordsOpen: string;
  recordsNone: string;
  recordsWrite: string;
  letterTitle: string;
  letterHelp: string;
  letterCta: string;
  reflectTitle: string;
  aheadTitle: string;
  reference: string;
  noMain: string;
  optionsTitle: string;
  optionsLead: string;
  optionsNote: string;
}

function Toggle({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-stone-200/80 bg-white/70">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-stone-700">
        {title}
        <span aria-hidden className={`text-stone-400 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}>⌄</span>
      </button>
      {open && <div className="animate-[fadeUp_.25s_ease-out] px-3 pb-3 text-sm text-stone-700 motion-reduce:animate-none">{children}</div>}
    </div>
  );
}

export function TuviStages({ stages, labels, currentAge }: { stages: StageView[]; labels: StageLabels; currentAge: number | null }) {
  const start = Math.max(0, stages.findIndex((s) => s.state === "current"));
  const [selected, setSelected] = useState(start);
  const rail = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLButtonElement | null)[]>([]);

  const first = useRef(true);
  useEffect(() => {
    // Centre the selected stage in the rail (instantly on first render, smoothly after a tap),
    // scrolling only the rail, never the page.
    const el = cards.current[selected];
    const box = rail.current;
    if (!el || !box) return;
    const left = el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    box.scrollTo({ left, behavior: first.current || reduce ? "auto" : "smooth" });
    first.current = false;
  }, [selected]);

  const s = stages[selected];
  if (!s) return null;
  const tone = (x: StageView) => (x.palace ? TONE[x.palace] : NO_TONE);
  return (
    <div className="space-y-4">
      {/* B. Life map: the whole life at a glance, one coloured segment per decade. */}
      <div className="rounded-3xl bg-linear-to-br from-white to-stone-50 p-3 ring-1 ring-stone-200/70">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-bold text-stone-800">{labels.mapTitle}</p>
          <p className="text-[10px] text-stone-500">{stages[0]!.from}–{stages[stages.length - 1]!.to}</p>
        </div>
        <p className="mt-0.5 text-[11px] text-stone-500">{labels.mapHelp}</p>
        <div className="mt-3 flex gap-0.5" role="group" aria-label={labels.mapTitle}>
          {stages.map((x, i) => {
            const active = i === selected;
            const now = x.state === "current" && currentAge !== null;
            return (
              <button
                key={x.branch}
                type="button"
                onClick={() => setSelected(i)}
                aria-label={`${x.ageText} ${x.short}`}
                aria-pressed={active}
                className={`relative h-7 flex-1 rounded-md transition-all motion-reduce:transition-none ${tone(x).bar} ${
                  x.state === "past" ? "opacity-50" : x.phase === "beyond" ? "opacity-35 saturate-50" : ""
                } ${active ? "-translate-y-0.5 ring-2 ring-teal-500 ring-offset-1" : "hover:-translate-y-0.5"}`}
              >
                {now && (
                  <span className="absolute inset-0 grid grid-cols-10" aria-hidden>
                    <span className={`${COL[Math.min(9, Math.max(0, currentAge! - x.from))]} flex items-center justify-center`}>
                      <span className="h-3 w-3 animate-pulse rounded-full border-2 border-white bg-amber-500 shadow motion-reduce:animate-none" />
                    </span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="mt-1 flex gap-0.5 text-center text-[9px] text-stone-400">
          {stages.map((x) => <span key={x.branch} className="flex-1">{x.from}</span>)}
        </div>
      </div>

      <p className="text-xs text-stone-500">{labels.help}</p>
      <div ref={rail} className="scrollbar-none -mx-5 flex snap-x scroll-px-5 gap-2 overflow-x-auto px-5 pb-4 pt-2">
        {stages.map((x, i) => {
          const active = i === selected;
          const bg =
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
              className={`relative w-40 shrink-0 snap-center rounded-2xl border p-2.5 text-left transition-all motion-reduce:transition-none ${bg} ${active ? "-translate-y-0.5 ring-2 ring-teal-300 shadow-md" : "hover:-translate-y-0.5"}`}
            >
              <span className="flex items-center justify-between gap-1">
                <span className="whitespace-nowrap text-[11px] font-semibold text-amber-800">{x.ageText}</span>
                {x.phase === "beyond" ? (
                  <span className="shrink-0 rounded-full bg-stone-100 px-1.5 text-[10px] text-stone-500">{labels.reference}</span>
                ) : (
                  labels.state[x.state] && (
                    <span className={`shrink-0 rounded-full px-1.5 text-[10px] ${x.state === "current" ? "bg-amber-100 font-bold text-amber-800" : "bg-stone-100 text-stone-600"}`}>{labels.state[x.state]}</span>
                  )
                )}
              </span>
              <span className="block text-[10px] text-stone-500">{x.yearText}</span>
              <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${tone(x).chip}`}>{x.short}</span>
              <span className="mt-1 block line-clamp-2 text-xs font-semibold text-stone-900">{x.label}</span>
              {x.borrowedFrom ? (
                <span className="mt-0.5 block truncate text-[11px] text-stone-500">{labels.noMain} · <span className="text-rose-800/70">{x.stars.join(" · ")}</span></span>
              ) : (
                <span className="mt-0.5 block truncate text-[11px] text-rose-800">{x.stars.join(" · ") || "—"}</span>
              )}
            </button>
          );
        })}
      </div>

      <div key={s.branch} className="animate-[fadeUp_.3s_ease-out] space-y-3 rounded-3xl border border-stone-200/80 bg-white/80 p-4 text-sm motion-reduce:animate-none">
        <div>
          <p className="text-xs font-semibold text-amber-800">{s.ageText} · {s.yearText}</p>
          <p className="text-[11px] text-stone-500">{s.fullAgeText}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="text-base font-bold text-stone-900">{s.label}</p>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${tone(s).chip}`}>{s.short}</span>
          </div>
        </div>
        {s.theme && <p className="leading-relaxed text-stone-800">{s.theme}</p>}
        {s.borrowedText && <p className="text-xs text-stone-600">{s.borrowedText}</p>}
        {s.stars.length > 0 && (
          <ul className="space-y-0.5">
            {s.stars.map((name, i) => (
              <li key={name}><span className="font-semibold text-rose-800">{name}</span><span className="text-stone-600"> — {s.keywords[i]}</span></li>
            ))}
          </ul>
        )}
        {s.hoa.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {s.hoa.map((h) => <span key={h} className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] text-violet-800">{h}</span>)}
          </div>
        )}

        {/* C. Hints for the decade, from the same traditional tables as the theme readings. */}
        {(s.hints.strengths.length > 0 || s.hints.cautions.length > 0) && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-stone-500">{labels.hintsTitle}</p>
            {s.hints.strengths.length > 0 && (
              <div className="rounded-2xl bg-linear-to-br from-teal-50 to-emerald-50 p-3 text-teal-950">
                <p className="mb-1 text-xs font-semibold text-teal-700">{labels.strength}</p>
                <ul className="space-y-1">{s.hints.strengths.map((t) => <li key={t}>{t}</li>)}</ul>
              </div>
            )}
            {s.hints.cautions.length > 0 && (
              <div className="rounded-2xl bg-linear-to-br from-amber-50 to-orange-50 p-3 text-amber-950">
                <p className="mb-1 text-xs font-semibold text-amber-700">{labels.caution}</p>
                <ul className="space-y-1">{s.hints.cautions.map((t) => <li key={t}>{t}</li>)}</ul>
              </div>
            )}
          </div>
        )}
        {s.hints.support.length > 0 && (
          <div className="rounded-2xl bg-violet-50/60 p-3">
            <p className="text-xs font-semibold text-violet-800">{labels.support}</p>
            <p className="mt-1 text-[13px] leading-6 text-stone-700">{labels.supportLead}</p>
            <ul className="mt-2 divide-y divide-violet-100 rounded-xl bg-white/80">
              {s.hints.support.map((x) => (
                <li key={x.label} className="px-3 py-2">
                  <p className="flex flex-wrap items-center gap-x-2 text-sm font-bold text-stone-900">
                    {x.label}
                    <span className="rounded-md bg-violet-100 px-1.5 py-px text-[10px] font-semibold text-violet-800">{labels.supportWhere[x.where]}</span>
                  </p>
                  <p className="mt-0.5 flex flex-wrap gap-x-3 text-[13px] leading-6 text-stone-700">
                    {x.stars.length ? x.stars.map((st) => <span key={st}>{st}</span>) : <span className="text-stone-500">{labels.supportNone}</span>}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
        {s.hints.notes.length > 0 && (
          <Toggle title={labels.starNotes}>
            <p className="mb-2 leading-6 text-stone-600">{labels.starNotesLead}</p>
            <ul className="list-disc space-y-2 pl-4 leading-6">{s.hints.notes.map((n) => <li key={n}>{n}</li>)}</ul>
          </Toggle>
        )}

        {/* The theme as it tends to look at this age: possibilities to choose from, never the period's rule. */}
        {s.hints.options.length > 0 && (
          <div className="rounded-2xl bg-linear-to-br from-sky-50 to-teal-50 p-3" data-testid="stage-options">
            <p className="text-xs font-semibold text-sky-800">🧭 {labels.optionsTitle}</p>
            <p className="mt-1 text-[13px] leading-6 text-stone-700">{labels.optionsLead}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-stone-800">{s.hints.options.map((o) => <li key={o}>{o}</li>)}</ul>
            <p className="mt-2 text-[11px] leading-5 text-stone-500">{labels.optionsNote}</p>
          </div>
        )}
        {s.hints.reflection && (
          <div className="rounded-2xl bg-linear-to-br from-violet-50 to-sky-50 p-3">
            <p className="text-xs font-semibold text-violet-800">{s.hints.reflection.mode === "ahead" ? labels.aheadTitle : labels.reflectTitle}</p>
            <p className="mt-1 text-stone-800">{s.hints.reflection.text}</p>
          </div>
        )}
        {/* D. Your own records from this time, or a letter to the future self. */}
        {s.records && (
          <div className="rounded-2xl bg-linear-to-br from-sky-50 to-violet-50 p-3">
            <p className="text-xs font-semibold text-sky-800">{labels.recordsTitle}</p>
            {s.records.count > 0 ? (
              <Link href={s.records.href} className="mt-1 flex items-center justify-between gap-2 rounded-xl bg-white/80 px-3 py-2 transition-colors hover:bg-white">
                <span className="text-lg font-bold text-stone-900">{s.records.countText}</span>
                <span className="text-xs font-semibold text-teal-700">{labels.recordsOpen} →</span>
              </Link>
            ) : (
              <p className="mt-1 text-xs text-stone-600">{labels.recordsNone}</p>
            )}
            <Link href={s.records.writeHref} className="mt-2 inline-block text-xs font-semibold text-teal-700 underline">{labels.recordsWrite} →</Link>
          </div>
        )}
        {s.letterHref && (
          <div className="rounded-2xl bg-linear-to-br from-rose-50 to-amber-50 p-3">
            <p className="text-xs font-semibold text-rose-800">✉ {labels.letterTitle}</p>
            <p className="mt-1 text-xs text-stone-600">{labels.letterHelp}</p>
            <Link href={s.letterHref} className="mt-2 inline-flex rounded-full bg-white px-3 py-1.5 text-xs font-bold text-rose-800 shadow-sm ring-1 ring-rose-200 transition hover:bg-rose-50">
              {labels.letterCta} →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
