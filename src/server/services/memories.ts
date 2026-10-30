import { and, asc, desc, eq, inArray, lte, gte, sql, type SQL } from "drizzle-orm";
import type { GiftOrigin } from "@/lib/timeline";
import { z } from "zod";
import { escapeLike, isoDate, optionalDate, optionalText, tagList, todayIn, uuid } from "@/lib/validation/common";
import { MEMORY_CIRCLES, MEMORY_KINDS, memoryCircles, memoryEntries, memoryEntryVersions, memoryPeople, memoryTagNotes, memoryTags, people, profiles } from "../db/schema";
import { mergeTags, normalizeTag, tagKey } from "@/lib/tags";
import { withUser, type Tx } from "../db/tx";
import { invalid, notFound } from "../errors";
import { attachMedia, MAX_MEDIA } from "./media";
import { FEELINGS, inferLabels, kindOf, LABELS, type Feeling, type Label } from "@/lib/labels";

export const memoryInput = z.object({
  kind: z.enum(MEMORY_KINDS).default("note"),
  title: optionalText(200),
  // May be empty when the record is photos or videos.
  body: z.string().trim().max(20_000).default(""),
  reason: optionalText(5_000),
  mood: z.preprocess((v) => (v === "" || v === null ? undefined : v), z.coerce.number().int().min(1).max(5).optional()),
  occurredOn: optionalDate,
  revealOn: optionalDate,
  tags: tagList.default([]),
  personIds: z.array(uuid).max(20).default([]),
  /** Photos and videos, in order; left out = unchanged (on edit). */
  media: z.array(uuid).max(MAX_MEDIA).optional(),
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

function validateKindFields(data: z.output<typeof memoryInput>, hadMedia = false) {
  if (!data.body && !(data.media ? data.media.length : hadMedia)) throw invalid("empty_record");
  if (data.kind === "letter_to_future" && data.media?.length) throw invalid("invalid_media");
  if (data.kind === "letter_to_future" && !data.revealOn) throw invalid("reveal_date_required");
  if (data.kind !== "letter_to_future" && data.revealOn) throw invalid("reveal_date_only_for_letters");
}

export async function createMemory(userId: string, input: unknown) {
  const data = memoryInput.parse(input);
  validateKindFields(data);
  return withUser(userId, async (tx) => {
    await assertPeopleOwned(tx, userId, data.personIds);
    // A post's labels are read from its words; its kind (kept for older readers) is the first.
    const letter = data.kind === "letter_to_future";
    const labels = letter ? [] : withAsked(data.kind, inferLabels(`${data.title ?? ""}\n${data.body}`, { hasMedia: !!data.media?.length }));
    const [entry] = await tx
      .insert(memoryEntries)
      .values({ userId, kind: letter ? data.kind : kindOf(labels), labels, occurredOn: data.occurredOn ?? null, revealOn: data.revealOn ?? null })
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
    // "#tag" in the text is a tag too.
    await replaceLinks(tx, userId, entry!.id, mergeTags(data.tags, `${data.title ?? ""}\n${data.body}`), data.personIds);
    if (data.media?.length) await attachMedia(tx, entry!.id, data.media);
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
  return withUser(userId, async (tx) => {
    const [entry] = await tx
      .select()
      .from(memoryEntries)
      .where(and(eq(memoryEntries.id, id), eq(memoryEntries.userId, userId)))
      .for("update");
    if (!entry) throw notFound();
    // Text may be emptied only when the record keeps photos or videos.
    const hadMedia = data.media === undefined && !data.body ? ((await tx.execute<{ n: number }>(sql`select count(*)::int as n from memory_media_for(${`{${id}}`}::uuid[])`)).rows[0]?.n ?? 0) > 0 : false;
    validateKindFields(data, hadMedia);
    if ((entry.kind === "letter_to_future") !== (data.kind === "letter_to_future")) {
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
    // Labels the owner set stay; read ones are read again from the new words.
    const letter = entry.kind === "letter_to_future";
    const labels = letter ? [] : entry.labelsBy === "user" ? (entry.labels as Label[]) : withAsked(data.kind, inferLabels(`${data.title ?? ""}\n${data.body}`, { hasMedia: data.media ? data.media.length > 0 : hadMedia || (await hasMedia(tx, id)) }));
    await tx
      .update(memoryEntries)
      .set({
        kind: letter ? entry.kind : kindOf(labels),
        labels,
        occurredOn: data.occurredOn ?? null,
        revealOn: data.revealOn ?? null,
        currentVersion: version,
        updatedAt: new Date(),
      })
      .where(eq(memoryEntries.id, id));
    await replaceLinks(tx, userId, id, mergeTags(data.tags, `${data.title ?? ""}\n${data.body}`), data.personIds);
    if (data.media !== undefined) await attachMedia(tx, id, data.media);
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
  return todayIn(await userZone(tx, userId));
}

async function userZone(tx: Tx, userId: string) {
  const [p] = await tx.select({ tz: profiles.timeZone }).from(profiles).where(eq(profiles.userId, userId));
  return p?.tz ?? "UTC";
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
  labels: Label[];
  labelsBy: "auto" | "user";
  feeling: Feeling | null;
  /** Received from a gift box (see migration 0081). */
  fromGift: GiftOrigin | null;
}

export const memoryFilters = z.object({
  q: optionalText(200),
  kind: z.preprocess((v) => (v === "" ? undefined : v), z.enum(MEMORY_KINDS).optional()),
  tag: optionalText(40),
  personId: z.preprocess((v) => (v === "" ? undefined : v), uuid.optional()),
  from: optionalDate,
  to: optionalDate,
  /** shared: shown to anyone else; private: only you (letters, always private, are left out of both unless `letters`). */
  audience: z.preprocess((v) => (v === "" ? undefined : v), z.enum(["shared", "private"]).optional()),
  /** With audience "private": keep letters to the future too (the own timeline, kept as a diary). */
  letters: z.boolean().default(false),
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
    if (f.kind) conds.push(f.kind === "letter_to_future" || f.kind === "note" ? eq(memoryEntries.kind, f.kind) : sql`${f.kind} = any(${memoryEntries.labels})`);
    const onTimeline = timelineDate(today);
    if (f.audience) {
      if (!(f.letters && f.audience === "private")) conds.push(sql`${memoryEntries.kind} <> 'letter_to_future'`);
      conds.push(f.audience === "shared" ? sql`${memoryEntries.visibility} <> 'private'` : eq(memoryEntries.visibility, "private"));
    }
    if (f.from) conds.push(gte(onTimeline, f.from));
    if (f.to) conds.push(lte(onTimeline, f.to));
    if (f.tag) {
      conds.push(
        sql`exists (select 1 from ${memoryTags} where ${memoryTags.entryId} = ${memoryEntries.id} and ${memoryTags.tag} = ${normalizeTag(f.tag)})`,
      );
    }
    if (f.personId) {
      conds.push(
        sql`exists (select 1 from ${memoryPeople} where ${memoryPeople.entryId} = ${memoryEntries.id} and ${memoryPeople.personId} = ${f.personId})`,
      );
    }
    if (f.q && /^[#＃]/.test(f.q.trim())) {
      // "#…": tags only, loosely (kana, width, accents): my tags that match, then their records.
      const key = tagKey(f.q);
      const mine = await tx.selectDistinct({ tag: memoryTags.tag }).from(memoryTags).where(eq(memoryTags.userId, userId));
      const hits = mine.map((x) => x.tag).filter((tag) => tagKey(tag).includes(key));
      conds.push(hits.length ? sql`exists (select 1 from ${memoryTags} where ${memoryTags.entryId} = ${memoryEntries.id} and ${inArray(memoryTags.tag, hits)})` : sql`false`);
    } else if (f.q) {
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

/** Letters to the future still sealed, soonest first: only when each was written and when it opens. */
export async function sealedLetters(userId: string): Promise<{ id: string; writtenOn: string; revealOn: string }[]> {
  return withUser(userId, async (tx) => {
    const tz = await userZone(tx, userId);
    const today = todayIn(tz);
    const rows = await tx
      .select({ id: memoryEntries.id, createdAt: memoryEntries.createdAt, revealOn: memoryEntries.revealOn })
      .from(memoryEntries)
      .where(and(eq(memoryEntries.userId, userId), eq(memoryEntries.kind, "letter_to_future"), sql`${memoryEntries.revealOn} > ${today}::date`))
      .orderBy(memoryEntries.revealOn);
    return rows.map((r) => ({ id: r.id, writtenOn: todayIn(tz, r.createdAt), revealOn: r.revealOn! }));
  });
}

/** Letters that have opened and not been read yet, newest first (Home announces them until read). */
export async function arrivedLetters(userId: string): Promise<{ id: string; writtenOn: string; revealOn: string }[]> {
  return withUser(userId, async (tx) => {
    const tz = await userZone(tx, userId);
    const today = todayIn(tz);
    const rows = await tx
      .select({ id: memoryEntries.id, createdAt: memoryEntries.createdAt, revealOn: memoryEntries.revealOn })
      .from(memoryEntries)
      .where(
        and(
          eq(memoryEntries.userId, userId),
          eq(memoryEntries.kind, "letter_to_future"),
          sql`${memoryEntries.revealOn} <= ${today}::date and ${memoryEntries.letterReadAt} is null`,
        ),
      )
      .orderBy(desc(memoryEntries.revealOn), desc(memoryEntries.createdAt));
    return rows.map((r) => ({ id: r.id, writtenOn: todayIn(tz, r.createdAt), revealOn: r.revealOn! }));
  });
}

/** The owner has read an opened letter: Home stops announcing it. */
export async function markLetterRead(userId: string, entryId: string) {
  await withUser(userId, async (tx) => {
    const today = await userToday(tx, userId);
    await tx
      .update(memoryEntries)
      .set({ letterReadAt: new Date() })
      .where(
        and(
          eq(memoryEntries.id, entryId),
          eq(memoryEntries.userId, userId),
          eq(memoryEntries.kind, "letter_to_future"),
          sql`${memoryEntries.revealOn} <= ${today}::date and ${memoryEntries.letterReadAt} is null`,
        ),
      );
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
      labels: sealed ? [] : (e.labels as Label[]),
      labelsBy: e.labelsBy as "auto" | "user",
      feeling: sealed ? null : (e.feeling as Feeling | null),
      fromGift: e.fromKind ? { label: e.fromLabel, role: e.fromRole, kind: e.fromKind as GiftOrigin["kind"] } : null,
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

/** My tags, most used first, with when each was last used (its latest record's timeline date). */
export async function listTags(userId: string): Promise<{ tag: string; n: number; last: string }[]> {
  return withUser(userId, async (tx) => {
    const r = await tx
      .select({ tag: memoryTags.tag, n: sql<number>`count(*)::int`, last: sql<string>`max(${effectiveDate})::text` })
      .from(memoryTags)
      .innerJoin(memoryEntries, eq(memoryEntries.id, memoryTags.entryId))
      .where(eq(memoryTags.userId, userId))
      .groupBy(memoryTags.tag)
      .orderBy(desc(sql`count(*)`), asc(memoryTags.tag));
    return r;
  });
}

export interface TagDetail {
  tag: string;
  n: number;
  /** Timeline dates of the first and the latest record with it. */
  first: string | null;
  last: string | null;
  feelings: Partial<Record<Feeling, number>>;
  note: string | null;
}

/** One tag of mine: how much, over what time, with which feelings, and my note on it. */
export async function tagDetail(userId: string, raw: string): Promise<TagDetail> {
  const tag = normalizeTag(raw);
  return withUser(userId, async (tx) => {
    const rows = await tx
      .select({ date: sql<string>`${effectiveDate}::text`, feeling: memoryEntries.feeling })
      .from(memoryTags)
      .innerJoin(memoryEntries, eq(memoryEntries.id, memoryTags.entryId))
      .where(and(eq(memoryTags.userId, userId), eq(memoryTags.tag, tag)));
    const [note] = await tx.select({ note: memoryTagNotes.note }).from(memoryTagNotes).where(and(eq(memoryTagNotes.userId, userId), eq(memoryTagNotes.tag, tag)));
    const dates = rows.map((r) => r.date).sort();
    const feelings: Partial<Record<Feeling, number>> = {};
    for (const r of rows) if (r.feeling) feelings[r.feeling as Feeling] = (feelings[r.feeling as Feeling] ?? 0) + 1;
    return { tag, n: rows.length, first: dates[0] ?? null, last: dates.at(-1) ?? null, feelings, note: note?.note ?? null };
  });
}

/**
 * Rename a tag on every record that has it. To a tag already used, it is a merge: records with
 * both keep one, and the notes are put together. Returns the tag's new name.
 */
export async function renameTag(userId: string, rawFrom: string, rawTo: string): Promise<string> {
  const from = normalizeTag(rawFrom);
  const to = normalizeTag(rawTo);
  if (!from || !to) throw invalid("invalid_tag");
  if (from === to) return to;
  return withUser(userId, async (tx) => {
    await tx.execute(sql`
      delete from ${memoryTags} a using ${memoryTags} b
      where a.user_id = ${userId} and a.tag = ${from} and b.user_id = ${userId} and b.tag = ${to} and b.entry_id = a.entry_id`);
    await tx.update(memoryTags).set({ tag: to }).where(and(eq(memoryTags.userId, userId), eq(memoryTags.tag, from)));
    const notes = await tx.select().from(memoryTagNotes).where(and(eq(memoryTagNotes.userId, userId), inArray(memoryTagNotes.tag, [from, to])));
    const old = notes.find((x) => x.tag === from);
    if (old) {
      const kept = notes.find((x) => x.tag === to);
      await tx.delete(memoryTagNotes).where(and(eq(memoryTagNotes.userId, userId), eq(memoryTagNotes.tag, from)));
      const note = (kept ? `${kept.note}\n${old.note}` : old.note).slice(0, 1000);
      await tx.insert(memoryTagNotes).values({ userId, tag: to, note }).onConflictDoUpdate({ target: [memoryTagNotes.userId, memoryTagNotes.tag], set: { note, updatedAt: new Date() } });
    }
    return to;
  });
}

/** Take a tag off every record (the records stay), with its note. */
export async function deleteTag(userId: string, raw: string) {
  const tag = normalizeTag(raw);
  await withUser(userId, async (tx) => {
    await tx.delete(memoryTags).where(and(eq(memoryTags.userId, userId), eq(memoryTags.tag, tag)));
    await tx.delete(memoryTagNotes).where(and(eq(memoryTagNotes.userId, userId), eq(memoryTagNotes.tag, tag)));
  });
}

/** My note on a tag; empty removes it. */
export async function setTagNote(userId: string, raw: string, rawNote: unknown) {
  const tag = normalizeTag(raw);
  const note = z.string().trim().max(1000).parse(rawNote ?? "");
  if (!tag) throw invalid("invalid_tag");
  await withUser(userId, async (tx) => {
    if (!note) await tx.delete(memoryTagNotes).where(and(eq(memoryTagNotes.userId, userId), eq(memoryTagNotes.tag, tag)));
    else await tx.insert(memoryTagNotes).values({ userId, tag, note }).onConflictDoUpdate({ target: [memoryTagNotes.userId, memoryTagNotes.tag], set: { note, updatedAt: new Date() } });
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

/** A label asked for by the caller (an import, a test persona) comes first. */
function withAsked(kind: string, read: Label[]): Label[] {
  // "note" is what the form says when nothing was chosen: the words decide.
  if (kind === "note" || !(LABELS as readonly string[]).includes(kind)) return read;
  return [...new Set([kind as Label, ...read.filter((l) => l !== "note")])];
}

async function hasMedia(tx: Tx, id: string) {
  return ((await tx.execute<{ n: number }>(sql`select count(*)::int as n from memory_media_for(${`{${id}}`}::uuid[])`)).rows[0]?.n ?? 0) > 0;
}

/** The owner confirms or corrects what a post is about; from then on it is theirs. */
export async function setMemoryLabels(userId: string, entryId: string, input: unknown) {
  const id = uuid.parse(entryId);
  const labels = [...new Set(z.array(z.enum(LABELS)).max(LABELS.length).parse(input))];
  await withUser(userId, async (tx) => {
    const r = await tx
      .update(memoryEntries)
      .set({ labels, labelsBy: "user", kind: kindOf(labels) })
      .where(and(eq(memoryEntries.id, id), eq(memoryEntries.userId, userId), sql`${memoryEntries.kind} <> 'letter_to_future'`))
      .returning({ id: memoryEntries.id });
    if (!r.length) throw notFound();
  });
}

/** How they felt (the optional question after posting); null clears it. */
export async function setMemoryFeeling(userId: string, entryId: string, feeling: unknown) {
  const id = uuid.parse(entryId);
  const f = z.enum(FEELINGS).nullable().parse(feeling === "" ? null : feeling) as Feeling | null;
  await withUser(userId, async (tx) => {
    const r = await tx.update(memoryEntries).set({ feeling: f }).where(and(eq(memoryEntries.id, id), eq(memoryEntries.userId, userId))).returning({ id: memoryEntries.id });
    if (!r.length) throw notFound();
  });
}
