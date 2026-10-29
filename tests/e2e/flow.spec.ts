import { randomUUID } from "node:crypto";
import { expect, test, type Browser } from "@playwright/test";
import { setDate } from "./date";
import { setBirthTime } from "./birth-time";

async function newUser(browser: Browser) {
  const ctx = await browser.newContext({ locale: "ja-JP", extraHTTPHeaders: { "Accept-Language": "ja-JP,ja;q=0.9", "x-e2e-client-ip": `10.8.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` } });
  const page = await ctx.newPage();
  await page.goto("/register");
  await page.getByLabel("なんと呼べばいいですか？").fill("ミオ");
  await page.getByLabel("メールアドレス").fill(`${randomUUID().slice(0, 8)}@example.test`);
  await page.getByLabel(/^パスワード/).fill("e2e correct horse battery");
  await page.getByRole("button", { name: "アカウントを作成" }).click();
  // New accounts start with the welcome guide.
  await page.waitForURL(/welcome/);
  await page.goto("/home");
  return { ctx, page };
}

test("answer them all: one after another, follow-ups in place, no daily limit", async ({ browser }) => {
  const { ctx, page } = await newUser(browser);
  await page.getByRole("link", { name: /まとめて答える/ }).first().click();
  await page.waitForURL("/discover/all");
  await expect(page.getByText(/問中0問に回答/)).toBeVisible();

  // Five answers in a row: each one brings the next question on the same page.
  const prompts: string[] = [];
  for (let i = 0; i < 5; i++) {
    const form = page.locator("form").filter({ has: page.getByRole("button", { name: "回答を保存" }) });
    prompts.push(await form.innerText());
    if (await form.locator("input[name=choice]").count()) await form.locator("input[name=choice]").first().check();
    else if (await form.locator("input[name=scale]").count()) await form.locator("input[name=scale]").first().check();
    else if (await form.locator("input[name=choices]").count()) await form.locator("input[name=choices]").first().check();
    else await form.locator("[name=text]").fill("テストの答え");
    await form.getByRole("button", { name: "回答を保存" }).click();
    await expect(page).toHaveURL(/\/discover\/all\?/);
    await expect(page.getByText(`問中${i + 1}問に回答`)).toBeVisible();
  }
  expect(new Set(prompts).size).toBe(5);

  // A follow-up is asked right here, not on a separate page.
  await page.goto("/discover/all?f=c.changed_mind");
  await page.getByLabel("はい", { exact: true }).check();
  await page.getByRole("button", { name: "回答を保存" }).click();
  await expect(page).toHaveURL(/\/discover\/all\?f=c\.changed_mind_what/);
  await expect(page.getByText("いまの答えへの追加の質問")).toBeVisible();
  await expect(page.getByText("何が変わりましたか？そして、見方が変わったきっかけは？")).toBeVisible();
  await page.getByRole("link", { name: /ひと休みする/ }).click();
  await page.waitForURL("/insights");
  await ctx.close();
});

test("a slow screen shows that it is loading", async ({ browser }) => {
  const { ctx, page } = await newUser(browser);
  // Hold the next screen back for a moment.
  await page.route(/\/insights/, async (route) => {
    await new Promise((r) => setTimeout(r, 1500));
    await route.continue();
  });
  await page.getByRole("link", { name: "自己理解" }).click();
  await expect(page.getByTestId("nav-progress")).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "読み込み中…" }).first()).toBeVisible();
  await page.waitForURL("/insights");
  await expect(page.getByTestId("nav-progress")).toHaveCount(0);
  await ctx.close();
});

