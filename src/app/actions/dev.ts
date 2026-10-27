"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { companionAnswersAsks, companionAsksOwner, companionComments, companionGroupMessages, companionMessages, companionsReplyInGroup, companionWrites, createCompanion, deleteCompanion, enrichCompanion, reconnectCompanion } from "@/server/services/dev-companion";
import { attempt, str } from "./util";

// Development only: every service call refuses unless DEV_TOOLS=on.

function done(r: { ok: boolean; error?: string }, ok = "saved") {
  revalidatePath("/admin");
  revalidatePath("/home");
  revalidatePath("/memories");
  revalidatePath("/people");
  redirect(`/admin?${r.ok ? `ok=${ok}` : `e=${r.error}`}#dev`);
}

export async function createCompanionAction(form: FormData) {
  const uid = await requireUser();
  done(await attempt("dev.companion", () => createCompanion(uid, str(form, "relationship"))));
}

export async function companionWritesAction(form: FormData) {
  const uid = await requireUser();
  done(await attempt("dev.companion_write", () => companionWrites(uid, str(form, "id"))));
}

export async function deleteCompanionAction(form: FormData) {
  const uid = await requireUser();
  done(await attempt("dev.companion_delete", () => deleteCompanion(uid, str(form, "id"))), "deleted");
}

export async function enrichCompanionAction(form: FormData) {
  const uid = await requireUser();
  done(await attempt("dev.companion_enrich", () => enrichCompanion(uid, str(form, "id"))));
}

export async function reconnectCompanionAction(form: FormData) {
  const uid = await requireUser();
  done(await attempt("dev.companion_reconnect", () => reconnectCompanion(uid, str(form, "id"))));
}

export async function companionAnswersAction(form: FormData) {
  const uid = await requireUser();
  done(await attempt("dev.companion_answer", () => companionAnswersAsks(uid, str(form, "id"))));
}

export async function companionAsksOwnerAction(form: FormData) {
  const uid = await requireUser();
  done(await attempt("dev.companion_ask", () => companionAsksOwner(uid, str(form, "id"))));
}

export async function companionCommentsAction(form: FormData) {
  const uid = await requireUser();
  done(await attempt("dev.companion_comment", () => companionComments(uid, str(form, "id"))));
}

export async function companionMessagesAction(form: FormData) {
  const uid = await requireUser();
  done(await attempt("dev.companion_dm", () => companionMessages(uid, str(form, "id"))));
}

export async function companionGroupMessagesAction(form: FormData) {
  const uid = await requireUser();
  done(await attempt("dev.companion_group", () => companionGroupMessages(uid, str(form, "id"))));
}

/** From a group's info page: the test companions in it reply, then back to the conversation. */
export async function companionsReplyInGroupAction(form: FormData) {
  const uid = await requireUser();
  const id = str(form, "conversationId");
  const r = await attempt("dev.group_reply", () => companionsReplyInGroup(uid, id));
  redirect(r.ok ? `/messages/${encodeURIComponent(id)}` : `/messages/${encodeURIComponent(id)}/info?e=${r.error}`);
}
