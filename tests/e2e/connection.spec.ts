import { randomUUID } from "node:crypto";
import { expect, test, type Browser } from "@playwright/test";

async function user(browser: Browser, name: string) {
  const ctx = await browser.newContext({ locale: "ja-JP", extraHTTPHeaders: { "Accept-Language": "ja-JP,ja;q=0.9", "x-e2e-client-ip": `10.9.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` } });
  const page = await ctx.newPage();
  await page.goto("/register");
  await page.getByLabel("なんと呼べばいいですか？").fill(name);
  await page.getByLabel("メールアドレス").fill(`${randomUUID().slice(0, 8)}@example.test`);
  await page.getByLabel(/^パスワード/).fill("e2e correct horse battery");
  await page.getByRole("button", { name: "アカウントを作成" }).click();
  // New accounts start with the welcome guide.
  await page.waitForURL(/welcome/);
  await page.goto("/home");
  await expect(page.getByRole("heading", { name: `こんにちは、${name}さん` })).toBeVisible();
  await page.goto("/discover/q/f.drink");
  await page.getByLabel("お茶", { exact: true }).check();
  await page.getByRole("checkbox", { name: /比較で見せる/ }).check();
  await page.getByRole("button", { name: "回答を保存" }).click();
  await expect(page.getByText(/回答を保存しました/)).toBeVisible();
  return page;
}

test("QR connection: preview of what others see, who is waiting, results first", async ({ browser }) => {
  const a = await user(browser, "ハナ");
  const b = await user(browser, "ソラ");

  // The profile shows what another person could see, before anyone connects.
  await a.goto("/me");
  await a.locator('textarea[name="bio"]').fill("お茶と散歩が好きです。");
  await a.getByRole("button", { name: "保存", exact: true }).click();
  await expect(a.getByText("保存しました。")).toBeVisible();
  await a.getByRole("link", { name: /相手からの見え方/ }).click();
  await expect(a.getByText("「ハナさんからつながりの招待が届いています。」— 表示名だけです。")).toBeVisible();
  await expect(a.getByText("いつもの飲みものは？").last()).toBeVisible();
  // Each comparable answer can be switched between shown and only-me right here.
  await a.getByRole("button", { name: /いつもの飲みものは？: 自分だけにする/ }).click();
  await expect(a.getByRole("button", { name: /いつもの飲みものは？: 見せるにする/ })).toBeVisible();
  await a.getByRole("button", { name: /いつもの飲みものは？: 見せるにする/ }).click();
  await expect(a.getByRole("button", { name: /いつもの飲みものは？: 自分だけにする/ })).toBeVisible();
  await expect(a.getByText("お茶と散歩が好きです。").last()).toBeVisible();
  await expect(a.getByText("命盤をまだ作っていないため、表示されません。").first()).toBeVisible();

  await a.goto("/share");
  await a.getByRole("button", { name: "QRを表示" }).click();
  const url = await a.getByTestId("share-url").inputValue();

  await b.goto(url.replace(/^https?:\/\/[^/]+/, ""));
  await expect(b.getByText("ハナさんからつながりの招待が届いています。")).toBeVisible();
  await b.getByRole("button", { name: "続ける" }).click();
  await b.waitForURL(/\/compare\//);
  await b.getByRole("checkbox", { name: /^好み/ }).check();
  await b.locator('input[name="agree"]').check();
  await b.getByRole("button", { name: "同意する" }).click();
  // Before ハナ agrees, ソラ does not see her bio.
  await expect(b.getByText("お茶と散歩が好きです。")).toHaveCount(0);
  await b.goto("/share");
  await expect(b.getByText("相手の同意待ち")).toBeVisible();

  // The link owner is told on Home that someone is waiting for their choice.
  await a.goto("/home");
  await expect(a.getByText(/ソラさんがあなたのQRからつながりました/)).toBeVisible();
  await a.goto("/share");
  await expect(a.getByText("あなたの同意待ち")).toBeVisible();
  await a.getByRole("link", { name: /^ソラさん/ }).click();
  await a.getByRole("checkbox", { name: /^好み/ }).check();
  await a.locator('input[name="agree"]').check();
  await a.getByRole("button", { name: "同意する" }).click();

  // Once both agree the results come first; the consent form folds away.
  await expect(a.getByTestId("pref-items").getByText("お茶", { exact: true })).toHaveCount(2);
  const compareUrl = a.url();
  await b.goto(compareUrl.replace(/^https?:\/\/[^/]+/, "").split("?")[0]!);
  await expect(b.getByRole("heading", { name: "ハナさんを知る" })).toBeVisible();
  await expect(b.getByText("お茶と散歩が好きです。")).toBeVisible();
  await expect(a.getByText("同意した内容を見る・変える")).toBeVisible();
  await expect(a.getByRole("button", { name: "同意内容を更新" })).toBeHidden();
  await a.goto("/home");
  await expect(a.getByText(/ソラさんがあなたのQRからつながりました/)).toHaveCount(0);

  // 大切な人: the connection can be added once, is marked 🔗, and links back to the comparison.
  await a.goto("/people");
  await expect(a.getByText("QRでつながった人")).toBeVisible();
  await a.getByRole("button", { name: /大切な人に追加/ }).click();
  await expect(a.getByRole("heading", { level: 1, name: "ソラ" })).toBeVisible();
  await expect(a.getByRole("link", { name: /ソラさんのページ/ })).toBeVisible();
  await a.getByRole("link", { name: /ソラさんのページ/ }).click();
  await expect(a.getByRole("link", { name: /大切な人のページを見る/ })).toBeVisible();
  await a.goto("/people");
  await expect(a.getByText("QRでつながった人")).toHaveCount(0);
  await expect(a.getByRole("link", { name: /ソラ.*つながっている/ })).toBeVisible();
  // A's entry and its link stay A's own: B still only sees the connection, not an entry.
  await b.goto("/people");
  await expect(b.getByText("QRでつながった人")).toBeVisible();
  await expect(b.getByRole("link", { name: /つながっている/ })).toHaveCount(0);
});
