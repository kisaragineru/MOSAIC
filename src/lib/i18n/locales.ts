/** To add a language: add it here, add a dictionary in ./messages, and fill every I18nText (the compiler lists them). */
export const SUPPORTED_LOCALES = ["en", "vi", "ja"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

/** Each language's own name, for language pickers. */
export const LOCALE_NAMES: Record<Locale, string> = { vi: "Tiếng Việt", en: "English", ja: "日本語" };

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(v);
}
