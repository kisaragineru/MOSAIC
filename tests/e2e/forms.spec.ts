import { expect, test } from "@playwright/test";

// A phone set to Japanese, reading MOSAIC in English: the form bubbles follow the app.
test.use({ locale: "ja-JP", storageState: { cookies: [{ name: "mosaic_locale", value: "en", domain: "localhost", path: "/", expires: -1, httpOnly: false, secure: false, sameSite: "Lax" }], origins: [] } });

test("the browser's form messages come in the app's language, not the device's", async ({ page }) => {
  await page.goto("/register");
  await page.getByRole("button", { name: "Create account" }).click();
  const name = page.getByLabel("What should we call you?");
  await expect.poll(() => name.evaluate((el: HTMLInputElement) => el.validationMessage)).toBe("Please fill in this field.");
  // Typing clears it.
  await name.fill("Lin");
  expect(await name.evaluate((el: HTMLInputElement) => el.validationMessage)).toBe("");
  await page.getByLabel("Email").fill("not-an-email");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect.poll(() => page.getByLabel("Email").evaluate((el: HTMLInputElement) => el.validationMessage)).toBe("Please enter an email address.");
});
