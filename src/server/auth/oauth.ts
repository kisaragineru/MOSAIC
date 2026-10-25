/**
 * Sign-in with Google or Facebook (OAuth 2.0 authorization code flow). Server-only: secrets never
 * reach the browser. A provider is offered only when its id and secret are set in the environment.
 *
 * Google is OpenID Connect with PKCE; Facebook is plain OAuth with the unversioned Graph endpoints
 * (they follow Facebook's oldest supported version, so no version string goes stale here).
 */
import "server-only";
import { createHash, randomBytes } from "node:crypto";

export const PROVIDERS = ["google", "facebook"] as const;

/** The cookie that carries one sign-in's state across the trip to the provider (10 minutes). */
export const OAUTH_COOKIE = "mosaic_oauth";
export type Provider = (typeof PROVIDERS)[number];

export interface OAuthProfile {
  provider: Provider;
  /** The provider's stable id for the account. */
  subject: string;
  email: string | null;
  /** True only when the provider vouches that the address belongs to this account. */
  emailVerified: boolean;
  name: string | null;
}

// Local tests point both providers at a stand-in server (never set outside tests).
const TEST_BASE = process.env.OAUTH_TEST_BASE;

const ENDPOINTS: Record<Provider, { auth: string; token: string; profile: string }> = TEST_BASE
  ? {
      google: { auth: `${TEST_BASE}/google/auth`, token: `${TEST_BASE}/google/token`, profile: `${TEST_BASE}/google/userinfo` },
      facebook: { auth: `${TEST_BASE}/facebook/auth`, token: `${TEST_BASE}/facebook/token`, profile: `${TEST_BASE}/facebook/me` },
    }
  : {
      google: { auth: "https://accounts.google.com/o/oauth2/v2/auth", token: "https://oauth2.googleapis.com/token", profile: "https://openidconnect.googleapis.com/v1/userinfo" },
      facebook: { auth: "https://www.facebook.com/dialog/oauth", token: "https://graph.facebook.com/oauth/access_token", profile: "https://graph.facebook.com/me" },
    };

function credentials(p: Provider): { id: string; secret: string } | null {
  const id = p === "google" ? process.env.GOOGLE_CLIENT_ID : process.env.FACEBOOK_APP_ID;
  const secret = p === "google" ? process.env.GOOGLE_CLIENT_SECRET : process.env.FACEBOOK_APP_SECRET;
  return id && secret ? { id, secret } : null;
}

export function isProvider(v: string): v is Provider {
  return (PROVIDERS as readonly string[]).includes(v);
}

/** The providers this deployment can offer (their keys are set). */
export function enabledProviders(): Provider[] {
  return PROVIDERS.filter((p) => credentials(p) !== null);
}

export function redirectUri(p: Provider, origin: string) {
  return `${process.env.APP_ORIGIN || origin}/api/auth/${p}/callback`;
}

const b64url = (b: Buffer) => b.toString("base64url");

/** Where to send the browser, and the values to remember (in a short-lived cookie) until it returns. */
export function authorizationUrl(p: Provider, origin: string): { url: string; state: string; verifier: string } | null {
  const c = credentials(p);
  if (!c) return null;
  const state = b64url(randomBytes(24));
  const verifier = b64url(randomBytes(32));
  const u = new URL(ENDPOINTS[p].auth);
  u.searchParams.set("client_id", c.id);
  u.searchParams.set("redirect_uri", redirectUri(p, origin));
  u.searchParams.set("response_type", "code");
  u.searchParams.set("state", state);
  if (p === "google") {
    u.searchParams.set("scope", "openid email profile");
    u.searchParams.set("code_challenge", b64url(createHash("sha256").update(verifier).digest()));
    u.searchParams.set("code_challenge_method", "S256");
    u.searchParams.set("prompt", "select_account");
  } else {
    u.searchParams.set("scope", "email,public_profile");
  }
  return { url: u.toString(), state, verifier };
}

async function json(r: Response): Promise<Record<string, unknown>> {
  if (!r.ok) throw new Error(`oauth_http_${r.status}`);
  return (await r.json()) as Record<string, unknown>;
}

/** Trade the returned code for the account's profile. Throws on any failure (the caller says so). */
export async function fetchProfile(p: Provider, code: string, verifier: string, origin: string): Promise<OAuthProfile> {
  const c = credentials(p);
  if (!c) throw new Error("oauth_unavailable");
  const signal = AbortSignal.timeout(10_000);
  const body = new URLSearchParams({ client_id: c.id, client_secret: c.secret, code, redirect_uri: redirectUri(p, origin) });
  if (p === "google") {
    body.set("grant_type", "authorization_code");
    body.set("code_verifier", verifier);
  }
  const token = await json(await fetch(ENDPOINTS[p].token, { method: "POST", body, headers: { Accept: "application/json" }, signal, cache: "no-store" }));
  const access = typeof token.access_token === "string" ? token.access_token : null;
  if (!access) throw new Error("oauth_no_token");
  if (p === "google") {
    const u = await json(await fetch(ENDPOINTS.google.profile, { headers: { Authorization: `Bearer ${access}` }, signal, cache: "no-store" }));
    if (typeof u.sub !== "string" || !u.sub) throw new Error("oauth_no_subject");
    return { provider: p, subject: u.sub, email: typeof u.email === "string" ? u.email : null, emailVerified: u.email_verified === true, name: typeof u.name === "string" ? u.name : null };
  }
  const me = new URL(ENDPOINTS.facebook.profile);
  me.searchParams.set("fields", "id,name,email");
  const u = await json(await fetch(me, { headers: { Authorization: `Bearer ${access}` }, signal, cache: "no-store" }));
  if (typeof u.id !== "string" || !u.id) throw new Error("oauth_no_subject");
  // Facebook does not say whether the address is verified, so it is never used to join existing accounts.
  return { provider: p, subject: u.id, email: typeof u.email === "string" ? u.email : null, emailVerified: false, name: typeof u.name === "string" ? u.name : null };
}
