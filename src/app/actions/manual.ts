"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { clearManualRewrite, rewriteManual } from "@/server/services/manual-rewrite";
import { attempt } from "./util";

export async function rewriteManualAction() {
  const uid = await requireUser();
  const { locale } = await getT();
  const r = await attempt("manual.rewrite", () => rewriteManual(uid, locale));
  revalidatePath("/me/manual");
  // The reason (not configured, refused, …) is shown on the manual; nothing else is said.
  redirect(r.ok ? (r.value.ok ? "/me/manual?ai=done#ai" : `/me/manual?ai=${r.value.reason}#ai`) : `/me/manual?ai=${r.error}#ai`);
}

export async function clearManualRewriteAction() {
  const uid = await requireUser();
  await attempt("manual.rewrite_clear", () => clearManualRewrite(uid));
  revalidatePath("/me/manual");
  redirect("/me/manual#ai");
}
