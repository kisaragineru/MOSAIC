import { z } from "zod";

export const uuid = z.string().uuid();

/** Calendar date "YYYY-MM-DD" that actually exists. */
export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const [y, m, d] = s.split("-").map(Number) as [number, number, number];
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d && y >= 1800 && y <= 2200;
  }, "invalid_date");

/** Optional form field: "" → undefined. */
export const optionalText = (max: number) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().trim().max(max).optional());

export const optionalDate = z.preprocess((v) => (v === "" || v === null ? undefined : v), isoDate.optional());

export const tagList = z
  .array(z.string().trim().toLowerCase().min(1).max(40))
  .max(20)
  .transform((tags) => [...new Set(tags)]);

/** Parse "a, b ,c" into tags. */
export function splitTags(input: string | undefined | null): string[] {
  if (!input) return [];
  return input
    .split(/[,，、#]/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

/** Escape LIKE wildcards in user input. */
export function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** Today's date (YYYY-MM-DD) in a given IANA time zone. */
export function todayIn(timeZone: string, now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  return parts; // en-CA formats as YYYY-MM-DD
}
