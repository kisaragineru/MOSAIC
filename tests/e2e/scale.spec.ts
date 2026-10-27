import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test.use({ locale: "ja-JP", extraHTTPHeaders: { "Accept-Language": "ja-JP,ja;q=0.9", "x-e2e-client-ip": `10.67.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` } });

test("a 1–5 question is answered in words, and read back in words", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("なんと呼べばいいですか？").fill("ハナ");
  await page.getByLabel("メールアドレス").fill(`${randomUUID().slice(0, 8)}@example.test`);
  await page.getByLabel(/^パスワード/).fill("e2e correct horse battery");
  await page.getByRole("button", { name: "アカウントを作成" }).click();
  await page.waitForURL(/welcome/);

  await page.goto("/discover/q/p.lists");
  const words = page.getByTestId("scale-words");
  await expect(words.getByRole("radio")).toHaveCount(5);
  for (const w of ["特に変わらない", "あまり変わらない", "どちらともいえない", "少し安心する", "とても安心する"]) await expect(words.getByText(w, { exact: true })).toBeVisible();
  await words.getByText("少し安心する", { exact: true }).click();
  await page.getByRole("button", { name: /答える|保存/ }).first().click();
  await page.waitForURL((u) => !u.pathname.endsWith("/p.lists") || u.search.includes("ok="));

  await page.goto("/discover/q/p.lists");
  await expect(page.getByText(/前回の回答.*少し安心する|少し安心する/).first()).toBeVisible();
  await page.goto("/discover/history");
  await expect(page.getByText("少し安心する").first()).toBeVisible();
  await expect(page.getByText(/5段階中/)).toHaveCount(0);
});
