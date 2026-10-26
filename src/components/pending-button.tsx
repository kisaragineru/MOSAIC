"use client";
import { useFormStatus } from "react-dom";

/** A submit button that says it's working while its form is being sent (for slow actions). */
export function PendingButton({ children, pending, className }: { children: React.ReactNode; pending: string; className?: string }) {
  const s = useFormStatus();
  return (
    <button type="submit" disabled={s.pending} aria-busy={s.pending} className={`${className ?? ""} disabled:cursor-wait disabled:opacity-70`}>
      {s.pending ? pending : children}
    </button>
  );
}
