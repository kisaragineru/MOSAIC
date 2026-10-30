"use client";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * A <details> that remembers whether it was left open (in this browser), and opens when the
 * page is reached at its #id or with `open`.
 */
export function RememberedDetails({ id, storageKey, open = false, className, children, testId }: { id: string; storageKey: string; open?: boolean; className?: string; children: ReactNode; testId?: string }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let saved = false;
    try {
      saved = localStorage.getItem(storageKey) === "open";
    } catch {}
    if (open || saved || location.hash === `#${id}`) el.open = true;
  }, [id, storageKey, open]);
  return (
    <details
      ref={ref}
      id={id}
      className={className}
      data-testid={testId}
      onToggle={(e) => {
        try {
          if (e.currentTarget.open) localStorage.setItem(storageKey, "open");
          else localStorage.removeItem(storageKey);
        } catch {}
      }}
    >
      {children}
    </details>
  );
}
