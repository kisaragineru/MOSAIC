/**
 * Direct messages between people who are connected: one-to-one conversations and groups. The
 * rules (who may write, who sees which messages, editing, unsending, photos, shared records)
 * live in the SQL functions of migration 0021; this module validates input and shapes rows.
 */
import { sql } from "drizzle-orm";
import { cache } from "react";
import { z } from "zod";
import { uuid } from "@/lib/validation/common";
import { enforceRateLimit, hitInTx } from "../auth/rate-limit";
import { withUser, type Tx } from "../db/tx";
import { invalid, mapDbError, rateLimited } from "../errors";
import { audit } from "./audit";

export const DM_REACTIONS = ["❤️", "😂", "😮", "😢", "😡", "👍"] as const;
export const DM_EDIT_MINUTES = 15;
export const DM_MAX_PHOTOS = 3;
export const DM_MAX_PHOTO_BYTES = 2_500_000;

export interface DmPerson {
  id: string;
  name: string;
}

export interface DmInboxItem {
  id: string;
  kind: "direct" | "group";
  title: string | null;
  others: DmPerson[];
  last: { kind: DmMessage["kind"]; body: string | null; meta: DmSystemMeta | null; senderId: string | null; senderName: string | null; deleted: boolean; at: Date; mine: boolean };
  unread: number;
  muted: boolean;
  canSend: boolean;
  leftGroup: boolean;
}

export interface DmMember extends DmPerson {
  role: "owner" | "member";
  left: boolean;
  lastReadAt: Date | null;
  typing: boolean;
  connected: boolean;
}

export interface DmConversation {
  id: string;
  kind: "direct" | "group";
  title: string | null;
  /** A group MOSAIC runs ("beta"): its members are set by the admins. */
  system: string | null;
  canSend: boolean;
  me: { role: "owner" | "member"; left: boolean; muted: boolean; joinedAt: Date };
  members: DmMember[];
}

export type DmSystemMeta = { event: "created" | "added" | "left" | "renamed"; by: string; users?: string[]; title?: string | null };

export interface DmMessage {
  id: string;
  senderId: string | null;
  senderName: string | null;
  kind: "text" | "image" | "record" | "system";
  body: string | null;
  meta: DmSystemMeta | null;
  createdAt: string;
  updatedAt: string;
  edited: boolean;
  deleted: boolean;
  reply: { id: string; senderName: string | null; kind: string; body: string | null; deleted: boolean } | null;
  /** `shown`: its owner showed it in this message to someone outside its audience (the card only, no page). */
  record: { id: string; mine: boolean; shown?: boolean; ownerName: string; kind: string; title: string | null; body: string | null } | { hidden: true } | null;
  attachments: { id: string; w: number; h: number }[];
  reactions: { userId: string; emoji: string }[];
}

async function run<T>(userId: string, fn: (tx: Tx) => Promise<T>) {
  return withUser(userId, async (tx) => {
    try {
      return await fn(tx);
    } catch (e) {
      mapDbError(e);
    }
  });
}

const toMessage = (j: Record<string, unknown>): DmMessage => {
  const reply = j.reply as Record<string, unknown> | null;
  const record = j.record as Record<string, unknown> | null;
  return {
    id: j.id as string,
    senderId: (j.sender_id as string | null) ?? null,
    senderName: (j.sender_name as string | null) ?? null,
    kind: j.kind as DmMessage["kind"],
    body: (j.body as string | null) ?? null,
    meta: (j.meta as DmSystemMeta | null) ?? null,
    createdAt: new Date(j.created_at as string).toISOString(),
    updatedAt: new Date(j.updated_at as string).toISOString(),
    edited: !!j.edited,
    deleted: !!j.deleted,
    reply: reply ? { id: reply.id as string, senderName: (reply.sender_name as string | null) ?? null, kind: reply.kind as string, body: (reply.body as string | null) ?? null, deleted: !!reply.deleted } : null,
    record: !record
      ? null
      : record.hidden
        ? { hidden: true }
        : { id: record.id as string, mine: !!record.mine, ...(record.shown ? { shown: true } : {}), ownerName: record.owner_name as string, kind: record.kind as string, title: (record.title as string | null) ?? null, body: (record.body as string | null) ?? null },
    attachments: ((j.attachments as { id: string; w: number; h: number }[]) ?? []).map((a) => ({ id: a.id, w: a.w, h: a.h })),
    reactions: ((j.reactions as { user_id: string; emoji: string }[]) ?? []).map((r) => ({ userId: r.user_id, emoji: r.emoji })),
  };
};

