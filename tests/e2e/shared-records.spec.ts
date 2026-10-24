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
  await expect(hana.getByLabel("タイトル (任意)")).toHaveCount(0);
  await hana.getByLabel("あったこと・考えていること").fill("みんなで海に行って、夕日を見た。");
  await hana.getByRole("radio", { name: /つながっている全員/ }).check({ force: true });
  await hana.getByRole("button", { name: "記録する" }).click();
  await hana.waitForURL(/\/memories\/[0-9a-f-]+\?ok=saved/);
  const record = new URL(hana.url()).pathname;
  // Letters can't be shared: picking one swaps the audience for the opening day.
  await hana.goto("/memories/new");
  await expect(hana.getByLabel("手紙を開く日")).toBeHidden();
  await hana.getByRole("radio", { name: /未来の自分への手紙/ }).check({ force: true });
  await expect(hana.getByLabel("手紙を開く日")).toBeVisible();
  await expect(hana.getByRole("radio", { name: /つながっている全員/ })).toBeHidden();
  await hana.goto(record);
  await expect(hana.getByText("🔗 つながっている人に公開中")).toBeVisible();

  // Hana's own timeline: today's header, the time it was written, the shared badge.
  await hana.goto("/memories");
  await expect(hana.getByRole("heading", { level: 3 }).first()).toContainText("今日");
  await expect(hana.getByRole("link", { name: /夕日を見た/ })).toContainText(/\d{2}:\d{2}/);
  await expect(hana.getByRole("link", { name: /夕日を見た/ })).toContainText("つながっている人に公開中");

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
  await hana.getByRole("radio", { name: /自分だけ/ }).check({ force: true });
  await hana.getByRole("button", { name: "保存" }).click();
  await hana.waitForURL(/ok=saved/);
  await expect(hana.getByText("🔒 自分だけ")).toBeVisible();
  await sora.goto("/memories");
  await expect(sora.getByText("みんなで海に行って、夕日を見た。")).toHaveCount(0);
});

test("write in place from the floating button, or close it with ✕", async ({ browser }) => {
  const page = await user(browser, "ミオ");
  await page.goto("/memories");
  await page.getByRole("button", { name: "書く" }).click();
  const sheet = page.getByRole("dialog", { name: "いま、書く" });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByLabel("あったこと・考えていること")).toBeFocused();
  await sheet.getByLabel("あったこと・考えていること").fill("駅まで歩いて、金木犀の匂いがした。");
  await sheet.locator("label", { hasText: "気持ち" }).click();
  await expect(sheet.getByRole("radio", { name: /気持ち/ })).toBeChecked();
  await sheet.getByRole("button", { name: "記録する" }).click();
  await expect(sheet).toBeHidden();
  await expect(page).toHaveURL(/\/memories$/);
  await expect(page.getByRole("link", { name: /金木犀の匂いがした/ })).toContainText("気持ち");

  // ✕ asks before throwing away what was written.
  await page.getByRole("button", { name: "書く" }).click();
  await page.getByRole("dialog").getByLabel("あったこと・考えていること").fill("下書き");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("dialog").getByRole("button", { name: "閉じる" }).last().click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("下書き")).toHaveCount(0);
});

test("share by relationship, and a test companion from settings (development)", async ({ browser }) => {
  const hana = await user(browser, "ハナ");
  const sora = await user(browser, "ソラ");
  await connect(hana, sora);

  // Hana files Sora as family, then shares a record with family only.
  await hana.goto("/people");
  await hana.getByLabel("関係").first().selectOption("family");
  await hana.getByRole("button", { name: /大切な人に追加/ }).click();
  await hana.waitForURL(/\/people\/[0-9a-f-]+/);
  await hana.goto(`${new URL(hana.url()).pathname}/settings`);
  await expect(hana.getByText("あなたの記録のうち 0 件が見えています")).toBeVisible();
  await hana.goto("/memories/new");
  await hana.getByLabel("あったこと・考えていること").fill("家族だけに伝えたいこと。");
  await hana.getByRole("radio", { name: /関係で選ぶ/ }).check({ force: true });
  await hana.getByRole("checkbox", { name: /家族/ }).check({ force: true });
  await hana.getByRole("button", { name: "記録する" }).click();
  await hana.waitForURL(/ok=saved/);
  await expect(hana.getByText(/家族に公開中/)).toBeVisible();
  await sora.goto("/memories?view=friends");
  await expect(sora.getByText("家族だけに伝えたいこと。")).toBeVisible();

  // A test companion: connected right away, with records to read.
  await hana.goto("/settings");
  await hana.getByRole("button", { name: /テスト相手をつくる/ }).click();
  await hana.waitForURL(/settings\?ok=saved/);
  await expect(hana.getByText("ミナ（テスト）")).toBeVisible();
  await hana.goto("/memories?view=friends");
  await expect(hana.getByText(/駅前に新しいカフェができてた/)).toBeVisible();
  await expect(hana.getByText(/自分だけの記録/)).toHaveCount(0);
  await hana.goto("/settings");
  hana.once("dialog", (d) => d.accept());
  await hana.getByRole("button", { name: "削除" }).last().click();
  await hana.waitForURL(/ok=deleted/);
  await expect(hana.getByText("ミナ（テスト）")).toHaveCount(0);
});

