import { randomUUID } from "node:crypto";
import { expect, test, type Browser } from "@playwright/test";
import { confirm } from "./confirm";
import { setDate } from "./date";
import { setBirthTime } from "./birth-time";

async function user(browser: Browser, name: string) {
  const ctx = await browser.newContext({ locale: "ja-JP", extraHTTPHeaders: { "Accept-Language": "ja-JP,ja;q=0.9", "x-e2e-client-ip": `10.7.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` } });
  const page = await ctx.newPage();
  await page.goto("/register");
  await page.getByLabel("なんと呼べばいいですか？").fill(name);
  await page.getByLabel("メールアドレス").fill(`${randomUUID().slice(0, 8)}@example.test`);
  await page.getByLabel(/^パスワード/).fill("e2e correct horse battery");
  await page.getByRole("button", { name: "アカウントを作成" }).click();
  await page.waitForURL(/welcome/);
  return page;
}

test("hand the story over as a work: read it first, fix it, a link of their own, read without signing up", async ({ browser }) => {
  const hana = await user(browser, "ハナ");
  await hana.goto("/tuvi");
  await setDate(hana, /^生年月日/, "1990-06-07");
  await setBirthTime(hana, "06:30");
  await hana.getByRole("button", { name: "保存して計算" }).click();
  await expect(hana.getByTestId("essence")).toBeVisible();

  // From the end of the story in the manual.
  await hana.goto("/me/manual");
  await hana.getByTestId("work-entry").click();
  await hana.waitForURL(/\/me\/work$/);
  const draft = hana.getByTestId("work-draft");
  await expect(draft.getByTestId("work")).toContainText("この物語は、こうして生まれました");
  await draft.getByLabel("作品のタイトル").fill("ハナの物語");
  await hana.getByRole("button", { name: "この内容で作品にする" }).click();
  await hana.waitForURL(/ok=saved/);
  await expect(hana.getByText("あなたの作品")).toBeVisible();

  // Hand it to Mum, with a note; the link is shown once.
  await hana.getByLabel(/誰に渡しますか/).fill("母");
  await hana.getByLabel(/表紙に添えるひと言/).fill("あなたに読んでほしくて");
  await expect(hana.getByLabel("読める期間")).toHaveValue("14");
  await hana.getByRole("button", { name: "渡すリンクをつくる" }).click();
  await expect(hana.getByTestId("work-handed")).toContainText("母さんに渡すリンクができました");
  const url = await hana.getByTestId("share-link").getByRole("textbox").inputValue();
  expect(url).toMatch(/\/w\/[A-Za-z0-9_-]+$/);

  // Someone without an account reads it: the cover note, the story, how it came to be, and an invitation.
  const guest = await (await browser.newContext({ locale: "ja-JP" })).newPage();
  await guest.goto(url);
  // Like a letter: the link's preview and the envelope say who it's from and what MOSAIC is.
  await expect(guest).toHaveTitle("ハナさんから、物語が届きました — MOSAIC");
  await expect(guest.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  const envelope = guest.getByTestId("envelope");
  await expect(envelope).toContainText("ハナさんから、あなたへ");
  await expect(envelope).toContainText("あなたに読んでほしくて");
  await expect(envelope).toContainText("MOSAICでつくられたハナさんの物語です");
  // Looking isn't opening: Hana hasn't been told yet.
  await hana.goto("/home");
  await expect(hana.getByTestId("work-opened")).toHaveCount(0);
  await guest.getByRole("button", { name: /物語をひらく/ }).click();
  await expect(guest.getByRole("heading", { level: 1, name: "ハナの物語" })).toBeVisible();
  await expect(guest.getByTestId("work-note")).toContainText("あなたに読んでほしくて");
  await expect(guest.getByTestId("work-how")).toContainText("MOSAICが、一冊の物語に");
  // After reading: their own type, without signing up, beside Hana's.
  const tryIt = guest.getByTestId("type-try");
  await setDate(tryIt, "生年月日", "1995-03-03");
  await tryIt.getByLabel(/生まれた時刻/).selectOption("10");
  await tryIt.getByRole("button", { name: "タイプを見る" }).click();
  await expect(guest.getByTestId("type-try-result")).toContainText("あなたは「");
  await expect(guest.getByTestId("work-why")).toContainText("見せるのは、あなたが選んだ人だけ");
  await expect(guest.getByRole("link", { name: "自分の物語を始める" })).toHaveAttribute("href", /\/register\?next=%2Fw%2F.+%3Fopen%3D1$/);

  // The reader signs up from the story, comes back to it, and connects in one tap.
  await guest.getByRole("link", { name: "自分の物語を始める" }).click();
  await guest.waitForURL(/\/register/);
  await guest.getByLabel("なんと呼べばいいですか？").fill("ソラ");
  await guest.getByLabel("メールアドレス").fill(`${randomUUID().slice(0, 8)}@example.test`);
  await guest.getByLabel(/^パスワード/).fill("e2e correct horse battery");
  await guest.getByRole("button", { name: "アカウントを作成" }).click();
  await guest.waitForURL(/\/w\//);
  await expect(guest.getByTestId("offer")).toContainText("ハナさんとつながりますか？");
  await guest.getByTestId("offer").getByRole("button", { name: "つながる" }).click();
  await expect(guest.getByTestId("offer-connected")).toContainText("ハナさんとつながりました");
  await expect(guest.getByRole("link", { name: "自分の物語を始める" })).toHaveAttribute("href", "/welcome");
  // The guide's birth form starts with the date and hour they tried.
  await guest.goto("/welcome?step=2");
  await expect(guest.locator('input[name="solarDate"]')).toHaveValue("1995-03-03");
  await expect(guest.locator('select[name="birthHour"]')).toHaveValue("10");

  // Once the reader has a chart, they're asked whether to tell Hana; they do.
  await guest.goto("/tuvi");
  await setDate(guest, /^生年月日/, "1995-03-03");
  await setBirthTime(guest, "10:00");
  await guest.getByRole("button", { name: "保存して計算" }).click();
  await expect(guest.getByTestId("essence")).toBeVisible();
  await guest.goto("/home");
  await guest.getByTestId("offer-start").getByRole("button", { name: "伝える" }).click();
  await guest.waitForURL(/\/home/);
  await expect(guest.getByTestId("offer-start")).toHaveCount(0);

  // Hana is told once that it was opened.
  await hana.goto("/home");
  await expect(hana.getByTestId("work-opened")).toContainText("母さんが、あなたの物語を開いてくれました");
  await expect(hana.getByTestId("writer-news")).toContainText("母さんが、物語からつながってくれました");
  await expect(hana.getByTestId("writer-news")).toContainText("母さんも、自分の物語を書き始めました");
  await hana.reload();
  await expect(hana.getByTestId("work-opened")).toHaveCount(0);
  await expect(hana.getByTestId("writer-news")).toHaveCount(0);
  await hana.goto("/me/work");
  await expect(hana.getByTestId("work-links")).toContainText("✓ 開いてくれました");

  // From the header's QR page, a new link any time.
  await hana.goto("/share");
  await hana.getByTestId("share-work").getByLabel("誰に渡しますか？").fill("父");
  await hana.getByTestId("share-work").getByRole("button", { name: "渡すリンクをつくる" }).click();
  await expect(hana.getByTestId("work-handed")).toContainText("父さんに渡すリンクができました");
  await hana.goto("/me/work");

  // Taken back: the page says so and shows nothing of the work.
  await hana.getByTestId("work-links").locator("li", { hasText: "母" }).getByRole("button", { name: "取り消す" }).click();
  await confirm(hana);
  await hana.waitForURL(/ok=saved/);
  // (even for a reader who connected: the writer took it back)
  await guest.goto(url);
  await expect(guest.getByTestId("work-closed")).toContainText("この作品の公開は終わりました");
  await expect(guest.getByText("あなたに読んでほしくて")).toHaveCount(0);
});

test("the story grows: new pages are mentioned once, then one question about handing it to someone", async ({ browser }) => {
  const sora = await user(browser, "ソラ");
  await sora.goto("/tuvi");
  await setDate(sora, /^生年月日/, "1992-03-14");
  await setBirthTime(sora, "08:00");
  await sora.getByRole("button", { name: "保存して計算" }).click();
  await expect(sora.getByTestId("essence")).toBeVisible();

  await sora.goto("/home");
  // With a chart the story already has its first pages: either they're mentioned, or (grown enough) the question comes.
  const grew = sora.getByTestId("story-grew");
  const ask = sora.getByTestId("story-ask");
  await expect(grew.or(ask)).toBeVisible();
  if (await ask.count()) {
    await expect(ask).toContainText("あなたの物語を、知ってほしい人はいますか？");
    await ask.getByRole("button", { name: "いまはいない" }).click();
    await sora.waitForURL(/\/home$/);
    await expect(ask).toHaveCount(0);
  } else {
    await expect(grew).toContainText("あなたの物語に、新しいページが増えました");
    await expect(grew).toHaveAttribute("href", "/me/manual#sec-novel");
  }
  // Said once.
  await sora.reload();
  await expect(grew).toHaveCount(0);
  await expect(ask).toHaveCount(0);
});