const byTime = (a: DmMessage, b: DmMessage) => (a.createdAt === b.createdAt ? a.id.localeCompare(b.id) : a.createdAt < b.createdAt ? -1 : 1);

// ── Reading ──────────────────────────────────────────────────────────────

async function inboxUncached(userId: string): Promise<DmInboxItem[]> {
  const r = await run(userId, (tx) =>
    tx.execute<{
      id: string; kind: "direct" | "group"; title: string | null; others: DmPerson[]; last_kind: DmMessage["kind"]; last_body: string | null; last_meta: DmSystemMeta | null;
      last_sender: string | null; last_sender_name: string | null; last_deleted: boolean; last_at: string | Date; unread: number; muted: boolean; can_send: boolean; left_group: boolean;
    }>(sql`select * from dm_inbox()`),
  );
  return r.rows.map((x) => ({
    id: x.id,
    kind: x.kind,
    title: x.title,
    others: x.others,
    last: { kind: x.last_kind, body: x.last_body, meta: x.last_meta, senderId: x.last_sender, senderName: x.last_sender_name, deleted: x.last_deleted, at: new Date(x.last_at), mine: x.last_sender === userId },
    unread: Number(x.unread),
    muted: x.muted,
    canSend: x.can_send,
    leftGroup: x.left_group,
  }));
}
/** Read once per page render. */
export const dmInbox = cache(inboxUncached);

async function unreadUncached(userId: string): Promise<number> {
  const r = await run(userId, (tx) => tx.execute<{ n: number }>(sql`select dm_unread_total() as n`));
  return Number(r.rows[0]?.n ?? 0);
}
/** Conversations with something new (muted ones aside), for the badge. */
export const dmUnreadTotal = cache(unreadUncached);

export async function dmConversation(userId: string, conversationId: string): Promise<DmConversation> {
  const id = uuid.parse(conversationId);
  const r = await run(userId, (tx) => tx.execute<{ c: Record<string, unknown>; k: string | null }>(sql`select dm_conversation(${id}) as c, dm_system_key(${id}) as k`));
  const c = r.rows[0]!.c as {
    id: string; kind: "direct" | "group"; title: string | null; can_send: boolean;
    me: { role: "owner" | "member"; left: boolean; muted: boolean; joined_at: string };
    members: { id: string; name: string; role: "owner" | "member"; left: boolean; last_read_at: string | null; typing: boolean; connected: boolean }[];
  };
  return {
    id: c.id,
    kind: c.kind,
    title: c.title,
    system: r.rows[0]!.k ?? null,
    canSend: c.can_send,
    me: { role: c.me.role, left: c.me.left, muted: c.me.muted, joinedAt: new Date(c.me.joined_at) },
    members: c.members.map((m) => ({ id: m.id, name: m.name, role: m.role, left: m.left, lastReadAt: m.last_read_at ? new Date(m.last_read_at) : null, typing: m.typing, connected: m.connected })),
  };
}

/** The newest messages before `before` (default: now), oldest first. */
export async function dmMessages(userId: string, conversationId: string, opts: { before?: string | null; limit?: number } = {}): Promise<DmMessage[]> {
  const id = uuid.parse(conversationId);
  const before = opts.before ? z.string().datetime({ offset: true }).parse(opts.before) : null;
  const r = await run(userId, (tx) => tx.execute<{ dm_messages: Record<string, unknown> }>(sql`select * from dm_messages(${id}, ${before}::timestamptz, null, ${opts.limit ?? 40})`));
  return r.rows.map((x) => toMessage(x.dm_messages)).sort(byTime);
}

