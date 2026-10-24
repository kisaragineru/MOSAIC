"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { addComment, deleteComment } from "@/server/services/comments";
import { attempt, safeNext, str, withParam } from "./util";

/** Write in a one-to-one thread, then come back to it. */
export async function addCommentAction(form: FormData) {
  const uid = await requireUser();
  const back = safeNext(str(form, "back"), "/memories");
  const r = await attempt("comments.add", () => addComment(uid, str(form, "entryId"), str(form, "partnerId") || null, str(form, "body")));
  revalidatePath("/home");
  redirect(r.ok ? `${back}#comments` : `${withParam(back, "e", r.error)}#comments`);
}

export async function deleteCommentAction(form: FormData) {
  const uid = await requireUser();
  const back = safeNext(str(form, "back"), "/memories");
  const r = await attempt("comments.delete", () => deleteComment(uid, str(form, "commentId")));
  redirect(r.ok ? `${back}#comments` : `${withParam(back, "e", r.error)}#comments`);
}
