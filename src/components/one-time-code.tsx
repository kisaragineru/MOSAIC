"use client";
import { useActionState, useState, type ReactNode } from "react";
import type { CodeState } from "@/app/actions/gift-boxes";

/** A form that asks the server for a one-time code and shows it once, with a copy button. */
export function OneTimeCode({
  action,
  hidden,
  children,
  button,
  labels,
}: {
  action: (prev: CodeState, form: FormData) => Promise<CodeState>;
  hidden: Record<string, string>;
  children?: ReactNode;
  button: string;
  labels: { once: string; copy: string; copied: string; errors: Record<string, string> };
}) {
  const [state, run, pending] = useActionState(action, {});
  const [copied, setCopied] = useState(false);
  return (
    <form action={run} className="space-y-2">
      {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {children}
      <button type="submit" disabled={pending} className="inline-flex min-h-10 items-center rounded-full border border-stone-200 bg-white px-5 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-50">
        {button}
      </button>
      {state.error && <p role="alert" className="text-sm text-rose-700">{labels.errors[state.error] ?? labels.errors.generic}</p>}
      {state.code && (
        <div className="space-y-2 rounded-2xl bg-teal-50 p-4 ring-1 ring-teal-200" role="status">
          <p className="text-center font-mono text-2xl font-bold tracking-[0.15em] text-teal-900" data-testid="one-time-code">{state.code}</p>
          <p className="text-center text-xs text-teal-800">{labels.once}</p>
          <p className="text-center">
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(state.code!).then(() => setCopied(true))}
              className="rounded-full bg-teal-700 px-4 py-1 text-xs font-semibold text-white"
            >
              {copied ? labels.copied : labels.copy}
            </button>
          </p>
        </div>
      )}
    </form>
  );
}
