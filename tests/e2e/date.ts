import type { Locator, Page } from "@playwright/test";

/** Pick a date ("YYYY-MM-DD") in the year / month / day pickers labelled `name`. */
export async function setDate(scope: Page | Locator, name: string | RegExp, iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const g = scope.getByRole("group", { name });
  const s = g.locator("select");
  await s.nth(0).selectOption(String(y));
  await s.nth(1).selectOption(String(m));
  await s.nth(2).selectOption(String(d));
}
