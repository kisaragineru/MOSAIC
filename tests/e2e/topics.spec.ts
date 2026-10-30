import { randomUUID } from "node:crypto";
import { expect, test, type Browser, type Page } from "@playwright/test";

async function user(browser: Browser, name: string) {
  const ctx = await browser.newContext({ locale: "ja-JP", timezoneId: "Asia/Tokyo", extraHTTPHeaders: { "Accept-Language": "ja-JP,ja;q=0.9", "x-e2e-client-ip": `10.12.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` } });
  const page = await ctx.newPage();
  await page.goto("/register");
  await page.getByLabel("なんと呼べばいいですか？").fill(name);
  await page.getByLabel("メールアドレス").fill(`${randomUUID().slice(0, 8)}@example.test`);
  await page.getByLabel(/^パスワード/).fill("e2e correct horse battery");
  await page.getByRole("button", { name: "アカウントを作成" }).click();
  await page.waitForURL(/welcome/);
  return page;
}

/** Connect the two; the connection page's address. */
async function connect(a: Page, b: Page) {
  await a.goto("/share");
  await a.getByRole("button", { name: "QRを表示" }).click();
  const url = await a.getByTestId("share-url").first().inputValue();
  await b.goto(url.replace(/^https?:\/\/[^/]+/, ""));
  await b.getByRole("button", { name: "続ける" }).click();
  await b.waitForURL(/\/compare\//);
  const compare = new URL(b.url()).pathname;
  for (const p of [b, a]) {
    await p.goto(compare);
    await p.locator('input[name="agree"]').check();
    await p.getByRole("button", { name: "つながる", exact: true }).click();
    await expect(p.getByRole("button", { name: "つながる", exact: true })).toHaveCount(0);
  }
  return compare;
}

test("topics: sent with my answer, answered by the other, then both answers side by side and a message to talk", async ({ browser }) => {
  test.setTimeout(180_000);
  const hana = await user(browser, "ハナ");
  const sora = await user(browser, "ソラ");
  const pairPage = await connect(hana, sora);

  // Hana: a topic from MOSAIC's, with her answer.
  await hana.goto(pairPage);
  await hana.getByTestId("connection-actions").getByRole("link", { name: /お題/ }).click();
  const send = hana.getByTestId("topic-send");
  await send.locator("select[name=preset]").selectOption({ label: "過去イチ恥ずかしかった話" });
  await send.getByRole("textbox", { name: "あなたの答え" }).fill("改札で人の背中にぶつかった");
  await send.getByRole("button", { name: "お題を送る" }).click();
  await hana.waitForURL(/ok=sent/);
  const mine = hana.getByTestId("topic").first();
  await expect(mine).toContainText("#過去イチ恥ずかしかった話");
  await expect(mine).toContainText("ソラさんの答えを待っています");

  // Sora: told at home; Hana's answer stays hidden until Sora answers.
  await sora.goto("/home");
  await sora.getByTestId("topic-notice-received").getByRole("link", { name: "見る" }).click();
  await sora.waitForURL(/\/compare\/.+#topics$/);
  const theirs = sora.getByTestId("topic").first();
  await expect(theirs).toContainText("ハナさんから届いたお題");
  await expect(sora.getByText("改札で人の背中にぶつかった")).toHaveCount(0);
  await theirs.getByRole("textbox", { name: "あなたの答え" }).fill("発表で名前を噛んだ");
  await theirs.getByRole("button", { name: "答える" }).click();
  await sora.waitForURL(/ok=saved/);
  const matched = sora.getByTestId("topic-matched").first();
  await expect(matched).toContainText("改札で人の背中にぶつかった");
  await expect(matched).toContainText("発表で名前を噛んだ");

  // Hana sees both too, and opens a message with the topic as a draft.
  await hana.goto(pairPage);
  await expect(hana.getByTestId("topic-matched").first()).toContainText("発表で名前を噛んだ");
  await hana.getByTestId("topic-matched").first().getByRole("button", { name: /メッセージで話す/ }).click();
  await hana.waitForURL(/\/messages\/[0-9a-f-]+/);
  await expect(hana.getByLabel("メッセージを入力…")).toHaveValue("#過去イチ恥ずかしかった話 ");
});
