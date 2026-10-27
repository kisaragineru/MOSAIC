"use server";
import { cookies } from "next/headers";
import { getLocale } from "@/lib/i18n/server";
import { typesById } from "@/lib/tuvi/type-view";
import { TRY_COOKIE, tryType } from "@/server/services/tuvi-try";

export type TryState = { status: "idle" } | { status: "no_time" | "needs" | "invalid" } | { status: "type"; types: { id: string; persona: string; name: string; plain: string }[] };

/**
 * Someone who just read a work tries their own type. Nothing is stored on our side; the date and
 * hour stay in their browser for an hour (a cookie) so signing up starts with them filled in.
 */
export async function tryTypeAction(_prev: TryState, form: FormData): Promise<TryState> {
  const date = form.get("date");
  const hour = form.get("hour");
  const r = tryType(date, hour);
  if (r.status !== "type") return r;
  const jar = await cookies();
  jar.set(TRY_COOKIE, JSON.stringify({ date, hour }), { httpOnly: true, sameSite: "lax", secure: (process.env.APP_ORIGIN ?? "").startsWith("https://"), path: "/", maxAge: 60 * 60 });
  return { status: "type", types: typesById(r.ids, await getLocale()).map(({ id, persona, name, plain }) => ({ id, persona, name, plain })) };
}
