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
  // New accounts start with the welcome guide.
  await page.waitForURL(/welcome/);
  await page.goto("/home");
  await expect(page.getByRole("heading", { name: "こんにちは、ハナさん" })).toBeVisible();

  await page.goto("/discover/q/f.drink");
  await expect(page.getByText("いつもの飲みものは？")).toBeVisible();
  await page.getByLabel("お茶", { exact: true }).check();
  await page.getByRole("button", { name: "回答を保存" }).click();
  await expect(page.getByText("回答を保存しました。以前の回答も履歴に残っています。")).toBeVisible();
  await page.goto("/discover/history");
  await expect(page.getByTestId("history-list").locator("summary").getByText("お茶", { exact: true })).toBeVisible();

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
  await page.locator("#stages button", { hasText: "数え5〜14歳" }).click();
  await expect(page.getByText(/この10年の大限は、命盤の/).first()).toBeVisible();
  await expect(page.getByText(/子どもの時期なので/).first()).toBeVisible();
  await expect(page.getByText("振り返りのヒント")).toBeVisible();
  await expect(page.getByText(/^子どもの頃の「自分の性格や得意なこと」を思い出すと/)).toBeVisible();
  await page.locator("#stages button", { hasText: "数え75〜84歳" }).click();
  await expect(page.getByText("これからへの問い")).toBeVisible();

  await page.goto("/people");
  await page.getByRole("button", { name: "人を追加" }).click();
  await page.getByRole("dialog").getByLabel("名前・呼び名").fill("ユキ");
  await page.getByRole("dialog").getByRole("button", { name: "人を追加" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "ユキ" })).toBeVisible();
  // Long notes are read clamped, and edited in an auto-growing field behind 編集.
  await page.getByText("✎ 編集").click();
  const memo = page.locator("form", { has: page.locator('textarea[name="note"]') });
  await memo.locator('textarea[name="note"]').fill(Array.from({ length: 8 }, (_, i) => `メモの${i + 1}行目`).join("\n"));
  await memo.getByRole("button", { name: "保存", exact: true }).click();
  await page.getByRole("button", { name: "続きを読む" }).click();
  await expect(page.getByRole("button", { name: "閉じる" })).toBeVisible();
  // A date with a past year repeats yearly and says when it comes next.
  const dateForm = page.locator('form:has(input[name="remindDaysBefore"])');
  await dateForm.getByLabel("名前").fill("誕生日");
  await dateForm.getByLabel("日", { exact: true }).fill("20");
  await dateForm.getByLabel("月", { exact: true }).fill("7");
  await dateForm.getByLabel("年（任意）").fill("2001");
  await dateForm.getByLabel("何日前に知らせるか").fill("14");
  await dateForm.getByRole("button", { name: "追加" }).click();
  await expect(page.getByText(/次は \d{4}年7月20日（/)).toBeVisible();
  await expect(page.getByText("14日前からホームでお知らせ")).toBeVisible();
  const prefForm = page.locator('form:has(select[name="sentiment"])');
  await prefForm.locator('input[name="label"]').fill("フィルムカメラ");
  await prefForm.locator('select[name="categoryId"]').selectOption("item");
  await prefForm.locator('select[name="sentiment"]').selectOption("wants");
  await prefForm.locator('select[name="source"]').selectOption("person_stated");
  await prefForm.getByRole("button", { name: "追加" }).click();
  await expect(page.locator("li", { hasText: "フィルムカメラ" }).getByText(/もの・贈り物/)).toBeVisible();
  // The birthday's year gives the age; gender is optional and kept for next time.
  await expect(page.getByText(/年齢：\d+歳（誕生日から）/)).toBeVisible();
  await page.locator('#gifts select[name="gender"]').selectOption("female");
  await page.getByRole("button", { name: "提案する" }).click();
  const ideas = page.getByTestId("gift-ideas");
  await expect(ideas.getByText(/欲しいものリストにあります（本人が言っていた/)).toBeVisible();
  await expect(ideas.getByText("根拠: フィルムカメラ (欲しい)")).toBeVisible();
  // Then a few general ideas, labelled as such.
  await expect(ideas.getByText("一般的な傾向", { exact: true }).first()).toBeVisible();
  await expect(page.locator('#gifts select[name="gender"]')).toHaveValue("female");

  // Saved items can be edited in place, not only deleted.
  await page.locator("li", { hasText: "フィルムカメラ" }).getByRole("link", { name: /編集/ }).click();
  const editPref = page.locator('form:has(input[name="itemId"]):has(button:text("保存"))');
  await editPref.locator('input[name="label"]').fill("フィルムカメラ（中古）");
  await editPref.locator('select[name="sentiment"]').selectOption("love");
  await editPref.getByRole("button", { name: "保存" }).click();
  await expect(page.getByText("フィルムカメラ（中古）")).toBeVisible();
  await expect(page.getByText("履歴 (2)")).toBeVisible();
  await page.locator("li", { hasText: "14日前からホームでお知らせ" }).getByRole("link", { name: /編集/ }).click();
  await page.locator('form:has(input[name="kind"][value="date"])').getByLabel("日", { exact: true }).fill("21");
  await page.locator('form:has(input[name="kind"][value="date"])').getByRole("button", { name: "保存" }).click();
  await expect(page.getByText(/次は \d{4}年7月21日（/)).toBeVisible();
  // Home lists dates up to a year ahead, so this birthday shows even when months away.
  await page.goto("/home");
  await expect(page.getByText("1年以内の予定はありません。")).toHaveCount(0);
  await expect(page.locator("li", { hasText: "ユキ" }).filter({ hasText: "誕生日" })).toBeVisible();
  await ctx.close();
});
