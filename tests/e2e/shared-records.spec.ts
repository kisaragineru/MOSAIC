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
  // Under the button: who will see it.
  await expect(hana.getByTestId("post-audience")).toHaveText("🔗 つながっている全員のタイムラインに届きます");
  await hana.getByRole("button", { name: "投稿する" }).click();
  await hana.waitForURL(/\/memories\/[0-9a-f-]+\?ok=saved/);
  const record = new URL(hana.url()).pathname;
  // A letter is its own way of writing (below the post form): an opening day, never shared.
  await hana.goto("/memories/new");
  await expect(hana.getByLabel("手紙を開く日")).toHaveCount(0);
  await expect(hana.getByText("🔒 自分だけが見られます")).toBeVisible();
  await hana.getByRole("link", { name: /未来の自分への手紙/ }).click();
  await hana.waitForURL(/kind=letter_to_future/);
  await expect(hana.getByRole("heading", { level: 1, name: "未来の自分への手紙" })).toBeVisible();
  await expect(hana.getByLabel("手紙を開く日")).toBeVisible();
  await expect(hana.getByRole("radio", { name: /つながっている全員/ })).toHaveCount(0);
  await hana.locator('textarea[name="body"]').fill("5年後の私へ。元気にしてる？");
  await hana.getByLabel("手紙を開く日").fill("2031-01-01");
  await hana.getByRole("button", { name: "手紙に封をする" }).click();
  await hana.waitForURL(/\/memories\/[0-9a-f-]+\?ok=saved/);
  // Still sealed: a sealed envelope on the timeline, and on its own shelf with only its dates.
  await hana.goto("/memories");
  const shelf = hana.getByTestId("letter-shelf");
  await expect(shelf).toContainText("まだ届いていない、未来への手紙 1通");
  await expect(shelf).toContainText(/次は あと\d+日/);
  await expect(hana.getByText(/2031-01-01 まで封印中/)).toBeVisible();
  await expect(hana.getByText("5年後の私へ。元気にしてる？")).toHaveCount(0);
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
  await hana.getByRole("button", { name: "変更を保存" }).click();
  await hana.waitForURL(/ok=saved/);
  await expect(hana.getByText("🔒 自分だけ")).toBeVisible();
  await sora.goto("/memories");
  await expect(sora.getByText("みんなで海に行って、夕日を見た。")).toHaveCount(0);
});

