import { randomUUID } from "node:crypto";
import { expect, test, type Browser, type Page } from "@playwright/test";

async function user(browser: Browser, name: string) {
  const ctx = await browser.newContext({ locale: "ja-JP", viewport: { width: 412, height: 860 }, extraHTTPHeaders: { "Accept-Language": "ja-JP,ja;q=0.9", "x-e2e-client-ip": `10.5.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` } });
  const page = await ctx.newPage();
  await page.goto("/register");
  await page.getByLabel("なんと呼べばいいですか？").fill(name);
  await page.getByLabel("メールアドレス").fill(`${randomUUID().slice(0, 8)}@example.test`);
  await page.getByLabel(/^パスワード/).fill("e2e correct horse battery");
  await page.getByRole("button", { name: "アカウントを作成" }).click();
  // New accounts start with the welcome guide.
  await page.waitForURL(/welcome/);
  await page.goto("/home");
  return page;
}

async function connect(a: Page, b: Page) {
  await a.goto("/share");
  await a.getByRole("button", { name: "QRを表示" }).click();
  const url = await a.getByTestId("share-url").inputValue();
  await b.goto(url.replace(/^https?:\/\/[^/]+/, ""));
  await b.getByRole("button", { name: "続ける" }).click();
  await b.waitForURL(/\/compare\//);
}

async function choose(page: Page, questionId: string, label: string) {
  await page.goto(`/discover/q/${questionId}`);
  await page.getByLabel(label, { exact: true }).check();
  await page.getByRole("button", { name: "回答を保存" }).click();
  await expect(page.getByText(/回答を保存しました/)).toBeVisible();
}

test("show your manual to a connection: friend preset, preview, and stop", async ({ browser }) => {
  const hana = await user(browser, "ハナ");
  const sora = await user(browser, "ソラ");
  await choose(hana, "p.weekend_plan", "予定を立てる");
  await choose(hana, "ax.plan_pack", "リストで確認して詰め終わっている");
  await choose(hana, "ax.plan_deadline", "すぐ始めて早めに終わらせる");
  await connect(hana, sora);
  const compare = new URL(sora.url()).pathname;

  // Nothing is shown until Hana chooses.
  await expect(sora.getByText("ハナさんの取扱説明書")).toHaveCount(0);

  await hana.goto(compare);
  const card = hana.locator("#manual");
  await expect(card.getByRole("radio", { name: /見せない/ })).toBeChecked();
  await card.getByRole("radio", { name: /^友人向け/ }).check();
  await card.getByRole("button", { name: "保存" }).click();
  await expect(hana.locator("#manual").getByText("いまは「友人向け」で見せています")).toBeVisible();

  // Hana checks what Sora will see.
  await hana.locator("#manual").getByRole("link", { name: /相手にどう見えるか確認/ }).first().click();
  await hana.waitForURL(/\/me\/manual\/shared\?preset=friend/);
  await expect(hana.getByText("ハナさんは「先に計画を立てる」ことが多いようです。").first()).toBeVisible();

  // Sora reads it from the connection.
  await sora.reload();
  await sora.getByRole("link", { name: /ハナさんの取扱説明書/ }).click();
  await sora.waitForURL(/\/compare\/.+\/manual$/);
  await expect(sora.getByRole("heading", { level: 1, name: "ハナさんの取扱説明書（友人向け）" })).toBeVisible();
  await expect(sora.getByText("ハナさんは「先に計画を立てる」ことが多いようです。").first()).toBeVisible();
  await expect(sora.getByText("ハナさんから").first()).toBeVisible();
  const manualUrl = new URL(sora.url()).pathname;

  // Hana stops showing it; the page is gone for Sora.
  await hana.goto(compare);
  await hana.locator("#manual").getByRole("radio", { name: /見せない/ }).check();
  await hana.locator("#manual").getByRole("button", { name: "保存" }).click();
  await expect(hana.locator("#manual").getByText(/いまは/)).toHaveCount(0);
  const r = await sora.goto(manualUrl);
  expect(r?.status()).toBe(404);
});