/** Everything new or changed since `since` (an updatedAt the client has seen), oldest first. */
export async function dmChanges(userId: string, conversationId: string, since: string): Promise<DmMessage[]> {
  const id = uuid.parse(conversationId);
  const s = z.string().datetime({ offset: true }).parse(since);
  const r = await run(userId, (tx) => tx.execute<{ dm_messages: Record<string, unknown> }>(sql`select * from dm_messages(${id}, null, ${s}::timestamptz, 200)`));
  return r.rows.map((x) => toMessage(x.dm_messages)).sort(byTime);
}

/** One message's text, for a member who can see it (for translating it on request). */
export async function messageText(userId: string, messageId: string): Promise<string | null> {
  const id = uuid.parse(messageId);
  const r = await run(userId, (tx) => tx.execute<{ body: string | null }>(sql`select dm_message_text(${id}) as body`));
  return r.rows[0]?.body ?? null;
}

export async function dmAttachment(userId: string, attachmentId: string): Promise<{ mime: string; bytes: Buffer } | null> {
  const id = uuid.safeParse(attachmentId);
  if (!id.success) return null;
  const r = await run(userId, (tx) => tx.execute<{ mime: string; bytes: Buffer }>(sql`select * from dm_attachment(${id.data})`));
  return r.rows[0] ?? null;
}

// ── Writing ──────────────────────────────────────────────────────────────

export async function openDirect(userId: string, otherId: string): Promise<string> {
  const other = uuid.parse(otherId);
  return run(userId, async (tx) => (await tx.execute<{ id: string }>(sql`select dm_open_direct(${other}) as id`)).rows[0]!.id);
}

const memberList = z.array(uuid).min(1).max(30);

export async function createGroup(userId: string, title: unknown, memberIds: unknown): Promise<string> {
  const t = z.string().trim().max(60).optional().parse(typeof title === "string" ? title : undefined);
  const ids = memberList.parse(memberIds);
  return run(userId, async (tx) => {
    const id = (await tx.execute<{ id: string }>(sql`select dm_create_group(${t ?? null}, ${`{${ids.join(",")}}`}::uuid[]) as id`)).rows[0]!.id;
    await audit(tx, userId, "dm.group_created", "dm_conversation", id);
    return id;
  });
}

export async function addMembers(userId: string, conversationId: string, memberIds: unknown) {
  const id = uuid.parse(conversationId);
  const ids = memberList.parse(memberIds);
  await run(userId, (tx) => tx.execute(sql`select dm_add_members(${id}, ${`{${ids.join(",")}}`}::uuid[])`));
}

export async function leaveGroup(userId: string, conversationId: string) {
  const id = uuid.parse(conversationId);
  await run(userId, (tx) => tx.execute(sql`select dm_leave(${id})`));
}

export async function renameGroup(userId: string, conversationId: string, title: unknown) {
  const id = uuid.parse(conversationId);
  const t = z.string().trim().max(60).parse(typeof title === "string" ? title : "");
  await run(userId, (tx) => tx.execute(sql`select dm_rename(${id}, ${t || null})`));
}

const sendSchema = z.object({
  kind: z.enum(["text", "image", "record"]),
  body: z.string().max(4000).optional().nullable(),
  replyTo: uuid.optional().nullable(),
  recordId: uuid.optional().nullable(),
  attachmentIds: z.array(uuid).max(DM_MAX_PHOTOS).optional(),
});

export async function sendMessage(userId: string, conversationId: string, input: unknown): Promise<string> {
  const id = uuid.parse(conversationId);
  const d = sendSchema.safeParse(input);
  if (!d.success) throw invalid("invalid_message");
  await enforceRateLimit("dm", userId);
  const att = d.data.attachmentIds ?? [];
  return run(userId, async (tx) => {
    const r = await tx.execute<{ id: string }>(
      sql`select dm_send(${id}, ${d.data.kind}, ${d.data.body ?? null}, ${d.data.replyTo ?? null}, ${d.data.recordId ?? null}, ${`{${att.join(",")}}`}::uuid[]) as id`,
    );
    return r.rows[0]!.id;
  });
}