test("someone written about before connecting: the connection attaches to them", async ({ browser }) => {
  const hana = await user(browser, "ハナ");
  const sora = await user(browser, "ソラ");
  await hana.goto("/people");
  await hana.getByRole("button", { name: "人を追加" }).click();
  await hana.getByRole("dialog").getByLabel("名前・呼び名").fill("ソラ");
  await hana.getByRole("dialog").getByRole("button", { name: "人を追加" }).click();
  await hana.waitForURL(/\/people\/[0-9a-f-]+/);
  const before = new URL(hana.url()).pathname;
  await connect(hana, sora);
  await hana.goto("/people");
  // The entry with the same name is suggested.
  await expect(hana.getByLabel("ソラさんは「大切な人」の誰ですか？")).toHaveValue(before.split("/").pop()!);
  await hana.getByRole("button", { name: /大切な人に追加/ }).click();
  await hana.waitForURL(new RegExp(`${before}\\?ok=saved`));
  await expect(hana.getByRole("link", { name: /ソラさんのページ/ })).toBeVisible();
  await hana.goto("/people");
  await expect(hana.getByRole("link", { name: /ソラ.*つながっている/ })).toHaveCount(1);

  // Settings for one person: its own page, from the gear on their panel.
  await hana.getByRole("link", { name: "ソラさんへの設定" }).click();
  await hana.waitForURL(/\/people\/[0-9a-f-]+\/settings$/);
  await expect(hana.getByRole("heading", { level: 1, name: "ソラさんへの設定" })).toBeVisible();
  await expect(hana.getByText(/あなたの記録のうち 0 件が見えています/)).toBeVisible();
  await hana.getByLabel("関係").selectOption("family");
  await hana.locator("form", { has: hana.getByLabel("関係") }).getByRole("button", { name: "保存" }).click();
  await hana.waitForURL(/\/settings\?ok=saved/);
  await expect(hana.getByLabel("関係")).toHaveValue("family");
  await expect(hana.getByRole("button", { name: "この人と関連する記録をすべて削除" })).toBeVisible();
});

test("one-to-one comments on a shared record", async ({ browser }) => {
  const hana = await user(browser, "ハナ");
  const sora = await user(browser, "ソラ");
  const ren = await user(browser, "レン");
  await connect(hana, sora);
  await connect(hana, ren);
  await hana.goto("/memories/new");
  await hana.getByLabel("あったこと・考えていること").fill("はじめてパンを焼いた。");
  await hana.getByRole("radio", { name: /つながっている全員/ }).check({ force: true });
  await hana.getByRole("button", { name: "記録する" }).click();
  await hana.waitForURL(/\/memories\/[0-9a-f-]+\?ok=saved/);
  const record = new URL(hana.url()).pathname;
  await expect(hana.getByText("共有した相手がコメントすると、ここに届きます。")).toBeVisible();

  // Sora comments from the shared timeline; the page says it's only between the two of them.
  await sora.goto("/memories?view=friends");
  await sora.getByRole("link", { name: "💬 コメント" }).click();
  await sora.waitForURL(/\/memories\/shared\//);
  await expect(sora.getByText("はじめてパンを焼いた。")).toBeVisible();
  await expect(sora.getByText("🔒 このやりとりは、あなたとハナさんの2人だけに見えます。")).toBeVisible();
  await sora.getByLabel("コメントを書く").fill("おいしそう！");
  await sora.getByRole("button", { name: "送る" }).click();
  await expect(sora.getByText("おいしそう！")).toBeVisible();
  const shared = new URL(sora.url()).pathname;

  // The comment shows on Sora's timeline under the record; Ren's timeline doesn't show it.
  await sora.goto("/memories?view=friends");
  await expect(sora.getByRole("list", { name: "コメント" }).getByText("おいしそう！")).toBeVisible();
  await ren.goto("/memories?view=friends");
  await expect(ren.getByText("はじめてパンを焼いた。")).toBeVisible();
  await expect(ren.getByText("おいしそう！")).toHaveCount(0);

  // Ren sees the record but not Sora's comment.
  await ren.goto(shared);
  await expect(ren.getByText("はじめてパンを焼いた。")).toBeVisible();
  await expect(ren.getByText("おいしそう！")).toHaveCount(0);
  await expect(ren.getByText("まだコメントはありません。")).toBeVisible();

  // Hana is told on Home, opens it and answers Sora.
  await hana.goto("/home");
  await expect(hana.getByText("新しいコメント")).toBeVisible();
  await hana.getByRole("link", { name: /ソラさんからコメント/ }).click();
  await hana.waitForURL(new RegExp(record));
  await expect(hana.getByRole("heading", { name: /ソラさんとのやりとり/ })).toBeVisible();
  await hana.getByLabel("返信する").fill("ありがとう、今度持っていくね");
  await hana.getByRole("button", { name: "送る" }).click();
  await expect(hana.getByText("ありがとう、今度持っていくね")).toBeVisible();
  await hana.goto("/home");
  await expect(hana.getByText("新しいコメント")).toHaveCount(0);
  // Her own timeline shows both lines of the conversation.
  await hana.goto("/memories");
  const lines = hana.getByRole("list", { name: "コメント" });
  await expect(lines.getByText("おいしそう！")).toBeVisible();
  await expect(lines.getByText("ありがとう、今度持っていくね")).toBeVisible();

  await sora.goto("/home");
  await sora.getByRole("link", { name: /ハナさんから返信/ }).click();
  await sora.waitForURL(/\/memories\/shared\//);
  await expect(sora.locator("#comments").getByText("ありがとう、今度持っていくね")).toBeVisible();
  // Taking back her own comment.
  sora.once("dialog", (d) => d.accept());
  await sora.getByRole("button", { name: "取り消す" }).click();
  await expect(sora.getByText("おいしそう！")).toHaveCount(0);

  // Someone not connected can't open the shared page at all.
  const stranger = await user(browser, "X");
  expect((await stranger.goto(shared))?.status()).toBe(404);
});
