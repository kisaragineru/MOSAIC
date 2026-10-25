import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

// The stand-in provider (tests/e2e/og-server.mjs) signs in as whoever the test names next.
const provider = "http://127.0.0.1:4599";
const nextAccount = (p: "google" | "facebook", who: Record<string, string>) => fetch(`${provider}/${p}/next?${new URLSearchParams(who)}`);
const ctxOpts = () => ({ locale: "ja-JP", extraHTTPHeaders: { "Accept-Language": "ja-JP,ja;q=0.9", "x-e2e-client-ip": `10.4.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` } });

test("sign up with Google, then sign in with it again", async ({ browser }) => {
  const ctx = await browser.newContext(ctxOpts());
  const page = await ctx.newPage();
  const sub = `g-${randomUUID()}`;
  await nextAccount("google", { sub, email: `${sub}@example.test`, name: "ハナ" });
  await page.goto("/register");
  await expect(page.getByTestId("oauth-buttons")).toBeVisible();
  await page.getByRole("link", { name: "Googleで続ける" }).click();
  // A new account starts with the welcome guide, named from the Google account.
  await page.waitForURL(/\/welcome$/);
  await expect(page.getByRole("heading", { name: "ようこそ、ハナさん" })).toBeVisible();

  await ctx.clearCookies();
  await page.goto("/login");
  await page.getByRole("link", { name: "Googleで続ける" }).click();
  await page.waitForURL(/\/home$/);
  await expect(page.getByRole("heading", { level: 1, name: /ハナ/ })).toBeVisible();
  await ctx.close();
});

test("Facebook: an account without an email; saying no on Facebook; a forged return is refused", async ({ browser }) => {
  const ctx = await browser.newContext(ctxOpts());
  const page = await ctx.newPage();
  await nextAccount("facebook", { sub: `f-${randomUUID()}`, name: "ソラ" });
  await page.goto("/register");
  await page.getByRole("link", { name: "Facebookで続ける" }).click();
  await page.waitForURL(/\/welcome$/);
  await expect(page.getByRole("heading", { name: "ようこそ、ソラさん" })).toBeVisible();

  await ctx.clearCookies();
  await nextAccount("facebook", { deny: "1" });
  await page.goto("/login");
  await page.getByRole("link", { name: "Facebookで続ける" }).click();
  await page.waitForURL(/\/login\?/);
  await expect(page.getByText("ログインがキャンセルされました。")).toBeVisible();

  // A return this browser didn't start (no matching state) signs no one in.
  await page.goto("/api/auth/google/callback?code=stolen&state=guess");
  await page.waitForURL(/\/login\?/);
  await expect(page.getByText("ログインできませんでした。もう一度お試しください。")).toBeVisible();
  await page.goto("/home");
  await page.waitForURL(/\/login/);
  await ctx.close();
});
