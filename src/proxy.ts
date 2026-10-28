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
 * icons, the service worker that shows notifications), or needed by anyone before signing in
 * (the privacy policy and terms, which sign-in providers check): open, as they say nothing about anyone.
 */
const OPEN = new Set(["/manifest.webmanifest", "/sw.js", "/icon.png", "/apple-icon.png", "/privacy", "/terms"]);
/** The open pages (not files): they go on with their security headers. */
const OPEN_PAGES = new Set(["/privacy", "/terms"]);

/**
 * What scanners look for on any site (secrets, other software's admin pages): MOSAIC has none of
 * it, so it is turned away at once, before anything renders and before the password gate.
 */
const PROBE = [
  /\/\.(?!well-known\/)/, // dotfiles and folders: /.env, /.git/config, /.DS_Store, /.aws/…
  /\.(php\d?|aspx?|jsp|cgi|env|sql|bak|old|ini|sh|log)$/i,
  /^\/(wp-|wordpress|phpmyadmin|pma|cgi-bin|actuator|vendor\/|ecp\/|owa\/|autodiscover|server-status|xmlrpc|boaform|hnap1)/i,
];
export const isProbe = (path: string) => PROBE.some((r) => r.test(path));

/**
 * The site's own address is APP_ORIGIN. Its default netlify.app address (not a branch or preview
 * deploy's, which carry "--") sends people there, keeping the path: old links and the installed
 * app keep working. Done here because this runs before the host's own redirect rules.
 */
function canonical(request: NextRequest): NextResponse | null {
  const origin = process.env.APP_ORIGIN;
  if (!origin) return null;
  const host = request.headers.get("host") ?? request.nextUrl.host;
  let target: URL;
  try {
    target = new URL(origin);
  } catch {
    return null;
  }
  if (host === target.host || !host.endsWith(".netlify.app") || host.includes("--")) return null;
  const to = new URL(request.nextUrl.pathname + request.nextUrl.search, target);
  return NextResponse.redirect(to, request.method === "GET" || request.method === "HEAD" ? 301 : 308);
}

/** Per-request CSP nonce + security headers (see docs/SECURITY.md). */
export function proxy(request: NextRequest) {
  const moved = canonical(request);
  if (moved) return moved;
  if (isProbe(request.nextUrl.pathname)) return new NextResponse("Not found", { status: 404, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  const open = OPEN.has(request.nextUrl.pathname);
  // Static files: as they are. The policy page goes on below, with its security headers.
  if (open && !OPEN_PAGES.has(request.nextUrl.pathname)) return NextResponse.next();
  const denied = open ? null : gate(request);
  if (denied) return denied;
  // Prefetches pass through the gate above, then go on as they always did (no nonce of their own).
  if (request.headers.get("next-router-prefetch") || request.headers.get("purpose") === "prefetch") return NextResponse.next();
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";
  const https = (process.env.APP_ORIGIN ?? "").startsWith("https://");
  const turnstile = !!(process.env.TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY);
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' blob: data:",
    // Recorded videos play from here; a chosen video is read locally (blob:) for its first frame.
    "media-src 'self' blob:",
    "font-src 'self'",
    // Cloudflare Turnstile on sign-up, when its keys are set.
    `connect-src 'self'${turnstile ? " https://challenges.cloudflare.com" : ""}`,
    `frame-src ${turnstile ? "https://challenges.cloudflare.com" : "'none'"}`,
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
    // Prefetches too, so nothing gets past the gate (see proxy()). The app's own pictures (logo,
    // type illustrations) say nothing about anyone: served straight from the CDN, cached.
    { source: "/((?!_next/static|_next/image|favicon.ico|icon.svg|brand/|tuvi-types/).*)" },
  ],
};
