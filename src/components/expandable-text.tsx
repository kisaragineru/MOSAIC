"use client";
import { useLayoutEffect, useRef, useState } from "react";

/** Long text clamped to a few lines, with a toggle that only appears when the text overflows. */
const CLAMP = { 3: "line-clamp-3", 4: "line-clamp-4" } as const;

export function ExpandableText({ text, more, less, lines = 4 }: { text: string; more: string; less: string; lines?: keyof typeof CLAMP }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false);
  const [overflows, setOverflows] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && !open) setOverflows(el.scrollHeight > el.clientHeight + 1);
  }, [text, open]);
  return (
    <div>
      <p ref={ref} className={`emoji-color whitespace-pre-line break-words text-sm leading-relaxed text-stone-800 ${open ? "" : CLAMP[lines]}`}>{text}</p>
      {(overflows || open) && (
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="mt-1 text-sm font-medium text-teal-700 underline">
          {open ? less : more}
        </button>
      )}
    </div>
  );
}
