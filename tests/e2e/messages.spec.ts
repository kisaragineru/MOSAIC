import { randomUUID } from "node:crypto";
import { expect, test, type Browser, type Locator, type Page } from "@playwright/test";
import { confirm } from "./confirm";

async function user(browser: Browser, name: string) {
  const ctx = await browser.newContext({ locale: "ja-JP", timezoneId: "Asia/Tokyo", extraHTTPHeaders: { "Accept-Language": "ja-JP,ja;q=0.9", "x-e2e-client-ip": `10.8.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` } });
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
  const url = await a.getByTestId("share-url").first().inputValue();
  await b.goto(url.replace(/^https?:\/\/[^/]+/, ""));
  await b.getByRole("button", { name: "続ける" }).click();
  await b.waitForURL(/\/compare\//);
  const compare = b.url();
  for (const p of [b, a]) {
    await p.goto(compare);
    await p.getByRole("button", { name: "つながる", exact: true }).click();
    await p.getByRole("checkbox", { name: /^好み/ }).check();
    await p.locator('input[name="agree"]').check();
    await p.getByRole("button", { name: "見せるものを更新" }).click();
    await expect(p.getByRole("button", { name: "つながる", exact: true })).toHaveCount(0);
  }
}

async function sendText(p: Page, text: string) {
  await p.getByLabel("メッセージを入力…").fill(text);
  // The message shows at once (sent in the background): wait for the server to have it too.
  await Promise.all([
    p.waitForResponse((r) => r.request().method() === "POST" && /^\/api\/dm\/[^/]+\/send$/.test(new URL(r.url()).pathname)),
    p.getByRole("button", { name: "送信", exact: true }).click(),
  ]);
  await expect(p.getByText(text, { exact: true }).last()).toBeVisible();
}

/** Open a message's actions (long press / right click). */
async function actionsFor(p: Page, text: string) {
  await p.locator('[role="button"][aria-label="メッセージの操作"]').filter({ has: p.getByText(text, { exact: true }) }).last().click({ button: "right" });
  return p.getByRole("dialog", { name: "メッセージの操作" });
}

// A 1×1 PNG.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

test("direct messages: send, read, reply, react, edit, unsend, photos", async ({ browser }) => {
  test.setTimeout(180_000);
  const hana = await user(browser, "ハナ");
  const sora = await user(browser, "ソラ");
  const ren = await user(browser, "レン");
  await connect(hana, sora);

  // Only people you're connected with can be picked.
  await hana.goto("/messages");
  await expect(hana.getByText("まだメッセージはありません。")).toBeVisible();
  await hana.getByRole("link", { name: "新しいメッセージ" }).click();
  await expect(hana.getByText("レン")).toHaveCount(0);
  await hana.getByLabel("ソラ").check();
  await hana.getByRole("button", { name: "はじめる" }).click();
  await hana.waitForURL(/\/messages\/[0-9a-f-]+$/);
  const thread = new URL(hana.url()).pathname;
  await sendText(hana, "こんにちは！");

  // Sora: badge in the header, the conversation in the inbox, then reads it.
  await sora.goto("/home");
  await expect(sora.getByRole("link", { name: "メッセージ (1)" })).toBeVisible();
  await sora.getByRole("link", { name: "メッセージ (1)" }).click();
  await expect(sora.getByText("こんにちは！")).toBeVisible();
  await sora.getByRole("link", { name: /ハナ/ }).click();
  await sora.waitForURL(thread);
  await expect(sora.getByText("こんにちは！")).toBeVisible();
  // Hana's icon at the top leads to Sora's page about her.
  await expect(sora.getByRole("link", { name: "ハナさんとのページを開く" })).toHaveAttribute("href", /^\/people\/with\/[0-9a-f-]+$/);
  // Hana sees it was read, and that Sora is typing.
  await expect(hana.getByText("既読")).toBeVisible({ timeout: 15_000 });
  await sora.getByLabel("メッセージを入力…").fill("い");
  await expect(hana.getByText("ソラが入力中…").first()).toBeVisible({ timeout: 15_000 });

  // Sora replies to the message; Hana's screen picks it up by itself.
  await (await actionsFor(sora, "こんにちは！")).getByRole("button", { name: /返信/ }).click();
  await expect(sora.getByText("ハナに返信")).toBeVisible();
  await sendText(sora, "元気だよ");
  await expect(hana.getByText("元気だよ", { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(hana.getByText("↩ ハナ")).toBeVisible();

  // Translate, under the original (which stays; the stand-in AI answers). Then turn it off.
  const menu = await actionsFor(hana, "元気だよ");
  await expect(menu.getByText("翻訳のため、このメッセージだけをAI（Anthropic）に送ります。保存はされません。")).toBeVisible();
  await menu.getByRole("button", { name: /翻訳/ }).click();
  await expect(hana.getByTestId("translation")).toContainText("[AI訳] 元気だよ");
  await expect(hana.getByText("元気だよ", { exact: true })).toBeVisible();
  await (await actionsFor(hana, "元気だよ")).getByRole("button", { name: "🌐 翻訳を解除" }).click();
  await expect(hana.getByTestId("translation")).toHaveCount(0);

  // A reaction, seen on the other side.
  await (await actionsFor(hana, "元気だよ")).getByRole("button", { name: "😂" }).click();
  await expect(sora.getByRole("button", { name: "😂" })).toBeVisible({ timeout: 15_000 });

  // Edit (own message, within 24 hours) and unsend.
  await (await actionsFor(hana, "こんにちは！")).getByRole("button", { name: /編集/ }).click();
  await hana.getByLabel("メッセージを入力…").fill("こんにちは、ソラ！");
  await hana.getByRole("button", { name: "保存" }).click();
  await expect(sora.getByText("こんにちは、ソラ！").first()).toBeVisible({ timeout: 15_000 });
  await expect(sora.getByText(/編集済み/)).toBeVisible();
  await (await actionsFor(sora, "元気だよ")).getByRole("button", { name: /送信を取り消す/ }).click();
  await confirm(sora);
  await expect(hana.getByText("メッセージの送信が取り消されました")).toBeVisible({ timeout: 15_000 });

  // A photo: only members can load it. (On a phone there is also the camera, next to the gallery.)
  // While typing, the photo buttons tuck into one "›" (as in Messenger); "›" brings them back.
  const box = hana.getByLabel("メッセージを入力…");
  await box.fill("x");
  await expect(hana.getByTestId("dm-tools")).toBeVisible();
  await expect(hana.getByRole("button", { name: "カメラで撮る" })).toHaveCount(0);
  await box.fill("");
  await hana.getByTestId("dm-tools").click();
  await expect(box).toBeFocused();
  await expect(hana.getByRole("button", { name: "カメラで撮る" })).toBeVisible();
  await expect(hana.getByTestId("dm-camera")).toHaveAttribute("capture", "environment");
  await hana.locator('input[type="file"][multiple]').setInputFiles({ name: "dot.png", mimeType: "image/png", buffer: PNG });
  await expect(hana.getByRole("button", { name: "写真を外す" })).toBeVisible();
  await hana.getByRole("button", { name: "送信", exact: true }).click();
  const img = sora.locator('img[src^="/api/dm/photo/"]');
  await expect(img).toBeVisible({ timeout: 15_000 });
  const src = await img.getAttribute("src");
  expect((await sora.request.get(src!)).status()).toBe(200);
  expect((await ren.request.get(src!)).status()).toBe(404);
  // And Ren can't open the conversation at all.
  expect((await ren.goto(thread))?.status()).toBe(404);

  // A day later (the phone's clock 25 hours on): "Edit" is still in the menu, greyed, saying why.
  await hana.clock.install({ time: new Date(Date.now() + 25 * 3600_000) });
  await hana.reload();
  const later = await actionsFor(hana, "こんにちは、ソラ！");
  await expect(later.getByTestId("edit-passed")).toBeDisabled();
  await expect(later.getByTestId("edit-passed")).toContainText("編集できるのは、送ってから24時間までです。");
});

test("group messages: create, notices, who wrote, read counts, leave", async ({ browser }) => {
  test.setTimeout(180_000);
  const hana = await user(browser, "ハナ");
  const sora = await user(browser, "ソラ");
  const ren = await user(browser, "レン");
  await connect(hana, sora);
  await connect(hana, ren);

  await hana.goto("/messages/new");
  await hana.getByLabel("ソラ").check();
  await hana.getByLabel("レン").check();
  await hana.getByLabel("グループ名（任意）").fill("週末の計画");
  await hana.getByRole("button", { name: "はじめる" }).click();
  await hana.waitForURL(/\/messages\/[0-9a-f-]+$/);
  const group = new URL(hana.url()).pathname;
  await expect(hana.getByRole("heading", { name: "週末の計画" })).toBeVisible();
  await expect(hana.getByText("あなたがグループを作成しました")).toBeVisible();
  await sendText(hana, "土曜どう？");

  await ren.goto("/messages");
  await expect(ren.getByText("週末の計画")).toBeVisible();
  await ren.getByRole("link", { name: /週末の計画/ }).click();
  await expect(ren.getByText("土曜どう？")).toBeVisible();
  await sendText(ren, "いいね");
  await sora.goto(group);
  await expect(sora.getByText("いいね")).toBeVisible();
  // Group: who wrote is shown, and how many have read.
  await expect(sora.getByText("レン", { exact: true }).first()).toBeVisible();
  await expect(ren.getByText(/既読 [12]/)).toBeVisible({ timeout: 15_000 });

  // Ren leaves: the others see a notice, Ren can't write any more.
  await ren.goto(`${group}/info`);
  await expect(ren.getByText("メンバー（3人）")).toBeVisible();
  await ren.getByRole("button", { name: "グループを退出" }).click();
  await confirm(ren);
  await ren.waitForURL("/messages");
  await expect(hana.getByText("レンが退出しました")).toBeVisible({ timeout: 15_000 });
});

test("group mentions: @ lists the members (and everyone), the person mentioned sees it in the list and the message", async ({ browser }) => {
  test.setTimeout(180_000);
  const hana = await user(browser, "ハナ");
  const sora = await user(browser, "ソラ");
  const ren = await user(browser, "レン");
  await connect(hana, sora);
  await connect(hana, ren);
  await hana.goto("/messages/new");
  await hana.getByLabel("ソラ").check();
  await hana.getByLabel("レン").check();
  await hana.getByLabel("グループ名（任意）").fill("週末の計画");
  await hana.getByRole("button", { name: "はじめる" }).click();
  await hana.waitForURL(/\/messages\/[0-9a-f-]+$/);
  const group = new URL(hana.url()).pathname;

  // "@" opens the members and "everyone"; typing narrows them; picking one writes "@name ".
  const box = hana.getByLabel("メッセージを入力…");
  await box.click();
  await box.pressSequentially("土曜は@");
  const list = hana.getByTestId("mention-list");
  await expect(list.getByRole("button")).toHaveText([/@ソラ/, /@レン/, /@全員/]);
  await box.pressSequentially("ソ");
  await expect(list.getByRole("button")).toHaveText([/@ソラ/]);
  await list.getByRole("button", { name: /@ソラ/ }).click();
  await expect(box).toHaveValue("土曜は@ソラ ");
  await expect(list).toHaveCount(0);
  await box.pressSequentially("来られる？");
  await Promise.all([
    hana.waitForResponse((r) => r.request().method() === "POST" && /^\/api\/dm\/[^/]+\/send$/.test(new URL(r.url()).pathname)),
    hana.getByRole("button", { name: "送信", exact: true }).click(),
  ]);

  // Sora: an "@" in the list, the message marked for them, the name marked in it.
  await sora.goto("/messages");
  await expect(sora.getByTestId("inbox-mentioned")).toBeVisible();
  await sora.goto(group);
  const mine = sora.locator("[data-mentions-me]");
  await expect(mine).toHaveText("土曜は@ソラ 来られる？");
  await expect(mine.locator("[data-mention]")).toHaveText("@ソラ");
  // Ren was not mentioned.
  await ren.goto(group);
  await expect(ren.getByText("土曜は@ソラ 来られる？")).toBeVisible();
  await expect(ren.locator("[data-mentions-me]")).toHaveCount(0);
});

test("sending feels instant: shown at once while the server is slow; a failure says so and can be resent", async ({ browser }) => {
  const hana = await user(browser, "ハナ");
  const sora = await user(browser, "ソラ");
  await connect(hana, sora);
  await hana.goto("/messages/new");
  await hana.getByLabel("ソラ").check();
  await hana.getByRole("button", { name: "はじめる" }).click();
  await hana.waitForURL(/\/messages\/[0-9a-f-]+$/);
  const thread = new URL(hana.url()).pathname;

  // A slow server: the message is on screen right away, with no "sending" state.
  await hana.route("**/api/dm/*/send", async (r) => {
    await new Promise((res) => setTimeout(res, 2500));
    await r.continue();
  });
  await hana.getByLabel("メッセージを入力…").fill("すぐ表示される");
  await hana.getByRole("button", { name: "送信", exact: true }).click();
  await expect(hana.getByText("すぐ表示される")).toBeVisible({ timeout: 500 });
  await expect(hana.getByText("送信中…")).toHaveCount(0);
  await hana.getByLabel("メッセージを入力…").fill("続けて送れる");
  await hana.getByRole("button", { name: "送信", exact: true }).click();
  await expect(hana.getByText("続けて送れる")).toBeVisible({ timeout: 500 });
  await sora.goto(thread);
  await expect(sora.getByText("続けて送れる")).toBeVisible({ timeout: 15_000 });
  // In order, once each.
  const bodies = await sora.locator("li p").allInnerTexts();
  expect(bodies.filter((b) => b === "すぐ表示される")).toHaveLength(1);
  expect(bodies.indexOf("すぐ表示される")).toBeLessThan(bodies.indexOf("続けて送れる"));
  await hana.unroute("**/api/dm/*/send");

  // The server is down: after one automatic retry it says it failed, and "resend" delivers it once.
  await hana.route("**/api/dm/*/send", (r) => r.fulfill({ status: 503, body: "{}" }));
  await hana.getByLabel("メッセージを入力…").fill("あとで届く");
  await hana.getByRole("button", { name: "送信", exact: true }).click();
  await expect(hana.getByText("送信できませんでした")).toBeVisible({ timeout: 10_000 });
  await hana.unroute("**/api/dm/*/send");
  await hana.getByRole("button", { name: "再送" }).click();
  await expect(hana.getByText("送信できませんでした")).toHaveCount(0);
  await expect(sora.getByText("あとで届く")).toBeVisible({ timeout: 15_000 });

  // A failed one can also be deleted from the screen.
  await hana.route("**/api/dm/*/send", (r) => r.fulfill({ status: 400, body: JSON.stringify({ error: "invalid_message" }) }));
  await hana.getByLabel("メッセージを入力…").fill("消す予定");
  await hana.getByRole("button", { name: "送信", exact: true }).click();
  await expect(hana.getByText("メッセージを確認してください（4000文字まで）。")).toBeVisible({ timeout: 5_000 });
  await hana.getByRole("button", { name: "削除" }).click();
  await expect(hana.getByText("消す予定")).toHaveCount(0);
});


test("a URL is sent like any text; an expired sign-in is explained, and unsent messages survive a reload", async ({ browser }) => {
  const hana = await user(browser, "ハナ");
  const sora = await user(browser, "ソラ");
  await connect(hana, sora);
  await hana.goto("/messages/new");
  await hana.getByLabel("ソラ").check();
  await hana.getByRole("button", { name: "はじめる" }).click();
  await hana.waitForURL(/\/messages\/[0-9a-f-]+$/);
  const thread = new URL(hana.url()).pathname;
  await sendText(hana, "https://vt.tiktok.com/ZSgxDomeP/");
  await sora.goto(thread);
  await expect(sora.getByRole("link", { name: "https://vt.tiktok.com/ZSgxDomeP/" })).toBeVisible();

  // The hosting's sign-in runs out: every request is refused before reaching the app.
  await hana.route("**/api/dm/**", (r) => r.fulfill({ status: 401, contentType: "text/html", body: "<html>login</html>" }));
  await hana.getByLabel("メッセージを入力…").fill("期限切れのあとに");
  await hana.getByRole("button", { name: "送信", exact: true }).click();
  await expect(hana.getByText(/ログインの有効期限が切れたため送れませんでした/)).toBeVisible({ timeout: 5_000 });
  await expect(hana.getByText(/接続が切れました/)).toBeVisible();

  // Signed in again: after a reload the message is still there, ready to resend.
  await hana.unroute("**/api/dm/**");
  await hana.reload();
  await expect(hana.getByText("期限切れのあとに")).toBeVisible();
  await hana.getByRole("button", { name: "再送" }).click();
  await expect(sora.getByText("期限切れのあとに")).toBeVisible({ timeout: 15_000 });
  await hana.reload();
  await expect(hana.getByRole("button", { name: "再送" })).toHaveCount(0);
});

test("a web link shows the page's card (OGP), its image served from MOSAIC; MOSAIC's own pages carry OGP", async ({ browser }) => {
  const hana = await user(browser, "ハナ");
  const sora = await user(browser, "ソラ");
  await connect(hana, sora);
  await hana.goto("/messages/new");
  await hana.getByLabel("ソラ").check();
  await hana.getByRole("button", { name: "はじめる" }).click();
  await hana.waitForURL(/\/messages\/[0-9a-f-]+$/);
  const thread = new URL(hana.url()).pathname;
  await sendText(hana, "これ見て http://127.0.0.1:4599/sunset");

  for (const p of [hana, sora]) {
    if (p === sora) await sora.goto(thread);
    const card = p.getByRole("link", { name: /夕焼けの丘/ });
    await expect(card).toBeVisible({ timeout: 15_000 });
    await expect(card).toHaveAttribute("href", "http://127.0.0.1:4599/sunset");
    await expect(card).toContainText("Photo Diary");
    await expect(card).toContainText("週末に見つけた、きれいな空の写真です。");
    const img = card.locator("img");
    await expect(img).toHaveAttribute("src", /^\/api\/link-preview\/image\/[0-9a-f]{64}$/);
    expect((await p.request.get((await img.getAttribute("src"))!)).headers()["content-type"]).toBe("image/png");
  }
  // Signed-out visitors can't use the preview service.
  const anon = await browser.newContext();
  expect((await anon.request.get("http://localhost:3100/api/link-preview?url=http://127.0.0.1:4599/sunset")).status()).toBe(401);
  await anon.close();

  // MOSAIC's own share card.
  const html = await (await sora.request.get("/s")).text();
  expect(html).toContain('property="og:title" content="MOSAICでつながりましょう"');
  expect(html).toMatch(/property="og:image" content="http:\/\/localhost:3100\/opengraph-image/);
  expect(html).toContain('name="twitter:card" content="summary_large_image"');
  const og = await sora.request.get("/opengraph-image");
  expect(og.status()).toBe(200);
  expect(og.headers()["content-type"]).toBe("image/png");
});

test("test companions can reply in a group (development)", async ({ browser }) => {
  const hana = await user(browser, "ハナ");
  for (let i = 0; i < 2; i++) {
    await hana.goto("/admin");
    await hana.getByRole("button", { name: /テスト相手をつくる/ }).click();
    await hana.waitForURL(/admin\?ok=saved/);
  }
  await hana.goto("/messages/new");
  await hana.getByLabel("ミナ（テスト）").check();
  await hana.getByLabel("ソウ（テスト）").check();
  await hana.getByLabel("グループ名（任意）").fill("テストの会");
  await hana.getByRole("button", { name: "はじめる" }).click();
  await hana.waitForURL(/\/messages\/[0-9a-f-]+$/);
  await sendText(hana, "みんな元気？");

  await hana.getByRole("link", { name: "詳細" }).click();
  await expect(hana.getByText(/このグループにいるテスト相手が、順に返信します。（ミナ（テスト）、ソウ（テスト））/)).toBeVisible();
  await hana.getByRole("button", { name: "🧪 テスト相手に返信させる" }).click();
  await hana.waitForURL(/\/messages\/[0-9a-f-]+$/);
  await expect(hana.getByText("いいね、賛成！")).toBeVisible();
  await expect(hana.getByText("了解です〜")).toBeVisible();
  // Each reply shows who wrote it.
  await expect(hana.getByText("ソウ（テスト）", { exact: true }).first()).toBeVisible();
});

test("development: sign in as a test companion (set their picture), then back to yourself", async ({ browser }) => {
  const hana = await user(browser, "ハナ");
  await hana.goto("/admin");
  await hana.getByRole("button", { name: /テスト相手をつくる/ }).click();
  await hana.waitForURL(/admin\?ok=saved/);
  await hana.getByRole("button", { name: /このユーザーとしてログイン/ }).click();
  await hana.waitForURL(/\/home$/);
  await expect(hana.getByTestId("trial-bar")).toBeVisible();
  await expect(hana.getByRole("heading", { level: 1 })).toContainText("ミナ（テスト）");
  // As Mina: a picture from a type illustration.
  await hana.goto("/me/photo");
  await hana.getByTestId("avatar-types").getByRole("button", { name: "静かに見守る月タイプ 2" }).click();
  await hana.getByRole("button", { name: "この写真にする" }).click();
  await hana.waitForURL(/\/me\/photo\?ok=saved/);
  // Back to Hana: Mina is still there, now with her picture.
  await hana.getByTestId("trial-bar").getByRole("button").click();
  await hana.waitForURL(/\/admin/);
  await expect(hana.getByTestId("trial-bar")).toHaveCount(0);
  await expect(hana.getByText("ミナ（テスト）").first()).toBeVisible();
  await hana.goto("/people");
  await expect(hana.locator('img[src^="/api/avatar/"]').first()).toBeVisible();
});

test("a group gets its own photo from any member; removed, the members' pictures come back", async ({ browser }) => {
  const hana = await user(browser, "ハナ");
  for (let i = 0; i < 2; i++) {
    await hana.goto("/admin");
    await hana.getByRole("button", { name: /テスト相手をつくる/ }).click();
    await hana.waitForURL(/admin\?ok=saved/);
  }
  await hana.goto("/messages/new");
  await hana.getByLabel("ミナ（テスト）").check();
  await hana.getByLabel("ソウ（テスト）").check();
  await hana.getByRole("button", { name: "はじめる" }).click();
  await hana.waitForURL(/\/messages\/[0-9a-f-]+$/);
  const group = new URL(hana.url()).pathname;
  const icon = `/api/dm/${group.split("/").pop()}/icon`;
  const photoIn = (scope: Page | Locator) => scope.locator(`img[src*="${icon}"]`);

  await hana.goto(`${group}/info`);
  await expect(photoIn(hana.getByTestId("group-photo"))).toHaveCount(0);
  await hana.locator('input[type="file"]').setInputFiles("tests/e2e/fixtures-photo.jpg");
  await expect(hana.getByRole("img", { name: /写真の位置と大きさ/ })).toBeVisible();
  await hana.getByRole("button", { name: "この写真にする" }).click();
  await hana.waitForURL(new RegExp(`${group}/info\\?ok=saved`));
  await expect(photoIn(hana.getByTestId("group-photo"))).toHaveCount(1);

  // Everywhere the group is shown, and said in the conversation.
  await hana.goto(group);
  await expect(photoIn(hana.locator("header"))).toHaveCount(1);
  await expect(hana.getByText("あなたがグループの写真を変更しました")).toBeVisible();
  await hana.goto("/messages");
  await expect(photoIn(hana.locator("main"))).toHaveCount(1);
  const res = await hana.request.get((await photoIn(hana.locator("main")).first().getAttribute("src"))!);
  expect(res.headers()["content-type"]).toBe("image/jpeg");

  // Someone outside the group can't fetch it.
  const x = await user(browser, "X");
  expect((await x.request.get(icon)).status()).toBe(404);

  await hana.goto(`${group}/info`);
  await hana.getByRole("button", { name: "写真を外す" }).click();
  await confirm(hana);
  await hana.waitForURL(new RegExp(`${group}/info\\?ok=deleted`));
  await expect(photoIn(hana.getByTestId("group-photo"))).toHaveCount(0);
});
