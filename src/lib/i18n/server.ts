import "server-only";
import { eq } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { currentUserId } from "@/server/auth/session";
import { profiles } from "@/server/db/schema";
import { withUser } from "@/server/db/tx";
import { DEFAULT_LOCALE, isLocale, type Locale } from "./locales";
import { en, type Dict } from "./messages/en";
import { vi } from "./messages/vi";

const DICTS: Record<Locale, Dict> = { en, vi };
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
  return /\bvi\b/i.test(al) ? "vi" : DEFAULT_LOCALE;
});

export async function getT(): Promise<{ t: Dict; locale: Locale }> {
  const locale = await getLocale();
  return { t: DICTS[locale], locale };
}

export function dictFor(locale: Locale): Dict {
  return DICTS[locale];
}
