import { expect, test } from "@playwright/test";

test.use({ locale: "ja-JP", extraHTTPHeaders: { "Accept-Language": "ja-JP,ja;q=0.9" } });

test("the privacy policy is open to anyone, in each language, and linked from sign-in", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: "プライバシーポリシー" }).click();
  await page.waitForURL(/\/privacy$/);
  const policy = page.getByTestId("privacy-policy");
  await expect(policy.getByRole("heading", { name: "プライバシーポリシー" })).toBeVisible();
  await expect(policy).toContainText("Anthropic");
  await expect(policy).toContainText("広告には使いません");
  await page.getByRole("link", { name: "English" }).click();
  await page.waitForURL(/lang=en/);
  await expect(page.getByTestId("privacy-policy").getByRole("heading", { name: "Privacy Policy" })).toBeVisible();
  await page.goto("/privacy?lang=vi");
  await expect(page.getByTestId("privacy-policy").getByRole("heading", { name: "Chính sách quyền riêng tư" })).toBeVisible();
});
