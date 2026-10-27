import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test.use({ locale: "ja-JP", extraHTTPHeaders: { "Accept-Language": "ja-JP,ja;q=0.9", "x-e2e-client-ip": `10.64.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` } });

test("a bot that fills the hidden field is turned away; a person signs up", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("なんと呼べばいいですか？").fill("ボット");
  await page.getByLabel("メールアドレス").fill(`${randomUUID().slice(0, 8)}@example.test`);
  await page.getByLabel(/^パスワード/).fill("e2e correct horse battery");
  // What a bot does: fill every field there is, seen or not.
  await page.locator('input[name="website"]').evaluate((el: HTMLInputElement) => (el.value = "http://spam.example"));
  await page.getByRole("button", { name: "アカウントを作成" }).click();
  await expect(page.getByText("うまく登録できませんでした。ページを開き直して、もう一度お試しください。")).toBeVisible();
  await expect(page).toHaveURL(/\/register/);

  // The same form, as a person leaves it.
  await page.getByLabel("なんと呼べばいいですか？").fill("ハナ");
  await page.getByLabel("メールアドレス").fill(`${randomUUID().slice(0, 8)}@example.test`);
  await page.getByLabel(/^パスワード/).fill("e2e correct horse battery");
  await page.getByRole("button", { name: "アカウントを作成" }).click();
  await page.waitForURL(/welcome/);
});
