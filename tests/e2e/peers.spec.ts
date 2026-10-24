import { randomUUID } from "node:crypto";
import { expect, test, type Browser, type Page } from "@playwright/test";

async function user(browser: Browser, name: string) {
  const ctx = await browser.newContext({ locale: "ja-JP", viewport: { width: 412, height: 860 }, extraHTTPHeaders: { "Accept-Language": "ja-JP,ja;q=0.9", "x-e2e-client-ip": `10.5.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` } });
  const page = await ctx.newPage();
  await page.goto("/register");
  await page.getByLabel("なんと呼べばいいですか？").fill(name);
  await page.getByLabel("メールアドレス").fill(`${randomUUID().slice(0, 8)}@example.test`);
  await page.getByLabel(/^パスワード/).fill("e2e correct horse battery");
  await page.getByRole("button", { name: "アカウントを作成" }).click();
  // New accounts start with the welcome guide.
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
}

test("ask a connection how they see you; they answer with their name; you see the map", async ({ browser }) => {
  const hana = await user(browser, "ハナ");
  const sora = await user(browser, "ソラ");
  await connect(hana, sora);

  // Hana asks from her profile.
  await hana.goto("/me");
  await hana.getByRole("link", { name: /周りから見たあなた/ }).click();
  await hana.waitForURL("/me/others");
  await expect(hana.getByText("まだ回答がありません。", { exact: false })).toBeVisible();
  await hana.getByRole("button", { name: "聞く" }).click();
  await expect(hana.getByText("回答待ち")).toBeVisible();

  // Sora is told on Home and answers every item.
  await sora.goto("/home");
  await sora.getByRole("link", { name: /ハナさんが「あなたから見たハナさん」を知りたがっています/ }).click();
  await sora.waitForURL(/\/others\//);
  await expect(sora.getByRole("heading", { name: "あなたから見たハナさん" })).toBeVisible();
  for (const label of ["先に計画を立てる", "何があっても落ち着いている"]) await sora.getByText(label, { exact: true }).click();
  // Everything else: "neither".
  const groups = sora.locator("fieldset.grid");
  const n = await groups.count();
  expect(n).toBe(17);
  for (let i = 0; i < n; i++) {
    const g = groups.nth(i);
    if (!(await g.locator("input:checked").count())) await g.getByText("どちらとも").click();
  }
  await sora.getByLabel("ハナさんへのひとこと（任意）").fill("いつも段取りが完璧");
  await sora.getByText(/名前を出す/).click();
  await sora.getByRole("button", { name: "送る", exact: true }).click();
  await expect(sora.getByText("ありがとうございます。ハナさんに届きました。")).toBeVisible();
  await expect(sora.getByText("ハナさんは… 先に計画を立てる")).toBeVisible();

  // Hana sees the answer beside her own (she has no answers yet, so these are things others notice).
  await hana.goto("/me/others");
  await expect(hana.getByText("回答あり")).toBeVisible();
  await expect(hana.getByText("周りだけが気づいているあなた")).toBeVisible();
  await expect(hana.getByText("いつも段取りが完璧")).toBeVisible();
  await expect(hana.getByText("— ソラ")).toBeVisible();

  // Sora can take it back.
  sora.once("dialog", (d) => d.accept());
  await sora.getByRole("button", { name: "回答を取り下げる" }).click();
  await expect(sora.getByText("この依頼は終了しています。")).toBeVisible();
  await hana.goto("/me/others");
  await expect(hana.getByText("取り下げ")).toBeVisible();
  await expect(hana.getByText("いつも段取りが完璧")).toHaveCount(0);
});
