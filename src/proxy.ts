import { NextResponse, type NextRequest } from "next/server";

/** Same length and same characters, compared in constant time. */
function same(a: string, b: string) {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

/**
 * While MOSAIC is shown only to the people trying it: the whole site asks for one shared ID and
 * password (HTTP Basic auth), set in the hosting settings as BASIC_AUTH_USER / BASIC_AUTH_PASSWORD.
 * The browser asks once and remembers; links (with their #fragment) open as they are after it.
 * Unset: no gate.
 */
function gate(request: NextRequest): NextResponse | null {
  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASSWORD;
  if (!user || !pass) return null;
  const header = request.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    try {
      const [u, ...rest] = atob(header.slice(6)).split(":");
      if (same(u ?? "", user) && same(rest.join(":"), pass)) return null;
    } catch {}
  }
  return new NextResponse("Authentication required", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="MOSAIC", charset="UTF-8"', "Cache-Control": "no-store" } });
}

/**
 * Fetched by the browser itself, often without the password it remembers (the app manifest, its
 * icons, the service worker that shows notifications): open, as they say nothing about anyone.
 */
const OPEN = new Set(["/manifest.webmanifest", "/sw.js", "/icon.png", "/apple-icon.png"]);

/** Per-request CSP nonce + security headers (see docs/SECURITY.md). */
export function proxy(request: NextRequest) {
  if (OPEN.has(request.nextUrl.pathname)) return NextResponse.next();
  const denied = gate(request);
  if (denied) return denied;
  // Prefetches pass through the gate above, then go on as they always did (no nonce of their own).
  if (request.headers.get("next-router-prefetch") || request.headers.get("purpose") === "prefetch") return NextResponse.next();
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";
  const https = (process.env.APP_ORIGIN ?? "").startsWith("https://");
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' blob: data:",
    // Recorded videos play from here; a chosen video is read locally (blob:) for its first frame.
    "media-src 'self' blob:",
    "font-src 'self'",
    "connect-src 'self'",
    // The service worker for push notifications (/sw.js).
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(https ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "same-origin");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()");
  response.headers.set("Cache-Control", "private, no-store");
  if (https) response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  return response;
}

export const config = {
  matcher: [
    // Prefetches too, so nothing gets past the gate (see proxy()).
    { source: "/((?!_next/static|_next/image|favicon.ico|icon.svg).*)" },
  ],
};
