"use client";

import { useFormStatus } from "react-dom";

/**
 * A form's submit button that shows it's working while the form is sent (saving can take a couple of
 * seconds on a phone; without this a tap looks like it did nothing).
 */
export function SubmitButton({ children, pending: pendingLabel, className = "" }: { children: React.ReactNode; pending: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-teal-700 px-5 py-2 text-sm font-medium text-white transition hover:bg-teal-800 active:scale-[0.98] disabled:cursor-wait disabled:opacity-70 ${className}`}
    >
      {pending && <span aria-hidden className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white motion-safe:animate-spin" />}
      {pending ? pendingLabel : children}
    </button>
  );
}
