import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test("answer by chapter: badges, private note, progress, feedback, note in history", async ({ browser }) => {
  const ctx = await browser.newContext({ locale: "ja-JP", extraHTTPHeaders: { "Accept-Language": "ja-JP,ja;q=0.9", "x-e2e-client-ip": `10.7.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` } });
  const page = await ctx.newPage();
  await page.goto("/register");
  await page.getByLabel("なんと呼べばいいですか？").fill("ミチ");
  await page.getByLabel("メールアドレス").fill(`${randomUUID().slice(0, 8)}@example.test`);
  await page.getByLabel(/^パスワード/).fill("e2e correct horse battery");
  await page.getByRole("button", { name: "アカウントを作成" }).click();
  // New accounts start with the welcome guide.
  await page.waitForURL(/welcome/);
  await page.goto("/home");

  await page.goto("/discover");
  await page.getByRole("link", { name: "章ごとに" }).click();
  await page.waitForURL("/discover/chapters");
  await expect(page.getByRole("progressbar")).toHaveCount(6);
  await page.getByRole("link", { name: /気質/ }).click();
  await page.waitForURL("/discover/chapter/self");
  await expect(page.getByText(/^0\/|問中0問/).first()).toBeVisible();

  // The form says what kind of question this is and which tiles it feeds.
  const form = page.locator("form:has(input[name=questionId])");
  await expect(form.getByText("🔗 比較に使える")).toBeVisible();
  await expect(form.getByText("この答えが手がかりになるタイル")).toBeVisible();
  const firstPrompt = await form.locator("legend").innerText();
  await form.locator('input[type="radio"]').first().check();
  await form.getByText("＋ 理由やメモを書く（自分だけ）").click();
  await form.locator('textarea[name="note"]').fill("いつもそうしている気がする");
  await form.getByRole("button", { name: "回答を保存" }).click();

  // The next question of the chapter appears, progress moves, and feedback is asked once.
  await expect(page.getByText(/問中1問/)).toBeVisible();
  await expect(page.locator("form:has(input[name=questionId]) legend")).not.toHaveText(firstPrompt);
  await page.getByRole("button", { name: "👍 よかった" }).click();
  await expect(page.getByText("ありがとうございます。質問をよくするために使います。")).toBeVisible();

  // The note shows only in the user's own history.
  await page.goto("/discover/history");
  await expect(page.getByText("🔒 いつもそうしている気がする")).toBeVisible();
  await ctx.close();
});
