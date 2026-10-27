import { randomUUID } from "node:crypto";
import { expect, test, type Browser } from "@playwright/test";
import { setDate } from "./date";
import { setBirthTime } from "./birth-time";

async function user(browser: Browser, name: string, birth: { date: string; time: string; sex: "male" | "female" }) {
  const ctx = await browser.newContext({ locale: "ja-JP", viewport: { width: 412, height: 860 }, extraHTTPHeaders: { "Accept-Language": "ja-JP,ja;q=0.9", "x-e2e-client-ip": `10.9.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` } });
  const page = await ctx.newPage();
  await page.goto("/register");
  await page.getByLabel("なんと呼べばいいですか？").fill(name);
  await page.getByLabel("メールアドレス").fill(`${randomUUID().slice(0, 8)}@example.test`);
  await page.getByLabel(/^パスワード/).fill("e2e correct horse battery");
  await page.getByRole("button", { name: "アカウントを作成" }).click();
  // New accounts start with the welcome guide.
  await page.waitForURL(/welcome/);
  await page.goto("/home");
  await expect(page.getByRole("heading", { name: `こんにちは、${name}さん` })).toBeVisible();
  await page.goto("/tuvi");
  await setDate(page, "生年月日 (新暦（グレゴリオ暦）)", birth.date);
  await setBirthTime(page, birth.time);
  await page.getByLabel("伝統的な計算で使う性別").selectOption(birth.sex);
  await page.getByRole("button", { name: "保存して計算" }).click();
  await expect(page.getByTestId("tuvi-chart")).toBeVisible();
  return page;
}

async function agree(page: import("@playwright/test").Page) {
  await page.getByRole("checkbox", { name: /^Tử Vi —/ }).check();
  await page.getByRole("checkbox", { name: /^Tử Vi 命盤の詳細/ }).check();
  await page.locator('input[name="agree"]').check();
  await page.getByRole("button", { name: "つながる", exact: true }).click();
}

test("full charts shared by both: partner chart, readings by relationship, no birth date or hour", async ({ browser }) => {
  const a = await user(browser, "ハナ", { date: "1990-06-07", time: "06:30", sex: "female" });
  const b = await user(browser, "ソラ", { date: "1992-03-15", time: "21:10", sex: "male" });
  await a.goto("/share");
  await a.getByRole("button", { name: "QRを表示" }).click();
  const url = await a.getByTestId("share-url").inputValue();
  await b.goto(url.replace(/^https?:\/\/[^/]+/, ""));
  await b.getByRole("button", { name: "続ける" }).click();
  await b.waitForURL(/\/compare\//);
  await agree(b);
  await a.goto("/share");
  await a.getByRole("link", { name: /^ソラさん/ }).click();
  await agree(a);

  await expect(a.getByRole("heading", { name: /二人のTử Vi/ })).toBeVisible();
  await expect(a.getByText(/ハナさんの夫妻宮の星と、ソラさんの命宮の星/)).toBeVisible();
  await a.getByRole("tab", { name: "友人", exact: true }).click();
  await expect(a.getByText(/ハナさんの奴僕宮の星と、ソラさんの命宮の星/)).toBeVisible();
  await expect(a.getByText(/ソラさん：数え\d+〜\d+歳/)).toBeVisible();
  await expect(a.getByRole("heading", { name: "ソラさんの命盤" })).toBeVisible();
  await expect(a.getByRole("heading", { name: "ソラさんの読み" })).toBeVisible();
  // The partner's chart shows neither their lunar birth date nor their birth hour.
  const chart = a.getByTestId("tuvi-chart");
  await expect(chart).toBeVisible();
  await expect(chart.getByText(/旧暦|出生時刻/)).toHaveCount(0);
});
