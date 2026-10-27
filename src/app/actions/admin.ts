"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { setBetaTester } from "@/server/services/admin";
import { attempt, safeNext, str, withParam } from "./util";

/** Make someone a beta tester, or not (admins only, checked in the service). */
export async function setBetaAction(form: FormData) {
  const uid = await requireUser();
  const back = safeNext(str(form, "back"), "/admin/users");
  const r = await attempt("admin.beta", () => setBetaTester(uid, str(form, "userId"), str(form, "on") === "1"));
  revalidatePath("/", "layout");
  redirect(withParam(back, r.ok ? "ok" : "e", r.ok ? "saved" : r.error));
}
