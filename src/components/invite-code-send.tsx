"use client";
import { useState } from "react";

/** One invite: the code to read out, and its link to copy or send through the phone's share sheet. */
export function InviteCodeSend({ code, message, tx }: { code: string; message: string; tx: { copy: string; copied: string; send: string } }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="rounded-xl bg-white px-3 py-1.5 font-mono text-base font-bold tracking-widest text-stone-900 ring-1 ring-amber-200" data-testid="invite-code">{code}</span>
      <button type="button" onClick={copy} className="min-h-9 rounded-full bg-white px-3 text-xs font-semibold text-amber-900 ring-1 ring-amber-200 hover:ring-amber-400">
        {copied ? `✓ ${tx.copied}` : tx.copy}
      </button>
      {/* The phone's share sheet (LINE, mail…); where there is none, the message is copied. */}
      <button type="button" onClick={() => ("share" in navigator ? navigator.share({ text: message }).catch(() => {}) : copy())} className="min-h-9 rounded-full bg-amber-600 px-3 text-xs font-bold text-white hover:bg-amber-700">
        {tx.send}
      </button>
    </div>
  );
}
