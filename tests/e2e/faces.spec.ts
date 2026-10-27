import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

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
  await expect(page.getByText("0 / 28 設定済み")).toBeVisible();
  // Drag the circle onto the face.
  const area = page.getByLabel(/の顔の位置/);
  await area.scrollIntoViewIfNeeded();
  const b = (await area.boundingBox())!;
  await page.mouse.move(b.x + 150, b.y + 80);
  await page.mouse.down();
  await page.mouse.move(b.x + 160, b.y + 60, { steps: 4 });
  await page.mouse.up();
  await expect(page.getByText("1 / 28 設定済み")).toBeVisible();
  await page.getByRole("button", { name: "設定を書き出す" }).click();
  expect(JSON.parse(await page.locator("textarea").inputValue())).toMatchObject({ tu_vi: { m: { r: 0.17 } } });
});
