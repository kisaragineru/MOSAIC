import "server-only";
import { eq } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { currentUserId } from "@/server/auth/session";
import { profiles } from "@/server/db/schema";
import { withUser } from "@/server/db/tx";
import { DEFAULT_LOCALE, isLocale, type Locale } from "./locales";
import { en, type Dict } from "./messages/en";
import { ja } from "./messages/ja";
import { vi } from "./messages/vi";

const DICTS: Record<Locale, Dict> = { en, vi, ja };
export const LOCALE_COOKIE = "mosaic_locale";

/** Locale: signed-in user's profile → cookie → Accept-Language → default. */
export const getLocale = cache(async (): Promise<Locale> => {
  const uid = await currentUserId();
  if (uid) {
    const [p] = await withUser(uid, (tx) => tx.select({ l: profiles.locale }).from(profiles).where(eq(profiles.userId, uid)));
    if (isLocale(p?.l)) return p.l;
  }
  const c = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(c)) return c;
  const al = (await headers()).get("accept-language") ?? "";
  // First listed supported language wins (e.g. "ja-JP,ja;q=0.9,en;q=0.8" → ja).
  for (const part of al.split(",")) {
    const tag = part.split(";")[0]!.trim().toLowerCase().split("-")[0];
    if (isLocale(tag)) return tag;
  }
  return DEFAULT_LOCALE;
});

export async function getT(): Promise<{ t: Dict; locale: Locale }> {
  const locale = await getLocale();
  return { t: DICTS[locale], locale };
}

export function dictFor(locale: Locale): Dict {
  return DICTS[locale];
}
