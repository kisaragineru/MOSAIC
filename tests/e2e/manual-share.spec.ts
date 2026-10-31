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
  await a.getByRole("checkbox", { name: /つながった人に Tử Vi を見せる/ }).first().uncheck();
  await a.getByRole("button", { name: "QRを表示" }).click();
  const url = await a.getByTestId("share-url").first().inputValue();
  await b.goto(url.replace(/^https?:\/\/[^/]+/, ""));
  await b.getByRole("button", { name: /さんとつながる$/ }).click();
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
  await card.getByRole("radio", { name: /^基本版/ }).check();
  await card.getByRole("button", { name: "保存" }).click();
  await expect(hana.locator("#manual").getByText("いまは「基本版」で見せています")).toBeVisible();

  // Hana checks what Sora will see.
  await hana.locator("#manual").getByRole("link", { name: /相手にどう見えるか確認/ }).first().click();
  await hana.waitForURL(/\/me\/manual\/shared\?preset=friend/);
  await expect(hana.getByText("ハナさんは「先に計画を立てる」ことが多いようです。").first()).toBeVisible();

  // Sora reads it from the connection.
  await sora.reload();
  await sora.getByRole("link", { name: /ハナさんの取扱説明書/ }).click();
  await sora.waitForURL(/\/compare\/.+\/manual$/);
  await expect(sora.getByRole("heading", { level: 1, name: "ハナさんの取扱説明書（基本版）" })).toBeVisible();
  await expect(sora.getByText("ハナさんは「先に計画を立てる」ことが多いようです。").first()).toBeVisible();
  await expect(sora.getByText("ハナさんから").first()).toBeVisible();
  const manualUrl = new URL(sora.url()).pathname;

  // Hana has AI rewrite the friend version from only what it shows; Sora sees it only after Hana
  // checks it and chooses to show it.
  await hana.goto("/settings#ai");
  await hana.locator("form#ai").getByLabel("AIによる振り返りを許可する").check();
  await hana.locator("form#ai").getByRole("button", { name: "保存" }).click();
  await hana.goto("/me/manual/shared?preset=friend#share-ai");
  // Each chapter is asked from the page (held a moment here), so it asks to stay until done.
  await hana.route("**/me/manual/shared**", async (r) => {
    if (r.request().method() === "POST") await new Promise((ok) => setTimeout(ok, 800));
    await r.continue();
  });
  await hana.getByTestId("share-ai").getByRole("button", { name: "AIで書き直す" }).click();
  await expect(hana.getByTestId("rewrite-stay")).toContainText("このページを開いたままにしてください");
  await expect(hana.getByTestId("share-ai")).toContainText("まだ相手には見えていません", { timeout: 20_000 });
  await expect(hana.getByTestId("rewrite-stay")).toBeHidden();
  await hana.unroute("**/me/manual/shared**");
  await expect(hana.getByText(/\[AI共有\] ch\.self/).first()).toBeVisible();
  await sora.reload();
  await expect(sora.getByText(/\[AI共有\]/)).toHaveCount(0);
  await hana.getByTestId("share-ai").getByRole("button", { name: "この文章で見せる" }).click();
  await expect(hana.getByTestId("share-ai")).toContainText("この文章を、つながっている相手に見せています。");
  await sora.reload();
  await expect(sora.getByText(/\[AI共有\] ch\.self/).first()).toBeVisible();
  await expect(sora.getByTestId("shared-ai-note")).toContainText("本人が確認した文章です");

  // Hana stops showing it; the page is gone for Sora.
  await hana.goto(compare);
  await hana.locator("#manual").getByRole("radio", { name: /見せない/ }).check();
  await hana.locator("#manual").getByRole("button", { name: "保存" }).click();
  await expect(hana.locator("#manual").getByText(/いまは/)).toHaveCount(0);
  const r = await sora.goto(manualUrl);
  expect(r?.status()).toBe(404);
});
