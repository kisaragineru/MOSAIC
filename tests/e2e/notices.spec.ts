import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test.use({ locale: "ja-JP", extraHTTPHeaders: { "Accept-Language": "ja-JP,ja;q=0.9", "x-e2e-client-ip": `10.55.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` } });

test("notices sit in one tray at the top of Home; closed ones stay away, the bell dots when someone is waiting", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("なんと呼べばいいですか？").fill("ハナ");
  await page.getByLabel("メールアドレス").fill(`${randomUUID().slice(0, 8)}@example.test`);
  await page.getByLabel(/^パスワード/).fill("e2e correct horse battery");
  await page.getByRole("button", { name: "アカウントを作成" }).click();
  await page.waitForURL(/welcome/);

  // Someone (a test companion) asks "how do you see me?": waiting on you.
  await page.goto("/settings");
  await page.getByRole("button", { name: /テスト相手をつくる/ }).click();
  await page.waitForURL(/settings\?ok=saved/);
  await page.getByRole("button", { name: /あなたに「どう見える？」を聞かせる/ }).click();
  await page.waitForURL(/settings\?ok=saved/);
  await expect(page.getByTestId("bell-dot")).toBeVisible();

  await page.goto("/home");
  const tray = page.getByTestId("notice-tray");
  // The tray comes first on the page.
  const first = await page.locator("main section, main [data-testid]").first().getAttribute("data-testid");
  expect(first).toBe("notice-tray");
  const ask = tray.getByTestId("notice").filter({ hasText: "知りたがっています" });
  await expect(ask).toBeVisible();

  // Closed: gone (it comes back once in three days if still unanswered), and the bell is quiet.
  await ask.getByRole("button", { name: "閉じる" }).click();
  await page.waitForURL(/\/home$/);
  await expect(page.getByTestId("notice").filter({ hasText: "知りたがっています" })).toHaveCount(0);
  await expect(page.getByTestId("bell-dot")).toHaveCount(0);
  // Closed isn't lost: the bell's page lists it, still there to answer.
  await page.getByTestId("bell").click();
  await page.waitForURL(/\/notices$/);
  await expect(page.getByTestId("notices-closed")).toContainText("知りたがっています");
  await page.goto("/home");

  // Close all: whatever is left goes too.
  if (await page.getByTestId("notice-tray").count()) {
    await page.getByTestId("notice-tray").getByRole("button", { name: "すべて閉じる" }).click();
    await page.waitForURL(/\/home$/);
    await expect(page.getByTestId("notice-tray")).toHaveCount(0);
  }
  await page.reload();
  await expect(page.getByTestId("notice-tray")).toHaveCount(0);
});
