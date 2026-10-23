"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { deleteBirthProfile, saveBirthProfile } from "@/server/services/tuvi";
import { attempt, bool, str } from "./util";

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
  if (!r.ok) redirect(`/tuvi?e=${r.error}`);
  revalidatePath("/tuvi");
  if (r.value.status === "invalid") redirect(`/tuvi?e=${r.value.error}`);
  redirect(r.value.status === "needs_decision" ? "/tuvi" : "/tuvi?ok=saved");
}

export async function deleteBirthAction() {
  const uid = await requireUser();
  const r = await attempt("tuvi.delete", () => deleteBirthProfile(uid));
  revalidatePath("/tuvi");
  redirect(r.ok ? "/tuvi?ok=deleted" : `/tuvi?e=${r.error}`);
}
