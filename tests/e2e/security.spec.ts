import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test("AUD-02: AI reflection is never triggered by a cross-site navigation", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel(/What should we call you/).fill("Sec");
  await page.getByLabel("Email").fill(`sec-${randomUUID().slice(0, 8)}@example.test`);
  await page.getByLabel(/^Password/).fill("e2e correct horse battery");
  await page.getByRole("button", { name: "Create account" }).click();
  // New accounts start with the welcome guide.
  await page.waitForURL(/welcome/);
  await page.goto("/home");
  await page.goto("/memories/new");
  await page.getByRole("radio", { name: "Value" }).check({ force: true });
  await page.getByLabel("What happened / what's on your mind").fill("Family");
  await page.getByRole("button", { name: "Post" }).click();
  await page.waitForURL(/ok=saved/);
  const url = "/insights?kind=values&ai=1";
  // Same-origin form submission reaches the AI decision (here: not opted in).
  const same = await page.request.get(url, { headers: { "sec-fetch-site": "same-origin" } });
  expect(await same.text()).toContain("AI is off");
  // A link from another site carries the Lax cookie but must not reach the AI decision at all.
  for (const site of ["cross-site", "none", "same-site"]) {
    const cross = await page.request.get(url, { headers: { "sec-fetch-site": site } });
    const html = await cross.text();
    expect(html).toContain("Family"); // deterministic reflection still rendered
    expect(html).not.toContain("AI is off");
  }
});

test("server actions reject a forged Origin", async ({ page, request }) => {
  await page.goto("/login");
  const field = await page.locator('input[name^="$ACTION_ID_"]').first().getAttribute("name");
  const res = await request.post("/login", {
    headers: { origin: "https://evil.example" },
    multipart: { [field!]: "", email: "x@example.test", password: "whatever-long", next: "/home" },
    maxRedirects: 0,
  });
  expect(res.status()).toBeGreaterThanOrEqual(400);
});
