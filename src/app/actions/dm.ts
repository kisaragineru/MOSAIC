"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import {
  addMembers,
  createGroup,
  editMessage,
  hideConversation,
  leaveGroup,
  openDirect,
  openDirectForConnection,
  reactToMessage,
  renameGroup,
  sendMessage,
  setMuted,
  setTyping,
  unsendMessage,
  uploadPhoto,
} from "@/server/services/dm";
import { attempt, safeNext, str, withParam } from "./util";

// ── Called from the chat screen (return a result, no redirect) ──────────

export async function dmSend(conversationId: string, input: { kind: "text" | "image" | "record"; body?: string; replyTo?: string | null; recordId?: string | null; attachmentIds?: string[] }) {
  const uid = await requireUser();
  return attempt("dm.send", () => sendMessage(uid, conversationId, input));
}

export async function dmEdit(messageId: string, body: string) {
  const uid = await requireUser();
  return attempt("dm.edit", () => editMessage(uid, messageId, body));
}

export async function dmUnsend(messageId: string) {
  const uid = await requireUser();
  return attempt("dm.unsend", () => unsendMessage(uid, messageId));
}

export async function dmReact(messageId: string, emoji: string | null) {
  const uid = await requireUser();
  return attempt("dm.react", () => reactToMessage(uid, messageId, emoji));
}

export async function dmTyping(conversationId: string) {
  const uid = await requireUser();
  return attempt("dm.typing", () => setTyping(uid, conversationId));
}

/** One photo (already resized in the browser), before the message that carries it is sent. */
export async function dmUpload(form: FormData) {
  const uid = await requireUser();
  const file = form.get("photo");
  if (!(file instanceof File)) return { ok: false as const, error: "invalid_image" };
  const bytes = new Uint8Array(await file.arrayBuffer());
  return attempt("dm.upload", () => uploadPhoto(uid, str(form, "conversationId"), bytes, str(form, "width"), str(form, "height")));
}

// ── Forms ───────────────────────────────────────────────────────────────

/** "Message" from a person's or a connection's page. */
export async function dmOpenForConnectionAction(form: FormData) {
  const uid = await requireUser();
  const r = await attempt("dm.open", () => openDirectForConnection(uid, str(form, "sessionId")));
  redirect(r.ok ? `/messages/${r.value}` : withParam(safeNext(str(form, "back"), "/messages"), "e", r.error));
}

/** New message: one person opens your conversation with them, several make a group. A record to share can come along. */
export async function dmStartAction(form: FormData) {
  const uid = await requireUser();
  const ids = form.getAll("member").filter((v): v is string => typeof v === "string");
  const record = str(form, "record");
  const r = await attempt("dm.start", async () => {
    const id = ids.length === 1 ? await openDirect(uid, ids[0]!) : await createGroup(uid, str(form, "title"), ids);
    if (record) await sendMessage(uid, id, { kind: "record", recordId: record });
    return id;
  });
  revalidatePath("/messages");
  redirect(r.ok ? `/messages/${r.value}` : withParam(`/messages/new${record ? `?record=${record}` : ""}`, "e", r.error));
}

/** Share a record into an existing conversation. */
export async function dmShareRecordAction(form: FormData) {
  const uid = await requireUser();
  const conv = str(form, "conversationId");
  const r = await attempt("dm.share", () => sendMessage(uid, conv, { kind: "record", recordId: str(form, "record") }));
  redirect(r.ok ? `/messages/${conv}` : withParam(`/messages/new?record=${str(form, "record")}`, "e", r.error));
}

function back(conv: string, r: { ok: boolean; error?: string }, ok = "saved") {
  revalidatePath("/messages");
  redirect(withParam(`/messages/${conv}/info`, r.ok ? "ok" : "e", r.ok ? ok : (r.error ?? "generic")));
}

export async function dmAddMembersAction(form: FormData) {
  const uid = await requireUser();
  const conv = str(form, "conversationId");
  back(conv, await attempt("dm.add", () => addMembers(uid, conv, form.getAll("member").filter((v): v is string => typeof v === "string"))));
}

export async function dmRenameAction(form: FormData) {
  const uid = await requireUser();
  const conv = str(form, "conversationId");
  back(conv, await attempt("dm.rename", () => renameGroup(uid, conv, str(form, "title"))));
}

export async function dmMuteAction(form: FormData) {
  const uid = await requireUser();
  const conv = str(form, "conversationId");
  back(conv, await attempt("dm.mute", () => setMuted(uid, conv, str(form, "muted") === "1")));
}

export async function dmLeaveAction(form: FormData) {
  const uid = await requireUser();
  const conv = str(form, "conversationId");
  const r = await attempt("dm.leave", () => leaveGroup(uid, conv));
  revalidatePath("/messages");
  redirect(r.ok ? "/messages" : withParam(`/messages/${conv}/info`, "e", r.error));
}

export async function dmHideAction(form: FormData) {
  const uid = await requireUser();
  const conv = str(form, "conversationId");
  const r = await attempt("dm.hide", () => hideConversation(uid, conv));
  revalidatePath("/messages");
  redirect(r.ok ? "/messages?ok=deleted" : withParam(`/messages/${conv}/info`, "e", r.error));
}
