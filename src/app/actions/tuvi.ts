"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { deleteBirthProfile, saveBirthProfile } from "@/server/services/tuvi";
import { attempt, bool, safeNext, str, withParam } from "./util";

export async function saveBirthAction(form: FormData) {
  const uid = await requireUser();
  const r = await attempt("tuvi.save", () =>
    saveBirthProfile(uid, {
      calendarInput: str(form, "calendarInput"),
      solarDate: str(form, "solarDate"),
      lunarYear: str(form, "lunarYear"),
      lunarMonth: str(form, "lunarMonth"),
      lunarDay: str(form, "lunarDay"),
      lunarLeap: bool(form, "lunarLeap"),
      timeKnown: bool(form, "timeKnown"),
      birthTime: bool(form, "timeKnown") ? str(form, "birthTime") : "",
      timeZone: str(form, "timeZone"),
      placeLabel: str(form, "placeLabel"),
      sex: str(form, "sex") || "unspecified",
      lateRatHour: str(form, "lateRatHour"),
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
