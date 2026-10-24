import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test("AUD-13: the timeline pages back to the oldest record (no silent cap)", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel(/What should we call you/).fill("Pager");
  await page.getByLabel("Email").fill(`pager-${randomUUID().slice(0, 8)}@example.test`);
  await page.getByLabel(/^Password/).fill("e2e correct horse battery");
  await page.getByRole("button", { name: "Create account" }).click();
  // New accounts start with the welcome guide.
  await page.waitForURL(/welcome/);
  await page.goto("/home");
  for (let i = 0; i < 52; i++) {
    await page.goto("/home");
    await page.getByLabel("Jot something down").fill(`note-${String(i).padStart(3, "0")}`);
    await page.getByRole("button", { name: "Save" }).click();
    await page.waitForURL(/ok=saved/);
  }
  await page.goto("/memories");
  await expect(page.getByText("note-051")).toBeVisible();
  await expect(page.getByText("note-000", { exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Older →" }).click();
  await expect(page.getByText("note-000", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "← Newer" })).toBeVisible();
});
