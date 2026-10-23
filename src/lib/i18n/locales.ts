/** Add "ja" here (and a dictionary in ./messages) to enable Japanese. */
export const SUPPORTED_LOCALES = ["en", "vi"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(v);
}
