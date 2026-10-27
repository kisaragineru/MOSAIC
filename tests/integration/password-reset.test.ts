import { afterEach, describe, expect, it, vi } from "vitest";
import { Pool } from "pg";
import { login, resolveSession } from "@/server/services/account";
import { issueResetLink, requestResetEmail, resetLinkValid, resetPassword } from "@/server/services/password-reset";
import { TEST_MIGRATION_DATABASE_URL } from "../helpers/test-env";
import { makeUser } from "../helpers/factory";

const env = { ...process.env };
afterEach(() => {
  for (const k of ["ADMIN_EMAILS", "RESEND_API_KEY", "MAIL_FROM", "APP_ORIGIN"] as const) {
    if (env[k] === undefined) delete process.env[k];
    else process.env[k] = env[k];
  }
  vi.unstubAllGlobals();
});
const tokenOf = (url: string) => /#t=([A-Za-z0-9_-]+)$/.exec(url)![1]!;
const NEW = "a brand new long password";

describe("setting a new password with a one-time link", () => {
  it("an admin hands one over; it works once, for an hour, and signs the account out everywhere", async () => {
    const boss = await makeUser("Boss");
    const hana = await makeUser("Hana");
    process.env.ADMIN_EMAILS = boss.email;
    process.env.APP_ORIGIN = "https://mosaicdiary.app";
    await expect(issueResetLink(hana.userId, hana.userId)).rejects.toThrow(); // not an admin

    const url = await issueResetLink(boss.userId, hana.userId);
    expect(url).toMatch(/^https:\/\/mosaicdiary\.app\/reset#t=[A-Za-z0-9_-]{20,}$/);
    const token = tokenOf(url);
    expect(await resetLinkValid(token)).toBe(true);
    // A newer link replaces it.
    const token2 = tokenOf(await issueResetLink(boss.userId, hana.userId));
    expect(await resetLinkValid(token)).toBe(false);

    await expect(resetPassword(token2, "short", null)).rejects.toThrow();
    expect(await resetPassword(token2, NEW, `ip-${Math.random()}`)).toBe(hana.userId);
    // Used once; old password and old sessions gone; the new one works.
    await expect(resetPassword(token2, NEW, `ip-${Math.random()}`)).rejects.toMatchObject({ code: "reset_invalid" });
    expect(await resolveSession(hana.token)).toBeNull();
    await expect(login({ email: hana.email, password: hana.password }, `ip-${Math.random()}`)).rejects.toThrow();
    await expect(login({ email: hana.email, password: NEW }, `ip-${Math.random()}`)).resolves.toHaveProperty("userId", hana.userId);

    // An hour later, an unused link no longer works.
    const token3 = tokenOf(await issueResetLink(boss.userId, hana.userId));
    // (As the owner: the app's role can't touch these rows directly.)
    const owner = new Pool({ connectionString: TEST_MIGRATION_DATABASE_URL });
    await owner.query("update password_resets set expires_at = now() - interval '1 minute' where user_id = $1 and used_at is null", [hana.userId]);
    await owner.end();
    await expect(resetPassword(token3, NEW, `ip-${Math.random()}`)).rejects.toMatchObject({ code: "reset_invalid" });
  });

  it("by email: sent only to an address with an account, saying nothing either way", async () => {
    const hana = await makeUser("Hana");
    await expect(requestResetEmail(hana.email, "ip-x")).rejects.toMatchObject({ code: "reset_unavailable" });
    process.env.RESEND_API_KEY = "re_test";
    process.env.MAIL_FROM = "MOSAIC <hello@mosaicdiary.app>";
    const sent: { to: string[]; subject: string; text: string }[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_u: string, init: RequestInit) => {
      sent.push(JSON.parse(String(init.body)));
      return new Response("{}", { status: 200 });
    }));
    await requestResetEmail("nobody-here@example.test", `ip-${Math.random()}`);
    expect(sent).toEqual([]);
    await requestResetEmail(hana.email.toUpperCase(), `ip-${Math.random()}`);
    expect(sent).toHaveLength(1);
    expect(sent[0]!.to).toEqual([hana.email]);
    expect(sent[0]!.text).toContain("Hana");
    const token = /#t=([A-Za-z0-9_-]+)/.exec(sent[0]!.text)![1]!;
    expect(await resetPassword(token, NEW, `ip-${Math.random()}`)).toBe(hana.userId);
  });
});