export async function editMessage(userId: string, messageId: string, body: unknown) {
  const id = uuid.parse(messageId);
  const b = z.string().max(4000).parse(body);
  await run(userId, (tx) => tx.execute(sql`select dm_edit(${id}, ${b})`));
}

export async function unsendMessage(userId: string, messageId: string) {
  const id = uuid.parse(messageId);
  await run(userId, (tx) => tx.execute(sql`select dm_unsend(${id})`));
}

export async function reactToMessage(userId: string, messageId: string, emoji: unknown) {
  const id = uuid.parse(messageId);
  const e = emoji === null || emoji === "" ? null : z.enum(DM_REACTIONS).parse(emoji);
  await run(userId, (tx) => tx.execute(sql`select dm_react(${id}, ${e})`));
}

export async function markRead(userId: string, conversationId: string) {
  const id = uuid.parse(conversationId);
  await run(userId, (tx) => tx.execute(sql`select dm_mark_read(${id})`));
}

export async function setTyping(userId: string, conversationId: string) {
  const id = uuid.parse(conversationId);
  await run(userId, (tx) => tx.execute(sql`select dm_typing(${id})`));
}

export async function setMuted(userId: string, conversationId: string, muted: boolean) {
  const id = uuid.parse(conversationId);
  await run(userId, (tx) => tx.execute(sql`select dm_set_muted(${id}, ${muted})`));
}

export async function hideConversation(userId: string, conversationId: string) {
  const id = uuid.parse(conversationId);
  await run(userId, (tx) => tx.execute(sql`select dm_hide(${id})`));
}

/** What the bytes really are (the browser's type is not trusted). */
export function sniffImage(b: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b.length > 12 && String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}

/** Store a photo (already resized in the browser) for a message about to be sent. */
export async function uploadPhoto(userId: string, conversationId: string, bytes: Uint8Array, width: unknown, height: unknown): Promise<string> {
  const id = uuid.parse(conversationId);
  if (bytes.length === 0 || bytes.length > DM_MAX_PHOTO_BYTES) throw invalid("image_too_large");
  const mime = sniffImage(bytes);
  if (!mime) throw invalid("invalid_image");
  const w = z.coerce.number().int().min(1).max(8000).parse(width);
  const h = z.coerce.number().int().min(1).max(8000).parse(height);
  await enforceRateLimit("dm", userId);
  return run(userId, async (tx) => (await tx.execute<{ id: string }>(sql`select dm_upload(${id}, ${mime}, ${Buffer.from(bytes)}, ${w}, ${h}) as id`)).rows[0]!.id);
}

/** The one-to-one conversation with the other person of one of my connections. */
export async function openDirectForConnection(userId: string, sessionId: string): Promise<string> {
  const sid = uuid.parse(sessionId);
  const other = await run(userId, async (tx) => (await tx.execute<{ user_id: string }>(sql`select user_id from comparison_participants(${sid}) where user_id <> ${userId}`)).rows[0]?.user_id);
  if (!other) throw invalid("not_connected");
  return openDirect(userId, other);
}

/** People I can start a conversation with or add to a group: everyone I'm actively connected with. */
export async function dmContacts(userId: string): Promise<DmPerson[]> {
  const r = await run(userId, (tx) =>
    tx.execute<{ id: string; name: string }>(sql`
      select p.user_id as id, p.display_name as name
      from comparison_sessions s, lateral comparison_participants(s.id) p
      where s.status = 'active' and p.user_id <> ${userId}
      order by p.display_name`),
  );
  return [...new Map(r.rows.map((x) => [x.id, x])).values()];
}


// ── The fast paths used by an open conversation ───────────────────────────

const fastSchema = sendSchema.extend({ id: uuid });

