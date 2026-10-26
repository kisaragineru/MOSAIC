"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { dismissStarter, finishOnboarding } from "@/server/services/onboarding";
import { safeNext, str } from "./util";

export async function finishOnboardingAction(form: FormData) {
  const uid = await requireUser();
  await finishOnboarding(uid);
  // Every page's guide bar goes away.
  revalidatePath("/", "layout");
  redirect(safeNext(str(form, "next"), "/home"));
}

export async function dismissStarterAction() {
  const uid = await requireUser();
  await dismissStarter(uid);
  redirect("/home");
}
