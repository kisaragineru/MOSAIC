import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test.use({ locale: "ja-JP", extraHTTPHeaders: { "Accept-Language": "ja-JP,ja;q=0.9", "x-e2e-client-ip": `10.57.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` } });

test("the name is changed on the profile, not in settings", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("なんと呼べばいいですか？").fill("ハナ");
  await page.getByLabel("メールアドレス").fill(`${randomUUID().slice(0, 8)}@example.test`);
  await page.getByLabel(/^パスワード/).fill("e2e correct horse battery");
  await page.getByRole("button", { name: "アカウントを作成" }).click();
  await page.waitForURL(/welcome/);

  await page.goto("/settings");
  await expect(page.getByLabel("表示名")).toHaveCount(0);

  await page.goto("/me");
  await page.getByText("名前を変える").click();
  await page.getByLabel("表示名").fill("ハナコ");
  await page.getByRole("button", { name: "保存", exact: true }).first().click();
  await page.waitForURL(/\/me\?ok=saved/);
  await expect(page.locator("main").getByText("ハナコ", { exact: true })).toBeVisible();
});