/**
 * Send with an id chosen by the browser, in one transaction (rate limit + send). Sending the same
 * id again returns the message already sent, so retries after a lost answer never duplicate it.
 */
export async function sendMessageFast(userId: string, conversationId: string, input: unknown): Promise<string> {
  const id = uuid.parse(conversationId);
  const d = fastSchema.safeParse(input);
  if (!d.success) throw invalid("invalid_message");
  const att = d.data.attachmentIds ?? [];
  return run(userId, async (tx) => {
    if (!(await hitInTx(tx, "dm", userId))) throw rateLimited();
    const r = await tx.execute<{ id: string }>(
      sql`select dm_send_id(${d.data.id}, ${id}, ${d.data.kind}, ${d.data.body ?? null}, ${d.data.replyTo ?? null}, ${d.data.recordId ?? null}, ${`{${att.join(",")}}`}::uuid[]) as id`,
    );
    return r.rows[0]!.id;
  });
}

/** Store a photo in one transaction (rate limit + upload). */
export async function uploadPhotoFast(userId: string, conversationId: string, bytes: Uint8Array, width: unknown, height: unknown): Promise<string> {
  const id = uuid.parse(conversationId);
  if (bytes.length === 0 || bytes.length > DM_MAX_PHOTO_BYTES) throw invalid("image_too_large");
  const mime = sniffImage(bytes);
  if (!mime) throw invalid("invalid_image");
  const w = z.coerce.number().int().min(1).max(8000).parse(width);
  const h = z.coerce.number().int().min(1).max(8000).parse(height);
  return run(userId, async (tx) => {
    if (!(await hitInTx(tx, "dm", userId))) throw rateLimited();
    return (await tx.execute<{ id: string }>(sql`select dm_upload(${id}, ${mime}, ${Buffer.from(bytes)}, ${w}, ${h}) as id`)).rows[0]!.id;
  });
}

/** Everything an open conversation needs every few seconds, in one call. */
export async function dmSync(userId: string, conversationId: string, opts: { since: string | null; read: boolean; typing: boolean }) {
  const id = uuid.parse(conversationId);
  const since = opts.since ? z.string().datetime({ offset: true }).parse(opts.since) : null;
  const r = await run(userId, (tx) => tx.execute<{ s: { messages: Record<string, unknown>[]; conversation: Record<string, unknown> } }>(sql`select dm_sync(${id}, ${since}::timestamptz, ${opts.read}, ${opts.typing}) as s`));
  const s = r.rows[0]!.s;
  const c = s.conversation as { title: string | null; can_send: boolean; me: { left: boolean }; members: { id: string; name: string; left: boolean; last_read_at: string | null; typing: boolean }[] };
  return {
    messages: s.messages.map(toMessage).sort(byTime),
    conversation: {
      title: c.title,
      canSend: c.can_send,
      me: { left: c.me.left },
      members: c.members.map((m) => ({ id: m.id, name: m.name, left: m.left, lastReadAt: m.last_read_at, typing: m.typing })),
    },
  };
}


// ── Sending my own record to people outside its audience ─────────────────

/** Who among these people can't see my record (outside who it's shared with), by name. */
export async function recordUnseenBy(userId: string, recordId: string, userIds: string[]): Promise<{ id: string; name: string }[]> {
  const id = uuid.parse(recordId);
  const ids = userIds.filter((x) => uuid.safeParse(x).success);
  if (!ids.length) return [];
  const r = await run(userId, (tx) => tx.execute<{ user_id: string; name: string }>(sql`select * from memory_unseen_by(${id}, ${`{${ids.join(",")}}`}::uuid[])`));
  return r.rows.map((x) => ({ id: x.user_id, name: x.name }));
}

/** Show my record, in a message I sent, to the members outside its audience (after being asked). */
export async function showRecordInMessage(userId: string, messageId: string) {
  const id = uuid.parse(messageId);
  await run(userId, (tx) => tx.execute(sql`select dm_show_record(${id})`));
}
