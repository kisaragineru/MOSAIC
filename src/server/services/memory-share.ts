/**
 * Sharing a record with the people you're connected with, and reading what they shared with
 * you. Records are private unless you choose otherwise, per record: everyone you're connected
 * with, or by relationship ("circles": partner, family, friends, colleagues — as set on the person
 * linked to each connection, so someone added later sees what was already shared with their
 * circle). Letters to the future always stay private. Rules live in memory_set_audience() and
 * connection_feed() (migrations 0014–0015): only the current text is shared (no people, tags,
 * mood, reasons or history), only with active connections.
 */
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { uuid } from "@/lib/validation/common";
import { MEMORY_CIRCLES, MEMORY_KINDS, memoryCircles, memoryEntries, people } from "../db/schema";
import { withUser } from "../db/tx";
import { invalid, mapDbError } from "../errors";
import { audit } from "./audit";
import { listComparisons } from "./sharing";
import { listMemories, type MemorySummary } from "./memories";
import { timelineDay, type TimelineEntry } from "@/lib/timeline";

export const VISIBILITIES = ["private", "connections", "circles"] as const;
export type Visibility = (typeof VISIBILITIES)[number];
export type Circle = (typeof MEMORY_CIRCLES)[number];

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

const audienceSchema = z.object({ visibility: z.enum(VISIBILITIES), circles: z.array(z.enum(MEMORY_CIRCLES)).max(4).default([]) });

export async function setMemoryAudience(userId: string, entryId: string, input: unknown) {
  const id = uuid.parse(entryId);
  const d = audienceSchema.parse(input);
  if (d.visibility === "circles" && d.circles.length === 0) throw invalid("choose_audience");
  await withUser(userId, async (tx) => {
    try {
      await tx.execute(sql`select memory_set_audience(${id}, ${d.visibility}, ${`{${d.circles.join(",")}}`}::text[])`);
    } catch (e) {
      mapDbError(e);
    }
    await audit(tx, userId, `memory.audience_${d.visibility}`, "memory_entry", id);
  });
}

export interface ShareTarget {
  sessionId: string;
  name: string;
  personId: string | null;
  /** The relationship on the linked person; null when the connection isn't in "people" yet. */
  circle: Circle | null;
}

/** Active connections, with the relationship that decides which "circles" records they see. */
export async function shareTargets(userId: string): Promise<ShareTarget[]> {
  const active = (await listComparisons(userId)).filter((c) => c.status === "active");
  const ids = active.map((c) => c.personId).filter((x): x is string => !!x);
  const rel = ids.length
    ? await withUser(userId, (tx) => tx.select({ id: people.id, r: people.relationship }).from(people).where(and(eq(people.userId, userId), inArray(people.id, ids))))
    : [];
  return active.map((c) => {
    const r = rel.find((x) => x.id === c.personId)?.r;
    return { sessionId: c.id, name: c.otherName, personId: c.personId, circle: (MEMORY_CIRCLES as readonly string[]).includes(r ?? "") ? (r as Circle) : null };
  });
}

/** How many of my records a connection can read now (for the person page). */
export async function visibleCount(userId: string, circle: Circle | null): Promise<number> {
  return withUser(userId, async (tx) => {
    const r = await tx.execute<{ n: number }>(sql`
      select count(*)::int as n from ${memoryEntries} e
      where e.user_id = ${userId} and e.kind <> 'letter_to_future'
        and (e.visibility = 'connections'
             or (e.visibility = 'circles' and ${circle}::text is not null
                 and exists (select 1 from ${memoryCircles} mc where mc.entry_id = e.id and mc.circle = ${circle})))`);
    return r.rows[0]?.n ?? 0;
  });
}

/**
 * What the people I'm connected with shared with me, ordered like my own records (effective
 * date, then written time). `after`/`upto` bound the effective date (after < date <= upto).
 */
export async function connectionFeed(
  userId: string,
  opts: { after?: string | null; upto?: string | null; offset?: number; limit?: number; sessionId?: string | null } = {},
): Promise<FeedItem[]> {
  const date = (v: string | null | undefined) => (v ? isoDate.parse(v) : null);
  return withUser(userId, async (tx) => {
    const r = await tx.execute<{
      id: string; owner_id: string; owner_name: string; session_id: string; kind: string; title: string | null; body: string;
      occurred_on: string | null; effective_on: string; created_at: Date; updated_at: Date;
    }>(sql`select * from connection_feed(${date(opts.after)}::date, ${date(opts.upto)}::date, ${opts.offset ?? 0}, ${opts.limit ?? 20}, ${opts.sessionId ? uuid.parse(opts.sessionId) : null}::uuid)`);
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
  circles: m.circles,
  version: m.version,
  tags: m.tags,
  people: m.people,
});

export const feedToEntry = (f: FeedItem): TimelineEntry => ({
  id: f.id,
  mine: false,
  ownerId: f.ownerId,
  ownerName: f.ownerName,
  kind: f.kind,
  title: f.title,
  body: f.body,
  sealed: false,
  revealOn: null,
  occurredOn: f.occurredOn,
  createdAt: f.createdAt,
  audience: "connections",
  circles: [],
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
  // Newest by the day each sits on (an opened letter counts from its opening day), then by time written.
  const day = (e: TimelineEntry) => timelineDay(e) ?? e.createdAt.toISOString().slice(0, 10);
  return [...mine, ...theirs].sort((a, b) => (day(a) === day(b) ? b.createdAt.getTime() - a.createdAt.getTime() : day(a) < day(b) ? 1 : -1)).slice(0, n);
}
