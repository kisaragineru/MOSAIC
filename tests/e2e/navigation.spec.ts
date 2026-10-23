import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test("bottom tabs: one row on a server-rendered page, Tử Vi first-class, clear current tab", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel(/What should we call you/).fill("Nav");
  await page.getByLabel("Email").fill(`nav-${randomUUID().slice(0, 8)}@example.test`);
  await page.getByLabel(/^Password/).fill("e2e correct horse battery");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(/home/);

  // A full page load (no client-side styling) must still lay the tabs out in a single row.
  await page.goto("/memories");
  const tabs = page.locator("nav.fixed a");
  await expect(tabs).toHaveCount(6);
  const ys = await tabs.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
  expect(new Set(ys).size).toBe(1);
  await expect(page.locator('nav.fixed a[aria-current="page"]')).toHaveText("Timeline");

  for (const [name, path] of [["Tử Vi", "/tuvi"], ["Insights", "/insights"], ["Discover", "/discover"]] as const) {
    await page.locator("nav.fixed").getByRole("link", { name }).click();
    await page.waitForURL(path);
    await expect(page.locator('nav.fixed a[aria-current="page"]')).toHaveText(name);
  }
  // Answer history is a visible tab of Discover; the profile and QR are header buttons.
  await page.getByRole("link", { name: "Answer history" }).click();
  await page.waitForURL("/discover/history");
  await page.getByRole("link", { name: "Profile & settings" }).click();
  await page.waitForURL("/me");
  await expect(page.getByRole("link", { name: "Settings", exact: true })).toBeVisible();
  await page.goto("/more");
  await page.waitForURL("/me");
});
