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
import { MEMORY_CIRCLES, MEMORY_KINDS, memoryAudiencePeople, memoryCircles, memoryEntries, memoryEntryVersions, people } from "../db/schema";
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

const audienceSchema = z.object({
  visibility: z.enum(VISIBILITIES),
  circles: z.array(z.enum(MEMORY_CIRCLES)).max(4).default([]),
  /** People I'm connected with, chosen besides (or instead of) relationships (user ids). */
  people: z.array(uuid).max(100).default([]),
});
const chosen = (d: z.output<typeof audienceSchema>) => d.visibility !== "circles" || d.circles.length > 0 || d.people.length > 0;
const setAudience = (id: string, d: z.output<typeof audienceSchema>) =>
  sql`select memory_set_audience(${id}, ${d.visibility}, ${`{${d.circles.join(",")}}`}::text[], ${`{${[...new Set(d.people)].join(",")}}`}::uuid[])`;

export async function setMemoryAudience(userId: string, entryId: string, input: unknown) {
  const id = uuid.parse(entryId);
  const d = audienceSchema.parse(input);
  if (!chosen(d)) throw invalid("choose_audience");
  await withUser(userId, async (tx) => {
    try {
      await tx.execute(setAudience(id, d));
    } catch (e) {
      mapDbError(e);
    }
    await audit(tx, userId, `memory.audience_${d.visibility}`, "memory_entry", id);
  });
}

/** The same audience for many records at once (the privacy page's bulk change). */
export async function setMemoriesAudience(userId: string, entryIds: string[], input: unknown) {
  const ids = z.array(uuid).min(1).max(200).parse(entryIds);
  const d = audienceSchema.parse(input);
  if (!chosen(d)) throw invalid("choose_audience");
  await withUser(userId, async (tx) => {
    for (const id of ids) {
      try {
        await tx.execute(setAudience(id, d));
      } catch (e) {
        mapDbError(e);
      }
      await audit(tx, userId, `memory.audience_${d.visibility}`, "memory_entry", id);
    }
  });
}

export interface ShareTarget {
  sessionId: string;
  /** Their user id (to choose them as a reader). */
  otherId: string;
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
    return { sessionId: c.id, otherId: c.otherId!, name: c.otherName, personId: c.personId, circle: (MEMORY_CIRCLES as readonly string[]).includes(r ?? "") ? (r as Circle) : null };
  });
}

/** How many of my records a connection can read now (for the person page): to everyone, to their relationship, or to them by name. */
export async function visibleCount(userId: string, circle: Circle | null, otherId: string | null = null): Promise<number> {
  return withUser(userId, async (tx) => {
    const r = await tx.execute<{ n: number }>(sql`
      select count(*)::int as n from ${memoryEntries} e
      where e.user_id = ${userId} and e.kind <> 'letter_to_future'
        and (e.visibility = 'connections'
             or (e.visibility = 'circles' and ${circle}::text is not null
                 and exists (select 1 from ${memoryCircles} mc where mc.entry_id = e.id and mc.circle = ${circle}))
             or (e.visibility = 'circles' and ${otherId}::uuid is not null
                 and exists (select 1 from ${memoryAudiencePeople} ap where ap.entry_id = e.id and ap.user_id = ${otherId}::uuid)))`);
    return r.rows[0]?.n ?? 0;
  });
}

/** My latest records shared with everyone I'm connected with (what any connection sees; for the preview). */
export async function sharedWithEveryone(userId: string, n = 3) {
  return withUser(userId, (tx) =>
    tx
      .select({ id: memoryEntries.id, kind: memoryEntries.kind, title: memoryEntryVersions.title, body: memoryEntryVersions.body, occurredOn: memoryEntries.occurredOn, createdAt: memoryEntries.createdAt })
      .from(memoryEntries)
      .innerJoin(memoryEntryVersions, and(eq(memoryEntryVersions.entryId, memoryEntries.id), eq(memoryEntryVersions.version, memoryEntries.currentVersion)))
      .where(and(eq(memoryEntries.userId, userId), eq(memoryEntries.visibility, "connections"), sql`${memoryEntries.kind} <> 'letter_to_future'`))
      .orderBy(sql`coalesce(${memoryEntries.occurredOn}, ${memoryEntries.createdAt}::date) desc`, sql`${memoryEntries.createdAt} desc`)
      .limit(n),
  );
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

/** My record on the timeline; `names` (user id → name) names the people chosen to see it. */
export const mineToEntry = (m: MemorySummary, names: Map<string, string> = new Map()): TimelineEntry => ({
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
  readers: m.audience.map((id) => names.get(id)).filter((x): x is string => !!x),
  version: m.version,
  tags: m.tags,
  people: m.people,
  labels: m.labels,
  feeling: m.feeling,
  fromGift: m.fromGift,
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
export async function feedForPage(userId: string, page: { previousOldest: string | null; oldest: string | null; first: boolean; last: boolean; today: string }) {
  return connectionFeed(userId, { after: page.last ? null : page.oldest, upto: page.first ? page.today : page.previousOldest, limit: 100 });
}

/**
 * Records dated after today, mine and theirs, soonest first ("ahead" of the timeline). Kept out
 * of the timeline until their day comes, then they sit on it like any other.
 */
export async function aheadTimeline(userId: string, today: string): Promise<TimelineEntry[]> {
  const names = new Map((await shareTargets(userId)).map((x) => [x.otherId, x.name]));
  const mine = (await listMemories(userId, { when: "future", limit: 100 })).map((m) => mineToEntry(m, names));
  const theirs = (await connectionFeed(userId, { after: today, limit: 100 })).map(feedToEntry);
  const day = (e: TimelineEntry) => timelineDay(e) ?? e.createdAt.toISOString().slice(0, 10);
  return [...mine, ...theirs].sort((a, b) => (day(a) === day(b) ? a.createdAt.getTime() - b.createdAt.getTime() : day(a) < day(b) ? -1 : 1));
}

/** The newest few, mine and theirs together (Home). */
export async function recentTimeline(userId: string, today: string, n = 6): Promise<TimelineEntry[]> {
  const names = new Map((await shareTargets(userId)).map((x) => [x.otherId, x.name]));
  const mine = (await listMemories(userId, { when: "past", limit: n })).map((m) => mineToEntry(m, names));
  const theirs = (await connectionFeed(userId, { upto: today, limit: n })).map(feedToEntry);
  // Newest by the day each sits on (an opened letter counts from its opening day), then by time written.
  const day = (e: TimelineEntry) => timelineDay(e) ?? e.createdAt.toISOString().slice(0, 10);
  return [...mine, ...theirs].sort((a, b) => (day(a) === day(b) ? b.createdAt.getTime() - a.createdAt.getTime() : day(a) < day(b) ? 1 : -1)).slice(0, n);
}
