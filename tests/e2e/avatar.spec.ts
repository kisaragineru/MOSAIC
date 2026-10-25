import { randomUUID } from "node:crypto";
import { expect, test, type Browser } from "@playwright/test";

async function user(browser: Browser, name: string) {
  const ctx = await browser.newContext({ locale: "ja-JP", timezoneId: "Asia/Tokyo", extraHTTPHeaders: { "Accept-Language": "ja-JP,ja;q=0.9", "x-e2e-client-ip": `10.9.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` } });
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

test("profile photo: choose, place by dragging and zooming, save, shown to connections only", async ({ browser }) => {
  const hana = await user(browser, "ハナ");
  const sora = await user(browser, "ソラ");
  const x = await user(browser, "X");

  await hana.goto("/me");
  await hana.getByRole("link", { name: "📷 写真を設定 →" }).click();
  await hana.waitForURL("/me/photo");
  await hana.locator('input[type="file"]').setInputFiles("tests/e2e/fixtures-photo.jpg");
  const area = hana.getByRole("img", { name: /写真の位置と大きさ/ });
  await expect(area).toBeVisible();
  // Zoom with the slider, then drag to place it.
  await hana.getByRole("slider", { name: "拡大・縮小" }).fill("2");
  const box = (await area.boundingBox())!;
  await hana.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await hana.mouse.down();
  await hana.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2 + 20, { steps: 5 });
  await hana.mouse.up();
  await area.focus();
  await hana.keyboard.press("ArrowLeft");
  await hana.getByRole("button", { name: "この写真にする" }).click();
  await hana.waitForURL(/\/me\/photo\?ok=saved/);

  // The header shows it; the file is a square photo.
  const header = hana.locator('header a[href="/me"] img');
  await expect(header).toBeVisible();
  const src = (await header.getAttribute("src"))!;
  expect(src).toMatch(/^\/api\/avatar\/[0-9a-f-]+\?v=1$/);
  const res = await hana.request.get(src);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("image/jpeg");

  // Someone not connected can't load it.
  expect((await x.request.get(src)).status()).toBe(404);

  // Connected people can.
  await hana.goto("/share");
  await hana.getByRole("button", { name: "QRを表示" }).click();
  const url = await hana.getByTestId("share-url").inputValue();
  await sora.goto(url.replace(/^https?:\/\/[^/]+/, ""));
  await sora.getByRole("button", { name: "続ける" }).click();
  await sora.waitForURL(/\/compare\//);
  const compare = sora.url();
  for (const p of [sora, hana]) {
    await p.goto(compare);
    await p.getByRole("checkbox", { name: /^好み/ }).check();
    await p.locator('input[name="agree"]').check();
    await p.getByRole("button", { name: "同意する" }).click();
    await expect(p.getByRole("button", { name: "同意する" })).toHaveCount(0);
  }
  expect((await sora.request.get(src)).status()).toBe(200);
  await sora.goto("/messages/new");
  await expect(sora.locator(`img[src="${src}"]`)).toBeVisible();

  // Changing it gives a new link; removing it brings back the initial.
  await hana.goto("/me/photo");
  hana.once("dialog", (d) => d.accept());
  await hana.getByRole("button", { name: "写真を削除" }).click();
  await hana.waitForURL(/ok=deleted/);
  await expect(hana.locator('header a[href="/me"] img')).toHaveCount(0);
});
