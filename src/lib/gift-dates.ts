/** Dates for gift boxes (UTC calendar dates, as the database compares them). */
export const todayIso = () => new Date().toISOString().slice(0, 10);

export function daysUntil(date: string, today = todayIso()): number {
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400_000);
}

/** Whole years and months between a birthday and a date, or null if either is missing or before birth. */
export function ageAt(birthday: string | null, date: string | null): { y: number; m: number } | null {
  if (!birthday || !date) return null;
  const [by, bm, bd] = birthday.split("-").map(Number) as [number, number, number];
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  let months = (y - by) * 12 + (m - bm) - (d < bd ? 1 : 0);
  if (months < 0) return null;
  return { y: Math.floor(months / 12), m: months % 12 };
}
