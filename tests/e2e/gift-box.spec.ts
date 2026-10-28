import { randomUUID } from "node:crypto";
import { expect, test, type Browser } from "@playwright/test";
import { confirm } from "./confirm";
import { setDate } from "./date";

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
  // Old enough to receive it with an account (13, as the terms of use say).
  await setDate(mom, "子どもの誕生日（任意）", "2008-05-05");
  await setDate(mom, "渡す日", today);
  await mom.getByLabel("あなたとの関係").selectOption("mother");
  await mom.getByLabel(/子どもからの呼ばれ方/).first().fill("ママ");
  await mom.getByRole("button", { name: "新しくつくる" }).click();
  await mom.waitForURL(/\/gifts\/[0-9a-f-]+\?ok=saved/);
  const boxUrl = new URL(mom.url()).pathname;
  await expect(mom.getByRole("heading", { name: "ハナへのギフトボックス" })).toBeVisible();

  // A growth record, written like a record (words, a photo, the day, a heading only if wanted),
  // shared with every writer; and a letter only Mom can see.
  const form = mom.getByTestId("gift-growth-form");
  await form.getByLabel("本文").fill("リビングで3歩。みんなで拍手した。");
  await form.getByTestId("media-picker").locator('input[type="file"][multiple]').setInputFiles("tests/e2e/fixtures-photo.jpg");
  await expect(form.locator('input[name="media"]')).toHaveCount(1);
  await setDate(form, "日付（任意）", "2019-06-01");
  await expect(form.getByLabel("見出し（任意）")).toBeHidden();
  await form.getByText("＋見出しをつける").click();
  await form.getByLabel("見出し（任意）").fill("初めて歩いた");
  await form.getByRole("button", { name: "追加", exact: true }).click();
  await expect(mom.getByText("リビングで3歩。みんなで拍手した。").first()).toBeVisible();
  await expect(mom.getByText("（11歳0か月）")).toBeVisible();
  await expect(mom.getByTestId("gift-entry").first().locator('[data-testid="media-grid"][data-count="1"]')).toBeVisible();
  await mom.getByRole("link", { name: "手紙" }).click();
  await mom.waitForURL(/tab=letters/);
  await mom.getByLabel("本文").first().fill("ハナへ。生まれてきてくれてありがとう。");
  await mom.getByRole("button", { name: "追加" }).click();
  await expect(mom.getByText("生まれてきてくれてありがとう。", { exact: false }).first()).toBeVisible();

  // From the journal's Write sheet: a link to the box's growth record, carrying what she typed.
  await mom.goto("/memories");
  await mom.getByTestId("compose-fab").click();
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
  await expect(dad.getByText("パパより。いつでも味方だよ。").first()).toBeVisible();
  // Only growth records and letters are written (no questionnaire about the child).
  await expect(dad.getByRole("link", { name: "あなたの見方" })).toHaveCount(0);

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
  // They are in the child's own records too: private, saying who wrote them.
  await expect(child.getByTestId("gift-in-records")).toContainText("あなたの記録にも入りました");
  await child.getByRole("link", { name: "記録で見る →" }).click();
  await child.waitForURL(/\/memories/);
  await expect(child.getByText("🎁 ママより").first()).toBeVisible();
  await expect(child.getByText("✉️ パパからの手紙").first()).toBeVisible();
  await child.goBack();
  // The people who wrote it: one tap connects, and they join the child's people as family.
  const kin = child.getByTestId("gift-writers");
  await expect(kin).toContainText("書いてくれた人とつながる");
  await kin.getByRole("listitem").filter({ hasText: "ママ" }).getByRole("button", { name: "つながる" }).click();
  await child.waitForURL(/\/book\?ok=saved/);
  await expect(kin.getByRole("listitem").filter({ hasText: "パパ" }).getByRole("button", { name: "つながる" })).toBeVisible();
  await kin.getByRole("link", { name: /つながっています/ }).click();
  await child.waitForURL(/\/people\/[0-9a-f-]+$/);
  await expect(child.getByRole("heading", { level: 1, name: "ママ" })).toBeVisible();
  await expect(child.getByTestId("person-hero")).toContainText("家族");
  await child.goBack();
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

