/**
 * Replies to my own records: follow-ups I add under a record, as a thread (what happened next, a
 * thought added later). They are seen by whoever can see the record — only me for a private one,
 * the same people for a shared one — and by nobody once it stops being shared with them.
 */
import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { uuid } from "@/lib/validation/common";
import { enforceRateLimit } from "../auth/rate-limit";
import { memoryEntries, memoryReplies } from "../db/schema";
import { withUser } from "../db/tx";
import { invalid, notFound } from "../errors";
import { audit } from "./audit";

export interface Reply {
  id: string;
  body: string;
  createdAt: Date;
}

const bodySchema = z.string().trim().min(1).max(2000);

/** Add a reply under my own record (not under a letter to the future). */
export async function addReply(userId: string, entryId: string, body: unknown): Promise<string> {
  const id = uuid.parse(entryId);
  const text = bodySchema.safeParse(body);
  if (!text.success) throw invalid("invalid_comment");
  await enforceRateLimit("comment", userId);
  return withUser(userId, async (tx) => {
    const [e] = await tx.select({ kind: memoryEntries.kind }).from(memoryEntries).where(and(eq(memoryEntries.id, id), eq(memoryEntries.userId, userId)));
    if (!e || e.kind === "letter_to_future") throw notFound();
    const [r] = await tx.insert(memoryReplies).values({ entryId: id, ownerId: userId, body: text.data }).returning({ id: memoryReplies.id });
    await audit(tx, userId, "reply.added", "memory_entry", id);
    return r!.id;
  });
}

export async function deleteReply(userId: string, replyId: string) {
  const id = uuid.parse(replyId);
  await withUser(userId, async (tx) => {
    const gone = await tx.delete(memoryReplies).where(and(eq(memoryReplies.id, id), eq(memoryReplies.ownerId, userId))).returning({ id: memoryReplies.id });
    if (!gone.length) throw notFound();
    await audit(tx, userId, "reply.deleted", "memory_reply", id);
  });
}

/** The replies under my own record, oldest first. */
export async function myReplies(userId: string, entryId: string): Promise<Reply[]> {
  const id = uuid.parse(entryId);
  const rows = await withUser(userId, (tx) => tx.select().from(memoryReplies).where(and(eq(memoryReplies.entryId, id), eq(memoryReplies.ownerId, userId))).orderBy(asc(memoryReplies.createdAt), asc(memoryReplies.id)));
  return rows.map((r) => ({ id: r.id, body: r.body, createdAt: r.createdAt }));
}

/** The owner's replies under someone else's record I may read (empty when I may not). */
export async function sharedReplies(userId: string, entryId: string): Promise<Reply[]> {
  const id = uuid.parse(entryId);
  const r = await withUser(userId, (tx) => tx.execute<{ id: string; body: string; created_at: string | Date }>(sql`select * from memory_replies_shared(${id})`));
  return r.rows.map((x) => ({ id: x.id, body: x.body, createdAt: new Date(x.created_at) }));
}
