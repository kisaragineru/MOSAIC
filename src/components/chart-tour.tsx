"use client";
import Link from "next/link";
import { useState } from "react";

/**
 * The welcome guide's tour of the chart: three things to try on the real board, each ticked off
 * as it is done (tap the Self palace, close the view that lifts out, tap This decade). It watches
 * clicks on the board it wraps rather than changing how the board works.
 */
export function ChartTour({
  steps,
  hasNow,
  closeLabel,
  done,
  next,
  nextHref,
  children,
}: {
  steps: string[];
  /** False when the decades can't be computed (no sex given): the last step is left out. */
  hasNow: boolean;
  closeLabel: string;
  done: string;
  next: string;
  nextHref: string;
  children: React.ReactNode;
}) {
  const shown = hasNow ? steps : steps.slice(0, 2);
  const [at, setAt] = useState(0);
  const finished = at >= shown.length;

  const onClick = (e: React.MouseEvent) => {
    const b = (e.target as HTMLElement).closest("button");
    if (!b) return;
    if (at === 0 && b.hasAttribute("data-menh")) setAt(1);
    else if (at === 1 && b.closest('[role="dialog"]') && (b.getAttribute("aria-label") === closeLabel || b.getAttribute("aria-hidden") === "true")) setAt(2);
    else if (at === 2 && b.hasAttribute("data-now")) setAt(3);
  };

  return (
    <div className="space-y-3">
      <ol className="space-y-1.5 rounded-3xl bg-violet-50 p-4 ring-1 ring-violet-100" aria-live="polite" data-testid="chart-tour">
        {shown.map((s, i) => (
          <li key={s} className={`flex gap-2 text-sm leading-6 ${i === at ? "font-semibold text-violet-950" : i < at ? "text-stone-500" : "text-stone-400"}`}>
            <span aria-hidden className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${i < at ? "bg-teal-600 text-white" : i === at ? "bg-violet-600 text-white" : "bg-stone-200 text-stone-500"}`}>
              {i < at ? "✓" : i + 1}
            </span>
            <span>{s}</span>
          </li>
        ))}
        {finished && <li className="pt-1 text-sm font-bold text-teal-800">🎉 {done}</li>}
      </ol>
      <div onClickCapture={onClick}>{children}</div>
      <div>
        <Link href={nextHref} className={`block rounded-full py-3 text-center font-semibold shadow-sm ${finished ? "bg-teal-700 text-white hover:bg-teal-800" : "bg-white text-teal-800 ring-1 ring-teal-200"}`}>
          {next} →
        </Link>
      </div>
    </div>
  );
}
