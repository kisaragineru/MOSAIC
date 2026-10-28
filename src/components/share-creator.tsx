"use client";
import { useActionState, useState } from "react";
import { createShareAction, type ShareState } from "@/app/actions/sharing";
import { drawQrCard } from "@/lib/qr-card";

export interface ShareCreatorText {
  create: string;
  advanced: string;
  createCustom: string;
  label: string;
  expires: string;
  maxUses: string;
  once: string;
  qrAlt: string;
  copy: string;
  copied: string;
  /** The QR as a picture: the button, the file name, and what the picture says ({name}, {date}). */
  save: string;
  saving: string;
  cardFrom: string;
  cardLead: string;
  cardHow: string;
  cardUntil: string;
  errors: Record<string, string>;
}

/** One tap shows a QR with the default options (7 days, no use limit); the options sit behind "more". */
export function ShareCreator({ tx, name }: { tx: ShareCreatorText; name: string }) {
  const [state, action, pending] = useActionState<ShareState, FormData>(createShareAction, null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  // The QR with MOSAIC's mark and who it is from, saved as a picture (made on this phone).
  const save = async (qr: string, expiresAt: string) => {
    setSaving(true);
    try {
      const date = expiresAt.slice(0, 10);
      const blob = await drawQrCard(qr, {
        from: tx.cardFrom.replace("{name}", name),
        lead: tx.cardLead,
        how: tx.cardHow,
        until: tx.cardUntil.replace("{date}", date),
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `MOSAIC-QR-${date}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } finally {
      setSaving(false);
    }
  };
  const input = "w-full rounded-2xl border border-stone-300 bg-white px-3 py-2";
  return (
    <div className="space-y-3">
      {state && "url" in state ? (
        <div className="space-y-3 text-center" data-testid="share-result">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={state.qr} alt={tx.qrAlt} className="mx-auto aspect-square w-full max-w-72 animate-[zoomIn_.4s_ease-out] rounded-3xl bg-white p-2 shadow-md motion-reduce:animate-none" />
          <button
            type="button"
            onClick={() => save(state.qr, state.expiresAt)}
            disabled={saving}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-teal-700 text-sm font-bold text-white shadow-sm hover:bg-teal-800 disabled:opacity-60"
            data-testid="qr-save"
          >
            <span aria-hidden>⬇</span>
            {saving ? tx.saving : tx.save}
          </button>
          <p className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">{tx.once}</p>
          <input readOnly value={state.url} className={`${input} text-xs`} data-testid="share-url" onFocus={(e) => e.currentTarget.select()} />
          <button
            type="button"
            className="min-h-10 w-full rounded-full border border-stone-300 bg-white text-sm"
            onClick={async () => {
              await navigator.clipboard?.writeText(state.url);
              setCopied(true);
            }}
          >
            {copied ? tx.copied : tx.copy}
          </button>
        </div>
      ) : (
        <form action={action}>
          <button
            disabled={pending}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-linear-to-r from-teal-600 to-teal-700 text-base font-bold text-white shadow-md transition hover:shadow-lg disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
              <rect x="4" y="4" width="6" height="6" rx="1" />
              <rect x="14" y="4" width="6" height="6" rx="1" />
              <rect x="4" y="14" width="6" height="6" rx="1" />
              <path d="M14 14h2v2h-2zM18 18h2v2h-2zM18 14h2M14 18v2" />
            </svg>
            {tx.create}
          </button>
        </form>
      )}
      {state && "error" in state && <p role="alert" className="rounded-2xl bg-rose-50 p-2 text-sm text-rose-900">{tx.errors[state.error] ?? tx.errors.generic}</p>}
      {!(state && "url" in state) && (
        <details className="text-sm">
          <summary className="cursor-pointer text-stone-600">{tx.advanced}</summary>
          <form action={action} className="mt-2 grid grid-cols-2 gap-2">
            <label className="col-span-2">{tx.label}<input name="label" maxLength={80} className={input} /></label>
            <label>{tx.expires}<input type="number" name="expiresInDays" min={1} max={30} defaultValue={7} className={input} /></label>
            <label>{tx.maxUses}<input type="number" name="maxUses" min={1} max={100} className={input} /></label>
            <button disabled={pending} className="col-span-2 min-h-10 rounded-full border border-teal-700 bg-white px-4 py-2 font-medium text-teal-800 disabled:opacity-50">
              {tx.createCustom}
            </button>
          </form>
        </details>
      )}
    </div>
  );
}
