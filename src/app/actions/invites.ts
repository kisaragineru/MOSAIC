"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { makeInviteCode, revokeInviteCode } from "@/server/services/invite-codes";
import { attempt, str, withParam } from "./util";

const PAGE = "/share";

/** Make an invite code for someone; the page shows it at the top of the list, ready to send. */
export async function makeInviteCodeAction(form: FormData) {
  const uid = await requireUser();
  const r = await attempt("invite.make", () => makeInviteCode(uid, str(form, "label")));
  revalidatePath(PAGE);
  redirect(`${r.ok ? withParam(PAGE, "made", r.value.id) : withParam(PAGE, "e", r.error)}#invite`);
}

export async function revokeInviteCodeAction(form: FormData) {
  const uid = await requireUser();
  await attempt("invite.revoke", () => revokeInviteCode(uid, str(form, "id")));
  revalidatePath(PAGE);
  redirect(`${PAGE}#invite`);
}
