import type { Page } from "@playwright/test";

/** Answer the app's "are you sure?" dialog. */
export async function confirm(page: Page, yes = true) {
  await page.getByTestId(yes ? "confirm-ok" : "confirm-cancel").click();
}
