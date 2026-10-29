"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { deleteBirthProfile, saveBirthProfile } from "@/server/services/tuvi";
import { saveSelfTypes } from "@/server/services/tuvi-type";
import { attempt, bool, safeNext, str, withParam } from "./util";

export async function saveBirthAction(form: FormData) {
  const uid = await requireUser();
  // The time comes as hour and minute pickers (an hour alone means on the hour; no hour, no time).
  const hour = str(form, "birthHour");
  const minute = str(form, "birthMinute");
  const time = form.has("birthHour") ? (hour ? `${hour}:${minute || "00"}` : "") : str(form, "birthTime");
  const r = await attempt("tuvi.save", () =>
    saveBirthProfile(uid, {
      calendarInput: str(form, "calendarInput"),
      solarDate: str(form, "solarDate"),
      lunarYear: str(form, "lunarYear"),
      lunarMonth: str(form, "lunarMonth"),
      lunarDay: str(form, "lunarDay"),
      lunarLeap: bool(form, "lunarLeap"),
      // The guide's form has no checkbox: a time given means it is known.
      timeKnown: str(form, "timeFromInput") === "1" ? !!time : bool(form, "timeKnown"),
      birthTime: str(form, "timeFromInput") === "1" || bool(form, "timeKnown") ? time : "",
      timeZone: str(form, "timeZone"),
      placeLabel: str(form, "placeLabel"),
      sex: str(form, "sex") || "unspecified",
      lateRatHour: str(form, "lateRatHour"),
      timeBasis: str(form, "timeBasis"),
      leapMonthRule: str(form, "leapMonthRule"),
    }),
  );
  // From the Tử Vi page or the profile; back there, at the form.
  const back = safeNext(str(form, "back"), "/tuvi");
  const at = back === "/me" ? "#birth" : "";
  if (!r.ok) redirect(`${withParam(back, "e", r.error ?? "generic")}${at}`);
  revalidatePath("/tuvi");
  revalidatePath("/me");
  revalidatePath("/home");
  if (r.value.status === "invalid") redirect(`${withParam(back, "e", r.value.error)}${at}`);
  redirect(r.value.status === "needs_decision" ? `${back}${at}` : `${withParam(back, "ok", "saved")}${at}`);
}

export async function deleteBirthAction() {
  const uid = await requireUser();
  const r = await attempt("tuvi.delete", () => deleteBirthProfile(uid));
  revalidatePath("/tuvi");
  redirect(r.ok ? "/tuvi?ok=deleted" : `/tuvi?e=${r.error}`);
}

export async function saveSelfTypesAction(form: FormData) {
  const uid = await requireUser();
  const r = await attempt("tuvi.self_types", () => saveSelfTypes(uid, form.getAll("type").map(String)));
  const [path, hash] = safeNext(str(form, "back"), "/tuvi").split("#");
  redirect(`${r.ok ? withParam(path!, "ok", "saved") : withParam(path!, "e", r.error)}${hash ? `#${hash}` : ""}`);
}
