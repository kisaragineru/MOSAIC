import { randomUUID } from "node:crypto";
import { expect, test, type Browser, type Page } from "@playwright/test";

async function user(browser: Browser, name: string) {
  const ctx = await browser.newContext({ locale: "ja-JP", timezoneId: "Asia/Tokyo", viewport: { width: 412, height: 860 }, extraHTTPHeaders: { "Accept-Language": "ja-JP,ja;q=0.9", "x-e2e-client-ip": `10.6.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` } });
  const page = await ctx.newPage();
  await page.goto("/register");
  await page.getByLabel("なんと呼べばいいですか？").fill(name);
  await page.getByLabel("メールアドレス").fill(`${randomUUID().slice(0, 8)}@example.test`);
  await page.getByLabel(/^パスワード/).fill("e2e correct horse battery");
  await page.getByRole("button", { name: "アカウントを作成" }).click();
  await page.waitForURL(/welcome/);
  await page.goto("/home");
  return page;
}

async function connect(a: Page, b: Page) {
  await a.goto("/share");
  await a.getByRole("button", { name: "QRを表示" }).click();
  const url = await a.getByTestId("share-url").inputValue();
  await b.goto(url.replace(/^https?:\/\/[^/]+/, ""));
  await b.getByRole("button", { name: "続ける" }).click();
  await b.waitForURL(/\/compare\//);
  const compare = b.url();
  for (const p of [b, a]) {
    await p.goto(compare);
    await p.getByRole("checkbox", { name: /^好み/ }).check();
    await p.locator('input[name="agree"]').check();
    await p.getByRole("button", { name: "同意する" }).click();
    await expect(p.getByRole("button", { name: "同意する" })).toHaveCount(0);
  }
}

test("records on a timeline, and a record shared with a connection", async ({ browser }) => {
  const hana = await user(browser, "ハナ");
  const sora = await user(browser, "ソラ");

  // Before any connection, a record can only be private.
  await hana.goto("/memories/new");
  await expect(hana.getByText("記録を公開するには、先に誰かとつながってください。")).toBeVisible();
  await connect(hana, sora);

  await hana.goto("/memories/new");
  await expect(hana.getByRole("radio", { name: /自分だけ/ })).toBeChecked();
  await hana.getByLabel("タイトル (任意)").fill("海に行った");
  await hana.getByLabel("あったこと・考えていること").fill("みんなで海に行って、夕日を見た。");
  await hana.getByRole("radio", { name: /つながっている全員/ }).check();
  await hana.getByRole("button", { name: "保存" }).click();
  await hana.waitForURL(/\/memories\/[0-9a-f-]+\?ok=saved/);
  const record = new URL(hana.url()).pathname;
  await expect(hana.getByText("🔗 つながっている人に公開中")).toBeVisible();

  // Hana's own timeline: today's header, the time it was written, the shared badge.
  await hana.goto("/memories");
  await expect(hana.getByRole("heading", { level: 3 }).first()).toContainText("今日");
  await expect(hana.getByRole("link", { name: /海に行った/ })).toContainText(/\d{2}:\d{2}/);
  await expect(hana.getByRole("link", { name: /海に行った/ })).toContainText("つながっている人に公開中");

  // Sora sees it on Home and in the timeline, read-only.
  await sora.goto("/home");
  await expect(sora.getByText("ハナさんの記録")).toBeVisible();
  await expect(sora.getByText("みんなで海に行って、夕日を見た。")).toBeVisible();
  await sora.goto("/memories?view=friends");
  await expect(sora.getByText("みんなで海に行って、夕日を見た。")).toBeVisible();
  await expect(sora.locator(`a[href="${record}"]`)).toHaveCount(0);
  expect((await sora.goto(record))?.status()).toBe(404);

  // Hana makes it private again: gone for Sora.
  await hana.goto(`${record}?edit=1`);
  await hana.getByRole("radio", { name: /自分だけ/ }).check();
  await hana.getByRole("button", { name: "保存" }).click();
  await hana.waitForURL(/ok=saved/);
  await expect(hana.getByText("🔒 自分だけ")).toBeVisible();
  await sora.goto("/memories");
  await expect(sora.getByText("みんなで海に行って、夕日を見た。")).toHaveCount(0);
});
