"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { enablePush, pushDeviceState, rememberPushState } from "@/lib/push-client";

/** Keeps this device's notification state in its cookie, so Home suggests them only where it makes sense. */
export function PushReadiness() {
  useEffect(() => {
    void pushDeviceState().then(rememberPushState).catch(() => undefined);
  }, []);
  return null;
}

/** The notice's button: turn notifications on here, in one tap (the browser asks first). */
export function PushNudgeButton({ publicKey, label, working, failed, denied }: { publicKey: string; label: string; working: string; failed: string; denied: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const go = async () => {
    setBusy(true);
    setError(null);
    const r = await enablePush(publicKey);
    setBusy(false);
    if (r === "on" || r === "denied") router.refresh();
    if (r === "failed") setError(failed);
    if (r === "denied") setError(denied);
  };
  return (
    <div className="mt-2">
      <button type="button" disabled={busy} onClick={() => void go()} className="rounded-full bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-60">
        🔔 {busy ? working : label}
      </button>
      {error && <p role="alert" className="mt-1 text-xs text-rose-700">{error}</p>}
    </div>
  );
}
