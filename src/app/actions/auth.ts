"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isLocale } from "@/lib/i18n/locales";
import { LOCALE_COOKIE } from "@/lib/i18n/server";
import { clearSessionCookie, clientKey, currentUserId, sessionToken, setSessionCookie } from "@/server/auth/session";
import { login, logout, register } from "@/server/services/account";
import { attempt, safeNext, str, withParam } from "./util";

export async function registerAction(form: FormData) {
  const next = safeNext(str(form, "next"));
  const r = await attempt("register", async () =>
    register(
      { email: str(form, "email"), password: str(form, "password"), displayName: str(form, "displayName"), locale: str(form, "locale") || "en", inviteCode: str(form, "inviteCode") },
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
