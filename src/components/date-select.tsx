"use client";

import { useState } from "react";
import { Select } from "./ui";

export interface DateSelectText {
  year: string;
  month: string;
  day: string;
  /** The twelve months' names, January first. */
  months: string[];
}

const pad = (n: number) => String(n).padStart(2, "0");
const daysIn = (y: number, m: number) => (y && m ? new Date(Date.UTC(y, m, 0)).getUTCDate() : 31);

/**
 * A date as three pickers (year, month, day) in the app's language: the browser's own date field
 * shows its placeholder and calendar in the device's language. The form gets one field, `name`,
 * as YYYY-MM-DD (empty until all three are chosen).
 */
export function DateSelect({
  name,
  label,
  text: tx,
  defaultValue,
  min,
  max,
  required,
  hint,
  hideLabel = false,
}: {
  name: string;
  label: string;
  text: DateSelectText;
  defaultValue?: string | null;
  min?: string;
  max?: string;
  required?: boolean;
  hint?: string;
  hideLabel?: boolean;
}) {
  const [y0, m0, d0] = (defaultValue ?? "").split("-").map(Number);
  const [y, setY] = useState(y0 || 0);
  const [m, setM] = useState(m0 || 0);
  const [d, setD] = useState(d0 || 0);
  const now = new Date().getUTCFullYear();
  const lo = min ? Number(min.slice(0, 4)) : 1900;
  const hi = max ? Number(max.slice(0, 4)) : now + 30;
  const years = Array.from({ length: Math.max(0, hi - lo + 1) }, (_, i) => hi - i);
  const last = daysIn(y, m);
  const day = Math.min(d, last);
  const value = y && m && day ? `${y}-${pad(m)}-${pad(day)}` : "";
  return (
    <fieldset role="group" aria-label={label} className="space-y-1">
      <legend className={hideLabel ? "sr-only" : "mb-1 text-sm font-medium text-stone-700"}>{label}</legend>
      <div className="grid grid-cols-[1.4fr_1.2fr_1fr] gap-2">
        <Select aria-label={tx.year} value={y || ""} required={required} onChange={(e) => setY(Number(e.target.value))}>
          <option value="">{tx.year}</option>
          {years.map((n) => <option key={n} value={n}>{n}</option>)}
        </Select>
        <Select aria-label={tx.month} value={m || ""} required={required} onChange={(e) => setM(Number(e.target.value))}>
          <option value="">{tx.month}</option>
          {tx.months.map((s, i) => <option key={i} value={i + 1}>{s}</option>)}
        </Select>
        <Select aria-label={tx.day} value={day || ""} required={required} onChange={(e) => setD(Number(e.target.value))}>
          <option value="">{tx.day}</option>
          {Array.from({ length: last }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
        </Select>
      </div>
      <input type="hidden" name={name} value={value} />
      {hint && <span className="block text-xs text-stone-500">{hint}</span>}
    </fieldset>
  );
}
