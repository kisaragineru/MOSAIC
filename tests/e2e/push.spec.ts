import { randomUUID } from "node:crypto";
import { devices, expect, test, type Browser } from "@playwright/test";

test.use({ locale: "ja-JP", extraHTTPHeaders: { "Accept-Language": "ja-JP,ja;q=0.9" } });

async function signUp(browser: Browser, opts: Parameters<Browser["newContext"]>[0] = {}) {
  const ctx = await browser.newContext({ locale: "ja-JP", ...opts, extraHTTPHeaders: { "Accept-Language": "ja-JP,ja;q=0.9", "x-e2e-client-ip": `10.61.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` } });
  const page = await ctx.newPage();
  await page.goto("/register");
  await page.getByLabel("なんと呼べばいいですか？").fill("ハナ");
  await page.getByLabel("メールアドレス").fill(`${randomUUID().slice(0, 8)}@example.test`);
  await page.getByLabel(/^パスワード/).fill("e2e correct horse battery");
  await page.getByRole("button", { name: "アカウントを作成" }).click();
  await page.waitForURL(/welcome/);
  return page;
}

test("notifications are offered in Settings, off until turned on; the app can go on the home screen", async ({ browser }) => {
  const page = await signUp(browser, { ...devices["Pixel 7"] });
  await page.goto("/settings#push");
  const card = page.locator("#push");
  await expect(card.getByText("スマホへの通知")).toBeVisible();
  await expect(card.getByText(/メッセージが届いたときだけ/)).toBeVisible();
  await expect(card.getByTestId("push-toggle")).toContainText("この端末には通知しません");
  await expect(card.getByRole("button", { name: "通知をオンにする" })).toBeVisible();
  await expect(card.getByText("通知を受け取っている端末：0台")).toBeVisible();

  // Showing the text is a choice, off by default.
  const preview = card.getByLabel("通知にメッセージの文面も表示する");
  await expect(preview).not.toBeChecked();
  await preview.check();
  await card.getByRole("button", { name: "保存" }).click();
  await page.waitForURL(/settings\?ok=saved/);
  await expect(page.locator("#push").getByLabel("通知にメッセージの文面も表示する")).toBeChecked();

  // The check: each step, and a test send that says there's no device yet.
  const check = page.locator("#push").getByTestId("push-check");
  await check.getByText("うまく届かないとき（診断）").click();
  await expect(check.getByText("このブラウザは通知に対応")).toBeVisible();
  await expect(check.getByText("通知の許可")).toBeVisible();
  await expect(check.getByText("サーバーに登録された端末")).toBeVisible();
  await check.getByRole("button", { name: /自分にテスト通知を送る/ }).click();
  await expect(check.getByTestId("push-test-results")).toContainText("通知をオンにした端末が登録されていません");

  // The service worker and the manifest are served.
  const sw = await page.request.get("/sw.js");
  expect(sw.status()).toBe(200);
  expect(await sw.text()).toContain("showNotification");
  const manifest = await (await page.request.get("/manifest.webmanifest")).json();
  expect(manifest).toMatchObject({ name: "MOSAIC", display: "standalone", start_url: "/home" });
  // Android crops the maskable icon to its own shape; every listed icon is served.
  expect(manifest.icons).toContainEqual(expect.objectContaining({ src: "/icon-maskable.png", purpose: "maskable" }));
  for (const icon of manifest.icons as { src: string }[]) expect((await page.request.get(icon.src)).status()).toBe(200);
});

test("the app manifest's description follows the browser's language", async ({ playwright, baseURL }) => {
  // The browser fetches the manifest without cookies, so only Accept-Language is there.
  for (const [lang, tagline] of [["ja", "ひとかけらずつ、あなたになる。"], ["vi", "Từng mảnh nhỏ, thành chính bạn."], ["en", "A lifetime, piece by piece."]] as const) {
    const ctx = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { "Accept-Language": lang } });
    expect(await (await ctx.get("/manifest.webmanifest")).json()).toMatchObject({ description: tagline, lang });
    await ctx.dispose();
  }
});

test("on iPhone outside the home screen, it explains how to add MOSAIC there", async ({ browser }) => {
  const page = await signUp(browser, { ...devices["iPhone 13"] });
  // Safari in a tab has no Push API.
  await page.addInitScript(() => {
    delete (window as unknown as Record<string, unknown>).PushManager;
  });
  await page.goto("/settings#push");
  const ios = page.getByTestId("push-ios");
  await expect(ios).toContainText("ホーム画面に追加すると通知を受け取れます");
  await expect(ios.getByRole("listitem")).toHaveCount(3);
});

test("Home suggests notifications once there's someone to hear from; closed, it stays away", async ({ browser }) => {
  const page = await signUp(browser, { ...devices["Pixel 7"] });
  // Nobody to hear from yet: no suggestion.
  await page.goto("/home");
  await expect(page.getByTestId("push-ask")).toHaveCount(0);

  // A connection, and a conversation started with them.
  await page.goto("/admin");
  await page.getByRole("button", { name: /テスト相手をつくる/ }).click();
  await page.waitForURL(/admin\?ok=saved/);
  await page.goto("/messages/new");
  await page.getByLabel("ミナ（テスト）").check();
  await page.getByRole("button", { name: "はじめる" }).click();
  await page.waitForURL(/\/messages\/[0-9a-f-]+$/);
  await page.getByLabel("メッセージを入力…").fill("こんにちは");
  await page.getByRole("button", { name: "送信", exact: true }).click();
  await expect(page.getByText("こんにちは", { exact: true }).last()).toBeVisible();

  // This device could turn them on (it says so in its cookie once a page has loaded): suggested.
  await page.goto("/home");
  await page.reload();
  const ask = page.getByTestId("notice").filter({ has: page.getByTestId("push-ask") });
  await expect(ask).toContainText("メッセージが届いたら、スマホに知らせましょうか？");
  await expect(ask.getByRole("button", { name: /通知をオンにする/ })).toBeVisible();
  await ask.getByRole("button", { name: "閉じる" }).click();
  await page.waitForURL(/\/home$/);
  await expect(page.getByTestId("push-ask")).toHaveCount(0);
});
