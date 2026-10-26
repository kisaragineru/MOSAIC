import type { Locator, Page } from "@playwright/test";

/** Pick a birth time ("HH:MM") in the birth form's hour and minute pickers (any language). */
export async function setBirthTime(scope: Page | Locator, hhmm: string) {
  const [h, m] = hhmm.split(":");
  const g = scope.getByRole("group", { name: /出生時刻|Birth time|Giờ sinh/ });
  await g.locator('select[name="birthHour"]').selectOption(h!);
  await g.locator('select[name="birthMinute"]').selectOption(m!);
}
