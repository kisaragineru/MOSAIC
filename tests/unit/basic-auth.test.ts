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
});
