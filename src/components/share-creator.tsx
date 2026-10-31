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
  /** The owner's choice made with the QR: their Tử Vi shown to whoever connects. */
  showTuvi: string;
  showTuviNote: string;
  /** Under the one-tap QR: for one person, until tomorrow, connected at their yes. */
  quickNote: string;
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

/** A link's QR, its address to copy, and the QR saved as a picture (just made, or shown again). */
export function ShareResult({ url, qr, expiresAt, name, tx, note }: { url: string; qr: string; expiresAt: string; name: string; tx: ShareCreatorText; note?: string }) {
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const input = "w-full rounded-2xl border border-stone-300 bg-white px-3 py-2";
  // The QR with MOSAIC's mark and who it is from, saved as a picture (made on this phone).
  const save = async () => {
    setSaving(true);
    try {
      const date = expiresAt.slice(0, 10);
      const blob = await drawQrCard(qr, {
        from: tx.cardFrom.replace("{name}", name),
        lead: tx.cardLead,
        how: tx.cardHow,
        until: tx.cardUntil.replace("{date}", date),
      });
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `MOSAIC-QR-${date}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 10_000);
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="space-y-3 text-center" data-testid="share-result">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qr} alt={tx.qrAlt} className="mx-auto aspect-square w-full max-w-72 animate-[zoomIn_.4s_ease-out] rounded-3xl bg-white p-2 shadow-md motion-reduce:animate-none" />
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-teal-700 text-sm font-bold text-white shadow-sm hover:bg-teal-800 disabled:opacity-60"
        data-testid="qr-save"
      >
        <span aria-hidden>⬇</span>
        {saving ? tx.saving : tx.save}
      </button>
      {note && <p className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">{note}</p>}
      <input readOnly value={url} className={`${input} text-xs`} data-testid="share-url" onFocus={(e) => e.currentTarget.select()} />
      <button
        type="button"
        className="min-h-10 w-full rounded-full border border-stone-300 bg-white text-sm"
        onClick={async () => {
          await navigator.clipboard?.writeText(url);
          setCopied(true);
        }}
      >
        {copied ? tx.copied : tx.copy}
      </button>
    </div>
  );
}

/** One tap shows a QR with the default options (7 days, no use limit); the options sit behind "more". */
export function ShareCreator({ tx, name }: { tx: ShareCreatorText; name: string }) {
  const [state, action, pending] = useActionState<ShareState, FormData>(createShareAction, null);
  const input = "w-full rounded-2xl border border-stone-300 bg-white px-3 py-2";
  return (
    <div className="space-y-3">
      {state && "url" in state ? (
        <ShareResult url={state.url} qr={state.qr} expiresAt={state.expiresAt} name={name} tx={tx} note={tx.once} />
      ) : (
        <form action={action} className="space-y-3">
          <input type="hidden" name="quick" value="on" />
          <TuviChoice tx={tx} />
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
          <p className="text-xs leading-5 text-stone-500">{tx.quickNote}</p>
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
            <div className="col-span-2"><TuviChoice tx={tx} /></div>
            <button disabled={pending} className="col-span-2 min-h-10 rounded-full border border-teal-700 bg-white px-4 py-2 font-medium text-teal-800 disabled:opacity-50">
              {tx.createCustom}
            </button>
          </form>
        </details>
      )}
    </div>
  );
}

/** Checked to start with: showing the QR is already a yes to this person, Tử Vi included unless unticked. */
function TuviChoice({ tx }: { tx: ShareCreatorText }) {
  return (
    <label className="flex items-start gap-2 rounded-2xl bg-violet-50/70 px-3 py-2 text-left text-sm text-stone-800 ring-1 ring-violet-100">
      <input type="checkbox" name="showTuvi" defaultChecked className="mt-1 h-4 w-4 accent-teal-700" />
      <span>
        <span className="block font-semibold">✦ {tx.showTuvi}</span>
        <span className="block text-xs text-stone-500">{tx.showTuviNote}</span>
      </span>
    </label>
  );
}
