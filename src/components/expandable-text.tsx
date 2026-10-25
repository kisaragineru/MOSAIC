"use client";
import { useLayoutEffect, useRef, useState } from "react";

/** Long text clamped to a few lines, with a toggle that only appears when the text overflows. */
export function ExpandableText({ text, more, less }: { text: string; more: string; less: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false);
  const [overflows, setOverflows] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && !open) setOverflows(el.scrollHeight > el.clientHeight + 1);
  }, [text, open]);
  return (
    <div>
      <p ref={ref} className={`emoji-color whitespace-pre-line break-words text-sm leading-relaxed text-stone-800 ${open ? "" : "line-clamp-4"}`}>{text}</p>
      {(overflows || open) && (
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="mt-1 text-sm font-medium text-teal-700 underline">
          {open ? less : more}
        </button>
      )}
    </div>
  );
}
