import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test("Japanese UI end to end: auto-detected, registration, question, Tử Vi, gifts", async ({ browser }) => {
  const ctx = await browser.newContext({ locale: "ja-JP", extraHTTPHeaders: { "Accept-Language": "ja-JP,ja;q=0.9,en;q=0.8" } });
  const page = await ctx.newPage();
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "おかえりなさい" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  await page.goto("/register");
  await expect(page.locator('select[name="locale"]')).toHaveValue("ja");
  await page.getByLabel("なんと呼べばいいですか？").fill("ハナ");
  await page.getByLabel("メールアドレス").fill(`hana-${randomUUID().slice(0, 8)}@example.test`);
  await page.getByLabel(/^パスワード/).fill("e2e correct horse battery");
  await page.getByRole("button", { name: "アカウントを作成" }).click();
  await expect(page.getByRole("heading", { name: "こんにちは、ハナさん" })).toBeVisible();

  await page.goto("/discover/q/f.drink");
  await expect(page.getByText("いつもの飲みものは？")).toBeVisible();
  await page.getByLabel("お茶", { exact: true }).check();
  await page.getByRole("button", { name: "回答を保存" }).click();
  await expect(page.getByText("回答を保存しました。以前の回答も履歴に残っています。")).toBeVisible();
  await page.goto("/discover/history");
  await expect(page.getByText("お茶", { exact: true })).toBeVisible();

  await page.goto("/tuvi");
  await page.getByLabel("生年月日 (新暦（グレゴリオ暦）)").fill("1990-06-07");
  await page.getByLabel("出生時刻（現地の時計）").fill("06:30");
  await page.getByLabel("伝統的な計算で使う性別").selectOption("male");
  await page.getByRole("button", { name: "保存して計算" }).click();
  await expect(page.getByTestId("tuvi-chart")).toBeVisible();
  await expect(page.getByText(/命宮のThiên Cơ（天機）は、伝統的に/)).toBeVisible();
  await page.getByRole("tab", { name: /恋愛・パートナー/ }).click();
  await expect(page.getByRole("tabpanel").getByText("活かし方")).toBeVisible();
  await expect(page.getByRole("heading", { name: "10年ごとの人生ステージ" })).toBeVisible();
  await page.locator("#stages").getByRole("button", { name: /数え5〜14歳/ }).click();
  await expect(page.getByText(/伝統的に、この10年は「/)).toBeVisible();

  await page.goto("/people");
  await page.getByLabel("名前・呼び名").fill("ユキ");
  await page.getByRole("button", { name: "追加" }).click();
  await expect(page.getByRole("heading", { name: "ユキ" })).toBeVisible();
  const prefForm = page.locator('form:has(select[name="sentiment"])');
  await prefForm.locator('input[name="label"]').fill("フィルムカメラ");
  await prefForm.locator('select[name="categoryId"]').selectOption("item");
  await prefForm.locator('select[name="sentiment"]').selectOption("wants");
  await prefForm.locator('select[name="source"]').selectOption("person_stated");
  await prefForm.getByRole("button", { name: "追加" }).click();
  await expect(page.locator("li", { hasText: "フィルムカメラ" }).getByText(/もの・贈り物/)).toBeVisible();
  await page.getByRole("button", { name: "提案する" }).click();
  const ideas = page.getByTestId("gift-ideas");
  await expect(ideas.getByText(/欲しいものリストにあります（本人が言っていた/)).toBeVisible();
  await expect(ideas.getByText("根拠: フィルムカメラ (欲しい)")).toBeVisible();
  await ctx.close();
});
