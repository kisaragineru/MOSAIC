"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { notFound } from "@/server/errors";
import { sharedEntry } from "@/server/services/comments";
import {
  addMembers,
  createGroup,
  dmConversation,
  editMessage,
  hideConversation,
  leaveGroup,
  openDirect,
  openDirectForConnection,
  recordUnseenBy,
  reactToMessage,
  renameGroup,
  sendMessage,
  setMuted,
  setTyping,
  showRecordInMessage,
  unsendMessage,
  uploadPhoto,
} from "@/server/services/dm";
import { getLocale } from "@/lib/i18n/server";
import { translateMessage } from "@/server/services/translate";
import { removeGroupPhoto, setGroupPhoto } from "@/server/services/group-photo";
import { notifyMessageLater } from "@/server/services/push";
import { attempt, safeNext, str, withParam } from "./util";

// ── Called from the chat screen (return a result, no redirect) ──────────

export async function dmSend(conversationId: string, input: { kind: "text" | "image" | "record"; body?: string; replyTo?: string | null; recordId?: string | null; attachmentIds?: string[] }) {
  const uid = await requireUser();
  const r = await attempt("dm.send", () => sendMessage(uid, conversationId, input));
  if (r.ok) await notifyMessageLater(uid, r.value);
  return r;
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

/** A translation of one message into the reader's language, shown under the original. */
export async function dmTranslate(messageId: string) {
  const uid = await requireUser();
  const locale = await getLocale();
  return attempt("dm.translate", () => translateMessage(uid, messageId, locale));
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
  // A conversation starter comes with a draft, put in the box unsent.
  const draft = str(form, "draft").slice(0, 1000);
  redirect(r.ok ? `/messages/${r.value}${draft ? `?draft=${encodeURIComponent(draft)}` : ""}` : withParam(safeNext(str(form, "back"), "/messages"), "e", r.error));
}

/**
 * Sending my record where some members can't see it (outside who it's shared with): first ask
 * (back to the page, naming them); once I choose to show it, the message shows them the card.
 */
async function sendRecord(uid: string, conv: string, record: string, show: boolean) {
  const msg = await sendMessage(uid, conv, { kind: "record", recordId: record });
  if (show) await showRecordInMessage(uid, msg);
  await notifyMessageLater(uid, msg);
}

/** New message: one person opens your conversation with them, several make a group. A record to share can come along. */
export async function dmStartAction(form: FormData) {
  const uid = await requireUser();
  const ids = form.getAll("member").filter((v): v is string => typeof v === "string");
  const record = str(form, "record");
  const show = str(form, "show") === "1";
  if (record && !show && ids.length) {
    const unseen = await recordUnseenBy(uid, record, ids).catch(() => []);
    if (unseen.length) {
      const q = new URLSearchParams({ record, to: ids.join(","), title: str(form, "title") });
      redirect(`/messages/new?${q}#ask`);
    }
  }
  const r = await attempt("dm.start", async () => {
    const id = ids.length === 1 ? await openDirect(uid, ids[0]!) : await createGroup(uid, str(form, "title"), ids);
    if (record) await sendRecord(uid, id, record, show);
    return id;
  });
  revalidatePath("/messages");
  redirect(r.ok ? `/messages/${r.value}` : withParam(`/messages/new${record ? `?record=${record}` : ""}`, "e", r.error));
}

/** Share a record into an existing conversation. */
export async function dmShareRecordAction(form: FormData) {
  const uid = await requireUser();
  const conv = str(form, "conversationId");
  const record = str(form, "record");
  const show = str(form, "show") === "1";
  if (!show) {
    const members = await dmConversation(uid, conv).then((c) => c.members.filter((m) => !m.left).map((m) => m.id)).catch(() => []);
    const unseen = await recordUnseenBy(uid, record, members).catch(() => []);
    if (unseen.length) redirect(`/messages/new?${new URLSearchParams({ record, conv })}#ask`);
  }
  const r = await attempt("dm.share", () => sendRecord(uid, conv, record, show));
  redirect(r.ok ? `/messages/${conv}` : withParam(`/messages/new?record=${record}`, "e", r.error));
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

/** A group's cropped photo, from the editor (returns a result; the editor moves on). */
export async function uploadGroupPhotoAction(form: FormData) {
  const uid = await requireUser();
  const file = form.get("photo");
  if (!(file instanceof File)) return { ok: false as const, error: "invalid_image" };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const conv = str(form, "conversationId");
  const r = await attempt("dm.group_photo", () => setGroupPhoto(uid, conv, bytes));
  if (r.ok) revalidatePath("/messages");
  return r;
}

export async function removeGroupPhotoAction(form: FormData) {
  const uid = await requireUser();
  const conv = str(form, "conversationId");
  back(conv, await attempt("dm.group_photo_remove", () => removeGroupPhoto(uid, conv)), "deleted");
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

/** Answer someone's record in your one-to-one conversation with its owner (the record goes along). */
export async function dmReplyToRecordAction(form: FormData) {
  const uid = await requireUser();
  const id = str(form, "entryId");
  const r = await attempt("dm.replyRecord", async () => {
    const e = await sharedEntry(uid, id);
    if (!e) throw notFound();
    return openDirectForConnection(uid, e.sessionId);
  });
  redirect(r.ok ? `/messages/${r.value}?record=${encodeURIComponent(id)}` : withParam(`/memories/shared/${encodeURIComponent(id)}`, "e", r.error));
}
