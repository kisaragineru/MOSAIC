"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { deleteComment } from "@/server/services/comments";
import { addReply, deleteReply } from "@/server/services/replies";
import { attempt, safeNext, str, withParam } from "./util";

export async function deleteCommentAction(form: FormData) {
  const uid = await requireUser();
  const back = safeNext(str(form, "back"), "/memories");
  const r = await attempt("comments.delete", () => deleteComment(uid, str(form, "commentId")));
  redirect(r.ok ? `${back}#comments` : `${withParam(back, "e", r.error)}#comments`);
}

/** Reply under a record (mine, or one shared with me), then come back to the thread. */
export async function addReplyAction(form: FormData) {
  const uid = await requireUser();
  const back = safeNext(str(form, "back"), "/memories");
  const r = await attempt("replies.add", () => addReply(uid, str(form, "entryId"), str(form, "body")));
  revalidatePath("/memories");
  revalidatePath("/home");
  redirect(r.ok ? `${back}#replies` : `${withParam(back, "e", r.error)}#replies`);
}

export async function deleteReplyAction(form: FormData) {
  const uid = await requireUser();
  const back = safeNext(str(form, "back"), "/memories");
  const r = await attempt("replies.delete", () => deleteReply(uid, str(form, "replyId")));
  revalidatePath("/memories");
  redirect(r.ok ? `${back}#replies` : `${withParam(back, "e", r.error)}#replies`);
}
