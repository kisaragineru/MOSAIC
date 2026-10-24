"use server";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { finishOnboarding } from "@/server/services/onboarding";
import { safeNext, str } from "./util";

export async function finishOnboardingAction(form: FormData) {
  const uid = await requireUser();
  await finishOnboarding(uid);
  redirect(safeNext(str(form, "next"), "/home"));
}
