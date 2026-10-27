"use client";
import { useState } from "react";

export interface VapidKeygenText {
  make: string;
  again: string;
  publicLabel: string;
  privateLabel: string;
  subjectLabel: string;
  subjectValue: string;
  copy: string;
  copied: string;
  warning: string;
  failed: string;
}

const b64url = (b: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/**
 * The key pair for push notifications (VAPID), made here in the admin's own browser: it is shown
 * once to be copied into the hosting settings and is never sent to MOSAIC.
 */
export function VapidKeygen({ text: tx }: { text: VapidKeygenText }) {
  const [keys, setKeys] = useState<{ pub: string; priv: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const make = async () => {
    setError(false);
    try {
      const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
      const pub = b64url(await crypto.subtle.exportKey("raw", pair.publicKey));
      const jwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
      setKeys({ pub, priv: jwk.d! });
    } catch {
      setError(true);
    }
  };

  const copy = async (k: string, v: string) => {
    try {
      await navigator.clipboard.writeText(v);
      setCopied(k);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {}
  };

  const row = (k: string, label: string, v: string) => (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-stone-600">{label}</p>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 break-all rounded-xl bg-stone-100 px-3 py-2 text-xs text-stone-800" data-testid={`vapid-${k}`}>{v}</code>
        <button type="button" onClick={() => void copy(k, v)} className="shrink-0 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50">
          {copied === k ? tx.copied : tx.copy}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <button type="button" onClick={() => void make()} className="rounded-full bg-violet-700 px-4 py-2 text-sm font-bold text-white hover:bg-violet-800">
        🔑 {keys ? tx.again : tx.make}
      </button>
      {error && <p role="alert" className="text-sm text-rose-700">{tx.failed}</p>}
      {keys && (
        <div className="space-y-3 rounded-2xl bg-white p-3 ring-1 ring-violet-100">
          {row("public", tx.publicLabel, keys.pub)}
          {row("private", tx.privateLabel, keys.priv)}
          {row("subject", tx.subjectLabel, tx.subjectValue)}
          <p className="text-xs leading-5 text-amber-800">⚠️ {tx.warning}</p>
        </div>
      )}
    </div>
  );
}