test("a box handed over as a book reaches the child's account later: a code from the owner, the records in the child's own", async ({ browser }) => {
  const today = new Date().toISOString().slice(0, 10);
  const mom = await user(browser, "マイ");
  await mom.goto("/gifts");
  await mom.getByLabel("子どもの名前（呼び名）").fill("ソラ");
  await setDate(mom, "子どもの誕生日（任意）", "2008-05-05");
  await setDate(mom, "渡す日", today);
  await mom.getByLabel("あなたとの関係").selectOption("mother");
  await mom.getByLabel(/子どもからの呼ばれ方/).first().fill("ママ");
  await mom.getByRole("button", { name: "新しくつくる" }).click();
  await mom.waitForURL(/\/gifts\/[0-9a-f-]+\?ok=saved/);
  const boxUrl = new URL(mom.url()).pathname;
  const form = mom.getByTestId("gift-growth-form");
  await form.getByLabel("本文").fill("はじめての海。");
  await form.getByRole("button", { name: "追加", exact: true }).click();
  await expect(mom.getByText("はじめての海。").first()).toBeVisible();

  // Handed over as a book first.
  await mom.goto(`${boxUrl}?tab=manage`);
  await mom.getByRole("button", { name: /本（PDF）にして渡す/ }).click();
  await confirm(mom);
  await mom.waitForURL(/\/book$/);
  // Later, the box page offers the account too.
  await mom.goto(boxUrl);
  const later = mom.getByTestId("gift-book-to-account");
  await expect(later).toContainText("ソラがMOSAICを始めたら");
  await later.getByRole("button", { name: "受け取りコードを出す" }).click();
  // With the code comes a link to send (LINE, mail).
  const link = await later.getByTestId("receive-link").locator("input").inputValue();
  expect(link).toMatch(/\/g\/[A-Z2-9]{12}$/);
  const path = new URL(link).pathname;

  // Sora opens it before having an account: the cover, then sign-up (no invite code), then receive.
  const ctx = await browser.newContext({ locale: "ja-JP", extraHTTPHeaders: { "Accept-Language": "ja-JP,ja;q=0.9", "x-e2e-client-ip": `10.4.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` } });
  const child = await ctx.newPage();
  await child.goto(path.toLowerCase()); // however it's typed
  await child.waitForURL(new RegExp(`${path}$`));
  const cover = child.getByTestId("gift-link-cover");
  await expect(cover).toContainText("ソラへ");
  await expect(cover).toContainText("ママより");
  await expect(child.getByText("はじめての海。")).toHaveCount(0); // nothing inside before receiving
  await child.getByRole("link", { name: "アカウントをつくって受け取る" }).click();
  await child.waitForURL(/\/register/);
  await child.getByLabel("なんと呼べばいいですか？").fill("ソラ");
  await child.getByLabel("メールアドレス").fill(`${randomUUID().slice(0, 8)}@example.test`);
  await child.getByLabel(/^パスワード/).fill("e2e correct horse battery");
  await child.getByRole("button", { name: "アカウントを作成" }).click();
  await child.waitForURL(new RegExp(`${path}$`));
  await child.getByRole("button", { name: "受け取る" }).click();
  await child.waitForURL(/\/gifts\/[0-9a-f-]+\/book$/);
  await expect(child.getByTestId("gift-in-records")).toContainText("あなたの記録にも入りました");
  await expect(child.getByTestId("gift-writers")).toContainText("ママ");
  await child.goto("/memories");
  await expect(child.getByText("🎁 ママより").first()).toBeVisible();

  await mom.goto(boxUrl);
  await expect(mom.getByTestId("gift-book-to-account")).toContainText("ソラのアカウントにも渡しました。");
  // Used once: the link now says so.
  await child.goto(path);
  await expect(child.getByTestId("gift-link-closed")).toContainText("このリンクは使えません");
});
