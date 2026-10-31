import { randomUUID } from "node:crypto";
import { devices, expect, test, type Browser, type Page } from "@playwright/test";
import { confirm } from "./confirm";
import { setDate } from "./date";
import { makeLegacyLink } from "./legacy-link";

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
  await a.getByRole("checkbox", { name: /つながった人に Tử Vi を見せる/ }).first().uncheck();
  await a.getByRole("button", { name: "QRを表示" }).click();
  const url = await a.getByTestId("share-url").first().inputValue();
  await b.goto(url.replace(/^https?:\/\/[^/]+/, ""));
  await b.getByRole("button", { name: /さんとつながる$/ }).click();
  await b.waitForURL(/\/compare\//);
  const compare = b.url();
  for (const p of [b, a]) {
    await p.goto(compare);
    await p.getByRole("checkbox", { name: /^好み/ }).check();
    await p.locator('input[name="agree"]').check();
    await p.getByRole("button", { name: "見せるものを更新" }).click();
    await expect(p.getByRole("button", { name: "つながる", exact: true })).toHaveCount(0);
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
  await setDate(hana, "手紙を開く日", "2031-01-01");
  await hana.getByRole("button", { name: "手紙に封をする" }).click();
  await hana.waitForURL(/\/memories\/[0-9a-f-]+\?ok=saved/);
  // Still sealed: a sealed envelope on the timeline, and on its own shelf with only its dates.
  await hana.goto("/memories");
  // On its way: on the line ahead of today, with only when it was written.
  const ahead = hana.getByTestId("ahead");
  await expect(ahead).toContainText("これから");
  await expect(ahead).toContainText(/次は .*に書いた手紙が届く（封印中）/);
  await expect(hana.getByText(/2031-01-01 まで封印中/)).toBeVisible();
  await expect(hana.getByText("5年後の私へ。元気にしてる？")).toHaveCount(0);
  await hana.goto(record);
  await expect(hana.getByText("🔗 つながっている人に公開中")).toBeVisible();

  // Hana's own timeline: today's header, the time it was written, the shared badge.
  await hana.goto("/memories");
  await expect(hana.getByRole("heading", { level: 3 }).first()).toContainText("今日");
  await expect(hana.getByRole("link", { name: /夕日を見た/ })).toContainText(/\d{2}:\d{2}/);
  await expect(hana.getByRole("link", { name: /夕日を見た/ })).toContainText("つながっている人に公開中");
  // The filter can show only records kept to herself, or only shared ones.
  await hana.getByText("絞り込み", { exact: true }).click();
  await hana.getByLabel("公開範囲").selectOption("private");
  await hana.getByRole("button", { name: "検索" }).click();
  await hana.waitForURL(/audience=private/);
  await expect(hana.getByRole("link", { name: /夕日を見た/ })).toHaveCount(0);
  await hana.getByLabel("公開範囲").selectOption("shared");
  await hana.getByRole("button", { name: "検索" }).click();
  await hana.waitForURL(/audience=shared/);
  await expect(hana.getByRole("link", { name: /夕日を見た/ })).toBeVisible();
  // "Mine" is a diary: what's kept to herself (her letter too), until she picks "any".
  await hana.goto("/memories?view=mine");
  await expect(hana.getByTestId("mine-only-me")).toBeVisible();
  await expect(hana.getByRole("link", { name: /夕日を見た/ })).toHaveCount(0);
  await expect(hana.getByText(/2031-01-01 まで封印中/)).toBeVisible();
  await hana.getByText("絞り込み", { exact: true }).click();
  await expect(hana.getByLabel("公開範囲")).toHaveValue("private");
  await expect(hana.getByLabel("分類")).toHaveValue("");
  await hana.getByLabel("公開範囲").selectOption({ label: "指定なし" });
  await hana.getByRole("button", { name: "検索" }).click();
  await hana.waitForURL(/view=mine.*audience=any|audience=any.*view=mine/);
  await expect(hana.getByRole("link", { name: /夕日を見た/ })).toBeVisible();
  await expect(hana.getByTestId("mine-only-me")).toHaveCount(0);

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
  await page.getByRole("dialog").getByRole("button", { name: "閉じる" }).last().click();
  await confirm(page);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("下書き")).toHaveCount(0);

  // "Write in more detail" takes the text along to the full form, once.
  await page.getByTestId("compose-fab").click();
  await page.getByRole("dialog").getByLabel("あったこと・考えていること").fill("続きは詳しく書きたい。");
  await page.getByRole("dialog").getByRole("link", { name: /詳しく書く/ }).click();
  await page.waitForURL(/\/memories\/new$/);
  await expect(page.locator('form.memory-form textarea[name="body"]')).toHaveValue("続きは詳しく書きたい。");
  await page.reload();
  await expect(page.locator('form.memory-form textarea[name="body"]')).toHaveValue("");
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
  await hana.getByRole("radio", { name: /関係や人を選ぶ/ }).check({ force: true });
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
  await hana.goto("/admin");
  await hana.getByRole("button", { name: /テスト相手をつくる/ }).click();
  await hana.waitForURL(/admin\?ok=saved/);
  await expect(hana.getByText("ミナ（テスト）")).toBeVisible();
  await hana.goto("/memories?view=friends");
  await expect(hana.getByText(/駅前に新しいカフェができてた/)).toBeVisible();
  await expect(hana.getByText(/自分だけの記録/)).toHaveCount(0);

  // Sending the family-only record to Mina (not family): Hana is asked first, then shows it in the message.
  await hana.goto("/memories");
  await hana.getByText("家族だけに伝えたいこと。").first().click();
  await hana.waitForURL(/\/memories\/[0-9a-f-]+$/);
  await hana.getByRole("link", { name: "メッセージで送る" }).click();
  await hana.locator("label", { hasText: "ミナ（テスト）" }).getByRole("checkbox").check();
  await hana.getByRole("button", { name: "送信", exact: true }).click();
  await expect(hana.getByTestId("record-ask")).toContainText("ミナ（テスト）さんは、この記録を見られません");
  await hana.getByRole("button", { name: "見せて送る" }).click();
  await hana.waitForURL(/\/messages\/[0-9a-f-]+$/);
  await expect(hana.getByText("家族だけに伝えたいこと。")).toBeVisible();
  await hana.goto("/admin");
  await hana.getByRole("button", { name: "削除" }).last().click();
  await confirm(hana);
  await hana.waitForURL(/ok=deleted/);
  await expect(hana.getByText("ミナ（テスト）")).toHaveCount(0);
});

