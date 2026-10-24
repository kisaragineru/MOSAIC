import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

async function choose(page: Page, questionId: string, label: string) {
  await page.goto(`/discover/q/${questionId}`);
  await page.getByLabel(label, { exact: true }).check();
  await page.getByRole("button", { name: "回答を保存" }).click();
  await expect(page.getByText(/回答を保存しました/)).toBeVisible();
}

test("the manual is a long read that grows with answers", async ({ browser }) => {
  const ctx = await browser.newContext({ locale: "ja-JP", extraHTTPHeaders: { "Accept-Language": "ja-JP,ja;q=0.9", "x-e2e-client-ip": `10.7.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` } });
  const page = await ctx.newPage();
  await page.goto("/register");
  await page.getByLabel("なんと呼べばいいですか？").fill("サキ");
  await page.getByLabel("メールアドレス").fill(`${randomUUID().slice(0, 8)}@example.test`);
  await page.getByLabel(/^パスワード/).fill("e2e correct horse battery");
  await page.getByRole("button", { name: "アカウントを作成" }).click();
  // New accounts start with the welcome guide.
  await page.waitForURL(/welcome/);
  await page.goto("/home");

  // Before any answers: every chapter says it is still waiting, and points to its questions.
  await page.goto("/me");
  await page.getByRole("link", { name: /自分の取扱説明書/ }).click();
  await page.waitForURL("/me/manual");
  await expect(page.getByRole("heading", { level: 1, name: "サキさんの取扱説明書" })).toBeVisible();
  await expect(page.getByText("17軸のうち0軸")).toBeVisible();
  await expect(page.getByText("この章は、あと3問答えると書きはじめられます。").first()).toBeVisible();

  await choose(page, "p.weekend_plan", "予定を立てる");
  await choose(page, "ax.plan_pack", "リストで確認して詰め終わっている");
  await choose(page, "ax.plan_deadline", "すぐ始めて早めに終わらせる");

  // From Insights, under the mosaic.
  await page.goto("/insights");
  await page.getByRole("link", { name: /取扱説明書を読む/ }).click();
  await page.waitForURL("/me/manual");
  await expect(page.getByText("17軸のうち1軸")).toBeVisible();
  const card = page.locator("#axis-planning");
  await expect(card.getByRole("heading", { name: "計画派" })).toBeVisible();
  await expect(card.getByText("はっきり表れています")).toBeVisible();
  await expect(card.getByText("力が出やすい場所")).toBeVisible();
  await expect(card.getByText("3 件の答えから")).toBeVisible();

  // The contents jump to each section; the tips speak in the reader's voice.
  const toc = page.getByRole("navigation", { name: "目次" });
  await toc.getByRole("link", { name: /私と付き合うためのヒント/ }).click();
  await expect(page).toHaveURL(/#sec-tips$/);
  await expect(page.locator("#sec-tips li")).toHaveCount(1);
  await expect(page.getByRole("button", { name: /印刷・PDFで保存/ })).toBeVisible();
  // A chapter link leads back to its questions.
  await page.locator("#sec-mind").getByRole("link", { name: /質問に答えて章を書き足す/ }).click();
  await page.waitForURL("/discover/chapter/mind");
  await ctx.close();
});