test("write in place from the floating button, or close it with ✕", async ({ browser }) => {
  const page = await user(browser, "ミオ");
  await page.goto("/memories");
  await page.getByTestId("compose-fab").click();
  const sheet = page.getByRole("dialog", { name: "新しい投稿" });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByLabel("あったこと・考えていること")).toBeFocused();
  await sheet.getByLabel("あったこと・考えていること").fill("駅まで歩いて、金木犀の匂いがして嬉しかった。");
  // No category to choose.
  await expect(sheet.getByRole("group", { name: "カテゴリ" })).toHaveCount(0);
  await sheet.getByRole("button", { name: "投稿する" }).click();
  await expect(sheet).toBeHidden();
  await expect(page).toHaveURL(/\/memories$/);
  // Read from the words: a feeling.
  const card = page.getByRole("link", { name: /金木犀の匂いがして/ });
  await expect(card).toContainText("気持ち");
  // One optional question after posting, answered with a tap.
  const ask = page.getByTestId("feeling-ask");
  await expect(ask.getByText("どんな気持ちだった？")).toBeVisible();
  await ask.getByRole("button", { name: /嬉しい/ }).click();
  await expect(ask.getByText("ありがとう。気持ちも一緒に残しました。")).toBeVisible();
  await expect(card.getByLabel("嬉しい")).toBeVisible();
  // On the post: confirm the label with one tap.
  await card.click();
  const about = page.getByTestId("post-about");
  await expect(about.getByText("（書いた言葉から自動で分類）")).toBeVisible();
  await about.getByRole("button", { name: "✓ 合ってる" }).click();
  await expect(page.getByTestId("post-about").getByText("✓ あなたが確認済み")).toBeVisible();
  await page.goto("/memories");

  // ✕ asks before throwing away what was written.
  await page.getByTestId("compose-fab").click();
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
  await hana.getByRole("button", { name: "投稿する" }).click();
  await hana.waitForURL(/ok=saved/);
  await expect(hana.getByText(/家族に公開中/)).toBeVisible();
  await sora.goto("/memories?view=friends");
  await expect(sora.getByText("家族だけに伝えたいこと。")).toBeVisible();

  // The privacy overview shows the same: Sora is family, and sees that record.
  await hana.goto("/me/privacy");
  const row = hana.getByTestId("privacy-connection").filter({ hasText: "ソラ" });
  await expect(row.getByText("家族", { exact: true })).toBeVisible();
  await expect(row.getByText("見えている記録：1件")).toBeVisible();
  await expect(hana.locator("#records").getByText("家族だけ：1件")).toBeVisible();
  await row.getByRole("link", { name: "変更する →" }).click();
  await hana.waitForURL(/\/people\/[0-9a-f-]+\/settings$/);

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
  await hana.getByRole("button", { name: "投稿する" }).click();
  await hana.waitForURL(/\/memories\/[0-9a-f-]+\?ok=saved/);
  const record = new URL(hana.url()).pathname;
  await expect(hana.getByText("共有した相手がコメントすると、ここに届きます。")).toBeVisible();
  // Her own record takes replies: a follow-up hangs under it, and those who can see the record see it.
  await hana.getByLabel("この記録に返信する").fill("2回目はふっくら焼けた");
  await hana.getByTestId("record-replies").getByRole("button", { name: "送る" }).click();
  await expect(hana.getByTestId("record-replies")).toContainText("2回目はふっくら焼けた");
  await expect(hana.getByText("記録を見られる人には、返信も見えます。")).toBeVisible();

  // Sora comments from the shared timeline; the page says it's only between the two of them.
  await sora.goto("/memories?view=friends");
  await sora.getByRole("link", { name: "💬 コメント" }).click();
  await sora.waitForURL(/\/memories\/shared\//);
  await expect(sora.getByText("はじめてパンを焼いた。")).toBeVisible();
  await expect(sora.getByText("🔒 このやりとりは、あなたとハナさんの2人だけに見えます。")).toBeVisible();
  await expect(sora.getByTestId("record-replies")).toContainText("ハナさんのつづき");
  await expect(sora.getByTestId("record-replies")).toContainText("2回目はふっくら焼けた");
  await expect(sora.getByLabel("この記録に返信する")).toHaveCount(0);
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
  await hana.getByLabel("返信する", { exact: true }).fill("ありがとう、今度持っていくね");
  await hana.locator("#comments").getByRole("button", { name: "送る" }).click();
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

test("a connection's page offers things to do: message, gift, ask, and conversation starters that open a drafted message", async ({ browser }) => {
  const hana = await user(browser, "ハナ");
  const sora = await user(browser, "ソラ");
  // Both answer the same question the same way, shown in comparisons, then connect (sharing preferences).
  for (const p of [hana, sora]) {
    await p.goto("/discover/q/l.season");
    await p.getByLabel("春", { exact: true }).check();
    await p.getByLabel(/比較で見せる/).check();
    await p.getByRole("button", { name: "回答を保存" }).click();
    await expect(p.getByText(/回答を保存しました|違う/).first()).toBeVisible();
  }
  await connect(hana, sora);
  const compare = sora.url();
  // Sora shares a record with everyone they're connected with.
  await sora.goto("/memories/new");
  await sora.getByLabel("あったこと・考えていること").fill("桜を見に行った。");
  await sora.getByRole("radio", { name: /つながっている全員/ }).check({ force: true });
  await sora.getByRole("button", { name: "投稿する" }).click();
  await sora.waitForURL(/ok=saved/);

  // Sora's preview shows the same: the buttons Hana gets, and the shared record.
  await sora.goto("/me/preview");
  await expect(sora.getByTestId("phone-actions").getByText("💬メッセージ")).toBeVisible();
  await expect(sora.getByTestId("phone-records").getByText("桜を見に行った。")).toBeVisible();

  await hana.goto(compare);
  const actions = hana.getByTestId("connection-actions");
  await expect(actions.getByRole("button", { name: /メッセージ/ })).toBeVisible();
  await expect(actions.getByRole("link", { name: /プレゼント/ })).toBeVisible();
  await expect(actions.getByRole("button", { name: /印象を聞く/ })).toBeVisible();
  const starters = hana.getByTestId("starters");
  await expect(starters.getByText(/ソラさんの最近の記録：桜を見に行った。/)).toBeVisible();
  await expect(starters.getByText("「いちばん好きな季節は？」— お二人とも「春」")).toBeVisible();

  // The same answer opens the conversation with a draft in the box, not sent.
  await starters.locator("li", { hasText: "お二人とも" }).getByRole("button", { name: /メッセージで話す/ }).click();
  await hana.waitForURL(/\/messages\/[0-9a-f-]+$/);
  await expect(hana.getByRole("textbox")).toHaveValue("「いちばん好きな季節は？」、私も「春」なんだ！今度その話をしようよ。");
  await expect(hana.locator("p", { hasText: "今度その話をしようよ" })).toHaveCount(0); // not sent: no bubble

  // The record starter leads to the one-to-one comment page.
  await hana.goto(compare);
  await hana.getByTestId("starters").getByRole("link", { name: "💬 コメントする" }).click();
  await hana.waitForURL(/\/memories\/shared\//);
  await expect(hana.getByText("桜を見に行った。")).toBeVisible();
});

test("photos on a record: uploaded as chosen, a tidy block on the timeline, whole on the record, and shared with it", async ({ browser }) => {
  const hana = await user(browser, "ハナ");
  const sora = await user(browser, "ソラ");
  await connect(hana, sora);
  await hana.goto("/memories/new");
  await hana.getByLabel("あったこと・考えていること").fill("海に行った。");
  const picker = hana.getByTestId("media-picker");
  await picker.locator('input[type="file"]').setInputFiles(["tests/e2e/fixtures-photo.jpg", "tests/e2e/fixtures-photo.jpg", "tests/e2e/fixtures-photo.jpg"]);
  await expect(picker.locator('input[name="media"]')).toHaveCount(3);
  await hana.getByRole("radio", { name: /つながっている全員/ }).check({ force: true });
  await hana.getByRole("button", { name: "投稿する" }).click();
  await hana.waitForURL(/\/memories\/[0-9a-f-]+\?ok=saved/);
  const gallery = hana.getByTestId("media-gallery");
  await expect(gallery.getByRole("img")).toHaveCount(3);
  const src = await gallery.getByRole("img").first().getAttribute("src");
  const res = await hana.request.get(src!);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("image/jpeg");

  // On the timeline: one block of three (one large, two stacked), and the card opens the record.
  await hana.goto("/memories?view=mine");
  await expect(hana.locator('[data-testid="media-grid"][data-count="3"]')).toBeVisible();
  await expect(hana.getByRole("img", { name: "写真 1/3" })).toBeVisible();

  // Sora sees the same, taps the card, and gets the record with its photos and the comments.
  await sora.goto("/memories?view=friends");
  const card = sora.getByTestId("their-record").filter({ hasText: "海に行った。" });
  await expect(card.locator('[data-testid="media-grid"][data-count="3"]')).toBeVisible();
  await card.click();
  await sora.waitForURL(/\/memories\/shared\//);
  await expect(sora.getByTestId("media-gallery").getByRole("img")).toHaveCount(3);
  await expect(sora.getByLabel("コメントを書く")).toBeVisible();
  // Someone not connected can't fetch the photo.
  const stranger = await user(browser, "レン");
  expect((await stranger.request.get(src!)).status()).toBe(404);

  // A photo-only quick note from the floating composer.
  await hana.goto("/memories");
  await hana.getByTestId("compose-fab").click();
  const sheet = hana.getByRole("dialog");
  await sheet.getByTestId("media-picker").locator('input[type="file"]').setInputFiles("tests/e2e/fixtures-photo.jpg");
  await expect(sheet.locator('input[name="media"]')).toHaveCount(1);
  await sheet.getByRole("button", { name: "投稿する" }).click();
  await expect(hana.getByRole("dialog", { name: "新しい投稿" })).toHaveCount(0);
  await expect(hana.locator('[data-testid="media-grid"][data-count="1"]').first()).toBeVisible();
});

test("videos are served in parts by range, only to those who may see them", async ({ browser }) => {
  const hana = await user(browser, "ハナ");
  const origin = new URL(hana.url()).origin;
  const size = 4 * 1024 * 1024 + 500;
  const video = Buffer.alloc(size, 7);
  video.set([0, 0, 0, 0x18, ...Buffer.from("ftypmp42")]);
  const thumb = (await import("node:fs")).readFileSync("tests/e2e/fixtures-photo.jpg");
  const start = await hana.request.post("/api/memories/media", {
    headers: { origin },
    multipart: { kind: "video", width: "640", height: "360", durationMs: "3000", size: String(size), thumb: { name: "t.jpg", mimeType: "image/jpeg", buffer: thumb }, part: { name: "p", mimeType: "application/octet-stream", buffer: video.subarray(0, 4 * 1024 * 1024) } },
  });
  expect(start.status()).toBe(200);
  const { id, complete } = await start.json();
  expect(complete).toBe(false);
  const put = await hana.request.put(`/api/memories/media/${id}/part/1`, { headers: { origin }, data: video.subarray(4 * 1024 * 1024) });
  expect(await put.json()).toEqual({ complete: true });
  const head = await hana.request.get(`/api/memories/media/${id}`, { headers: { range: "bytes=0-99" } });
  expect(head.status()).toBe(206);
  expect(head.headers()["content-range"]).toBe(`bytes 0-99/${size}`);
  const tail = await hana.request.get(`/api/memories/media/${id}`, { headers: { range: `bytes=${4 * 1024 * 1024}-` } });
  expect(tail.headers()["content-range"]).toBe(`bytes ${4 * 1024 * 1024}-${size - 1}/${size}`);
  expect((await tail.body()).length).toBe(500);
  // Another site can't upload in the user's name.
  const csrf = await hana.request.put(`/api/memories/media/${id}/part/1`, { headers: { origin: "https://evil.example" }, data: Buffer.alloc(10) });
  expect(csrf.status()).toBe(403);
});
