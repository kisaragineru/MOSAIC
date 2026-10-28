import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/app/actions/util";
import { getLocale } from "@/lib/i18n/server";
import { fetchProfile, isProvider, OAUTH_COOKIE } from "@/server/auth/oauth";
import { clientKey, setSessionCookie } from "@/server/auth/session";
import { AppError } from "@/server/errors";
import { logError } from "@/server/log";
import { signInWithIdentity } from "@/server/services/account";

export const dynamic = "force-dynamic";

/** Back from Google or Facebook: check it is the sign-in this browser started, then sign in. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  const url = new URL(req.url);
  const jar = await cookies();
  const raw = jar.get(OAUTH_COOKIE)?.value;
  jar.delete({ name: OAUTH_COOKIE, path: "/api/auth" });
  let saved: { p?: string; s?: string; v?: string; n?: string; i?: string; w?: string; f?: string } = {};
  try {
    saved = raw ? JSON.parse(raw) : {};
  } catch {
    saved = {};
  }
  const from = saved.f === "/register" ? "/register" : "/login";
  const next = safeNext(saved.n);
  const back = (e: string) => NextResponse.redirect(new URL(`${from}?next=${encodeURIComponent(next)}&e=${e}`, url.origin), 303);
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  // The person said no on the provider's page.
  if (url.searchParams.get("error")) return back("oauth_cancelled");
  // Only the browser that started this sign-in can finish it (CSRF / login fixation).
  if (!isProvider(provider) || saved.p !== provider || !saved.s || !state || state !== saved.s || !code || !saved.v) return back("oauth_failed");
  try {
    const profile = await fetchProfile(provider, code, saved.v, url.origin);
    const r = await signInWithIdentity(profile, { inviteCode: saved.i, invite: saved.w, locale: await getLocale(), clientKey: await clientKey() });
    await setSessionCookie(r.session);
    // A new account starts with the first-run guide, unless it came from somewhere (e.g. a QR link).
    return NextResponse.redirect(new URL(r.created && next === "/home" ? "/welcome" : next, url.origin), 303);
  } catch (e) {
    // Signing in with an account that isn't here yet, while sign-up is by invitation: not an
    // error, just the wrong door. Sign-up says so warmly and asks for the code.
    if (e instanceof AppError && e.code === "invite_required" && from === "/login")
      return NextResponse.redirect(new URL(`/register?next=${encodeURIComponent(next)}&new=1`, url.origin), 303);
    if (e instanceof AppError) return back(e.code);
    logError(`oauth.${provider}`, e);
    return back("oauth_failed");
  }
}
