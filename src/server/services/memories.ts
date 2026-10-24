import { and, asc, desc, eq, inArray, lte, gte, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { escapeLike, isoDate, optionalDate, optionalText, tagList, todayIn, uuid } from "@/lib/validation/common";
import { MEMORY_CIRCLES, MEMORY_KINDS, memoryCircles, memoryEntries, memoryEntryVersions, memoryPeople, memoryTags, people, profiles } from "../db/schema";
import { withUser, type Tx } from "../db/tx";
import { invalid, notFound } from "../errors";

export const memoryInput = z.object({
  kind: z.enum(MEMORY_KINDS).default("thought"),
  title: optionalText(200),
  body: z.string().trim().min(1).max(20_000),
  reason: optionalText(5_000),
  mood: z.preprocess((v) => (v === "" || v === null ? undefined : v), z.coerce.number().int().min(1).max(5).optional()),
  occurredOn: optionalDate,
  revealOn: optionalDate,
  tags: tagList.default([]),
  personIds: z.array(uuid).max(20).default([]),
});
export type MemoryInput = z.input<typeof memoryInput>;

async function assertPeopleOwned(tx: Tx, userId: string, personIds: string[]) {
  if (personIds.length === 0) return;
  const found = await tx
    .select({ id: people.id })
    .from(people)
    .where(and(eq(people.userId, userId), inArray(people.id, personIds)));
  if (found.length !== new Set(personIds).size) throw invalid("unknown_person");
}

async function replaceLinks(tx: Tx, userId: string, entryId: string, tags: string[], personIds: string[]) {
  await tx.delete(memoryTags).where(and(eq(memoryTags.entryId, entryId), eq(memoryTags.userId, userId)));
  await tx.delete(memoryPeople).where(and(eq(memoryPeople.entryId, entryId), eq(memoryPeople.userId, userId)));
  if (tags.length) await tx.insert(memoryTags).values(tags.map((tag) => ({ entryId, userId, tag })));
  if (personIds.length)
    await tx.insert(memoryPeople).values([...new Set(personIds)].map((personId) => ({ entryId, userId, personId })));
}

function validateKindFields(data: z.output<typeof memoryInput>) {
  if (data.kind === "letter_to_future" && !data.revealOn) throw invalid("reveal_date_required");
  if (data.kind !== "letter_to_future" && data.revealOn) throw invalid("reveal_date_only_for_letters");
}

export async function createMemory(userId: string, input: unknown) {
  const data = memoryInput.parse(input);
  validateKindFields(data);
  return withUser(userId, async (tx) => {
    await assertPeopleOwned(tx, userId, data.personIds);
    const [entry] = await tx
      .insert(memoryEntries)
      .values({ userId, kind: data.kind, occurredOn: data.occurredOn ?? null, revealOn: data.revealOn ?? null })
      .returning();
    await tx.insert(memoryEntryVersions).values({
      entryId: entry!.id,
      userId,
      version: 1,
      title: data.title ?? null,
      body: data.body,
      reason: data.reason ?? null,
      mood: data.mood ?? null,
    });
    await replaceLinks(tx, userId, entry!.id, data.tags, data.personIds);
    return entry!.id;
  });
}

/**
 * Editing never overwrites: it appends version N+1 and keeps every earlier version
 * so the user can see how their words changed. Tags/people/dates are current metadata.
 */
export async function editMemory(userId: string, entryId: string, input: unknown) {
  const id = uuid.parse(entryId);
  const data = memoryInput.parse(input);
  validateKindFields(data);
  return withUser(userId, async (tx) => {
    const [entry] = await tx
      .select()
      .from(memoryEntries)
      .where(and(eq(memoryEntries.id, id), eq(memoryEntries.userId, userId)))
      .for("update");
    if (!entry) throw notFound();
    if (entry.kind !== data.kind && (entry.kind === "letter_to_future" || data.kind === "letter_to_future")) {
      throw invalid("cannot_change_letter_kind");
    }
    await assertPeopleOwned(tx, userId, data.personIds);
    const [current] = await tx
      .select()
      .from(memoryEntryVersions)
      .where(and(eq(memoryEntryVersions.entryId, id), eq(memoryEntryVersions.version, entry.currentVersion)));
    const contentChanged =
      !current ||
      current.body !== data.body ||
      (current.title ?? null) !== (data.title ?? null) ||
      (current.reason ?? null) !== (data.reason ?? null) ||
      (current.mood ?? null) !== (data.mood ?? current.mood ?? null);
    let version = entry.currentVersion;
    if (contentChanged) {
      version += 1;
      await tx.insert(memoryEntryVersions).values({
        entryId: id,
        userId,
        version,
        title: data.title ?? null,
        body: data.body,
        reason: data.reason ?? null,
        // Mood is no longer asked for: keep what an older version had.
        mood: data.mood ?? current?.mood ?? null,
      });
    }
    await tx
      .update(memoryEntries)
      .set({
        kind: data.kind,
        occurredOn: data.occurredOn ?? null,
        revealOn: data.revealOn ?? null,
        currentVersion: version,
        updatedAt: new Date(),
      })
      .where(eq(memoryEntries.id, id));
    await replaceLinks(tx, userId, id, data.tags, data.personIds);
    return { version, contentChanged };
  });
}

/** Permanent deletion of an entry and all its versions. */
export async function deleteMemory(userId: string, entryId: string) {
  const id = uuid.parse(entryId);
  await withUser(userId, async (tx) => {
    const r = await tx
      .delete(memoryEntries)
      .where(and(eq(memoryEntries.id, id), eq(memoryEntries.userId, userId)))
      .returning({ id: memoryEntries.id });
    if (r.length === 0) throw notFound();
  });
}

async function userToday(tx: Tx, userId: string) {
  const [p] = await tx.select({ tz: profiles.timeZone }).from(profiles).where(eq(profiles.userId, userId));
  return todayIn(p?.tz ?? "UTC");
}

export interface MemorySummary {
  id: string;
  kind: (typeof MEMORY_KINDS)[number];
  occurredOn: string | null;
  revealOn: string | null;
  sealed: boolean;
  /** The day it sits on in the timeline (an opened letter: its opening day). */
  timelineOn: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  title: string | null;
  body: string | null;
  mood: number | null;
  tags: string[];
  people: { id: string; nickname: string }[];
  /** Who else may read it: private, connections (everyone you're connected with) or circles (by relationship). */
  visibility: "private" | "connections" | "circles";
  /** For "circles": the relationships it is shown to. */
  circles: (typeof MEMORY_CIRCLES)[number][];
}

export const memoryFilters = z.object({
  q: optionalText(200),
  kind: z.preprocess((v) => (v === "" ? undefined : v), z.enum(MEMORY_KINDS).optional()),
  tag: optionalText(40),
  personId: z.preprocess((v) => (v === "" ? undefined : v), uuid.optional()),
  from: optionalDate,
  to: optionalDate,
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
});

/** Effective timeline date: when it happened, else when it was written. */
const effectiveDate = sql<string>`coalesce(${memoryEntries.occurredOn}, (${memoryEntries.createdAt} at time zone 'UTC')::date)`;
/** Where a record sits on the timeline: a letter to the future, once opened, on the day it opened. */
const timelineDate = (today: string) =>
  sql<string>`case when ${memoryEntries.kind} = 'letter_to_future' and ${memoryEntries.revealOn} <= ${today}::date then ${memoryEntries.revealOn} else ${effectiveDate} end`;

export async function listMemories(userId: string, filters: unknown = {}): Promise<MemorySummary[]> {
  const f = memoryFilters.parse(filters);
  return withUser(userId, async (tx) => {
    const today = await userToday(tx, userId);
    const conds: SQL[] = [eq(memoryEntries.userId, userId)];
    if (f.kind) conds.push(eq(memoryEntries.kind, f.kind));
    const onTimeline = timelineDate(today);
    if (f.from) conds.push(gte(onTimeline, f.from));
    if (f.to) conds.push(lte(onTimeline, f.to));
    if (f.tag) {
      conds.push(
        sql`exists (select 1 from ${memoryTags} where ${memoryTags.entryId} = ${memoryEntries.id} and ${memoryTags.tag} = ${f.tag.toLowerCase()})`,
      );
    }
    if (f.personId) {
      conds.push(
        sql`exists (select 1 from ${memoryPeople} where ${memoryPeople.entryId} = ${memoryEntries.id} and ${memoryPeople.personId} = ${f.personId})`,
      );
    }
    if (f.q) {
      const pattern = `%${escapeLike(f.q)}%`;
      // Sealed letters are never searchable by content before their reveal date.
      conds.push(sql`(
        mosaic_fold(coalesce(${memoryEntryVersions.title}, '') || ' ' || ${memoryEntryVersions.body}) like mosaic_fold(${pattern})
        or exists (select 1 from ${memoryTags} where ${memoryTags.entryId} = ${memoryEntries.id} and mosaic_fold(${memoryTags.tag}) like mosaic_fold(${pattern}))
      ) and (${memoryEntries.revealOn} is null or ${memoryEntries.revealOn} <= ${today})`);
    }
    const rows = await tx
      .select({ e: memoryEntries, v: memoryEntryVersions })
      .from(memoryEntries)
      .innerJoin(
        memoryEntryVersions,
        and(eq(memoryEntryVersions.entryId, memoryEntries.id), eq(memoryEntryVersions.version, memoryEntries.currentVersion)),
      )
      .where(and(...conds))
      .orderBy(desc(onTimeline), desc(memoryEntries.createdAt))
      .limit(f.limit)
      .offset(f.offset);
    return hydrate(tx, rows, today);
  });
}

async function hydrate(
  tx: Tx,
  rows: { e: typeof memoryEntries.$inferSelect; v: typeof memoryEntryVersions.$inferSelect }[],
  today: string,
): Promise<MemorySummary[]> {
  const ids = rows.map((r) => r.e.id);
  const tagRows = ids.length ? await tx.select().from(memoryTags).where(inArray(memoryTags.entryId, ids)) : [];
  const personRows = ids.length
    ? await tx
        .select({ entryId: memoryPeople.entryId, id: people.id, nickname: people.nickname })
        .from(memoryPeople)
        .innerJoin(people, eq(people.id, memoryPeople.personId))
        .where(inArray(memoryPeople.entryId, ids))
    : [];
  const circleRows = ids.length ? await tx.select().from(memoryCircles).where(inArray(memoryCircles.entryId, ids)) : [];
  return rows.map(({ e, v }) => {
    const sealed = e.revealOn !== null && e.revealOn > today;
    return {
      id: e.id,
      kind: e.kind as MemorySummary["kind"],
      occurredOn: e.occurredOn,
      revealOn: e.revealOn,
      sealed,
      timelineOn: e.kind === "letter_to_future" && e.revealOn && !sealed ? e.revealOn : (e.occurredOn ?? e.createdAt.toISOString().slice(0, 10)),
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
      version: e.currentVersion,
      title: sealed ? null : v.title,
      body: sealed ? null : v.body,
      mood: sealed ? null : v.mood,
      tags: tagRows.filter((t) => t.entryId === e.id).map((t) => t.tag).sort(),
      people: personRows.filter((p) => p.entryId === e.id).map(({ id, nickname }) => ({ id, nickname })),
      visibility: e.visibility as MemorySummary["visibility"],
      circles: MEMORY_CIRCLES.filter((c) => circleRows.some((r) => r.entryId === e.id && r.circle === c)),
    };
  });
}

export async function getMemory(userId: string, entryId: string) {
  const id = uuid.parse(entryId);
  return withUser(userId, async (tx) => {
    const today = await userToday(tx, userId);
    const rows = await tx
      .select({ e: memoryEntries, v: memoryEntryVersions })
      .from(memoryEntries)
      .innerJoin(
        memoryEntryVersions,
        and(eq(memoryEntryVersions.entryId, memoryEntries.id), eq(memoryEntryVersions.version, memoryEntries.currentVersion)),
      )
      .where(and(eq(memoryEntries.id, id), eq(memoryEntries.userId, userId)));
    if (rows.length === 0) throw notFound();
    const [summary] = await hydrate(tx, rows, today);
    const versions = summary!.sealed
      ? []
      : await tx
          .select()
          .from(memoryEntryVersions)
          .where(eq(memoryEntryVersions.entryId, id))
          .orderBy(asc(memoryEntryVersions.version));
    return { ...summary!, reason: summary!.sealed ? null : rows[0]!.v.reason, versions };
  });
}

export async function listTags(userId: string) {
  return withUser(userId, async (tx) => {
    const r = await tx
      .select({ tag: memoryTags.tag, n: sql<number>`count(*)::int` })
      .from(memoryTags)
      .where(eq(memoryTags.userId, userId))
      .groupBy(memoryTags.tag)
      .orderBy(desc(sql`count(*)`), asc(memoryTags.tag));
    return r;
  });
}


/** How many memories fall in each date range (by their timeline date), in one query. */
export async function countMemoriesInRanges(userId: string, ranges: { from: string; to: string }[]): Promise<number[]> {
  const valid = z.array(z.object({ from: isoDate, to: isoDate })).max(24).parse(ranges);
  if (valid.length === 0) return [];
  return withUser(userId, async (tx) => {
    const cols = valid.map(
      (r, i) => sql`count(*) filter (where ${effectiveDate} between ${r.from}::date and ${r.to}::date) as ${sql.raw(`c${i}`)}`,
    );
    const res = await tx.execute<Record<string, string>>(
      sql`select ${sql.join(cols, sql`, `)} from ${memoryEntries} where ${memoryEntries.userId} = ${userId}`,
    );
    const row = res.rows[0] ?? {};
    return valid.map((_, i) => Number(row[`c${i}`] ?? 0));
  });
}
