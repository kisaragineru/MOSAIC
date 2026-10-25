import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/app/actions/util";
import { authorizationUrl, isProvider, OAUTH_COOKIE } from "@/server/auth/oauth";

export const dynamic = "force-dynamic";

/** Send the browser to Google or Facebook, remembering where it was going (and any invite code). */
export async function GET(req: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  const url = new URL(req.url);
  const next = safeNext(url.searchParams.get("next") ?? undefined);
  const from = url.searchParams.get("from") === "register" ? "/register" : "/login";
  const back = (e: string) => NextResponse.redirect(new URL(`${from}?next=${encodeURIComponent(next)}&e=${e}`, url.origin), 303);
  if (!isProvider(provider)) return back("oauth_unavailable");
  const a = authorizationUrl(provider, url.origin);
  if (!a) return back("oauth_unavailable");
  const invite = (url.searchParams.get("invite") ?? "").slice(0, 200);
  (await cookies()).set(OAUTH_COOKIE, JSON.stringify({ p: provider, s: a.state, v: a.verifier, n: next, i: invite, f: from }), {
    httpOnly: true,
    secure: url.protocol === "https:",
    // "lax" so the cookie comes back on the provider's top-level redirect to the callback.
    sameSite: "lax",
    path: "/api/auth",
    maxAge: 600,
  });
  return NextResponse.redirect(a.url, 303);
}
