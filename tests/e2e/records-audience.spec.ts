import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test.use({ locale: "ja-JP", extraHTTPHeaders: { "Accept-Language": "ja-JP,ja;q=0.9", "x-e2e-client-ip": `10.58.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` } });

test("what is shared is listed in one place, and many records change at once", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("なんと呼べばいいですか？").fill("ハナ");
  await page.getByLabel("メールアドレス").fill(`${randomUUID().slice(0, 8)}@example.test`);
  await page.getByLabel(/^パスワード/).fill("e2e correct horse battery");
  await page.getByRole("button", { name: "アカウントを作成" }).click();
  await page.waitForURL(/welcome/);
  // Someone to share with.
  await page.goto("/admin");
  await page.getByRole("button", { name: /テスト相手をつくる/ }).click();
  await page.waitForURL(/admin\?ok=saved/);

  for (const [body, everyone] of [["海に行った。", true], ["パンを焼いた。", true], ["ひとりの考えごと。", false]] as const) {
    await page.goto("/memories/new");
    await page.getByLabel("あったこと・考えていること").fill(body);
    if (everyone) await page.getByRole("radio", { name: /つながっている全員/ }).check({ force: true });
    await page.getByRole("button", { name: "投稿する" }).click();
    await page.waitForURL(/\/memories\/[0-9a-f-]+\?ok=saved/);
  }

  // From the privacy overview: the list opens on what is shared.
  await page.goto("/me/privacy");
  await page.getByRole("link", { name: /一覧で見る・まとめて変える/ }).click();
  await page.waitForURL(/\/me\/privacy\/records$/);
  const list = page.getByTestId("audience-list");
  await expect(list.getByRole("listitem")).toHaveCount(2);
  await expect(list).toContainText("海に行った。");
  await expect(list).not.toContainText("ひとりの考えごと。");

  // All of them back to only me, in one go.
  await page.getByText("表示中をすべて選ぶ").click();
  await page.getByLabel("公開範囲", { exact: true }).selectOption("private");
  await page.getByRole("button", { name: "この範囲にする" }).click();
  await page.waitForURL(/\/me\/privacy\/records\?ok=saved/);
  await expect(page.getByText(/公開中の記録はありません/)).toBeVisible();

  // Private tab: pick one and share it with everyone.
  await page.getByRole("link", { name: /非公開/ }).click();
  await page.waitForURL(/show=private/);
  await page.getByTestId("audience-list").getByText("パンを焼いた。").click();
  await page.getByLabel("公開範囲", { exact: true }).selectOption("connections");
  await page.getByRole("button", { name: "この範囲にする" }).click();
  await page.waitForURL(/show=private&ok=saved/);
  await page.goto("/me/privacy/records");
  await expect(page.getByTestId("audience-list").getByRole("listitem")).toHaveCount(1);
  await expect(page.getByTestId("audience-list")).toContainText("パンを焼いた。");

  // Nothing picked: told, nothing changes.
  await page.getByRole("button", { name: "この範囲にする" }).click();
  await expect(page.getByText("記録を1件以上選んでください。")).toBeVisible();
});
