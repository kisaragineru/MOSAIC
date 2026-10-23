import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { resolveSession, type NewSession } from "../services/account";

const secure = () => (process.env.APP_ORIGIN ?? "").startsWith("https://");
export const sessionCookieName = () => (secure() ? "__Host-mosaic_session" : "mosaic_session");

export async function setSessionCookie(s: NewSession) {
  (await cookies()).set(sessionCookieName(), s.token, {
    httpOnly: true,
    secure: secure(),
    sameSite: "lax",
    path: "/",
    expires: s.expiresAt,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(sessionCookieName());
}

export async function sessionToken(): Promise<string | undefined> {
  return (await cookies()).get(sessionCookieName())?.value;
}

/** Current user id for this request (memoised per request), or null. */
export const currentUserId = cache(async (): Promise<string | null> => resolveSession(await sessionToken()));

export async function requireUser(): Promise<string> {
  const id = await currentUserId();
  if (!id) redirect("/login");
  return id;
}

/**
 * Client IP for rate limiting. Only trusted when TRUST_PROXY=1 (deployed behind a proxy that
 * overwrites X-Forwarded-For). Returns null otherwise; per-account limits still apply.
 */
export async function clientKey(): Promise<string | null> {
  if (process.env.TRUST_PROXY !== "1") return null;
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip");
  return ip || null;
}
