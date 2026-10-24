/**
 * One-to-one comments on shared records. Someone who can see a record you shared can write to
 * you about it; you can answer them. Each conversation is only between the two of you: other
 * people who can see the same record never see it. A conversation can be read while the record
 * is still shared with that person (connection active, record shared with them); otherwise it is
 * hidden from both. Rules live in the SQL functions of migration 0018.
 */
import { sql } from "drizzle-orm";
import { cache } from "react";
import { z } from "zod";
import { uuid } from "@/lib/validation/common";
import { enforceRateLimit } from "../auth/rate-limit";
import { withUser } from "../db/tx";
import { invalid, mapDbError } from "../errors";
import { audit } from "./audit";
import type { MEMORY_KINDS } from "../db/schema";

export interface SharedEntry {
  id: string;
  ownerId: string;
  ownerName: string;
  sessionId: string;
  kind: (typeof MEMORY_KINDS)[number];
  title: string | null;
  body: string;
  occurredOn: string | null;
  createdAt: Date;
}

export interface Comment {
  id: string;
  mine: boolean;
  body: string;
  createdAt: Date;
}

export interface Thread {
  entryId: string;
  /** The person who isn't the record's owner (the thread's key). */
  partnerId: string;
  /** Who I'm talking with, and whether the record is mine. */
  otherId: string;
  otherName: string;
  iOwn: boolean;
  count: number;
  unread: number;
  lastBody: string;
  lastMine: boolean;
  lastAt: Date;
}

const bodySchema = z.string().trim().min(1).max(2000);
const dateStr = (v: string | Date | null) => (v === null ? null : typeof v === "string" ? v.slice(0, 10) : `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(v.getDate()).padStart(2, "0")}`);

async function run<T>(userId: string, fn: Parameters<typeof withUser<T>>[1]) {
  return withUser(userId, async (tx) => {
    try {
      return await fn(tx);
    } catch (e) {
      mapDbError(e);
    }
  });
}

/** Someone else's record I may read (and so comment on), or null. */
export async function sharedEntry(userId: string, entryId: string): Promise<SharedEntry | null> {
  const id = uuid.parse(entryId);
  const r = await run(userId, (tx) =>
    tx.execute<{ id: string; owner_id: string; owner_name: string; session_id: string; kind: SharedEntry["kind"]; title: string | null; body: string; occurred_on: string | Date | null; created_at: string | Date }>(
      sql`select * from memory_shared_get(${id})`,
    ),
  );
  const x = r.rows[0];
  return x ? { id: x.id, ownerId: x.owner_id, ownerName: x.owner_name, sessionId: x.session_id, kind: x.kind, title: x.title, body: x.body, occurredOn: dateStr(x.occurred_on), createdAt: new Date(x.created_at) } : null;
}

/**
 * Write in a thread: on someone else's record, to its owner (`partnerId` is ignored); on my own
 * record, an answer to `partnerId`, who must have written first.
 */
export async function addComment(userId: string, entryId: string, partnerId: string | null, body: unknown) {
  const id = uuid.parse(entryId);
  const partner = partnerId ? uuid.parse(partnerId) : null;
  const text = bodySchema.safeParse(body);
  if (!text.success) throw invalid("invalid_comment");
  await enforceRateLimit("comment", userId);
  return run(userId, async (tx) => {
    const r = await tx.execute<{ id: string }>(sql`select memory_comment_add(${id}, ${partner}, ${text.data}) as id`);
    await audit(tx, userId, "comment.added", "memory_entry", id);
    return r.rows[0]!.id;
  });
}

/** One thread, oldest first; reading it marks it read. */
export async function readThread(userId: string, entryId: string, partnerId: string | null): Promise<Comment[]> {
  const id = uuid.parse(entryId);
  const partner = partnerId ? uuid.parse(partnerId) : null;
  return run(userId, async (tx) => {
    const r = await tx.execute<{ id: string; author_id: string; body: string; created_at: string | Date }>(sql`select * from memory_comment_thread(${id}, ${partner})`);
    if (r.rows.length) await tx.execute(sql`select memory_comment_mark_read(${id}, ${partner})`);
    return r.rows.map((c) => ({ id: c.id, mine: c.author_id === userId, body: c.body, createdAt: new Date(c.created_at) }));
  });
}

/** Every conversation I'm in that can still be read, newest first. */
async function commentInboxUncached(userId: string): Promise<Thread[]> {
  const r = await run(userId, (tx) =>
    tx.execute<{ entry_id: string; partner_id: string; other_id: string; other_name: string; i_own: boolean; n: number; unread: number; last_body: string; last_author: string; last_at: string | Date }>(
      sql`select * from memory_comment_inbox()`,
    ),
  );
  return r.rows.map((x) => ({
    entryId: x.entry_id,
    partnerId: x.partner_id,
    otherId: x.other_id,
    otherName: x.other_name,
    iOwn: x.i_own,
    count: Number(x.n),
    unread: Number(x.unread),
    lastBody: x.last_body,
    lastMine: x.last_author === userId,
    lastAt: new Date(x.last_at),
  }));
}

/** Read once per page render (the timeline and Home both use it). */
export const commentInbox = cache(commentInboxUncached);

/** Take back a comment I wrote. */
export async function deleteComment(userId: string, commentId: string) {
  const id = uuid.parse(commentId);
  await run(userId, async (tx) => {
    await tx.execute(sql`select memory_comment_delete(${id})`);
    await audit(tx, userId, "comment.deleted", "memory_comment", id);
  });
}

/** Comment counts per record, from the inbox (for the timeline). */
export function countsByEntry(threads: Thread[]) {
  const m = new Map<string, { count: number; unread: number }>();
  for (const t of threads) {
    const c = m.get(t.entryId) ?? { count: 0, unread: 0 };
    m.set(t.entryId, { count: c.count + t.count, unread: c.unread + t.unread });
  }
  return m;
}
