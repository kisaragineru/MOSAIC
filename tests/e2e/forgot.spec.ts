import { expect, test } from "@playwright/test";

test.use({ locale: "ja-JP", extraHTTPHeaders: { "Accept-Language": "ja-JP,ja;q=0.9" } });

test("forgot the password: from sign-in, the ways back in (no email set up here); a bad link says so", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: "パスワードを忘れた方" }).click();
  await page.waitForURL(/\/forgot$/);
  const ways = page.getByTestId("forgot-other-ways");
  await expect(ways).toContainText("いまはメールでの再設定に対応していません");
  await expect(ways).toContainText("Googleで続ける");
  await page.getByRole("link", { name: "ログイン画面に戻る" }).click();
  await page.waitForURL(/\/login$/);

  await page.goto("/reset");
  await expect(page.getByText("リンクが正しくないようです")).toBeVisible();
  await page.goto("/reset#t=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
  await page.getByLabel("新しいパスワード").fill("a brand new long password");
  await page.getByRole("button", { name: "このパスワードにする" }).click();
  await expect(page.getByText("このリンクは期限が切れているか、すでに使われています")).toBeVisible();
});
