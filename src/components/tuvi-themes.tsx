"use client";
import { useState } from "react";
import type { InterpretationParagraph, InterpretationSection } from "@/lib/tuvi/interpret";

export interface ThemeLabels {
  quoteOpen: string;
  quoteClose: string;
  related: string;
  strength: string;
  caution: string;
  notes: string;
  /** What the supporting stars and marks are, before the list. */
  notesLead: string;
  plain: string;
  detail: string;
  terms: string;
}

const ICON: Record<string, string> = {
  personality: "◎",
  love: "♡",
  career: "▲",
  wealth: "◇",
  family: "⌂",
  relationships: "∞",
};

function Toggle({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-stone-200/80 bg-white/70">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-stone-700">
        {title}
        <span aria-hidden className={`text-stone-400 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}>⌄</span>
      </button>
      {open && <div className="animate-[fadeUp_.2s_ease-out] px-3 pb-3 text-sm text-stone-700 motion-reduce:animate-none">{children}</div>}
    </div>
  );
}

function Lines({ items }: { items: InterpretationParagraph[] }) {
  return (
    <ul className="space-y-2 leading-6">
      {items.map((p, i) => <li key={i}>{p.text}</li>)}
    </ul>
  );
}

export function TuviThemes({ sections, labels }: { sections: InterpretationSection[]; labels: ThemeLabels }) {
  const [current, setCurrent] = useState(sections[0]?.section);
  const s = sections.find((x) => x.section === current) ?? sections[0];
  if (!s) return null;
  const by = (k: InterpretationParagraph["kind"]) => s.paragraphs.filter((p) => (p.kind ?? "core") === k);
  return (
    <div className="space-y-3">
      <div role="tablist" className="scrollbar-none -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 pt-0.5">
        {sections.map((x) => {
          const active = x.section === s.section;
          return (
            <button
              key={x.section}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setCurrent(x.section)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-all motion-reduce:transition-none ${
                active ? "border-teal-300 bg-teal-50 font-bold text-teal-800 shadow-sm" : "border-stone-200 bg-white/80 text-stone-700 hover:border-teal-300"
              }`}
            >
              <span aria-hidden>{ICON[x.section] ?? "•"}</span>
              {x.title}
            </button>
          );
        })}
      </div>
      <div key={s.section} role="tabpanel" className="animate-[fadeUp_.25s_ease-out] space-y-3 motion-reduce:animate-none">
        {s.plain && s.plain.length > 0 && (
          <div className="space-y-2 rounded-2xl bg-linear-to-br from-violet-50 to-sky-50 p-4 ring-1 ring-violet-100">
            <p className="text-xs font-semibold text-violet-700">💡 {labels.plain}</p>
            {s.persona && <p className="text-base font-bold text-stone-900">{labels.quoteOpen}{s.persona}{labels.quoteClose}</p>}
            {s.plain.map((x, i) => <p key={i} className="text-sm leading-7 text-stone-800">{x}</p>)}
          </div>
        )}
        {s.plain && s.plain.length > 0 && <p className="pt-1 text-xs font-semibold text-stone-500">📜 {labels.detail}</p>}
        {s.summary && <p className="text-sm font-semibold text-stone-900">{s.summary}</p>}
        {s.keywords && s.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {s.keywords.map((k) => <span key={k} className="rounded-full bg-violet-100/70 px-2.5 py-0.5 text-xs text-violet-800">{k}</span>)}
          </div>
        )}
        <div className="text-sm leading-relaxed text-stone-800"><Lines items={by("core")} /></div>
        {by("strength").length > 0 && (
          <div className="rounded-2xl bg-linear-to-br from-teal-50 to-emerald-50 p-4 text-sm text-teal-950">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-teal-700">{labels.strength}</p>
            <Lines items={by("strength")} />
          </div>
        )}
        {by("caution").length > 0 && (
          <div className="rounded-2xl bg-linear-to-br from-amber-50 to-orange-50 p-4 text-sm text-amber-950">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-700">{labels.caution}</p>
            <Lines items={by("caution")} />
          </div>
        )}
        {by("related").length > 0 && <Toggle title={labels.related}><Lines items={by("related")} /></Toggle>}
        {by("note").length > 0 && (
          <Toggle title={labels.notes}>
            <p className="mb-2 leading-6 text-stone-600">{labels.notesLead}</p>
            <Lines items={by("note")} />
          </Toggle>
        )}
        {s.terms && s.terms.length > 0 && (
          <Toggle title={`📖 ${labels.terms}`}>
            <dl className="space-y-2">
              {s.terms.map((x) => (
                <div key={x.term}>
                  <dt className="font-semibold text-stone-800">{x.term}</dt>
                  <dd className="leading-6 text-stone-700">{x.meaning}</dd>
                </div>
              ))}
            </dl>
          </Toggle>
        )}
      </div>
    </div>
  );
}
