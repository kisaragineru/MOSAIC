"use client";
import { useEffect, useState } from "react";
import { subscribePushAction, unsubscribePushAction } from "@/app/actions/push";

export interface PushToggleText {
  on: string;
  off: string;
  turnOn: string;
  turnOff: string;
  working: string;
  unsupported: string;
  denied: string;
  iosTitle: string;
  iosSteps: string[];
  failed: string;
}

type State = "checking" | "unsupported" | "ios" | "denied" | "off" | "on";

/** The public key as the Push API wants it (bytes from base64url). */
function keyBytes(b64: string) {
  const s = (b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

const isIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1);
const standalone = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

/**
 * Push notifications for messages in this browser: turn on (asks the browser's permission), turn
 * off. On iPhone they work only once MOSAIC is on the home screen, so that's explained instead.
 */
export function PushToggle({ publicKey, text: tx }: { publicKey: string; text: PushToggleText }) {
  const [state, setState] = useState<State>("checking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setState(isIos() && !standalone() ? "ios" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setState("denied");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          // Signed in as someone else since, or forgotten by the server: this browser is mine again.
          await subscribePushAction(sub.toJSON());
          setState("on");
        } else setState("off");
      } catch {
        setState("unsupported");
      }
    })();
  }, []);

  const turnOn = async () => {
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
      const r = await subscribePushAction(sub.toJSON());
      if (!r.ok) {
        await sub.unsubscribe();
        setError(tx.failed);
        return;
      }
      setState("on");
    } catch {
      setError(tx.failed);
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    setBusy(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await unsubscribePushAction(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
    } catch {
      setError(tx.failed);
    } finally {
      setBusy(false);
    }
  };

  if (state === "checking") return <p className="text-sm text-stone-400">…</p>;
  if (state === "unsupported") return <p className="text-sm leading-6 text-stone-600">{tx.unsupported}</p>;
  if (state === "denied") return <p className="text-sm leading-6 text-amber-800">{tx.denied}</p>;
  if (state === "ios")
    return (
      <div className="rounded-2xl bg-sky-50 p-4 text-sm leading-6 text-sky-950 ring-1 ring-sky-100" data-testid="push-ios">
        <p className="font-semibold">📱 {tx.iosTitle}</p>
        <ol className="mt-1 list-decimal pl-5">
          {tx.iosSteps.map((s) => <li key={s}>{s}</li>)}
        </ol>
      </div>
    );
  return (
    <div className="space-y-2" data-testid="push-toggle">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-semibold text-stone-800">{state === "on" ? `🔔 ${tx.on}` : `🔕 ${tx.off}`}</span>
        <button
          type="button"
          disabled={busy}
          onClick={() => void (state === "on" ? turnOff() : turnOn())}
          className={`rounded-full px-4 py-2 text-sm font-bold disabled:opacity-60 ${state === "on" ? "border border-stone-200 bg-white text-stone-800 hover:bg-stone-50" : "bg-teal-700 text-white hover:bg-teal-800"}`}
        >
          {busy ? tx.working : state === "on" ? tx.turnOff : tx.turnOn}
        </button>
      </div>
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    </div>
  );
}
