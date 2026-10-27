"use client";
import { useState } from "react";
import { pushDevicesAction, testPushAction } from "@/app/actions/push";
import type { PushTestResult } from "@/server/services/push";

export interface PushCheckText {
  title: string;
  support: string;
  standalone: string;
  permission: string;
  worker: string;
  subscribed: string;
  server: string;
  yes: string;
  no: string;
  /** "{n}" is the count. */
  units: string;
  states: { granted: string; default: string; denied: string };
  localTest: string;
  localHelp: string;
  localShown: string;
  serverTest: string;
  serverHelp: string;
  /** "{service}", "{status}" and "{message}" are filled in. */
  sent: string;
  failedSend: string;
  noDevices: string;
  sentHint: string;
  testBody: string;
  working: string;
  failed: string;
}

interface Checks {
  support: boolean;
  ios: boolean;
  standalone: boolean;
  permission: NotificationPermission | null;
  worker: boolean;
  subscribed: boolean;
  server: number;
}

/**
 * When notifications don't arrive: each step from this browser to the push service, so it's clear
 * where they stop. A test shown here only (no server) separates the device's own settings.
 */
const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? "");

export function PushCheck({ text: tx }: { text: PushCheckText }) {
  const [checks, setChecks] = useState<Checks | null>(null);
  const [busy, setBusy] = useState(false);
  const [local, setLocal] = useState<string | null>(null);
  const [results, setResults] = useState<PushTestResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const support = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1);
      const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
      const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration("/sw.js") : undefined;
      const sub = reg && "pushManager" in reg ? await reg.pushManager.getSubscription() : null;
      setChecks({
        support,
        ios,
        standalone,
        permission: "Notification" in window ? Notification.permission : null,
        worker: !!reg?.active,
        subscribed: !!sub,
        server: await pushDevicesAction(),
      });
    } catch {
      setError(tx.failed);
    } finally {
      setBusy(false);
    }
  };

  const showLocal = async () => {
    setError(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      if (!reg) throw new Error("no worker");
      await reg.showNotification("MOSAIC", { body: tx.testBody, tag: "local-test", icon: "/icon.png" });
      setLocal(tx.localShown);
    } catch {
      setError(tx.failed);
    }
  };

  const sendTest = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await testPushAction();
      setResults(r.results);
      setChecks((c) => (c ? { ...c, server: r.devices } : c));
    } catch {
      setError(tx.failed);
    } finally {
      setBusy(false);
    }
  };

  const mark = (ok: boolean) => <span className={`font-bold ${ok ? "text-teal-700" : "text-rose-700"}`}>{ok ? `✓ ${tx.yes}` : `✗ ${tx.no}`}</span>;
  const row = (label: string, value: React.ReactNode) => (
    <li className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-stone-600">{label}</span>
      <span className="shrink-0 text-right">{value}</span>
    </li>
  );

  return (
    <details className="mt-4 rounded-2xl bg-stone-50 p-3 text-sm ring-1 ring-stone-100" data-testid="push-check" onToggle={(e) => (e.currentTarget.open && !checks ? void run() : undefined)}>
      <summary className="cursor-pointer font-semibold text-stone-700">🩺 {tx.title}</summary>
      {checks ? (
        <div className="mt-2 space-y-3">
          <ul className="divide-y divide-stone-200/70">
            {row(tx.support, mark(checks.support))}
            {checks.ios && row(tx.standalone, mark(checks.standalone))}
            {row(tx.permission, <span className={`font-bold ${checks.permission === "granted" ? "text-teal-700" : "text-rose-700"}`}>{checks.permission ? tx.states[checks.permission] : "—"}</span>)}
            {row(tx.worker, mark(checks.worker))}
            {row(tx.subscribed, mark(checks.subscribed))}
            {row(tx.server, <span className="font-bold text-stone-800">{fill(tx.units, { n: String(checks.server) })}</span>)}
          </ul>
          {checks.worker && checks.permission === "granted" && (
            <div className="space-y-1">
              <button type="button" onClick={() => void showLocal()} className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-800 hover:bg-stone-100">🔔 {tx.localTest}</button>
              <p className="text-xs leading-5 text-stone-500">{local ?? tx.localHelp}</p>
            </div>
          )}
          <div className="space-y-1">
            <button type="button" disabled={busy} onClick={() => void sendTest()} className="rounded-full bg-stone-800 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60">📨 {busy ? tx.working : tx.serverTest}</button>
            <p className="text-xs leading-5 text-stone-500">{tx.serverHelp}</p>
            {results && (
              <div className="space-y-1" data-testid="push-test-results">
                {results.length === 0 ? (
                  <p className="text-xs leading-5 text-rose-700">{tx.noDevices}</p>
                ) : (
                  <>
                    {results.map((r, i) => (
                      <p key={i} className={`break-all text-xs ${r.ok ? "text-teal-800" : "text-rose-700"}`}>{fill(r.ok ? tx.sent : tx.failedSend, { service: r.service, status: r.status === null ? "—" : String(r.status), message: r.message ?? "" })}</p>
                    ))}
                    {results.some((r) => r.ok) && <p className="text-xs leading-5 text-stone-500">{tx.sentHint}</p>}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className="mt-2 text-xs text-stone-400">{busy ? tx.working : ""}</p>
      )}
      {error && <p role="alert" className="mt-2 text-xs text-rose-700">{error}</p>}
    </details>
  );
}
