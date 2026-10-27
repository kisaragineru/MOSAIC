"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isLocale } from "@/lib/i18n/locales";
import { LOCALE_COOKIE } from "@/lib/i18n/server";
import { clearSessionCookie, clientKey, currentUserId, sessionToken, setSessionCookie } from "@/server/auth/session";
import { login, logout, register } from "@/server/services/account";
import { actAsCompanion, endTrial, isTrialEmail, startTrial, trialAccount, trialReturnUser } from "@/server/services/dev-trial";
import { attempt, safeNext, str, withParam } from "./util";

export async function registerAction(form: FormData) {
  const next = safeNext(str(form, "next"));
  // Trying sign-up from settings (development): always a throwaway address, no invite code needed.
  const trial = !!(await trialReturnUser());
  const email = trial && !isTrialEmail(str(form, "email")) ? trialAccount().email : str(form, "email");
  const r = await attempt("register", async () =>
    register(
      { email, password: str(form, "password"), displayName: str(form, "displayName"), locale: str(form, "locale") || "en", inviteCode: trial ? process.env.REGISTRATION_CODE : str(form, "inviteCode") },
      await clientKey(),
    ),
  );
  if (!r.ok) redirect(withParam(`/register?next=${encodeURIComponent(next)}`, "e", r.error));
  await setSessionCookie(r.value);
  // A new account starts with the first-run guide, unless it came from somewhere (e.g. a QR link).
  redirect(next === "/home" ? "/welcome" : next);
}

export async function loginAction(form: FormData) {
  const next = safeNext(str(form, "next"));
  const r = await attempt("login", async () => login({ email: str(form, "email"), password: str(form, "password") }, await clientKey()));
  if (!r.ok) redirect(withParam(`/login?next=${encodeURIComponent(next)}`, "e", r.error));
  await setSessionCookie(r.value);
  redirect(next);
}

export async function logoutAction() {
  const uid = await currentUserId();
  const token = await sessionToken();
  if (uid && token) await attempt("logout", () => logout(uid, token));
  await clearSessionCookie();
  redirect("/login");
}

export async function setLocaleCookieAction(form: FormData) {
  const l = str(form, "locale");
  if (isLocale(l)) (await cookies()).set(LOCALE_COOKIE, l, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  redirect(safeNext(str(form, "back"), "/login"));
}

/** Development: sign out to sign-up with a throwaway account, keeping your own to come back to. */
export async function startTrialAction() {
  const uid = await currentUserId();
  if (!uid) redirect("/login");
  const r = await attempt("dev.trial_start", () => startTrial(uid));
  if (!r.ok) redirect(`/settings?e=${r.error}#dev`);
  redirect("/register");
}

/** Development: sign in as one of your test companions (back with the bar at the top). */
export async function actAsCompanionAction(form: FormData) {
  const uid = await currentUserId();
  if (!uid) redirect("/login");
  const r = await attempt("dev.act_as", () => actAsCompanion(uid, String(form.get("id") ?? "")));
  if (!r.ok) redirect(`/settings?e=${r.error}#dev`);
  redirect("/home");
}

/** Development: back to your own account; the throwaway account is deleted. */
export async function endTrialAction() {
  const back = await endTrial(await currentUserId());
  redirect(back ? "/settings?ok=trial_ended#dev" : "/login");
}
