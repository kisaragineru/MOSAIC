/**
 * Development only (DEV_TOOLS=on): try sign-up and the welcome guide from the start without making
 * real test accounts by hand. Starting keeps your own session aside (in its own cookie) and signs
 * you out to the sign-up page, filled in with a throwaway account; going back deletes that
 * account and signs you in as yourself again.
 */
import type { Locale } from "@/lib/i18n/locales";
import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { users } from "../db/schema";
import { withUser } from "../db/tx";
import { AppError } from "../errors";
import { sessionCookieName, sessionToken } from "../auth/session";
import { issueSession, resolveSession, SESSION_TTL_DAYS } from "./account";
import { devToolsEnabled, ownCompanion } from "./dev-companion";

/** Trial accounts use this address domain (".invalid" can never receive mail). */
export const TRIAL_DOMAIN = "trial.mosaic.invalid";
const RETURN_COOKIE = "mosaic_trial_return";

const secure = () => (process.env.APP_ORIGIN ?? "").startsWith("https://");

/** Sign out to sign-up, keeping your own session to come back to. */
export async function startTrial(userId: string) {
  if (!devToolsEnabled()) throw new AppError("not_found", 404);
  const token = await sessionToken();
  if (!token || (await resolveSession(token)) !== userId) throw new AppError("unauthorized", 401);
  const jar = await cookies();
  jar.set(RETURN_COOKIE, token, { httpOnly: true, secure: secure(), sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 });
  jar.delete(sessionCookieName());
}

/**
 * Sign in as one of your test companions (to set their photo, reply as them, see what they see).
 * Your own session waits aside as for a trial; going back leaves the companion as it is.
 */
export async function actAsCompanion(userId: string, companionId: string) {
  if (!devToolsEnabled()) throw new AppError("not_found", 404);
  const cid = await ownCompanion(userId, companionId);
  const token = await sessionToken();
  if (!token || (await resolveSession(token)) !== userId) throw new AppError("unauthorized", 401);
  const s = await issueSession(cid);
  const jar = await cookies();
  jar.set(RETURN_COOKIE, token, { httpOnly: true, secure: secure(), sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 });
  jar.set(sessionCookieName(), s.token, { httpOnly: true, secure: secure(), sameSite: "lax", path: "/", expires: s.expiresAt });
}

/** The account a trial will return to, when one is in progress. */
export async function trialReturnUser(): Promise<string | null> {
  if (!devToolsEnabled()) return null;
  return resolveSession((await cookies()).get(RETURN_COOKIE)?.value);
}

/** A throwaway account to sign up with. */
export function trialAccount(locale: Locale = "ja") {
  const id = randomBytes(4).toString("hex");
  // Named in the language the trial runs in, so the guide reads as one language.
  return { displayName: `${{ ja: "テスト", en: "Trial ", vi: "Thử " }[locale]}${id.slice(0, 3)}`, email: `trial-${id}@${TRIAL_DOMAIN}`, password: randomBytes(12).toString("base64url") };
}

export const isTrialEmail = (email: string) => email.toLowerCase().endsWith(`@${TRIAL_DOMAIN}`);

/**
 * Back to your own account: the trial account you are in (only one made for a trial) is deleted,
 * and your own session is restored. Returns false when there is nothing to go back to.
 */
export async function endTrial(currentUserId: string | null): Promise<boolean> {
  const jar = await cookies();
  const back = jar.get(RETURN_COOKIE)?.value;
  const owner = await resolveSession(back);
  if (currentUserId && currentUserId !== owner) {
    const [u] = await withUser(currentUserId, (tx) => tx.select({ email: users.email }).from(users).where(eq(users.id, currentUserId)));
    if (u && isTrialEmail(u.email)) await withUser(currentUserId, (tx) => tx.delete(users).where(eq(users.id, currentUserId)));
  }
  jar.delete(RETURN_COOKIE);
  if (!owner || !back) {
    jar.delete(sessionCookieName());
    return false;
  }
  jar.set(sessionCookieName(), back, { httpOnly: true, secure: secure(), sameSite: "lax", path: "/", expires: new Date(Date.now() + SESSION_TTL_DAYS * 86_400_000) });
  return true;
}
