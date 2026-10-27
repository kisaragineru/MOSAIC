"use client";

import { useState, useSyncExternalStore } from "react";

const noop = () => () => {};

/** A link to send: the phone's share sheet when there is one (LINE, mail…), and copy. */
export function ShareLink({ url, title, text, labels }: { url: string; title: string; text: string; labels: { share: string; copy: string; copied: string } }) {
  // The share sheet exists on phones (not while rendering on the server).
  const canShare = useSyncExternalStore(noop, () => typeof navigator.share === "function", () => false);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className="space-y-2" data-testid="share-link">
      <input readOnly value={url} aria-label={labels.copy} onFocus={(e) => e.currentTarget.select()} className="w-full rounded-2xl border border-stone-200 bg-white px-3 py-2 font-mono text-xs text-stone-700" />
      <div className="flex flex-wrap gap-2">
        {canShare && (
          <button type="button" onClick={() => void navigator.share({ title, text, url }).catch(() => undefined)} className="rounded-full bg-teal-700 px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-teal-800">
            {labels.share}
          </button>
        )}
        <button type="button" onClick={() => void copy()} className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-teal-800 ring-1 ring-stone-200 hover:ring-teal-300">
          {copied ? labels.copied : labels.copy}
        </button>
      </div>
    </div>
  );
}
