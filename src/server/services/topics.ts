/**
 * Topics to answer each other, between two connected people (an "ask" grown into a conversation
 * starter). The sender answers when sending; the other person answers or passes; once both have
 * answered, the two answers show side by side on our connection page. Each answer is its writer's
 * own record (private, titled and tagged with the topic). The rules live in the topic_* SQL
 * functions (migration 0090); this module turns input into records and rows into views.
 */
import { sql } from "drizzle-orm";
import { z } from "zod";
import { isTopicKey, TOPICS } from "@/content/topics";
import type { Locale } from "@/lib/i18n/locales";
import { normalizeTag } from "@/lib/tags";
import { uuid } from "@/lib/validation/common";
import { withUser } from "../db/tx";
import { invalid, mapDbError } from "../errors";
import { createMemory, deleteMemory } from "./memories";

/** Topics waiting for the same person's answer, at most. */
export const TOPIC_LIMIT = 3;

export interface TopicView {
  id: string;
  /** I sent it (else it was sent to me). */
  sent: boolean;
  /** In the reader's language for MOSAIC's topics; as written otherwise. */
  prompt: string;
  tag: string;
  status: "open" | "answered" | "passed";
  createdAt: Date;
  closedAt: Date | null;
  /** My answer: its record, and its text now (null when I haven't answered, or deleted it). */
  myEntry: string | null;
  myBody: string | null;
  /** Their answer, once both have answered (null before, or if they deleted it). */
  theirBody: string | null;
}

const answerSchema = z.string().trim().min(1).max(4000);
const promptSchema = z.string().trim().min(1).max(80);

const promptOf = (preset: string | null, written: string, locale: Locale) => (preset && isTopicKey(preset) ? TOPICS[preset][locale] : written);

async function run<T>(userId: string, fn: Parameters<typeof withUser<T>>[1]) {
  return withUser(userId, async (tx) => {
    try {
      return await fn(tx);
    } catch (e) {
      mapDbError(e);
    }
  });
}

/** An answer as a record of mine: the topic as its title and tag, kept to myself. */
async function answerRecord(userId: string, prompt: string, tag: string, answer: string) {
  return createMemory(userId, { title: prompt, body: answer, tags: [tag] });
}

/** Send a topic (one of MOSAIC's, or my own words) with my answer. */
export async function sendTopic(userId: string, sessionId: string, input: { preset?: unknown; prompt?: unknown; answer: unknown }, locale: Locale): Promise<string> {
  const session = uuid.parse(sessionId);
  // My own words, when written, else the topic picked from MOSAIC's.
  const own = promptSchema.safeParse(typeof input.prompt === "string" ? input.prompt.replace(/^[#＃]+/, "") : input.prompt).data;
  const preset = !own && isTopicKey(input.preset) ? input.preset : null;
  const written = own ?? (preset ? TOPICS[preset][locale] : undefined);
  if (!written) throw invalid("topic_required");
  const answer = answerSchema.safeParse(input.answer);
  if (!answer.success) throw invalid("answer_required");
  const tag = normalizeTag(written);
  const entry = await answerRecord(userId, written, tag, answer.data);
  try {
    return await run(userId, async (tx) => (await tx.execute<{ id: string }>(sql`select topic_send(${session}, ${written}, ${preset}, ${tag}, ${entry}) as id`)).rows[0]!.id);
  } catch (e) {
    // Not sent (too many waiting, no longer connected): the answer isn't left behind as a stray record.
    await deleteMemory(userId, entry);
    throw e;
  }
}

/** Answer a topic sent to me: then both answers show. */
export async function answerTopic(userId: string, sessionId: string, promptId: string, answer: unknown, locale: Locale) {
  const id = uuid.parse(promptId);
  const a = answerSchema.safeParse(answer);
  if (!a.success) throw invalid("answer_required");
  const topic = (await listTopics(userId, sessionId, locale)).find((x) => x.id === id && !x.sent && x.status === "open");
  if (!topic) throw invalid("topic_closed");
  const entry = await answerRecord(userId, topic.prompt, topic.tag, a.data);
  try {
    await run(userId, (tx) => tx.execute(sql`select topic_answer(${id}, ${entry})`));
  } catch (e) {
    await deleteMemory(userId, entry);
    throw e;
  }
}

/** Pass on a topic sent to me, or take back one I sent that hasn't been answered. */
export async function closeTopic(userId: string, promptId: string, how: "passed" | "canceled") {
  const id = uuid.parse(promptId);
  await run(userId, (tx) => tx.execute(sql`select topic_close(${id}, ${how})`));
}

export async function listTopics(userId: string, sessionId: string, locale: Locale): Promise<TopicView[]> {
  const session = uuid.parse(sessionId);
  const r = await run(userId, (tx) =>
    tx.execute<{
      id: string; sent: boolean; prompt: string; preset: string | null; tag: string; status: TopicView["status"]; created_at: string | Date; closed_at: string | Date | null;
      my_entry: string | null; my_body: string | null; their_answered: boolean; their_body: string | null;
    }>(sql`select * from topic_list(${session})`),
  );
  return r.rows.map((x) => ({
    id: x.id,
    sent: x.sent,
    prompt: promptOf(x.preset, x.prompt, locale),
    tag: x.tag,
    status: x.status,
    createdAt: new Date(x.created_at),
    closedAt: x.closed_at ? new Date(x.closed_at) : null,
    myEntry: x.my_body === null ? null : x.my_entry,
    myBody: x.my_body,
    theirBody: x.their_body,
  }));
}

export interface TopicNotice {
  id: string;
  kind: "received" | "matched";
  sessionId: string;
  otherName: string;
  prompt: string;
}

/** For home: topics waiting for my answer, and ours answered by both in the last two weeks. */
export async function topicInbox(userId: string, locale: Locale): Promise<TopicNotice[]> {
  const r = await run(userId, (tx) =>
    tx.execute<{ id: string; kind: TopicNotice["kind"]; session_id: string; other_name: string; prompt: string; preset: string | null }>(sql`select * from topic_inbox()`),
  );
  return r.rows.map((x) => ({ id: x.id, kind: x.kind, sessionId: x.session_id, otherName: x.other_name, prompt: promptOf(x.preset, x.prompt, locale) }));
}
