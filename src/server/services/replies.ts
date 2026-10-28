import { cache } from "react";
/**
 * Replies under a record, as one thread: the owner's follow-ups and the words of the people the
 * record is shared with. Everyone who can see the record reads the whole thread (only the owner for
 * a private one); nobody does once it stops being shared with them. The writer, or the record's
 * owner, can delete a reply. A writer I'm not connected to shows without a name ("a friend of
 * <owner>"). Rules live in the SQL functions of migrations 0045 and 0046.
 */
import { sql } from "drizzle-orm";
import { z } from "zod";
import { uuid } from "@/lib/validation/common";
import { enforceRateLimit } from "../auth/rate-limit";
import { withUser } from "../db/tx";
import { invalid, mapDbError } from "../errors";
import { audit } from "./audit";

export interface Reply {
  id: string;
  authorId: string;
  /** Null when I'm not connected to the writer: they show as "a friend of <owner>". */
  authorName: string | null;
  /** The first letter of their name, for the icon (shown even when the name is hidden). */
  authorInitial: string;
  mine: boolean;
  body: string;
  createdAt: Date;
}

export interface ReplyPreview {
  /** Null when I'm not connected to the writer. */
  authorName: string | null;
  mine: boolean;
  body: string;
  createdAt: Date;
}

/** A thread I'm in, with what's new to me (replies by others since I last read it). */
export interface ReplyThread {
  entryId: string;
  ownerName: string;
  iOwn: boolean;
  unread: number;
  /** The latest reply by someone else (null while only I have written there). */
  lastBody: string | null;
  /** Its writer's name (also null when I'm not connected to them). */
  lastAuthorName: string | null;
  lastAt: Date | null;
}

const bodySchema = z.string().trim().min(1).max(2000);

async function run<T>(userId: string, fn: Parameters<typeof withUser<T>>[1]) {
  return withUser(userId, async (tx) => {
    try {
      return await fn(tx);
    } catch (e) {
      mapDbError(e);
    }
  });
}

/** Reply under a record I can see (my own, or one shared with me). */
export async function addReply(userId: string, entryId: string, body: unknown): Promise<string> {
  const id = uuid.parse(entryId);
  const text = bodySchema.safeParse(body);
  if (!text.success) throw invalid("invalid_comment");
  await enforceRateLimit("comment", userId);
  return run(userId, async (tx) => {
    const r = await tx.execute<{ id: string }>(sql`select memory_reply_add(${id}, ${text.data}) as id`);
    await audit(tx, userId, "reply.added", "memory_entry", id);
    return r.rows[0]!.id;
  });
}

/** Delete a reply I wrote, or one under my own record. Returns the record it was under. */
export async function deleteReply(userId: string, replyId: string): Promise<string> {
  const id = uuid.parse(replyId);
  return run(userId, async (tx) => {
    const r = await tx.execute<{ entry: string }>(sql`select memory_reply_delete(${id}) as entry`);
    await audit(tx, userId, "reply.deleted", "memory_reply", id);
    return r.rows[0]!.entry;
  });
}

/** The whole thread under a record, oldest first (empty when I may not see it); reading marks it read. */
export async function readReplies(userId: string, entryId: string): Promise<Reply[]> {
  const id = uuid.parse(entryId);
  return run(userId, async (tx) => {
    const r = await tx.execute<{ id: string; author_id: string; author_name: string | null; author_initial: string | null; body: string; created_at: string | Date }>(sql`select * from memory_reply_thread(${id})`);
    if (r.rows.length) {
      await tx.execute(sql`insert into memory_reply_reads (user_id, entry_id, read_at) values (${userId}, ${id}, now())
        on conflict (user_id, entry_id) do update set read_at = now()`);
    }
    return r.rows.map((x) => ({ id: x.id, authorId: x.author_id, authorName: x.author_name, authorInitial: x.author_initial || "?", mine: x.author_id === userId, body: x.body, createdAt: new Date(x.created_at) }));
  });
}

/** The newest replies under each record (for the timeline), and each record's count. */
export async function replyPreviews(userId: string, entryIds: string[], per = 2): Promise<{ previews: Map<string, ReplyPreview[]>; counts: Map<string, number> }> {
  const ids = [...new Set(entryIds)].filter((x) => uuid.safeParse(x).success).slice(0, 100);
  const previews = new Map<string, ReplyPreview[]>();
  const counts = new Map<string, number>();
  if (!ids.length) return { previews, counts };
  const r = await run(userId, (tx) =>
    tx.execute<{ entry_id: string; author_id: string; author_name: string | null; body: string; created_at: string | Date; n: number }>(
      sql`select * from memory_reply_previews(${`{${ids.join(",")}}`}::uuid[], ${per})`,
    ),
  );
  for (const x of r.rows) {
    const list = previews.get(x.entry_id) ?? [];
    list.push({ authorName: x.author_name, mine: x.author_id === userId, body: x.body, createdAt: new Date(x.created_at) });
    previews.set(x.entry_id, list);
    counts.set(x.entry_id, x.n);
  }
  return { previews, counts };
}

/** Threads I'm in, newest activity first. */
export const replyInbox = cache((userId: string): Promise<ReplyThread[]> => replyInboxUncached(userId));

async function replyInboxUncached(userId: string): Promise<ReplyThread[]> {
  const r = await run(userId, (tx) =>
    tx.execute<{ entry_id: string; owner_name: string; i_own: boolean; unread: number; last_body: string | null; last_author_name: string | null; last_at: string | Date | null }>(sql`select * from memory_reply_inbox()`),
  );
  return r.rows.map((x) => ({ entryId: x.entry_id, ownerName: x.owner_name, iOwn: x.i_own, unread: x.unread, lastBody: x.last_body, lastAuthorName: x.last_author_name, lastAt: x.last_at === null ? null : new Date(x.last_at) }));
}

/** Counts for the timeline's 💬 badge: total replies, and how many are new to me. */
export function replyCounts(counts: Map<string, number>, inbox: ReplyThread[]) {
  const unread = new Map(inbox.map((x) => [x.entryId, x.unread]));
  return new Map([...counts].map(([id, count]) => [id, { count, unread: unread.get(id) ?? 0 }]));
}
