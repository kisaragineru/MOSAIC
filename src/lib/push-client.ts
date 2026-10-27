"use client";
import { subscribePushAction } from "@/app/actions/push";

/**
 * Push notifications on this device, for the browser side: what state it's in, and turning them
 * on. The state is also kept in a cookie (mosaic_push) so Home knows whether suggesting them
 * makes sense on this device: ready (could be turned on now), on, or na (can't: unsupported, an
 * iPhone tab outside the home screen, or blocked).
 */
export type PushDeviceState = "ready" | "on" | "na";
export const PUSH_COOKIE = "mosaic_push";

export const isIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1);
export const standalone = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
export const pushSupported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

/** The public key as the Push API wants it (bytes from base64url). */
export function keyBytes(b64: string) {
  const s = (b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

export async function pushDeviceState(): Promise<PushDeviceState> {
  if (!pushSupported() || Notification.permission === "denied") return "na";
  const reg = await navigator.serviceWorker.getRegistration("/sw.js");
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  return sub ? "on" : "ready";
}

export function rememberPushState(state: PushDeviceState) {
  try {
    document.cookie = `${PUSH_COOKIE}=${state}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax${location.protocol === "https:" ? "; secure" : ""}`;
  } catch {}
}

/** Ask the browser, subscribe, and tell the server. */
export async function enablePush(publicKey: string): Promise<"on" | "denied" | "dismissed" | "failed"> {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      if (permission === "denied") rememberPushState("na");
      return permission === "denied" ? "denied" : "dismissed";
    }
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
    const r = await subscribePushAction(sub.toJSON());
    if (!r.ok) {
      await sub.unsubscribe();
      return "failed";
    }
    rememberPushState("on");
    return "on";
  } catch {
    return "failed";
  }
}
