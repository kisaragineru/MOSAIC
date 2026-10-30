import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { confirm } from "./confirm";

test.use({ locale: "ja-JP", extraHTTPHeaders: { "Accept-Language": "ja-JP,ja;q=0.9", "x-e2e-client-ip": `10.58.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` } });

test("what is shared is listed in one place, and many records change at once", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("なんと呼べばいいですか？").fill("ハナ");
  await page.getByLabel("メールアドレス").fill(`${randomUUID().slice(0, 8)}@example.test`);
  await page.getByLabel(/^パスワード/).fill("e2e correct horse battery");
  await page.getByRole("button", { name: "アカウントを作成" }).click();
  await page.waitForURL(/welcome/);
  // Someone to share with.
  await page.goto("/admin");
  await page.getByRole("button", { name: /テスト相手をつくる/ }).click();
  await page.waitForURL(/admin\?ok=saved/);

  for (const [body, everyone] of [["海に行った。", true], ["パンを焼いた。", true], ["ひとりの考えごと。", false]] as const) {
    await page.goto("/memories/new");
    await page.getByLabel("あったこと・考えていること").fill(body);
    if (everyone) await page.getByRole("radio", { name: /つながっている全員/ }).check({ force: true });
    await page.getByRole("button", { name: "投稿する" }).click();
    await page.waitForURL(/\/memories\/[0-9a-f-]+\?ok=saved/);
  }

  // From the privacy overview: the list opens on what is shared.
  await page.goto("/me/privacy");
  await page.locator("#records").getByRole("link", { name: /一覧で見る・まとめて変える/ }).click();
  await page.waitForURL(/\/me\/privacy\/records$/);
  const list = page.getByTestId("audience-list");
  await expect(list.getByRole("listitem")).toHaveCount(2);
  await expect(list).toContainText("海に行った。");
  await expect(list).not.toContainText("ひとりの考えごと。");

  // All of them back to only me, in one go.
  await page.getByText("表示中をすべて選ぶ").click();
  await page.getByLabel("公開範囲", { exact: true }).selectOption("private");
  await page.getByRole("button", { name: "この範囲にする" }).click();
  await page.waitForURL(/\/me\/privacy\/records\?ok=saved/);
  await expect(page.getByText(/公開中の記録はありません/)).toBeVisible();

  // Private tab: pick one and share it with everyone.
  await page.getByRole("link", { name: /非公開/ }).click();
  await page.waitForURL(/show=private/);
  await page.getByTestId("audience-list").getByText("パンを焼いた。").click();
  await page.getByLabel("公開範囲", { exact: true }).selectOption("connections");
  await page.getByRole("button", { name: "この範囲にする" }).click();
  await page.waitForURL(/show=private&ok=saved/);
  await page.goto("/me/privacy/records");
  await expect(page.getByTestId("audience-list").getByRole("listitem")).toHaveCount(1);
  await expect(page.getByTestId("audience-list")).toContainText("パンを焼いた。");

  // Nothing picked: told, nothing changes.
  await page.getByRole("button", { name: "この範囲にする" }).click();
  await expect(page.getByText("記録を1件以上選んでください。")).toBeVisible();
});

test("Tử Vi and answers: how much each connection sees, set for many at once", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("なんと呼べばいいですか？").fill("ハナ");
  await page.getByLabel("メールアドレス").fill(`${randomUUID().slice(0, 8)}@example.test`);
  await page.getByLabel(/^パスワード/).fill("e2e correct horse battery");
  await page.getByRole("button", { name: "アカウントを作成" }).click();
  await page.waitForURL(/welcome/);
  // Mina shows everything; Hana chose preferences and values when connecting.
  await page.goto("/admin");
  await page.getByRole("button", { name: /テスト相手をつくる/ }).click();
  await page.waitForURL(/admin\?ok=saved/);

  // Tử Vi: from the overview to its own list (not the profile).
  await page.goto("/me/privacy");
  await page.locator("#tuvi").getByRole("link", { name: /一覧で見る・まとめて変える/ }).click();
  await page.waitForURL(/\/me\/privacy\/tuvi$/);
  await expect(page.getByText(/まだ命盤がありません/)).toBeVisible();
  const row = page.getByTestId("level-row").filter({ hasText: "ミナ（テスト）" });
  await expect(row).toContainText("あなた：見せない");
  await expect(row).toContainText("Tử Vi：相手は見せてくれている");
  // Showing more asks for consent first.
  await row.getByRole("checkbox").check();
  const bar = page.getByTestId("level-bar-tuvi");
  await bar.getByRole("combobox").selectOption({ label: "命盤の詳細まで" });
  await bar.getByRole("button", { name: "この設定にする" }).click();
  await expect(page.getByText("見せるには、同意にチェックしてください。")).toBeVisible();
  await page.getByTestId("level-row").filter({ hasText: "ミナ（テスト）" }).getByRole("checkbox").check();
  await bar.getByRole("combobox").selectOption({ label: "命盤の詳細まで" });
  await bar.getByRole("checkbox").check();
  await bar.getByRole("button", { name: "この設定にする" }).click();
  await page.waitForURL(/ok=saved/);
  await expect(row).toContainText("あなた：命盤の詳細まで");
  await expect(row).toContainText("Tử Vi：共有中");
  await expect(row).toContainText("Tử Vi 命盤の詳細：共有中");
  await page.goto("/me/privacy");
  await expect(page.locator("#tuvi")).toContainText("命盤の詳細まで：1人");

  // Answers: which ones and with whom, on their own page; the preview only shows.
  await page.locator("#answers").getByRole("link", { name: /一覧で見る・まとめて変える/ }).click();
  await page.waitForURL(/\/me\/privacy\/answers$/);
  const who = page.getByTestId("level-row").filter({ hasText: "ミナ（テスト）" });
  await expect(who).toContainText("あなた：好みと価値観");
  await expect(who).toContainText("好み：共有中");
  // Showing less needs no consent, and Tử Vi stays as it was.
  await who.getByRole("checkbox").check();
  await page.getByTestId("level-bar-answers").getByRole("combobox").selectOption({ label: "価値観だけ" });
  await page.getByTestId("level-bar-answers").getByRole("button", { name: "この設定にする" }).click();
  await page.waitForURL(/ok=saved/);
  await expect(who).toContainText("あなた：価値観だけ");
  await expect(who).toContainText("好み：相手は見せてくれている");
  await page.goto("/me/privacy/tuvi");
  await expect(page.getByTestId("level-row").filter({ hasText: "ミナ（テスト）" })).toContainText("あなた：命盤の詳細まで");
});

