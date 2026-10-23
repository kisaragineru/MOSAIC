import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, test, type Browser, type Page } from "@playwright/test";

const PASSWORD = "e2e correct horse battery";

async function newUser(browser: Browser, name: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const email = `${name.toLowerCase()}-${randomUUID().slice(0, 8)}@example.test`;
  await page.goto("/register");
  await page.getByLabel(/What should we call you|Chúng tôi nên gọi/).fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/^Password|^Mật khẩu/).fill(PASSWORD);
  await page.getByLabel(/^Language|^Ngôn ngữ/).selectOption("en");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole("heading", { name: `Hello, ${name}` })).toBeVisible();
  return { context, page, email };
}

async function answer(page: Page, questionId: string, choose: (p: Page) => Promise<void>, comparable: boolean) {
  await page.goto(`/discover/q/${questionId}`);
  await choose(page);
  if (comparable) await page.getByLabel(/Allow this answer in comparisons/).check();
  await page.getByRole("button", { name: "Save answer" }).click();
  await expect(page.getByText(/Answer saved|This is different/)).toBeVisible();
}

test("two users: profile, Tử Vi, questions, QR share, consent, comparison, revoke, export", async ({ browser }) => {
  // --- unauthenticated access is redirected ---
  const anon = await browser.newPage();
  await anon.goto("/home");
  await expect(anon).toHaveURL(/\/login/);
  const exportResp = await anon.request.post("/api/export", { headers: { origin: "http://localhost:3100" } });
  expect(exportResp.status()).toBe(401);
  await anon.close();

  // --- User A ---
  const a = await newUser(browser, "An");
  const pa = a.page;

  // Profile
  await pa.goto("/me");
  await pa.getByLabel("About me").fill("I like quiet mornings.");
  await pa.getByRole("button", { name: "Save" }).first().click();
  await expect(pa.getByText("Saved.")).toBeVisible();
  await pa.getByLabel("What").fill("Phở");
  await pa.getByRole("button", { name: "Add" }).click();
  await expect(pa.getByText("Phở", { exact: true })).toBeVisible();

  // Quick note from Home, then a memory with an edit (version history)
  await pa.goto("/home");
  await pa.getByLabel("Add a piece").fill("Walked by the West Lake at dawn.");
  await pa.getByRole("button", { name: "Save" }).click();
  await expect(pa.getByText("Saved.")).toBeVisible();
  await pa.goto("/memories/new");
  await pa.getByLabel("Kind").selectOption("value");
  await pa.getByLabel("What happened / what's on your mind").fill("Career comes first.");
  await pa.getByRole("button", { name: "Save" }).click();
  await expect(pa).toHaveURL(/\/memories\/[0-9a-f-]+\?ok=saved/);
  await pa.getByRole("link", { name: "Edit" }).click();
  await pa.getByLabel("What happened / what's on your mind").fill("Family comes first.");
  await pa.getByRole("button", { name: "Save" }).click();
  await expect(pa.getByText("Earlier versions")).toBeVisible();
  await expect(pa.getByText("Career comes first.")).toBeVisible();
  // Accent-insensitive search on the timeline
  await pa.goto("/memories?q=west%20lake");
  await expect(pa.getByText("Walked by the West Lake at dawn.")).toBeVisible();
  await expect(pa.getByText("Family comes first.")).toHaveCount(0);

  // Tử Vi
  await pa.goto("/tuvi");
  await pa.getByLabel("Date of birth (Solar (Gregorian))").fill("1990-06-07");
  await pa.getByLabel("Birth time (local clock)").fill("06:30");
  await pa.getByLabel("Sex used by the traditional method").selectOption("male");
  await pa.getByRole("button", { name: "Save & calculate" }).click();
  await expect(pa.getByTestId("tuvi-chart")).toBeVisible();
  await expect(pa.getByTestId("tuvi-chart").getByText("Canh Ngọ")).toBeVisible();
  await expect(pa.getByTestId("tuvi-chart").getByText(/Lộ Bàng Thổ/)).toBeVisible();
  await expect(pa.getByText(/Ruleset vn-ttl-2026\.1/)).toBeVisible();
  // Theme tabs: switching shows that theme's reading with its advice blocks.
  await pa.getByRole("tab", { name: /Love & partnership/ }).click();
  await expect(pa.getByRole("tabpanel").getByText(/^Phu Thê:/)).toBeVisible();
  await expect(pa.getByRole("tabpanel").getByText("Making the most of it")).toBeVisible();
  // 10-year stages: exactly one is marked as now.
  await expect(pa.getByRole("heading", { name: "Your life in 10-year stages" })).toBeVisible();
  await expect(pa.locator("#stages").getByText("Now", { exact: true })).toHaveCount(1);
  // Tapping a palace shows what it stands for.
  await pa.getByTestId("tuvi-chart").getByRole("button", { name: /^Quan Lộc/ }).click();
  await expect(pa.getByText("work, career and your role in society")).toBeVisible();
  // The related palaces are drawn on the board, and the detailed view lists every star.
  await expect(pa.locator("svg polygon")).toHaveCount(1);
  await expect(pa.getByTestId("tuvi-chart").getByText("Lộc Tồn")).toHaveCount(0);
  await pa.getByRole("button", { name: "Detailed" }).click();
  await expect(pa.getByTestId("tuvi-chart").getByText(/Lộc Tồn/)).toBeVisible();

  // Daily question flow: answer today's question generically or skip
  await pa.goto("/discover");
  await pa.getByRole("button", { name: "Skip" }).first().click();
  await expect(pa.getByText("Skipped").first()).toBeVisible();

  // Comparable answers
  await answer(pa, "f.drink", (p) => p.getByLabel("Coffee", { exact: true }).check(), true);
  await answer(pa, "m.genres", async (p) => { await p.getByLabel("Jazz", { exact: true }).check(); await p.getByLabel("Pop", { exact: true }).check(); }, true);
  await answer(pa, "f.spicy", (p) => p.getByLabel("5", { exact: true }).check(), false); // private: must not be compared
  // Change an answer → "did your view change?"
  await answer(pa, "f.drink", (p) => p.getByLabel("Tea", { exact: true }).check(), true);
  await expect(pa.getByText("This is different from your previous answer")).toBeVisible();
  await pa.getByRole("button", { name: "My view changed" }).click();
  await pa.goto("/discover/history");
  await expect(pa.getByText("View changed")).toBeVisible();

  // People & gifts
  await pa.goto("/people");
  await pa.getByLabel("Name or nickname").fill("Linh");
  await pa.getByRole("button", { name: "Add" }).click();
  await expect(pa.getByRole("heading", { name: "Linh" })).toBeVisible();
  const prefCard = pa.locator("section", { has: pa.getByRole("heading", { name: "Likes, dislikes & wishes" }) });
  await prefCard.locator('input[name="label"]').fill("Film camera");
  await prefCard.locator('select[name="categoryId"]').selectOption("item");
  await prefCard.locator('select[name="sentiment"]').selectOption("wants");
  await prefCard.locator('select[name="source"]').selectOption("person_stated");
  await prefCard.getByRole("button", { name: "Add" }).click();
  await expect(prefCard.getByText("Film camera")).toBeVisible();
  await pa.getByRole("button", { name: "Suggest" }).click();
  await expect(pa.getByTestId("gift-ideas").getByText("Film camera", { exact: true })).toBeVisible();
  await expect(pa.getByTestId("gift-ideas").getByText(/they said so/)).toBeVisible();

  // QR share link
  await pa.goto("/share");
  await pa.getByRole("button", { name: "Create link" }).click();
  await expect(pa.getByTestId("share-result")).toBeVisible();
  await expect(pa.getByRole("img", { name: "QR code for your share link" })).toBeVisible();
  const shareUrl = await pa.getByTestId("share-url").inputValue();
  expect(shareUrl).toMatch(/\/s#[A-Za-z0-9_-]{43}$/);

  // --- User B ---
  const b = await newUser(browser, "Binh");
  const pb = b.page;
  await answer(pb, "f.drink", (p) => p.getByLabel("Tea", { exact: true }).check(), true);
  await answer(pb, "m.genres", async (p) => { await p.getByLabel("Jazz", { exact: true }).check(); await p.getByLabel("Rock", { exact: true }).check(); }, true);
  await answer(pb, "f.spicy", (p) => p.getByLabel("1", { exact: true }).check(), true);

  // B opens the link: the token is in the fragment and is removed from the address bar.
  await pb.goto(shareUrl);
  await expect(pb.getByText("An invited you to compare.")).toBeVisible();
  expect(pb.url()).not.toContain("#");
  await pb.getByRole("button", { name: "Continue" }).click();
  await expect(pb).toHaveURL(/\/compare\/[0-9a-f-]+$/);
  const compareUrl = pb.url();
  await expect(pb.getByText("Waiting for the other person to consent.")).toBeVisible();
  // No result before consent
  await expect(pb.getByText("Preferences & values")).toHaveCount(0);
  await pb.getByLabel(/Tử Vi —/).check();
  await pb.getByLabel(/Preferences —/).check();
  await pb.getByLabel(/I understand and consent/).check();
  await pb.getByRole("button", { name: "Give consent" }).click();
  await expect(pb.getByText(/You consented to: Tử Vi, Preferences/)).toBeVisible();
  await expect(pb.getByText("Preferences & values")).toHaveCount(0);

  // A consents → result for both
  await pa.goto("/share");
  await pa.getByRole("link", { name: /With Binh/ }).click();
  await expect(pa.getByText("The other person has consented.")).toBeVisible();
  await pa.getByLabel(/Tử Vi —/).check();
  await pa.getByLabel(/Preferences —/).check();
  await pa.getByLabel(/I understand and consent/).check();
  await pa.getByRole("button", { name: "Give consent" }).click();
  await expect(pa.getByRole("heading", { name: "Preferences & values" })).toBeVisible();
  const items = pa.getByTestId("pref-items");
  await expect(items.getByText("Your go-to drink?")).toBeVisible();
  await expect(items.locator("li", { hasText: "Your go-to drink?" }).getByText("In common")).toBeVisible(); // both Tea now
  await expect(items.locator("li", { hasText: "Which kinds of music" }).getByText("Partly shared")).toBeVisible();
  // A's spicy answer is private → only B answered → listed as "only one", never as a difference
  await expect(items.getByText("How much do you enjoy spicy food?")).toHaveCount(0);
  await expect(pa.getByText(/Answered by only one of you/)).toBeVisible();
  // B has no Tử Vi chart → not compared, no guess
  await expect(pa.getByText(/Tử Vi can't be compared/)).toBeVisible();
  // Private data never appears
  const html = await pa.content();
  for (const secret of ["1990-06-07", "06:30", "Family comes first", "Film camera", "Linh"]) expect(html).not.toContain(secret);

  await pb.goto(compareUrl);
  await expect(pb.getByRole("heading", { name: "Preferences & values" })).toBeVisible();

  // --- A third user cannot see the comparison ---
  const c = await newUser(browser, "Chi");
  const resp = await c.page.goto(compareUrl);
  expect(resp?.status()).toBe(404);
  // and cannot open A's memories by guessing ids
  await pa.goto("/memories");
  const memHref = await pa.locator('a[href^="/memories/"]:not([href="/memories/new"])').first().getAttribute("href");
  const r2 = await c.page.goto(memHref!);
  expect(r2?.status()).toBe(404);

  // --- Revoke: B ends the comparison, A loses access to the result ---
  pb.on("dialog", (d) => d.accept());
  await pb.getByRole("button", { name: "End this comparison" }).click();
  await expect(pb.getByText(/This comparison has ended/)).toBeVisible();
  await pa.goto(compareUrl);
  await expect(pa.getByText(/This comparison has ended/)).toBeVisible();
  await expect(pa.getByText("Preferences & values")).toHaveCount(0);

  // A revokes the share link → a new visitor gets "unavailable"
  pa.on("dialog", (d) => d.accept());
  await pa.goto("/share");
  await pa.getByRole("button", { name: "Revoke" }).first().click();
  await expect(pa.getByText("Revoked")).toBeVisible();
  await c.page.goto(shareUrl);
  await expect(c.page.getByText(/invalid, expired, or has been revoked/)).toBeVisible();

  // --- Export (A) ---
  await pa.goto("/settings");
  const [download] = await Promise.all([pa.waitForEvent("download"), pa.getByRole("button", { name: "Download my data (JSON)" }).click()]);
  const path = await download.path();
  const doc = JSON.parse(readFileSync(path!, "utf8"));
  expect(doc.format).toBe("mosaic-export");
  expect(JSON.stringify(doc.memories)).toContain("Career comes first.");
  expect(JSON.stringify(doc.memories)).toContain("Family comes first.");
  expect(doc.tuvi.birthProfile.solarDate).toBe("1990-06-07");
  expect(JSON.stringify(doc)).not.toContain(PASSWORD);
  // Cross-origin export POST is refused
  const forged = await pa.request.post("/api/export", { headers: { origin: "https://evil.example" } });
  expect(forged.status()).toBe(403);

  // --- Account deletion (C) ---
  c.page.on("dialog", (d) => d.accept());
  await c.page.goto("/settings");
  await c.page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await c.page.getByLabel("Type DELETE to confirm").fill("DELETE");
  await c.page.getByRole("button", { name: "Delete my account forever" }).click();
  await expect(c.page).toHaveURL(/\/login/);
  await c.page.goto("/login");
  await c.page.getByLabel("Email").fill(c.email);
  await c.page.getByLabel("Password").fill(PASSWORD);
  await c.page.getByRole("button", { name: "Sign in" }).click();
  await expect(c.page.getByText("Email or password is incorrect.")).toBeVisible();

  await a.context.close();
  await b.context.close();
  await c.context.close();
});

test("Vietnamese UI renders and security headers are present", async ({ browser }) => {
  const ctx = await browser.newContext({ locale: "vi-VN", extraHTTPHeaders: { "Accept-Language": "vi-VN,vi;q=0.9" } });
  const page = await ctx.newPage();
  const resp = await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Chào mừng trở lại" })).toBeVisible();
  const h = resp!.headers();
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["content-security-policy"]).toMatch(/script-src 'self' 'nonce-/);
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["referrer-policy"]).toBe("same-origin");
  expect(h["x-powered-by"]).toBeUndefined();
  await ctx.close();
});
