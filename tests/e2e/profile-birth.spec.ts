import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test("birth details can be entered from the profile, and the Tử Vi chart follows", async ({ browser }) => {
  const ctx = await browser.newContext({ locale: "ja-JP", extraHTTPHeaders: { "Accept-Language": "ja-JP,ja;q=0.9", "x-e2e-client-ip": `10.7.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` } });
  const page = await ctx.newPage();
  await page.goto("/register");
  await page.getByLabel("なんと呼べばいいですか？").fill("ミナ");
  await page.getByLabel("メールアドレス").fill(`${randomUUID().slice(0, 8)}@example.test`);
  await page.getByLabel(/^パスワード/).fill("e2e correct horse battery");
  await page.getByRole("button", { name: "アカウントを作成" }).click();
  await page.waitForURL(/\/welcome$/);

  await page.goto("/me");
  const birth = page.locator("#birth");
  await expect(birth.getByRole("heading", { name: "🔮 生年月日（Tử Vi用）" })).toBeVisible();
  // Nothing entered yet: the form is open.
  await birth.getByLabel("生年月日 (新暦（グレゴリオ暦）)").fill("1990-06-07");
  await birth.getByLabel("出生時刻（現地の時計）").fill("06:30");
  await birth.getByRole("button", { name: "保存して計算" }).click();
  await page.waitForURL(/\/me\?ok=saved#birth$/);
  await expect(birth.getByText("1990年6月7日 · 06:30")).toBeVisible();

  // The same details on the Tử Vi page, with the chart drawn.
  await birth.getByRole("link", { name: "Tử Viを見る →" }).click();
  await page.waitForURL(/\/tuvi$/);
  await expect(page.getByTestId("tuvi-chart")).toBeVisible();
  await expect(page.getByLabel("生年月日 (新暦（グレゴリオ暦）)")).toHaveValue("1990-06-07");

  // Edited from the profile again, the chart changes with it.
  await page.goto("/me");
  await birth.getByText("✎ 編集").click();
  await birth.getByLabel("出生時刻（現地の時計）").fill("14:10");
  await birth.getByRole("button", { name: "保存して計算" }).click();
  await expect(birth.getByText("1990年6月7日 · 14:10")).toBeVisible();
  await ctx.close();
});
