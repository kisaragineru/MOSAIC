import { randomUUID } from "node:crypto";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { setDate } from "./date";
import { setBirthTime } from "./birth-time";

async function user(browser: Browser, name: string) {
  const ctx = await browser.newContext({ locale: "ja-JP", timezoneId: "Asia/Tokyo", viewport: { width: 412, height: 860 }, extraHTTPHeaders: { "Accept-Language": "ja-JP,ja;q=0.9", "x-e2e-client-ip": `10.11.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` } });
  const page = await ctx.newPage();
  await page.goto("/register");
  await page.getByLabel("なんと呼べばいいですか？").fill(name);
  await page.getByLabel("メールアドレス").fill(`${randomUUID().slice(0, 8)}@example.test`);
  await page.getByLabel(/^パスワード/).fill("e2e correct horse battery");
  await page.getByRole("button", { name: "アカウントを作成" }).click();
  await page.waitForURL(/welcome/);
  return page;
}

async function chart(page: Page, date: string, time: string, sex: "male" | "female") {
  await page.goto("/tuvi");
  await setDate(page, "生年月日 (新暦（グレゴリオ暦）)", date);
  await setBirthTime(page, time);
  await page.getByLabel("伝統的な計算で使う性別").selectOption(sex);
  await page.getByRole("button", { name: "保存して計算" }).click();
  await expect(page.getByTestId("tuvi-chart")).toBeVisible();
}

/** Hana shows a QR (Tử Vi shown or not); Sora reads it and connects with one tap. */
async function connectByQr(hana: Page, sora: Page, showTuvi: boolean) {
  await hana.goto("/share");
  await hana.getByRole("button", { name: "QRを表示" }).click({ trial: true });
  const tick = hana.getByRole("checkbox", { name: /つながった人に Tử Vi を見せる/ }).first();
  await expect(tick).toBeChecked();
  if (!showTuvi) await tick.uncheck();
  await expect(hana.getByText(/使えるのは1回・明日まで/)).toBeVisible();
  await hana.getByRole("button", { name: "QRを表示" }).click();
  const url = await hana.getByTestId("share-url").first().inputValue();
  await sora.goto(url.replace(/^https?:\/\/[^/]+/, ""));
  await sora.getByRole("button", { name: "ハナさんとつながる" }).click();
  await sora.waitForURL(/\/compare\/[0-9a-f-]+\?ok=connected/);
  await expect(sora.getByTestId("connected-moment")).toContainText("ハナさんとつながりました");
}

test("in person: one tap connects, then one way to our Tử Vi side by side", async ({ browser }) => {
  const hana = await user(browser, "ハナ");
  await chart(hana, "1990-06-07", "06:30", "female");
  const sora = await user(browser, "ソラ");
  await connectByQr(hana, sora, true);

  // Sora has no chart yet: the way there comes first.
  await sora.getByTestId("moment-tuvi").click();
  await sora.waitForURL(/\/welcome\?step=2&with=/);
  await expect(sora.getByTestId("with-banner")).toContainText("ハナさんとつながりました");
  await setDate(sora, "生年月日 (新暦（グレゴリオ暦）)", "1992-03-14");
  await setBirthTime(sora, "21:15");
  await sora.getByLabel("伝統的な計算で使う性別").selectOption("male");
  await sora.getByRole("button", { name: "命盤をつくる" }).click();
  await sora.waitForURL(/step=3&with=/);
  await sora.getByRole("link", { name: /次へ（ふたりの Tử Vi へ）/ }).click();
  await sora.waitForURL(/\/compare\/[0-9a-f-]+\/start/);
  const share = sora.getByTestId("start-share");
  await expect(share.getByRole("checkbox", { name: /ハナさんに Tử Vi を見せる/ })).toBeChecked();
  await expect(share).toContainText("生年月日と時刻は見せません");
  await share.getByRole("button", { name: "ふたりの Tử Vi を見る" }).click();
  await sora.waitForURL(/\/compare\/[0-9a-f-]+\?ok=saved/);
  await expect(sora.getByRole("heading", { name: /二人のTử Vi/ })).toBeVisible();
  await expect(sora.getByTestId("tuvi-waiting")).toHaveCount(0);

  // Hana sees it too, without doing anything more.
  await hana.goto(new URL(sora.url()).pathname);
  await expect(hana.getByRole("heading", { name: /二人のTử Vi/ })).toBeVisible();
});

test("no birth hour: a type to pick on the way; and asking once for theirs", async ({ browser }) => {
  const hana = await user(browser, "ハナ");
  await chart(hana, "1990-06-07", "06:30", "female");
  const sora = await user(browser, "ソラ");
  await connectByQr(hana, sora, false);

  await sora.getByTestId("moment-tuvi").click();
  await sora.waitForURL(/\/welcome\?step=2&with=/);
  await setDate(sora, "生年月日 (新暦（グレゴリオ暦）)", "1992-03-14");
  await sora.getByRole("button", { name: "命盤をつくる" }).click();
  await sora.waitForURL(/step=3&with=/);
  // Without the hour, the guide's own way to a type: pick what feels like you (questions refine it).
  const status = sora.getByTestId("type-status");
  await expect(status).toBeVisible();
  await expect(status.getByRole("link", { name: /生まれた時間を入れる|時刻/ }).first()).toHaveAttribute("href", /\/welcome\?step=2&with=/);
  await sora.getByRole("link", { name: /次へ（ふたりの Tử Vi へ）/ }).click();
  await sora.waitForURL(/\/start/);
  await sora.getByTestId("start-share").getByRole("button", { name: "ふたりの Tử Vi を見る" }).click();
  await sora.waitForURL(/\/compare\/[0-9a-f-]+\?ok=saved/);

  // Hana didn't show hers: Sora sees why, and may ask once.
  const waiting = sora.getByTestId("tuvi-waiting");
  await expect(waiting).toContainText("ハナさんが Tử Vi を見せると、ここにふたりの Tử Vi が並びます。");
  await waiting.getByRole("button", { name: /ハナさんにお願いする/ }).click();
  await expect(sora.getByTestId("tuvi-asked")).toContainText("ハナさんにお願いしました。");
  await expect(sora.getByRole("button", { name: /ハナさんにお願いする/ })).toHaveCount(0);

  await hana.goto("/home");
  await expect(hana.getByTestId("ask-notice")).toContainText("ソラさんが、ふたりの Tử Vi を見たいそうです。");
  await hana.getByTestId("ask-notice").getByRole("link").click();
  await hana.waitForURL(/\/start/);
  await hana.getByTestId("start-share").getByRole("button", { name: "ふたりの Tử Vi を見る" }).click();
  await hana.waitForURL(/\/compare\/[0-9a-f-]+\?ok=saved/);
  await expect(hana.getByTestId("tuvi-waiting")).toHaveCount(0);
  await hana.goto("/home");
  await expect(hana.getByTestId("ask-notice")).toHaveCount(0);
});
