"use client";
import { useActionState, useState } from "react";
import { createShareAction, type ShareState } from "@/app/actions/sharing";

export interface ShareCreatorText {
  create: string;
  label: string;
  expires: string;
  maxUses: string;
  once: string;
  qrAlt: string;
  copy: string;
  copied: string;
  errors: Record<string, string>;
}

export function ShareCreator({ tx }: { tx: ShareCreatorText }) {
  const [state, action, pending] = useActionState<ShareState, FormData>(createShareAction, null);
  const [copied, setCopied] = useState(false);
  const input = "w-full rounded-xl border border-stone-300 bg-white px-3 py-2";
  return (
    <div className="space-y-3">
      <form action={action} className="grid grid-cols-2 gap-2">
        <label className="col-span-2 text-sm">{tx.label}<input name="label" maxLength={80} className={input} /></label>
        <label className="text-sm">{tx.expires}<input type="number" name="expiresInDays" min={1} max={30} defaultValue={7} className={input} /></label>
        <label className="text-sm">{tx.maxUses}<input type="number" name="maxUses" min={1} max={100} className={input} /></label>
        <button disabled={pending} className="col-span-2 min-h-10 rounded-xl bg-teal-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {tx.create}
        </button>
      </form>
      {state && "error" in state && <p role="alert" className="rounded-xl bg-rose-50 p-2 text-sm text-rose-900">{tx.errors[state.error] ?? tx.errors.generic}</p>}
      {state && "url" in state && (
        <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3" data-testid="share-result">
          <p className="text-sm font-medium text-amber-900">{tx.once}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={state.qr} alt={tx.qrAlt} className="mx-auto h-56 w-56 bg-white" />
          <input readOnly value={state.url} className={`${input} text-xs`} data-testid="share-url" onFocus={(e) => e.currentTarget.select()} />
          <button
            type="button"
            className="min-h-10 w-full rounded-xl border border-stone-300 bg-white text-sm"
            onClick={async () => {
              await navigator.clipboard?.writeText(state.url);
              setCopied(true);
            }}
          >
            {copied ? tx.copied : tx.copy}
          </button>
        </div>
      )}
    </div>
  );
}