test("tags: # in the text with the tags already used offered, a cloud, a page per tag with a note, renaming, and similar tags pointed out", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("なんと呼べばいいですか？").fill("ハナ");
  await page.getByLabel("メールアドレス").fill(`${randomUUID().slice(0, 8)}@example.test`);
  await page.getByLabel(/^パスワード/).fill("e2e correct horse battery");
  await page.getByRole("button", { name: "アカウントを作成" }).click();
  await page.waitForURL(/welcome/);

  // "#tag" in the quick composer's text is a tag.
  await page.goto("/memories");
  await page.getByTestId("compose-fab").click();
  const sheet = page.getByRole("dialog", { name: "新しい投稿" });
  const box = sheet.getByLabel("あったこと・考えていること");
  await box.fill("Georg Jensen #好きなブランド");
  await sheet.getByRole("button", { name: "投稿する" }).click();
  await expect(sheet).toBeHidden();
  // The next time, "#" offers it.
  await page.getByTestId("compose-fab").click();
  await box.pressSequentially("Vivienne Westwood #好き");
  await page.getByTestId("quick-tag-suggestions").getByRole("button", { name: /#好きなブランド/ }).click();
  await expect(box).toHaveValue("Vivienne Westwood #好きなブランド ");
  await sheet.getByRole("button", { name: "投稿する" }).click();
  await expect(sheet).toBeHidden();

  // The cloud, then the tag's own page.
  await page.getByTestId("tags-link").click();
  await page.waitForURL(/\/memories\/tags$/);
  await page.getByTestId("tag-cloud").getByRole("link", { name: /#好きなブランド/ }).click();
  await expect(page.getByTestId("tag-span")).toContainText("2件");
  await expect(page.getByTestId("tag-records").getByRole("link")).toHaveCount(2);
  await page.getByLabel("このタグのメモ").fill("プレゼント選びの参考");
  await page.getByRole("button", { name: "メモを保存" }).click();
  await page.waitForURL(/ok=saved/);
  await expect(page.getByLabel("このタグのメモ")).toHaveValue("プレゼント選びの参考");

  // A new tag that looks like one already used is pointed out.
  await page.goto("/memories/new");
  await page.getByText("詳しく書く（日付・タグ・人）").click();
  await page.getByRole("textbox", { name: "タグ" }).fill("ぶらんど");
  await expect(page.getByTestId("tag-similar")).toContainText("#好きなブランド");
  await page.getByTestId("tag-similar").getByRole("button", { name: /#好きなブランド/ }).click();
  await expect(page.getByTestId("tag-input").getByRole("listitem")).toHaveText(["#好きなブランド✕"]);

  // Renamed on its page: the records follow, and a post's tag opens the page.
  await page.goto("/memories/tags");
  await page.getByTestId("tag-cloud").getByRole("link", { name: /#好きなブランド/ }).click();
  await page.getByLabel("新しい名前").fill("ブランド");
  await page.getByRole("button", { name: "名前を変える" }).click();
  await confirm(page);
  await page.waitForURL(/\/memories\/tags\/.+\?ok=saved/);
  await expect(page.getByRole("heading", { name: "#ブランド" })).toBeVisible();
  await page.getByTestId("tag-records").getByRole("link").first().click();
  await page.getByTestId("post-tag").click();
  await expect(page.getByRole("heading", { name: "#ブランド" })).toBeVisible();
});
