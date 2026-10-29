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
  await expect(form.getByText("🔗 見せ合える質問")).toBeVisible();
  await expect(form.getByText("この答えが手がかりになるタイル")).toBeVisible();
  const firstPrompt = await form.locator("legend").innerText();
  await form.locator('input[type="radio"]').first().check();
  await form.getByText("＋ 理由やメモを書く（自分だけ）").click();
  await form.locator('textarea[name="note"]').fill("いつもそうしている気がする");
  await form.getByRole("button", { name: "回答を保存" }).click();

  // The next question of the chapter appears, progress moves, and feedback is asked once.
  await expect(page.getByText(/問中1問/)).toBeVisible();
  await expect(page.locator("form:has(input[name=questionId]) legend")).not.toHaveText(firstPrompt);
  // "Saved" and "how was it?" in one slim line (no separate notice); the title alone says the chapter.
  await expect(page.getByTestId("feedback-prompt")).toContainText("✓ 回答を保存しました · 前の質問は？");
  await expect(page.getByText("回答を保存しました。以前の回答も履歴に残っています。")).toHaveCount(0);
  await expect(page.locator("form:has(input[name=questionId])").getByText(/気質/)).toHaveCount(0);
  await expect(page.getByRole("link", { name: "相手からの見え方と公開設定" })).toBeVisible();
  await page.getByRole("button", { name: "👍 よかった" }).click();
  await expect(page.getByText("ありがとうございます。質問をよくするために使います。")).toBeVisible();

  // The note shows only in the user's own history.
  await page.goto("/discover/history");
  // One row per question: open them to see the earlier answers and notes.
  for (const row of await page.getByTestId("history-list").locator("summary").all()) await row.click();
  await expect(page.getByText("🔒 いつもそうしている気がする")).toBeVisible();
  await ctx.close();
});

test("likes: fashion, then several brands one after another", async ({ browser }) => {
  const ctx = await browser.newContext({ locale: "ja-JP", extraHTTPHeaders: { "Accept-Language": "ja-JP,ja;q=0.9", "x-e2e-client-ip": `10.7.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` } });
  const page = await ctx.newPage();
  await page.goto("/register");
  await page.getByLabel("なんと呼べばいいですか？").fill("リン");
  await page.getByLabel("メールアドレス").fill(`${randomUUID().slice(0, 8)}@example.test`);
  await page.getByLabel(/^パスワード/).fill("e2e correct horse battery");
  await page.getByRole("button", { name: "アカウントを作成" }).click();
  await page.waitForURL(/welcome/);
  await page.goto("/discover/q/l.fashion_style");
  await page.getByLabel("シンプル", { exact: true }).check();
  await page.getByLabel("古着", { exact: true }).check();
  await page.getByRole("button", { name: "回答を保存" }).click();
  await expect(page.getByText("好きなブランドは？")).toBeVisible();
  await page.getByPlaceholder("例：無印良品、COS").fill("無印良品");
  await page.getByRole("button", { name: "好きなものに追加" }).click();
  await expect(page.getByText("追加しました（1/3）")).toBeVisible();
  await expect(page.getByText("もうひとつあれば")).toBeVisible();
  await page.getByPlaceholder("例：無印良品、COS").fill("COS");
  await page.getByRole("button", { name: "好きなものに追加" }).click();
  await expect(page.getByText("追加しました（2/3）")).toBeVisible();
  await page.getByRole("link", { name: "これで終わり" }).click();
  await expect(page.getByText("もうひとつあれば")).toHaveCount(0);
});

test("a mosaic piece opens its own questions in the chapter", async ({ browser }) => {
  const ctx = await browser.newContext({ locale: "ja-JP", extraHTTPHeaders: { "Accept-Language": "ja-JP,ja;q=0.9", "x-e2e-client-ip": `10.7.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` } });
  const page = await ctx.newPage();
  await page.goto("/register");
  await page.getByLabel("なんと呼べばいいですか？").fill("ユイ");
  await page.getByLabel("メールアドレス").fill(`${randomUUID().slice(0, 8)}@example.test`);
  await page.getByLabel(/^パスワード/).fill("e2e correct horse battery");
  await page.getByRole("button", { name: "アカウントを作成" }).click();
  await page.waitForURL(/welcome/);
  await page.goto("/insights");
  await expect(page.getByText("20枚のうち0枚が見えてきました")).toBeVisible();
  await page.goto("/discover/chapter/self?axis=planning");
  await expect(page.getByText(/「段取り」のピースを集めています/)).toBeVisible();
  await expect(page.getByRole("link", { name: /段取り/ })).toHaveAttribute("aria-current", "page");
});

test("finishing a piece's questions is celebrated before anything else", async ({ browser }) => {
  const ctx = await browser.newContext({ locale: "ja-JP", extraHTTPHeaders: { "Accept-Language": "ja-JP,ja;q=0.9", "x-e2e-client-ip": `10.7.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` } });
  const page = await ctx.newPage();
  await page.goto("/register");
  await page.getByLabel("なんと呼べばいいですか？").fill("ケイ");
  await page.getByLabel("メールアドレス").fill(`${randomUUID().slice(0, 8)}@example.test`);
  await page.getByLabel(/^パスワード/).fill("e2e correct horse battery");
  await page.getByRole("button", { name: "アカウントを作成" }).click();
  await page.waitForURL(/welcome/);
  await page.goto("/discover/chapter/self?axis=planning");
  const done = page.getByRole("heading", { name: "「段取り」のピースがそろいました！" });
  const save = page.getByRole("button", { name: "回答を保存" });
  for (let i = 0; i < 12; i++) {
    await expect(done.or(save)).toBeVisible();
    if (await done.isVisible()) break;
    const form = page.locator("form", { has: save });
    const qid = await form.locator('input[name="questionId"]').inputValue();
    // Answer with the first choice, whichever kind the question has.
    const radio = form.locator('input[type="radio"]').first();
    if (await radio.count()) await radio.check({ force: true });
    else await form.locator('input[type="checkbox"][name="choices"]').first().check({ force: true });
    await save.click();
    // The next question (or the celebration) replaces this one. (The feedback form below keeps
    // the previous question's id, so look only inside the question form.)
    await expect(page.locator("form", { has: save }).locator(`input[name="questionId"][value="${qid}"]`)).toHaveCount(0);
  }
  await expect(done).toBeVisible();
  await expect(page.getByRole("button", { name: "回答を保存" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /次のピース「/ })).toBeVisible();
});
