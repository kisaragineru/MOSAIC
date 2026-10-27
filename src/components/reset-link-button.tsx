"use client";
import { useState } from "react";
import { issueResetLinkAction } from "@/app/actions/password";

/** Admin: make a one-time link for someone who forgot their password, shown here once to copy. */
export function ResetLinkButton({ userId, text }: { userId: string; text: { make: string; note: string; copy: string; copied: string; failed: string } }) {
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  const make = async () => {
    setError(false);
    const r = await issueResetLinkAction(userId);
    if (r.ok) setUrl(r.value);
    else setError(true);
  };
  if (!url)
    return (
      <span className="inline-flex flex-col items-end">
        <button type="button" onClick={() => void make()} className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50">🔑 {text.make}</button>
        {error && <span role="alert" className="mt-1 text-xs text-rose-700">{text.failed}</span>}
      </span>
    );
  return (
    <div className="w-full space-y-1 rounded-xl bg-amber-50 p-2 ring-1 ring-amber-100" data-testid="reset-link">
      <code className="block break-all text-xs text-stone-800">{url}</code>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-amber-900">{text.note}</span>
        <button
          type="button"
          onClick={() => void navigator.clipboard.writeText(url).then(() => setCopied(true)).catch(() => undefined)}
          className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-stone-700 ring-1 ring-stone-200"
        >
          {copied ? text.copied : text.copy}
        </button>
      </div>
    </div>
  );
}
