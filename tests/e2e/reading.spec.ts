import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

async function choose(page: Page, questionId: string, label: string) {
  await page.goto(`/discover/q/${questionId}`);
  await page.getByLabel(label, { exact: true }).check();
  await page.getByRole("button", { name: "回答を保存" }).click();
  await expect(page.getByText(/回答を保存しました/)).toBeVisible();
}

test("insights read even from one answer; the manual ends with a story", async ({ browser }) => {
  const ctx = await browser.newContext({ locale: "ja-JP", extraHTTPHeaders: { "Accept-Language": "ja-JP,ja;q=0.9", "x-e2e-client-ip": `10.4.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` } });
  const page = await ctx.newPage();
  await page.goto("/register");
  await page.getByLabel("なんと呼べばいいですか？").fill("ユイ");
  await page.getByLabel("メールアドレス").fill(`${randomUUID().slice(0, 8)}@example.test`);
  await page.getByLabel(/^パスワード/).fill("e2e correct horse battery");
  await page.getByRole("button", { name: "アカウントを作成" }).click();
  // New accounts start with the welcome guide.
  await page.waitForURL(/welcome/);
  await page.goto("/home");
  await expect(page.getByRole("heading", { name: "MOSAICが知っているあなた" })).toBeVisible();
  await expect(page.getByTestId("pieces")).toHaveText("0");

  // One answer: a hypothesis, clearly marked, with a way to confirm it.
  await choose(page, "p.weekend_plan", "予定を立てる");
  await page.goto("/insights");
  await expect(page.getByText(/1問答えてくれました/)).toBeVisible();
  const card = page.locator("#t-planning");
  await expect(card.getByText("仮説", { exact: true })).toBeVisible();
  await expect(card.getByText(/まだ1問の答えからの仮説ですが、いまのところ「先に計画を立てる」寄りです/)).toBeVisible();
  await expect(card.getByText(/と答えました$/)).toBeVisible();
  await expect(card.getByRole("link", { name: /あと2問で確かめる/ })).toBeVisible();

  // Three agreeing answers: the reading opens with it.
  await choose(page, "ax.plan_pack", "リストで確認して詰め終わっている");
  await choose(page, "ax.plan_deadline", "すぐ始めて早めに終わらせる");
  await page.goto("/insights");
  await expect(page.getByText(/いちばんはっきりしているのは、あなたが「先に計画を立てる」人だということです。/)).toBeVisible();
  await expect(page.locator("#t-planning").getByText("一貫した傾向", { exact: true })).toBeVisible();
  await expect(page.getByTestId("pieces")).toHaveText("3");

  // The manual's last chapter is the story.
  await page.goto("/me/manual");
  const novel = page.locator("#sec-novel");
  await expect(novel.getByText("『ユイの物語』")).toBeVisible();
  await expect(novel.getByText("― プロローグ ―")).toBeVisible();
  await expect(novel.getByText(/いまのユイは、先に計画を立てる。/)).toBeVisible();
  await expect(novel.getByText("——つづく。")).toBeVisible();
  await expect(novel.getByRole("link", { name: /記録を書く/ })).toBeVisible();
  await ctx.close();
});
