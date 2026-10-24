import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test("saving settings keeps the time zone (it used to fall back to Africa/Abidjan)", async ({ browser }) => {
  const ctx = await browser.newContext({ locale: "ja-JP", timezoneId: "Asia/Ho_Chi_Minh", extraHTTPHeaders: { "Accept-Language": "ja-JP,ja;q=0.9", "x-e2e-client-ip": `10.8.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` } });
  const page = await ctx.newPage();
  await page.goto("/register");
  await page.getByLabel("なんと呼べばいいですか？").fill("トキ");
  await page.getByLabel("メールアドレス").fill(`${randomUUID().slice(0, 8)}@example.test`);
  await page.getByLabel(/^パスワード/).fill("e2e correct horse battery");
  await page.getByRole("button", { name: "アカウントを作成" }).click();
  // New accounts start with the welcome guide.
  await page.waitForURL(/welcome/);
  await page.goto("/home");
  await expect(page.getByText(/タイムゾーンが「.*」になっていて/)).toHaveCount(0);

  await page.goto("/settings");
  const tz = page.locator('select[name="timeZone"]');
  await expect(tz).toHaveValue("Asia/Ho_Chi_Minh");
  await page.getByRole("button", { name: "保存" }).first().click();
  await expect(page.getByText("保存しました。")).toBeVisible();
  await expect(page.locator('select[name="timeZone"]')).toHaveValue("Asia/Ho_Chi_Minh");

  // On a device in another zone, Home points to the setting and the settings offer the device's zone.
  const tokyo = await browser.newContext({ locale: "ja-JP", timezoneId: "Asia/Tokyo", storageState: await ctx.storageState(), extraHTTPHeaders: { "Accept-Language": "ja-JP,ja;q=0.9" } });
  const p2 = await tokyo.newPage();
  await p2.goto("/home");
  await expect(p2.getByText("タイムゾーンが「Asia/Ho_Chi_Minh」になっていて、この端末と違います。", { exact: false })).toBeVisible();
  await p2.goto("/settings");
  await p2.getByRole("button", { name: "この端末のタイムゾーン（Asia/Tokyo）にする" }).click();
  await expect(p2.locator('select[name="timeZone"]')).toHaveValue("Asia/Tokyo");
});
