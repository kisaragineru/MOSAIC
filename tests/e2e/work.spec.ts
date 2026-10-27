import { randomUUID } from "node:crypto";
import { expect, test, type Browser } from "@playwright/test";
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
  await hana.getByLabel(/^生年月日/).fill("1990-06-07");
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
  await expect(guest.getByRole("heading", { level: 1, name: "ハナの物語" })).toBeVisible();
  await expect(guest.getByTestId("work-note")).toContainText("あなたに読んでほしくて");
  await expect(guest.getByTestId("work-backstage")).toBeVisible();
  await expect(guest.getByRole("link", { name: "自分の物語を始める" })).toHaveAttribute("href", /\/register\?work=/);
  await expect(guest.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

  // Hana is told once that it was opened.
  await hana.goto("/home");
  await expect(hana.getByTestId("work-opened")).toContainText("母さんが、あなたの物語を開いてくれました");
  await hana.reload();
  await expect(hana.getByTestId("work-opened")).toHaveCount(0);
  await hana.goto("/me/work");
  await expect(hana.getByTestId("work-links")).toContainText("✓ 開いてくれました");

  // Taken back: the page says so and shows nothing of the work.
  hana.once("dialog", (d) => d.accept());
  await hana.getByTestId("work-links").getByRole("button", { name: "取り消す" }).click();
  await hana.waitForURL(/ok=saved/);
  await guest.reload();
  await expect(guest.getByTestId("work-closed")).toContainText("この作品の公開は終わりました");
  await expect(guest.getByText("あなたに読んでほしくて")).toHaveCount(0);
});