test("preview: the other person's phone, and switching what is shared", async ({ browser }) => {
  const { ctx, page } = await newUser(browser);
  await page.goto("/me/preview");
  const phone = page.getByRole("figure", { name: "相手のスマホではこう見えます" });
  await expect(phone).toBeVisible();
  await expect(phone.getByText("あなたとミオさん")).toBeVisible();
  await expect(phone.getByText("好みと価値観")).toBeVisible();
  await page.getByRole("link", { name: "✓ 好み" }).click();
  // Each switch is a navigation: wait for it before the next one, which builds on it.
  await expect(page.getByRole("link", { name: "好み", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "✓ 価値観" }).click();
  await expect(page).toHaveURL(/s=tuvi%2Ctuvi_detail|s=tuvi,tuvi_detail/);
  await expect(phone.getByText("好みと価値観")).toHaveCount(0);
  await ctx.close();
});

test("preview: answers shown or kept to oneself a section at a time, or picked", async ({ browser }) => {
  const { ctx, page } = await newUser(browser);
  for (const [id, pick] of [["f.drink", "お茶"], ["f.sweet_savory", null]] as const) {
    await page.goto(`/discover/q/${id}`);
    const form = page.locator("form:has(input[name=questionId])");
    if (pick) await form.getByLabel(pick, { exact: true }).check();
    else await form.locator('input[type="radio"]').first().check();
    await form.getByRole("button", { name: "回答を保存" }).click();
    await page.waitForURL(/ok=answered/);
  }
  await page.goto("/me/preview");
  const likes = page.getByTestId("bulk-preferences");
  const count = page.locator("#choices ~ section").first();
  // A section in one tap, either way.
  if (await likes.getByRole("button", { name: /すべて自分だけ/ }).count()) {
    await likes.getByRole("button", { name: /すべて自分だけ/ }).click();
    await page.waitForURL(/ok=saved/);
  }
  await expect(count).toContainText("2件中0件を見せる");
  await page.getByTestId("bulk-preferences").getByRole("button", { name: /すべて見せる/ }).click();
  await page.waitForURL(/ok=saved/);
  await expect(count).toContainText("2件中2件を見せる");
  // Or pick: every box ticked with "pick all", then one unticked, and the rest kept to oneself.
  await page.getByRole("link", { name: /選んで変える/ }).click();
  await page.waitForURL(/pick=1/);
  await expect(page.getByTestId("bulk-preferences")).toHaveCount(0);
  await page.getByRole("link", { name: "すべて選ぶ" }).click();
  await page.waitForURL(/pick=all/);
  await page.getByRole("checkbox", { name: "いつもの飲みものは？" }).uncheck();
  await page.getByRole("button", { name: /選んだものを自分だけに/ }).click();
  await page.waitForURL(/ok=saved/);
  await expect(count).toContainText("2件中1件を見せる");
  // Picking nothing says so.
  await page.getByRole("button", { name: /選んだものを見せる/ }).click();
  await expect(page.getByText("変えたい回答を選んでください。")).toBeVisible();
  await ctx.close();
});

test("Tử Vi: plain words first, and a guide for beginners", async ({ browser }) => {
  const { ctx, page } = await newUser(browser);
  await page.goto("/tuvi");
  await setDate(page, /^生年月日/, "1990-06-07");
  await setBirthTime(page, "06:30");
  await page.getByRole("button", { name: "保存して計算" }).click();
  await expect(page.getByTestId("essence")).toContainText("タイプ");
  await expect(page.getByText("💡 かんたんに言うと").first()).toBeVisible();
  await expect(page.getByText("ここは「どんな人か」を見るところです。", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: /この読みに出てくる言葉/ }).click();
  await expect(page.getByText("命宮（Mệnh）", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: /はじめての方へ：Tử Vi の読み方/ }).click();
  await page.waitForURL("/tuvi/guide");
  await expect(page.getByRole("heading", { level: 1, name: "Tử Vi の読み方ガイド" })).toBeVisible();
  await expect(page.getByRole("img", { name: /命宮が「寅」/ })).toBeVisible();
  await expect(page.getByText("「みんなをまとめる王様タイプ」")).toBeVisible();
  // A type's picture opens the character full screen; the arrows go through the types; ✕ closes.
  await page.getByRole("button", { name: "決断の早い実務家タイプを大きく見る" }).click();
  const viewer = page.getByTestId("type-viewer");
  await expect(viewer).toBeVisible();
  await expect(viewer.getByText("決断の早い実務家タイプ", { exact: true })).toBeVisible();
  await expect(viewer.getByText("TYPE 04 / 14")).toBeVisible();
  await viewer.getByRole("button", { name: "次のタイプ" }).click();
  await expect(viewer.getByText("おだやかな平和主義者タイプ", { exact: true })).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(viewer.getByText("Vũ Khúc", { exact: true })).toBeVisible();
  await viewer.getByRole("button", { name: "閉じる" }).click();
  await expect(viewer).toBeHidden();
  await page.getByRole("link", { name: "5. 読み方の手順" }).click();
  await expect(page).toHaveURL(/#g-steps$/);
  await ctx.close();
});
