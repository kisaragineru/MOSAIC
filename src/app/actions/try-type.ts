"use server";
import { cookies } from "next/headers";
import { getLocale } from "@/lib/i18n/server";
import { MAIN_STARS, type MainStarId } from "@/lib/tuvi/stars";
import { typesById } from "@/lib/tuvi/type-view";
import { isoDate } from "@/lib/validation/common";
import { TRY_COOKIE, tryType } from "@/server/services/tuvi-try";

export type TryState =
  | { status: "idle" }
  | { status: "needs" | "invalid" }
  /** No hour: they may pick the type that feels most like them (the date waits for sign-up). */
  | { status: "no_time"; date: string }
  | { status: "type"; types: { id: string; persona: string; name: string; plain: string }[]; picked?: boolean };

/**
 * Someone who just read a work tries their own type. Nothing is stored on our side; the date and
 * hour stay in their browser for an hour (a cookie) so signing up starts with them filled in.
 */
export async function tryTypeAction(_prev: TryState, form: FormData): Promise<TryState> {
  const date = form.get("date");
  const hour = form.get("hour");
  const r = tryType(date, hour);
  if (r.status === "no_time") {
    await keep({ date, hour: "" });
    return { status: "no_time", date: String(date) };
  }
  if (r.status !== "type") return r;
  await keep({ date, hour });
  return { status: "type", types: typesById(r.ids, await getLocale()).map(({ id, persona, name, plain }) => ({ id, persona, name, plain })) };
}

/** Without the hour: the type they feel is theirs, kept (with the date) to start sign-up's guide with. */
export async function pickTryTypeAction(_prev: TryState, form: FormData): Promise<TryState> {
  const date = isoDate.safeParse(form.get("date"));
  const pick = String(form.get("pick") ?? "");
  if (!date.success || !(MAIN_STARS as readonly string[]).includes(pick)) return { status: "invalid" };
  await keep({ date: date.data, hour: "", pick });
  return { status: "type", picked: true, types: typesById([pick as MainStarId], await getLocale()).map(({ id, persona, name, plain }) => ({ id, persona, name, plain })) };
}

async function keep(v: { date: unknown; hour: unknown; pick?: string }) {
  (await cookies()).set(TRY_COOKIE, JSON.stringify(v), { httpOnly: true, sameSite: "lax", secure: (process.env.APP_ORIGIN ?? "").startsWith("https://"), path: "/", maxAge: 60 * 60 });
}
