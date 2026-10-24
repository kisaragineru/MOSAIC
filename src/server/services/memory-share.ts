/**
 * Sharing a record with the people you're connected with, and reading what they shared with
 * you. Records are private unless you choose otherwise, per record; letters to the future always
 * stay private. Rules live in memory_set_audience() and connection_feed() (migration 0014): only
 * the current text is shared (no people, tags, mood, reasons or history), never once a
 * connection has ended.
 */
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { uuid } from "@/lib/validation/common";
import { MEMORY_KINDS, memoryAudience } from "../db/schema";
import { withUser } from "../db/tx";
import { invalid, mapDbError } from "../errors";
import { audit } from "./audit";
import { listComparisons } from "./sharing";
import { listMemories, type MemorySummary } from "./memories";
import type { TimelineEntry } from "@/lib/timeline";

export const VISIBILITIES = ["private", "connections", "selected"] as const;
export type Visibility = (typeof VISIBILITIES)[number];

export interface FeedItem {
  id: string;
  ownerId: string;
  ownerName: string;
  sessionId: string;
  kind: (typeof MEMORY_KINDS)[number];
  title: string | null;
  body: string;
  occurredOn: string | null;
  effectiveOn: string;
  createdAt: Date;
  updatedAt: Date;
}

/** pg returns `date` as a string or a Date (at local midnight) depending on the parser. */
const dateStr = (v: string | Date) => (typeof v === "string" ? v.slice(0, 10) : `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(v.getDate()).padStart(2, "0")}`);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const audienceSchema = z.object({ visibility: z.enum(VISIBILITIES), sessions: z.array(uuid).max(200).default([]) });

export async function setMemoryAudience(userId: string, entryId: string, input: unknown) {
  const id = uuid.parse(entryId);
  const d = audienceSchema.parse(input);
  if (d.visibility === "selected" && d.sessions.length === 0) throw invalid("choose_audience");
  await withUser(userId, async (tx) => {
    try {
      await tx.execute(sql`select memory_set_audience(${id}, ${d.visibility}, ${`{${d.sessions.join(",")}}`}::uuid[])`);
    } catch (e) {
      mapDbError(e);
    }
    await audit(tx, userId, `memory.audience_${d.visibility}`, "memory_entry", id);
  });
}

export async function memoryAudienceOf(userId: string, entryId: string): Promise<string[]> {
  const id = uuid.parse(entryId);
  return withUser(userId, async (tx) =>
    (await tx.select({ s: memoryAudience.sessionId }).from(memoryAudience).where(and(eq(memoryAudience.entryId, id), eq(memoryAudience.ownerId, userId)))).map((r) => r.s),
  );
}

/** Connections a record can be shared with (active), with the other person's name. */
export async function audienceChoices(userId: string): Promise<{ sessionId: string; name: string }[]> {
  return (await listComparisons(userId)).filter((c) => c.status === "active").map((c) => ({ sessionId: c.id, name: c.otherName }));
}

/**
 * What the people I'm connected with shared with me, ordered like my own records (effective
 * date, then written time). `after`/`upto` bound the effective date (after < date <= upto).
 */
export async function connectionFeed(
  userId: string,
  opts: { after?: string | null; upto?: string | null; offset?: number; limit?: number } = {},
): Promise<FeedItem[]> {
  const date = (v: string | null | undefined) => (v ? isoDate.parse(v) : null);
  return withUser(userId, async (tx) => {
    const r = await tx.execute<{
      id: string; owner_id: string; owner_name: string; session_id: string; kind: string; title: string | null; body: string;
      occurred_on: string | null; effective_on: string; created_at: Date; updated_at: Date;
    }>(sql`select * from connection_feed(${date(opts.after)}::date, ${date(opts.upto)}::date, ${opts.offset ?? 0}, ${opts.limit ?? 20})`);
    return r.rows.map((x) => ({
      id: x.id,
      ownerId: x.owner_id,
      ownerName: x.owner_name,
      sessionId: x.session_id,
      kind: x.kind as FeedItem["kind"],
      title: x.title,
      body: x.body,
      occurredOn: x.occurred_on ? dateStr(x.occurred_on) : null,
      effectiveOn: dateStr(x.effective_on),
      createdAt: new Date(x.created_at),
      updatedAt: new Date(x.updated_at),
    }));
  });
}

export const mineToEntry = (m: MemorySummary): TimelineEntry => ({
  id: m.id,
  mine: true,
  ownerName: null,
  kind: m.kind,
  title: m.title,
  body: m.body,
  sealed: m.sealed,
  revealOn: m.revealOn,
  occurredOn: m.occurredOn,
  createdAt: m.createdAt,
  audience: m.visibility,
  version: m.version,
  tags: m.tags,
  people: m.people,
});

export const feedToEntry = (f: FeedItem): TimelineEntry => ({
  id: f.id,
  mine: false,
  ownerName: f.ownerName,
  kind: f.kind,
  title: f.title,
  body: f.body,
  sealed: false,
  revealOn: null,
  occurredOn: f.occurredOn,
  createdAt: f.createdAt,
  audience: "connections",
  version: 1,
  tags: [],
  people: [],
});

/**
 * The shared records that belong between a page of my own records and the page before it, so
 * that paging through mine also pages through theirs without gaps or repeats: on page n they
 * are those dated after page n's oldest day (none below it on the last page) up to and
 * including page n-1's oldest day (no upper bound on the first page).
 */
export async function feedForPage(userId: string, page: { previousOldest: string | null; oldest: string | null; first: boolean; last: boolean }) {
  return connectionFeed(userId, { after: page.last ? null : page.oldest, upto: page.first ? null : page.previousOldest, limit: 100 });
}

/** The newest few, mine and theirs together (Home). */
export async function recentTimeline(userId: string, n = 6): Promise<TimelineEntry[]> {
  const mine = (await listMemories(userId, { limit: n })).map(mineToEntry);
  const theirs = (await connectionFeed(userId, { limit: n })).map(feedToEntry);
  return [...mine, ...theirs].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, n);
}
