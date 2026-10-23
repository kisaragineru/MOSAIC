import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test("a page left open past midnight re-renders when the user comes back to it", async ({ page }) => {
  await page.clock.install({ time: new Date() });
  await page.goto("/register");
  await page.getByLabel(/What should we call you/).fill("Night");
  await page.getByLabel("Email").fill(`night-${randomUUID().slice(0, 8)}@example.test`);
  await page.getByLabel(/^Password/).fill("e2e correct horse battery");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(/home/);
  // The card says which day the question is for.
  await expect(page.getByRole("heading", { name: /^Today's question · / })).toBeVisible();

  // Same day: coming back does not reload anything.
  let refreshes = 0;
  page.on("request", (r) => {
    if (r.headers()["rsc"] === "1" && new URL(r.url()).pathname === "/home") refreshes++;
  });
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await page.waitForTimeout(500);
  expect(refreshes).toBe(0);

  // The next day (in the browser): coming back asks the server for a fresh page.
  await page.clock.setSystemTime(new Date(Date.now() + 26 * 3600_000));
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect.poll(() => refreshes).toBeGreaterThan(0);
});
