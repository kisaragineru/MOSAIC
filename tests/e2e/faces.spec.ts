import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test.use({ locale: "ja-JP", extraHTTPHeaders: { "Accept-Language": "ja-JP,ja;q=0.9", "x-e2e-client-ip": `10.11.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` } });

test("development: set where the faces are in the type illustrations, then write the settings out", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("なんと呼べばいいですか？").fill("ミオ");
  await page.getByLabel("メールアドレス").fill(`${randomUUID().slice(0, 8)}@example.test`);
  await page.getByLabel(/^パスワード/).fill("e2e correct horse battery");
  await page.getByRole("button", { name: "アカウントを作成" }).click();
  await page.waitForURL(/welcome/);
  await page.goto("/settings#dev");
  await page.getByRole("link", { name: /タイプの顔の切り抜き/ }).click();
  await page.waitForURL(/\/settings\/faces$/);
  // A first pass is already set for all 28.
  await expect(page.getByText("28 / 28 設定済み")).toBeVisible();
  // Drag the circle onto the face.
  const area = page.getByLabel(/の顔の位置/);
  await area.scrollIntoViewIfNeeded();
  const b = (await area.boundingBox())!;
  await page.mouse.move(b.x + 150, b.y + 80);
  await page.mouse.down();
  await page.mouse.move(b.x + 160, b.y + 60, { steps: 4 });
  await page.mouse.up();
  await page.getByRole("button", { name: "設定を書き出す" }).click();
  const out = JSON.parse(await page.locator("textarea").inputValue());
  expect(out.tu_vi.m.r).toBe(0.3);
  expect(out.tu_vi.m.cx).not.toBe(0.5);
});
