import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { setDate } from "./date";
import { setBirthTime } from "./birth-time";

test("birth details can be entered from the profile, the Tử Vi chart follows, and the privacy overview reflects it", async ({ browser }) => {
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
  await expect(birth.getByRole("heading", { name: "⭐ 生年月日（Tử Vi用）" })).toBeVisible();
  // Nothing entered yet: the form is open.
  await setDate(birth, "生年月日 (新暦（グレゴリオ暦）)", "1990-06-07");
  await setBirthTime(birth, "06:30");
  await birth.getByRole("button", { name: "保存して計算" }).click();
  await page.waitForURL(/\/me\?ok=saved#birth$/);
  await expect(birth.getByText("1990年6月7日 · 06:30")).toBeVisible();

  // The same details on the Tử Vi page, with the chart drawn.
  await birth.getByRole("link", { name: "Tử Viを見る →" }).click();
  await page.waitForURL(/\/tuvi$/);
  await expect(page.getByTestId("tuvi-chart")).toBeVisible();
  await expect(page.locator('input[name="solarDate"]')).toHaveValue("1990-06-07");

  // Edited from the profile again, the chart changes with it.
  await page.goto("/me");
  await birth.getByText("✎ 編集").click();
  await setBirthTime(birth, "14:10");
  await birth.getByRole("button", { name: "保存して計算" }).click();
  await expect(birth.getByText("1990年6月7日 · 14:10")).toBeVisible();

  // Every sharing setting in one place, each linking to where it's changed.
  await page.getByRole("link", { name: /公開設定のまとめ/ }).click();
  await page.waitForURL(/\/me\/privacy$/);
  await expect(page.getByRole("heading", { name: "🔒 いつも、あなただけ" })).toBeVisible();
  await expect(page.getByText("生年月日・出生時刻・出生地（Tử Viの入力）")).toBeVisible();
  await expect(page.locator("#tuvi").getByText("命盤ができています。")).toBeVisible();
  await expect(page.locator("#profile").getByText("ミナ")).toBeVisible();
  await expect(page.getByText("まだ誰ともつながっていません。")).toBeVisible();
  await page.locator("#tuvi").getByRole("link", { name: "変更する →" }).click();
  await page.waitForURL(/\/me#birth$/);
  await ctx.close();
});
