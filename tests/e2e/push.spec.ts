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

  // The service worker and the manifest are served.
  const sw = await page.request.get("/sw.js");
  expect(sw.status()).toBe(200);
  expect(await sw.text()).toContain("showNotification");
  const manifest = await (await page.request.get("/manifest.webmanifest")).json();
  expect(manifest).toMatchObject({ name: "MOSAIC", display: "standalone", start_url: "/home" });
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