test("share with chosen people by name: only they see it", async ({ browser }) => {
  const hana = await user(browser, "ハナ");
  const sora = await user(browser, "ソラ");
  const ren = await user(browser, "レン");
  await connect(hana, sora);
  await connect(hana, ren);

  await hana.goto("/memories/new");
  await hana.getByLabel("あったこと・考えていること").fill("ソラにだけ話したいこと。");
  await hana.getByRole("radio", { name: /関係や人を選ぶ/ }).check({ force: true });
  await hana.getByTestId("audience-people").getByRole("checkbox", { name: /ソラ/ }).check({ force: true });
  await expect(hana.getByTestId("post-audience")).toHaveText("👪 ソラに届きます");
  await hana.getByRole("button", { name: "投稿する" }).click();
  await hana.waitForURL(/ok=saved/);
  await expect(hana.getByText(/👤ソラに公開中/)).toBeVisible();

  await sora.goto("/memories?view=friends");
  await expect(sora.getByText("ソラにだけ話したいこと。")).toBeVisible();
  await ren.goto("/memories?view=friends");
  await expect(ren.getByText("ソラにだけ話したいこと。")).toHaveCount(0);
});

test("records dated ahead wait above today, closed to one line, and on Home as one line", async ({ browser }) => {
  const hana = await user(browser, "ハナ");
  const next = `${new Date().getFullYear() + 1}-01-01`;
  await hana.goto("/memories/new");
  await hana.getByLabel("あったこと・考えていること").fill("正月の予定");
  await hana.getByText("詳しく書く（日付・タグ・人）").click();
  await setDate(hana, "いつのこと？", next);
  await hana.getByRole("button", { name: "投稿する" }).click();
  await hana.waitForURL(/ok=saved/);
  await hana.goto("/memories/new");
  await hana.getByLabel("あったこと・考えていること").fill("今日のこと");
  await hana.getByRole("button", { name: "投稿する" }).click();
  await hana.waitForURL(/ok=saved/);

  await hana.goto("/memories");
  const ahead = hana.getByTestId("ahead");
  await expect(ahead).toContainText("これから");
  await expect(ahead).toContainText("1件");
  await expect(hana.getByTestId("ahead-today")).toContainText("今日");
  // Closed at first: the record isn't on the timeline, only in the summary line.
  await expect(hana.getByTestId("ahead-item")).toBeHidden();
  await expect(hana.getByRole("link", { name: /正月の予定/ })).toBeHidden();
  await expect(hana.getByRole("link", { name: /今日のこと/ })).toBeVisible();
  await ahead.getByText("これから").click();
  await expect(hana.getByTestId("ahead-item")).toContainText("正月の予定");
  // Remembered as opened.
  await hana.reload();
  await expect(hana.getByTestId("ahead-item")).toBeVisible();
  // A search finds it as usual.
  await hana.goto("/memories?q=正月");
  await expect(hana.getByTestId("ahead")).toHaveCount(0);
  await expect(hana.getByRole("link", { name: /正月の予定/ })).toBeVisible();

  await hana.goto("/home");
  await expect(hana.getByTestId("home-ahead")).toContainText("これから 1件");
  await expect(hana.getByTestId("home-ahead")).toContainText("正月の予定");
  await hana.getByTestId("home-ahead").click();
  await hana.waitForURL(/\/memories#ahead/);
  await expect(hana.getByTestId("ahead-item")).toBeVisible();
});

test("a link from before: waiting for the owner, marked as such, with whose turn it is", async ({ browser }) => {
  const hana = await user(browser, "ハナ");
  const sora = await user(browser, "ソラ");
  await hana.goto("/share");
  await hana.getByRole("checkbox", { name: /つながった人に Tử Vi を見せる/ }).first().uncheck();
  await hana.getByRole("button", { name: "QRを表示" }).click();
  const url = await hana.getByTestId("share-url").first().inputValue();
  await makeLegacyLink(url);
  await sora.goto(url.replace(/^https?:\/\/[^/]+/, ""));
  await sora.getByRole("button", { name: /さんとつながる$/ }).click();
  await sora.waitForURL(/\/compare\/[0-9a-f-]+\?ok=reached/);
  await expect(sora.getByTestId("connected-moment")).toContainText("あなたの気持ちは届きました");
  await expect(sora.getByText("保存しました。")).toHaveCount(0);

  // Sora files Hana: waiting for her.
  await sora.goto("/people");
  await sora.getByLabel("関係").first().selectOption("friend");
  await sora.getByRole("button", { name: /大切な人に追加/ }).click();
  await sora.waitForURL(/\/people\/[0-9a-f-]+/);
  await expect(sora.getByTestId("person-waiting")).toContainText("ハナさんがつながるのを待っています");
  await sora.goto("/people");
  await expect(sora.getByTestId("person-pending")).toHaveText("⏳ 同意待ち");

  // Hana files Sora: her turn.
  await hana.goto("/people");
  await hana.getByLabel("関係").first().selectOption("friend");
  await hana.getByRole("button", { name: /大切な人に追加/ }).click();
  await hana.waitForURL(/\/people\/[0-9a-f-]+/);
  const person = new URL(hana.url()).pathname;
  await expect(hana.getByTestId("person-connect")).toHaveText("「つながる」を押すとメッセージできます →");
  await hana.getByTestId("person-connect").click();
  await hana.waitForURL(/\/compare\/[0-9a-f-]+#consent/);
  // One question first, with room to decide later and no guilt about it.
  await expect(hana.getByTestId("connect-choice")).toContainText("ソラさんとつながりますか？");
  await expect(hana.getByTestId("connect-choice")).toContainText("急がなくて大丈夫です");
  await expect(hana.getByRole("checkbox", { name: /^好み/ })).toHaveCount(0);
  await hana.getByRole("button", { name: "つながる", exact: true }).click();
  // Both said yes: the moment, and a way to say hello.
  const moment = hana.getByTestId("connected-moment");
  await expect(moment).toContainText("ソラさんとつながりました");
  await expect(moment.getByRole("button", { name: "💬 最初のメッセージを送る" })).toBeVisible();
  await hana.goto("/people");
  await expect(hana.getByTestId("person-pending")).toHaveCount(0);
  await expect(hana.getByText(/^🔗\s*つながっている$/)).toBeVisible();
  await hana.goto(person);
  await expect(hana.getByRole("button", { name: "メッセージ" })).toBeVisible();
});

test("ending a connection keeps my card as notes; connecting again comes back to it", async ({ browser }) => {
  const hana = await user(browser, "ハナ");
  const sora = await user(browser, "ソラ");
  await connect(hana, sora);
  await hana.goto("/people");
  await hana.getByLabel("関係").first().selectOption("friend");
  await hana.getByRole("button", { name: /大切な人に追加/ }).click();
  await hana.waitForURL(/\/people\/[0-9a-f-]+/);
  const person = new URL(hana.url()).pathname;
  await hana.goto(`${person}/settings`);
  await hana.getByRole("button", { name: "つながりを解除する" }).click();
  await confirm(hana);
  await expect(hana.getByText("ソラさんとのつながりは解除されています")).toBeVisible();

  await hana.goto("/people");
  await expect(hana.getByTestId("person-ended-pill")).toContainText("つながり終了");
  await hana.goto(person);
  await expect(hana.getByTestId("person-ended")).toContainText("つながりは終わりました");

  // Again: back to the same card, with a moment of its own.
  await hana.goto("/share");
  await hana.getByRole("checkbox", { name: /つながった人に Tử Vi を見せる/ }).first().uncheck();
  await hana.getByRole("button", { name: "QRを表示" }).click();
  const url = await hana.getByTestId("share-url").first().inputValue();
  await sora.goto(url.replace(/^https?:\/\/[^/]+/, ""));
  await sora.getByRole("button", { name: /さんとつながる$/ }).click();
  await sora.waitForURL(/\/compare\//);
  await expect(sora.getByTestId("connected-moment")).toContainText("ハナさんと、またつながりました");
  await hana.goto("/people");
  await expect(hana.getByText("QRでつながった人")).toHaveCount(0);
  await expect(hana.getByRole("list", { name: "大切な人" }).getByRole("listitem").filter({ hasText: "ソラ" })).toHaveCount(1);
  await expect(hana.getByTestId("person-ended-pill")).toHaveCount(0);
  await expect(hana.getByText(/^🔗\s*つながっている$/)).toBeVisible();
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

test("replies under a record: one thread for everyone who can see it", async ({ browser }) => {
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
  const thread = (p: typeof hana) => p.getByTestId("record-replies");

  // Hana adds a follow-up under her own record; it says who sees replies.
  await hana.getByLabel("返信を書く").fill("2回目はふっくら焼けた");
  await thread(hana).getByRole("button", { name: "送る" }).click();
  await expect(thread(hana)).toContainText("2回目はふっくら焼けた");
  await expect(thread(hana)).toContainText("投稿者");
  await expect(hana.getByText("👀 返信は、この記録を見られる人全員に見えます。")).toBeVisible();

  // Sora opens it from the shared timeline, reads Hana's follow-up and replies.
  await sora.goto("/memories?view=friends");
  await sora.getByRole("link", { name: /💬 返信/ }).first().click();
  await sora.waitForURL(/\/memories\/shared\//);
  const shared = new URL(sora.url()).pathname;
  await expect(thread(sora)).toContainText("2回目はふっくら焼けた");
  await sora.getByLabel("返信を書く").fill("おいしそう！");
  await thread(sora).getByRole("button", { name: "送る" }).click();
  await expect(thread(sora)).toContainText("おいしそう！");

  // Ren, who can see the record too, sees the whole thread and joins in. Ren isn't connected to
  // Sora, so Sora shows as "a friend of Hana", without her name; Ren is told the same about himself.
  await ren.goto(shared);
  await expect(thread(ren)).toContainText("おいしそう！");
  await expect(thread(ren)).toContainText("ハナさんの友だち");
  await expect(thread(ren)).not.toContainText("ソラ");
  await expect(ren.getByTestId("reply-name-note")).toContainText("あなたとつながっていない人には「ハナさんの友だち」と表示され");
  await ren.getByLabel("返信を書く").fill("レシピ知りたい");
  await thread(ren).getByRole("button", { name: "送る" }).click();
  await expect(thread(ren)).toContainText("レシピ知りたい");

  // Hana is told on Home, and the timeline shows the newest replies under the record.
  await hana.goto("/home");
  await hana.getByTestId("notice-tray").getByRole("link", { name: /あなたの記録にレンさんが返信/ }).click();
  await hana.waitForURL(new RegExp(record));
  await expect(thread(hana)).toContainText("おいしそう！");
  // Hana is connected to both, so she sees both names.
  await expect(thread(hana)).toContainText("ソラ");
  await expect(thread(hana)).toContainText("レン");
  // And Sora sees Ren only as "a friend of Hana".
  await sora.goto(shared);
  await expect(thread(sora)).toContainText("ハナさんの友だち");
  await expect(thread(sora)).not.toContainText("レン");
  // Someone she's connected to (Hana) opens their page together from the icon; Ren's doesn't link.
  await expect(thread(sora).getByRole("link", { name: "ハナさんとのページを開く" }).first()).toHaveAttribute("href", /^\/people\/with\/[0-9a-f-]+$/);
  await expect(thread(sora).locator("li", { hasText: "ハナさんの友だち" }).getByRole("link")).toHaveCount(0);
  // Ren's icon: his initial, no photo.
  const renItem = thread(sora).locator("li", { hasText: "ハナさんの友だち" });
  await expect(renItem.locator("span[aria-hidden]").first()).toHaveText("レ");
  await expect(renItem.locator("img")).toHaveCount(0);
  await hana.goto("/home");
  await expect(hana.getByTestId("notice-tray").getByText(/返信/)).toHaveCount(0);
  await hana.goto("/memories");
  const lines = hana.getByRole("list", { name: "返信" });
  await expect(lines.getByText("レシピ知りたい")).toBeVisible();
  await expect(lines.getByText("ほか1件の返信 →")).toBeVisible();

  // As the record's owner, Hana can remove Ren's reply; Sora can remove only her own.
  await hana.goto(record);
  await thread(hana).locator("li", { hasText: "レシピ知りたい" }).getByRole("button", { name: "削除" }).click();
  await confirm(hana);
  await expect(thread(hana)).not.toContainText("レシピ知りたい");
  await sora.goto(shared);
  await expect(thread(sora).locator("li", { hasText: "2回目はふっくら焼けた" }).getByRole("button", { name: "削除" })).toHaveCount(0);
  await thread(sora).locator("li", { hasText: "おいしそう！" }).getByRole("button", { name: "削除" }).click();
  await confirm(sora);
  await expect(thread(sora)).not.toContainText("おいしそう！");

  // Sora answers Hana privately: their conversation opens with the record attached; it goes as one message.
  await sora.goto(shared);
  await sora.getByRole("button", { name: "💬 ハナさんにメッセージで返信" }).click();
  await sora.waitForURL(/\/messages\/[0-9a-f-]+/);
  await expect(sora.getByTestId("record-reply-chip")).toContainText("ハナさんの記録への返信");
  await sora.getByRole("textbox").last().fill("こっそり聞きたいんだけど");
  await sora.getByRole("button", { name: "送信" }).click();
  await expect(sora.getByTestId("record-reply-chip")).toHaveCount(0);
  await expect(sora.getByText("こっそり聞きたいんだけど")).toBeVisible();
  const dm = new URL(sora.url()).pathname;
  await hana.goto(dm);
  await expect(hana.getByText("あなたの記録への返信")).toBeVisible();
  await expect(hana.getByText("こっそり聞きたいんだけど")).toBeVisible();
  // Someone else's record can't be passed on from the "share" page: it goes back to the record.
  await sora.goto(`/messages/new?record=${record.split("/").pop()}`);
  await sora.waitForURL(new RegExp(`/memories/shared/`));

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
    await p.getByLabel(/つながった人と見せ合う/).check();
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
  // Once she's among Hana's people, the present button lands on the ideas themselves, in view.
  await hana.getByRole("button", { name: "大切な人に追加" }).click();
  await hana.waitForURL(/\/people\/[0-9a-f-]+\?ok=saved/);
  await hana.goto(compare);
  await expect(actions.getByRole("link", { name: /プレゼント/ })).toHaveAttribute("href", /#gift-ideas$/);
  await actions.getByRole("link", { name: /プレゼント/ }).click();
  await expect(hana).toHaveURL(/\/people\/[0-9a-f-]+\?gifts=1#gift-ideas$/);
  await expect(hana.getByTestId("gift-ideas")).toBeInViewport();
  await hana.goto(compare);
  const starters = hana.getByTestId("starters");
  await expect(starters.getByText(/ソラさんの最近の記録：桜を見に行った。/)).toBeVisible();
  await expect(starters.getByText("「いちばん好きな季節は？」— お二人とも「春」")).toBeVisible();

  // The same answer opens the conversation with a draft in the box, not sent.
  await starters.locator("li", { hasText: "お二人とも" }).getByRole("button", { name: /メッセージで話す/ }).click();
  await hana.waitForURL(/\/messages\/[0-9a-f-]+$/);
  await expect(hana.getByRole("textbox")).toHaveValue("「いちばん好きな季節は？」、私も「春」なんだ！今度その話をしようよ。");
  await expect(hana.locator("p", { hasText: "今度その話をしようよ" })).toHaveCount(0); // not sent: no bubble

  // The record starter leads to the record and its replies.
  await hana.goto(compare);
  await hana.getByTestId("starters").getByRole("link", { name: "💬 返信する" }).click();
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
  await picker.locator('input[type="file"][multiple]').setInputFiles(["tests/e2e/fixtures-photo.jpg", "tests/e2e/fixtures-photo.jpg", "tests/e2e/fixtures-photo.jpg"]);
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
  // (It's shared, so "Mine" shows it with "who can read it" set to any.)
  await hana.goto("/memories?view=mine&audience=any");
  await expect(hana.locator('[data-testid="media-grid"][data-count="3"]')).toBeVisible();
  await expect(hana.getByRole("img", { name: "写真 1/3" })).toBeVisible();

  // Sora sees the same, taps the card, and gets the record with its photos and the comments.
  await sora.goto("/memories?view=friends");
  const card = sora.getByTestId("their-record").filter({ hasText: "海に行った。" });
  await expect(card.locator('[data-testid="media-grid"][data-count="3"]')).toBeVisible();
  // Hana's icon opens Sora's page about her (their connection page, while she isn't in My people).
  await card.getByRole("link", { name: "ハナさんとのページを開く" }).click();
  await sora.waitForURL(/\/compare\/[0-9a-f-]+$/);
  await sora.goBack();
  await card.click();
  await sora.waitForURL(/\/memories\/shared\//);
  await expect(sora.getByTestId("media-gallery").getByRole("img")).toHaveCount(3);
  await expect(sora.getByLabel("返信を書く")).toBeVisible();
  // Someone not connected can't fetch the photo.
  const stranger = await user(browser, "レン");
  expect((await stranger.request.get(src!)).status()).toBe(404);

  // A photo-only quick note from the floating composer.
  await hana.goto("/memories");
  await hana.getByTestId("compose-fab").click();
  const sheet = hana.getByRole("dialog");
  await sheet.getByTestId("media-picker").locator('input[type="file"][multiple]').setInputFiles("tests/e2e/fixtures-photo.jpg");
  await expect(sheet.locator('input[name="media"]')).toHaveCount(1);
  await sheet.getByRole("button", { name: "投稿する" }).click();
  await expect(hana.getByRole("dialog", { name: "新しい投稿" })).toHaveCount(0);
  await expect(hana.locator('[data-testid="media-grid"][data-count="1"]').first()).toBeVisible();
  // On a phone, a photo can also be taken with the camera straight away.
  await hana.getByTestId("compose-fab").click();
  const camera = hana.getByRole("dialog").getByTestId("media-camera");
  await expect(hana.getByRole("dialog").getByText("カメラで撮る")).toBeVisible();
  await expect(camera).toHaveAttribute("capture", "environment");
  await camera.setInputFiles("tests/e2e/fixtures-photo.jpg");
  await expect(hana.getByRole("dialog").locator('input[name="media"]')).toHaveCount(1);
  await hana.getByRole("dialog").getByRole("button", { name: "投稿する" }).click();
  await expect(hana.getByRole("dialog", { name: "新しい投稿" })).toHaveCount(0);
  // On a computer there is only the one button.
  const desk = await (await browser.newContext({ ...devices["Desktop Chrome"], locale: "ja-JP", storageState: await hana.context().storageState() })).newPage();
  await desk.goto("/memories");
  await desk.getByTestId("compose-fab").click();
  await expect(desk.getByRole("dialog").getByText("写真・動画を追加")).toBeVisible();
  await expect(desk.getByRole("dialog").getByText("カメラで撮る")).toBeHidden();
  await desk.context().close();
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
