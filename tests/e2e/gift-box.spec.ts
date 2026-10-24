import { randomUUID } from "node:crypto";
import { expect, test, type Browser } from "@playwright/test";

async function user(browser: Browser, name: string) {
  const ctx = await browser.newContext({ locale: "ja-JP", extraHTTPHeaders: { "Accept-Language": "ja-JP,ja;q=0.9", "x-e2e-client-ip": `10.3.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` } });
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

test("a gift box: parents write, letters stay private, the child receives it as a book", async ({ browser }) => {
  const today = new Date().toISOString().slice(0, 10);
  const mom = await user(browser, "マイ");
  await mom.goto("/me");
  await mom.getByRole("link", { name: /ギフトボックス/ }).click();
  await mom.waitForURL("/gifts");
  await mom.getByLabel("子どもの名前（呼び名）").fill("ハナ");
  await mom.getByLabel("子どもの誕生日（任意）").fill("2018-05-05");
  await mom.getByLabel("渡す日").fill(today);
  await mom.getByLabel("あなたとの関係").selectOption("mother");
  await mom.getByLabel(/子どもからの呼ばれ方/).first().fill("ママ");
  await mom.getByRole("button", { name: "新しくつくる" }).click();
  await mom.waitForURL(/\/gifts\/[0-9a-f-]+\?ok=saved/);
  const boxUrl = new URL(mom.url()).pathname;
  await expect(mom.getByRole("heading", { name: "ハナへのギフトボックス" })).toBeVisible();

  // A growth record, shared with every writer, and a letter only Mom can see.
  await mom.getByLabel("日付（任意）").fill("2019-06-01");
  await mom.getByLabel("見出し（任意）").fill("初めて歩いた");
  await mom.getByLabel("本文").fill("リビングで3歩。みんなで拍手した。");
  await mom.getByRole("button", { name: "追加" }).click();
  await expect(mom.getByText("リビングで3歩。みんなで拍手した。").first()).toBeVisible();
  await expect(mom.getByText("（1歳0か月）")).toBeVisible();
  await mom.getByRole("link", { name: "手紙" }).click();
  await mom.waitForURL(/tab=letters/);
  await mom.getByLabel("本文").first().fill("ハナへ。生まれてきてくれてありがとう。");
  await mom.getByRole("button", { name: "追加" }).click();
  await expect(mom.getByText("生まれてきてくれてありがとう。", { exact: false }).first()).toBeVisible();

  // From the journal's Write sheet: a link to the box's growth record, carrying what she typed.
  await mom.goto("/memories");
  await mom.getByRole("button", { name: "書く" }).click();
  await mom.getByRole("dialog").getByLabel("あったこと・考えていること").fill("はじめて自転車に乗れた");
  await mom.getByRole("link", { name: /ハナの成長の記録に書く/ }).click();
  await mom.waitForURL(/tab=growth/);
  await expect(mom.getByLabel("本文").first()).toHaveValue("はじめて自転車に乗れた");
  await mom.goto(boxUrl);

  // Mom invites Dad.
  await mom.getByRole("link", { name: "管理" }).click();
  await mom.waitForURL(/tab=manage/);
  await mom.getByLabel("あなたとの関係").selectOption("father");
  await mom.getByRole("button", { name: "招待コードを出す" }).click();
  const code = (await mom.getByTestId("one-time-code").innerText()).trim();
  expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);

  const dad = await user(browser, "ドク");
  await dad.goto("/gifts");
  await dad.getByLabel("コード", { exact: true }).first().fill(code);
  await dad.getByLabel(/子どもからの呼ばれ方/).last().fill("パパ");
  await dad.getByRole("button", { name: "参加する" }).click();
  await dad.waitForURL(new RegExp(boxUrl));
  await expect(dad.getByText("リビングで3歩。みんなで拍手した。").first()).toBeVisible();
  await dad.getByRole("link", { name: "手紙" }).click();
  await dad.waitForURL(/tab=letters/);
  await expect(dad.getByText("ほかの書き手の手紙が1通、受け取りの日を待っています。")).toBeVisible();
  await expect(dad.getByText("生まれてきてくれてありがとう。", { exact: false })).toHaveCount(0);
  await dad.getByLabel("本文").first().fill("パパより。いつでも味方だよ。");
  await dad.getByRole("button", { name: "追加" }).click();
  await dad.getByRole("link", { name: "あなたの見方" }).click();
  await dad.waitForURL(/tab=view/);
  await dad.getByText("先に計画を立てる", { exact: true }).click();
  await dad.getByLabel("ひとこと（任意）").fill("やさしくて、よく笑う子。");
  await dad.getByRole("button", { name: "保存" }).click();
  await expect(dad).toHaveURL(/tab=view&ok=saved/);

  // The date has come: Mom issues the receive code; the child receives it.
  await mom.goto(`${boxUrl}?tab=manage`);
  await mom.getByRole("button", { name: "受け取りコードを出す" }).click();
  const receive = (await mom.getByTestId("one-time-code").last().innerText()).trim();
  const child = await user(browser, "ハナ");
  await child.goto("/gifts");
  await child.getByLabel("コード", { exact: true }).last().fill(receive);
  await child.getByRole("button", { name: "受け取る" }).click();
  await child.waitForURL(/\/gifts\/[0-9a-f-]+\/book$/);
  await expect(child.getByRole("heading", { level: 1, name: "ハナへ" })).toBeVisible();
  await expect(child.getByText("ママ・パパより")).toBeVisible();
  await expect(child.getByText("リビングで3歩。みんなで拍手した。").first()).toBeVisible();
  await expect(child.getByText("ハナへ。生まれてきてくれてありがとう。")).toBeVisible();
  await expect(child.getByText("パパより。いつでも味方だよ。")).toBeVisible();
  await expect(child.getByText("やさしくて、よく笑う子。")).toBeVisible();
  // A real PDF comes out of it (A5 pages).
  await child.emulateMedia({ media: "print" });
  const pdf = await child.pdf({ preferCSSPageSize: true, printBackground: true });
  expect(pdf.subarray(0, 4).toString()).toBe("%PDF");

  // The box is closed; Mom keeps her copy, without Dad's letter.
  await mom.goto(boxUrl);
  await expect(mom.getByText("このボックスは渡されました。あなたが書いたものの控えを読めます。")).toBeVisible();
  await mom.getByRole("link", { name: /本として読む/ }).click();
  await expect(mom.getByText("ハナへ。生まれてきてくれてありがとう。")).toBeVisible();
  await expect(mom.getByText("パパより。いつでも味方だよ。")).toHaveCount(0);

  // Nobody else can open it.
  const stranger = await user(browser, "X");
  const r = await stranger.goto(boxUrl);
  expect(r?.status()).toBe(404);
});
