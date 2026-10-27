import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

const env = { ...process.env };
afterEach(() => {
  for (const k of ["BASIC_AUTH_USER", "BASIC_AUTH_PASSWORD"] as const) {
    if (env[k] === undefined) delete process.env[k];
    else process.env[k] = env[k];
  }
});
const req = (headers: Record<string, string> = {}) => new NextRequest("http://localhost/w/abc", { headers });
const basic = (u: string, p: string) => `Basic ${btoa(`${u}:${p}`)}`;

describe("the site's shared ID and password (while trying it out)", () => {
  it("is off unless both are set", () => {
    delete process.env.BASIC_AUTH_USER;
    delete process.env.BASIC_AUTH_PASSWORD;
    expect(proxy(req()).status).toBe(200);
  });

  it("asks for them, lets the right ones in, and leaves no way around (prefetches too)", () => {
    process.env.BASIC_AUTH_USER = "tester";
    process.env.BASIC_AUTH_PASSWORD = "pa:ss word";
    const r = proxy(req());
    expect(r.status).toBe(401);
    expect(r.headers.get("www-authenticate")).toContain("Basic");
    expect(proxy(req({ authorization: basic("tester", "wrong") })).status).toBe(401);
    expect(proxy(req({ authorization: basic("someone", "pa:ss word") })).status).toBe(401);
    expect(proxy(req({ authorization: "Basic !!!" })).status).toBe(401);
    expect(proxy(req({ purpose: "prefetch" })).status).toBe(401);
    expect(proxy(req({ authorization: basic("tester", "pa:ss word") })).status).toBe(200);
  });

  it("leaves open only what the browser fetches by itself (app manifest, icons, the notification worker)", () => {
    process.env.BASIC_AUTH_USER = "tester";
    process.env.BASIC_AUTH_PASSWORD = "secret";
    for (const p of ["/manifest.webmanifest", "/sw.js", "/icon.png", "/apple-icon.png"]) expect(proxy(new NextRequest(`http://localhost${p}`)).status).toBe(200);
    for (const p of ["/sw.js/x", "/home", "/api/dm/x/icon", "/icon.png.txt"]) expect(proxy(new NextRequest(`http://localhost${p}`)).status).toBe(401);
    // The privacy policy is open to anyone (sign-in providers check it), with its security headers.
    const policy = proxy(new NextRequest("http://localhost/privacy"));
    expect(policy.status).toBe(200);
    expect(policy.headers.get("content-security-policy")).toContain("default-src 'self'");
    expect(proxy(new NextRequest("http://localhost/privacy/x")).status).toBe(401);
    expect(proxy(new NextRequest("http://localhost/terms")).status).toBe(200);
    const csp = proxy(req({ authorization: basic("tester", "secret") })).headers.get("content-security-policy")!;
    expect(csp).toContain("worker-src 'self'");
  });
});

describe("scanners' requests", () => {
  it("are turned away at once (404), without the password and without rendering", async () => {
    const { isProbe } = await import("@/proxy");
    process.env.BASIC_AUTH_USER = "tester";
    process.env.BASIC_AUTH_PASSWORD = "secret";
    for (const p of ["/.env", "/.git/config", "/.DS_Store", "/wp-login.php", "/index.php", "/phpmyadmin/", "/actuator/env", "/ecp/Current/x", "/backup.sql", "/cgi-bin/x", "/config.bak"]) {
      expect(isProbe(p)).toBe(true);
      expect(proxy(new NextRequest(`http://localhost${p}`)).status).toBe(404);
    }
    // MOSAIC's own pages and files are not caught.
    for (const p of ["/", "/home", "/w/abc_DEF-123", "/s", "/privacy", "/api/dm/x/icon", "/sw.js", "/manifest.webmanifest", "/tuvi-types/people/x-m.webp", "/.well-known/security.txt", "/me/privacy/records", "/admin/users"]) expect(isProbe(p)).toBe(false);
  });
});

describe("the old netlify.app address", () => {
  it("sends people to the site's own domain, keeping the path; previews and other hosts stay", () => {
    const before = process.env.APP_ORIGIN;
    process.env.APP_ORIGIN = "https://mosaicdiary.app";
    try {
      const r = proxy(new NextRequest("https://mosaic-test-3008fa.netlify.app/w/abc?open=1", { headers: { host: "mosaic-test-3008fa.netlify.app" } }));
      expect(r.status).toBe(301);
      expect(r.headers.get("location")).toBe("https://mosaicdiary.app/w/abc?open=1");
      const post = proxy(new NextRequest("https://mosaic-test-3008fa.netlify.app/login", { method: "POST", headers: { host: "mosaic-test-3008fa.netlify.app" } }));
      expect(post.status).toBe(308);
      delete process.env.BASIC_AUTH_USER;
      delete process.env.BASIC_AUTH_PASSWORD;
      for (const host of ["claude-x--mosaic-test-3008fa.netlify.app", "mosaicdiary.app", "localhost:3100"]) {
        expect(proxy(new NextRequest(`https://${host}/home`, { headers: { host } })).status).toBe(200);
      }
    } finally {
      if (before === undefined) delete process.env.APP_ORIGIN;
      else process.env.APP_ORIGIN = before;
    }
  });
});
