import { afterEach, describe, expect, it, vi } from "vitest";
import { formStamp, HONEYPOT, notHuman } from "@/server/auth/human";

const env = { ...process.env };
afterEach(() => {
  for (const k of ["SIGNUP_MIN_SECONDS", "TURNSTILE_SITE_KEY", "TURNSTILE_SECRET_KEY"] as const) {
    if (env[k] === undefined) delete process.env[k];
    else process.env[k] = env[k];
  }
  vi.unstubAllGlobals();
});

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};
const now = 1_800_000_000_000;

describe("keeping sign-up for people", () => {
  it("lets a person through: nothing in the hidden field, a few seconds on the form", async () => {
    delete process.env.SIGNUP_MIN_SECONDS;
    expect(await notHuman(form({ shown: formStamp(now - 8000), [HONEYPOT]: "" }), null, now)).toBeNull();
  });

  it("turns away what bots do: fill every field, post at once, forge or reuse old forms", async () => {
    delete process.env.SIGNUP_MIN_SECONDS;
    expect(await notHuman(form({ shown: formStamp(now - 8000), [HONEYPOT]: "http://spam.example" }), null, now)).toBe("honeypot");
    expect(await notHuman(form({ shown: formStamp(now - 500) }), null, now)).toBe("too_fast_or_stale");
    expect(await notHuman(form({ shown: formStamp(now - 2 * 86_400_000) }), null, now)).toBe("too_fast_or_stale");
    expect(await notHuman(form({ shown: `${now - 9000}.forged` }), null, now)).toBe("stamp");
    expect(await notHuman(form({}), null, now)).toBe("stamp");
  });

  it("asks Cloudflare Turnstile when its keys are set", async () => {
    process.env.TURNSTILE_SITE_KEY = "site";
    process.env.TURNSTILE_SECRET_KEY = "secret";
    const shown = formStamp(now - 8000);
    expect(await notHuman(form({ shown }), null, now)).toBe("turnstile_missing");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ success: true }))));
    expect(await notHuman(form({ shown, "cf-turnstile-response": "tok" }), "1.2.3.4", now)).toBeNull();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ success: false }))));
    expect(await notHuman(form({ shown, "cf-turnstile-response": "tok" }), null, now)).toBe("turnstile_failed");
  });
});
