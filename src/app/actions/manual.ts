"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { clearManualRewrite, rewriteManualSection } from "@/server/services/manual-rewrite";
import { attempt } from "./util";

export async function clearManualRewriteAction() {
  const uid = await requireUser();
  await attempt("manual.rewrite_clear", () => clearManualRewrite(uid));
  revalidatePath("/me/manual");
  redirect("/me/manual#ai");
}

/** One chapter of the AI rewrite (the screen calls this chapter by chapter). */
export async function rewriteManualSectionAction(sectionId: string, first: boolean): Promise<{ ok: boolean; reason?: string }> {
  const uid = await requireUser();
  const { locale } = await getT();
  const r = await attempt("manual.rewrite_section", () => rewriteManualSection(uid, locale, sectionId, first));
  if (!r.ok) return { ok: false, reason: r.error };
  return r.value.ok ? { ok: true } : { ok: false, reason: r.value.reason };
}

export async function refreshManualAction() {
  revalidatePath("/me/manual");
}
