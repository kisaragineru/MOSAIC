import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test("profile: own words and an intro MOSAIC drafts, checked and saved before anyone sees it", async ({ browser }) => {
  const ctx = await browser.newContext({ locale: "ja-JP", extraHTTPHeaders: { "Accept-Language": "ja-JP,ja;q=0.9", "x-e2e-client-ip": `10.1.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` } });
  const page = await ctx.newPage();
  await page.goto("/register");
  await page.getByLabel("なんと呼べばいいですか？").fill("ミナ");
  await page.getByLabel("メールアドレス").fill(`${randomUUID().slice(0, 8)}@example.test`);
  await page.getByLabel(/^パスワード/).fill("e2e correct horse battery");
  await page.getByRole("button", { name: "アカウントを作成" }).click();
  await page.waitForURL(/welcome/);
  for (const [q, label] of [["p.weekend_plan", "予定を立てる"], ["ax.plan_pack", "リストで確認して詰め終わっている"], ["ax.plan_deadline", "すぐ始めて早めに終わらせる"], ["l.season", "秋"]] as const) {
    await page.goto(`/discover/q/${q}`);
    await page.getByLabel(label, { exact: true }).check();
    await page.getByRole("button", { name: "回答を保存" }).click();
    await expect(page.getByText(/回答を保存しました/)).toBeVisible();
  }
  // Right after a "likes" question: name the specific thing.
  await expect(page.getByText("その季節の、何が好き？")).toBeVisible();
  await page.getByPlaceholder(/金木犀/).fill("金木犀の香り");
  await page.getByRole("button", { name: "好きなものに追加" }).click();
  await expect(page.getByText("保存しました。")).toBeVisible();
  await page.goto("/discover/chapter/likes");
  await expect(page.getByText("金木犀の香り", { exact: true })).toBeVisible();

  // The profile is just you, and settings; the intro has two layers.
  await page.goto("/me");
  await expect(page.getByRole("link", { name: /取扱説明書/ })).toHaveCount(0);
  await page.getByLabel(/ていねい/).check();
  await page.getByRole("button", { name: /下書きをつくる/ }).click();
  await expect(page).toHaveURL(/draft=1/);
  const draft = page.getByRole("textbox", { name: "下書き" });
  await expect(draft).toHaveValue("先に計画を立てるタイプです。好きな季節は秋です。");
  await draft.fill("先に計画を立てるタイプです。秋と金木犀が好き。");
  await page.getByRole("button", { name: "この内容で保存" }).click();
  await expect(page).toHaveURL(/ok=saved/);
  await expect(page.getByText("先に計画を立てるタイプです。秋と金木犀が好き。")).toBeVisible();

  // The phone preview shows both layers.
  await page.goto("/me/preview");
  const phone = page.getByRole("figure", { name: "相手のスマホではこう見えます" });
  await expect(phone.getByText("MOSAICから見たミナさん")).toBeVisible();
  await expect(phone.getByText("先に計画を立てるタイプです。秋と金木犀が好き。")).toBeVisible();

  // Insights holds the things to read; the gift box sits with people.
  await page.goto("/insights");
  await expect(page.getByRole("navigation", { name: "あなたを読む" }).getByRole("link")).toHaveCount(3);
  await page.goto("/people");
  await expect(page.getByRole("link", { name: /ギフトボックス/ })).toBeVisible();
  await ctx.close();
});
