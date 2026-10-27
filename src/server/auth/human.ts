/**
 * Keeping sign-up for people. Three checks, none of which asks anything of a person:
 * - a field people never see (bots fill every field);
 * - the time since the form was shown, signed by the server: a person takes more than a few
 *   seconds (SIGNUP_MIN_SECONDS, default 3);
 * - Cloudflare Turnstile, when its keys are set (TURNSTILE_SITE_KEY / TURNSTILE_SECRET_KEY): a
 *   check in the background, rarely a click, no puzzles.
 */
import "server-only";
import { createHmac } from "node:crypto";
import { safeEqual } from "./crypto";

export const HONEYPOT = "website";

export const turnstileSiteKey = () => (process.env.TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY ? process.env.TURNSTILE_SITE_KEY : null);

const secret = () => `${process.env.RATE_LIMIT_SALT ?? "mosaic"}:form-time`;
const sign = (t: string) => createHmac("sha256", secret()).update(t).digest("base64url");

/** The value for the form's hidden "shown at" field. */
export function formStamp(now = Date.now()): string {
  const t = String(now);
  return `${t}.${sign(t)}`;
}

const minMs = () => Math.max(0, Number(process.env.SIGNUP_MIN_SECONDS ?? 3)) * 1000;

/** null: looks like a person. Otherwise why not (for logs; the person sees one plain message). */
export async function notHuman(form: FormData, ip: string | null, now = Date.now()): Promise<string | null> {
  if (String(form.get(HONEYPOT) ?? "").trim()) return "honeypot";
  const [t, sig] = String(form.get("shown") ?? "").split(".");
  if (!t || !sig || !safeEqual(sig, sign(t))) return "stamp";
  const age = now - Number(t);
  if (!(age >= minMs()) || age > 24 * 60 * 60 * 1000) return "too_fast_or_stale";
  if (turnstileSiteKey()) {
    const token = String(form.get("cf-turnstile-response") ?? "");
    if (!token) return "turnstile_missing";
    try {
      const body = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY!, response: token, ...(ip ? { remoteip: ip } : {}) });
      const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body, signal: AbortSignal.timeout(8000) });
      const j = (await r.json()) as { success?: boolean };
      if (!j.success) return "turnstile_failed";
    } catch {
      return "turnstile_unreachable";
    }
  }
  return null;
}
