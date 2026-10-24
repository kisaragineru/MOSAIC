import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

async function choose(page: Page, questionId: string, label: string) {
  await page.goto(`/discover/q/${questionId}`);
  await page.getByLabel(label, { exact: true }).check();
  await page.getByRole("button", { name: "回答を保存" }).click();
  await expect(page.getByText(/回答を保存しました/)).toBeVisible();
}

test("the mosaic fills in as answers agree, and a tile explains itself", async ({ browser }) => {
  const ctx = await browser.newContext({ locale: "ja-JP", extraHTTPHeaders: { "Accept-Language": "ja-JP,ja;q=0.9", "x-e2e-client-ip": `10.6.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` } });
  const page = await ctx.newPage();
  await page.goto("/register");
  await page.getByLabel("なんと呼べばいいですか？").fill("サキ");
  await page.getByLabel("メールアドレス").fill(`${randomUUID().slice(0, 8)}@example.test`);
  await page.getByLabel(/^パスワード/).fill("e2e correct horse battery");
  await page.getByRole("button", { name: "アカウントを作成" }).click();
  // New accounts start with the welcome guide.
  await page.waitForURL(/welcome/);
  await page.goto("/home");
  await expect(page.getByText("17枚のうち0枚が見えてきました")).toBeVisible();

  await choose(page, "p.weekend_plan", "予定を立てる");
  await choose(page, "ax.plan_pack", "リストで確認して詰め終わっている");
  await choose(page, "ax.plan_deadline", "すぐ始めて早めに終わらせる");

  await page.goto("/home");
  await expect(page.getByText("17枚のうち1枚が見えてきました")).toBeVisible();
  await page.getByRole("link", { name: /あなたのモザイク/ }).click();
  await page.waitForURL("/insights");
  const tile = page.getByRole("button", { name: "段取り — 計画派: はっきり" });
  await tile.click();
  await expect(page.getByText("先に計画を立てるのを好むことが多いようです。").first()).toBeVisible();
  await expect(page.getByText("回答3件から")).toBeVisible();
  // An empty tile says what it needs and where to go.
  await page.getByRole("button", { name: "スピード: まだ" }).click();
  await expect(page.getByText(/まだ手がかりがありません/)).toBeVisible();
  await page.getByRole("link", { name: /「気質」の質問に答える/ }).click();
  await page.waitForURL("/discover/chapter/self");
  await ctx.close();
});
