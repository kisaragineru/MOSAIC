"use server";
import { redirect } from "next/navigation";
import { clientKey, requireUser } from "@/server/auth/session";
import { issueResetLink, requestResetEmail, resetPassword } from "@/server/services/password-reset";
import { attempt, str } from "./util";

/** Admin: a one-time link for someone who forgot their password (shown once, to send them). */
export async function issueResetLinkAction(userId: string) {
  const uid = await requireUser();
  return attempt("admin.reset_link", () => issueResetLink(uid, userId));
}

/** "Forgot my password": always the same answer, whether or not the address has an account. */
export async function forgotAction(form: FormData) {
  const r = await attempt("password.forgot", async () => requestResetEmail(str(form, "email"), await clientKey()));
  redirect(r.ok || r.error === "invalid_input" ? "/forgot?sent=1" : `/forgot?e=${r.error}`);
}

/** The new password, from the link's page (returns an error to show there, or signs in fresh). */
export async function resetAction(_prev: { error: string | null }, form: FormData): Promise<{ error: string | null }> {
  const r = await attempt("password.reset", async () => resetPassword(str(form, "token"), str(form, "password"), await clientKey()));
  if (!r.ok) return { error: r.error };
  redirect("/login?ok=password_reset");
}
