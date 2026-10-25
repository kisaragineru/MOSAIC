import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test("a new account is guided: three questions to a first tile, a bio, then home", async ({ browser }) => {
  const ctx = await browser.newContext({ locale: "ja-JP", extraHTTPHeaders: { "Accept-Language": "ja-JP,ja;q=0.9", "x-e2e-client-ip": `10.2.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` } });
  const page = await ctx.newPage();
  await page.goto("/register");
  await page.getByLabel("なんと呼べばいいですか？").fill("リン");
  await page.getByLabel("メールアドレス").fill(`${randomUUID().slice(0, 8)}@example.test`);
  await page.getByLabel(/^パスワード/).fill("e2e correct horse battery");
  await page.getByRole("button", { name: "アカウントを作成" }).click();
  await page.waitForURL(/\/welcome$/);
  await expect(page.getByRole("heading", { name: "ようこそ、リンさん" })).toBeVisible();
  await expect(page.getByText("見せるのは、選んだものだけ")).toBeVisible();
  await page.getByRole("link", { name: /はじめる/ }).click();

  for (const [n, label] of [[0, "予定を立てる"], [1, "リストで確認して詰め終わっている"], [2, "すぐ始めて早めに終わらせる"]] as const) {
    await expect(page.getByText(`${n} / 3`)).toBeVisible();
    await page.getByLabel(label, { exact: true }).check();
    await page.getByRole("button", { name: "回答を保存" }).click();
    await page.waitForURL(/step=2/);
  }
  await expect(page.getByRole("heading", { name: /最初のタイルが見えました/ })).toBeVisible();
  await expect(page.getByText("先に計画を立てるのを好むことが多いようです。")).toBeVisible();
  await page.getByRole("link", { name: "次へ" }).click();

  await page.getByRole("textbox").fill("週末は山とパン屋めぐり。");
  await page.getByRole("button", { name: "保存して次へ" }).click();
  await page.waitForURL(/step=4/);
  await expect(page.getByRole("heading", { name: /準備ができました/ })).toBeVisible();
  await expect(page.getByTestId("pieces")).toHaveText("6"); // 3 answers + bio
  await page.getByRole("button", { name: "ホームへ" }).click();
  await page.waitForURL(/\/home$/);
  await expect(page.getByText("はじめてガイドの続き")).toHaveCount(0);

  // Monthly look back: this month so far, and a note saved as a record.
  await page.goto("/reflection");
  await expect(page.getByRole("heading", { level: 2, name: /年\d+月のあなた/ })).toBeVisible();
  // What was answered this month is listed, once per question.
  await expect(page.getByRole("heading", { name: "💬 この月に答えたこと（3問）" })).toBeVisible();
  await expect(page.getByText("予定を立てる", { exact: true })).toBeVisible();
  await page.getByLabel("この1か月で、いちばん心に残ったことは？").fill("はじめてMOSAICを使った。");
  await page.getByRole("button", { name: "振り返りを記録する" }).click();
  await expect(page).toHaveURL(/ok=saved/);
  // What was written stays on the month's page, and more can be added.
  await expect(page.getByRole("heading", { name: "📝 この月の振り返り" })).toBeVisible();
  await expect(page.locator("#lookback").getByText("はじめてMOSAICを使った。")).toBeVisible();
  await expect(page.getByText("＋ もう一度書く・書き足す")).toBeVisible();
  await page.goto("/memories");
  await expect(page.getByText(/はじめてMOSAICを使った。/).first()).toBeVisible();
  await ctx.close();
});

test("the guide can be skipped, and offered again from home", async ({ browser }) => {
  const ctx = await browser.newContext({ locale: "en-US", extraHTTPHeaders: { "x-e2e-client-ip": `10.2.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` } });
  const page = await ctx.newPage();
  await page.goto("/register");
  await page.getByLabel("What should we call you?").fill("Lin");
  await page.getByLabel("Email").fill(`${randomUUID().slice(0, 8)}@example.test`);
  await page.getByLabel(/^Password/).fill("e2e correct horse battery");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(/\/welcome$/);
  await page.goto("/home");
  await page.getByRole("link", { name: /Continue the welcome guide/ }).click();
  await page.waitForURL(/\/welcome$/);
  await page.getByRole("button", { name: "Later" }).click();
  await page.waitForURL(/\/home$/);
  await expect(page.getByText("Continue the welcome guide")).toHaveCount(0);
  await ctx.close();
});
