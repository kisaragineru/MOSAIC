"use client";
import { useState } from "react";

/** Wraps checkboxes so no more than `max` can be ticked; a further tick is undone with a note. */
export function PickLimit({ max, note, children }: { max: number; note: string; children: React.ReactNode }) {
  const [over, setOver] = useState(false);
  const onChange = (e: React.ChangeEvent<HTMLDivElement>) => {
    const box = e.target as unknown as HTMLInputElement;
    if (box.type !== "checkbox" || !box.checked) return setOver(false);
    const ticked = e.currentTarget.querySelectorAll<HTMLInputElement>(`input[type="checkbox"][name="${box.name}"]:checked`).length;
    if (ticked > max) {
      box.checked = false;
      setOver(true);
    } else setOver(false);
  };
  return (
    <div onChange={onChange}>
      {children}
      {over && <p role="alert" className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">{note}</p>}
    </div>
  );
}
