import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { AGE_BANDS, GENDERS } from "@/content/gift-general";
import { optionalDate, optionalText, todayIn, uuid } from "@/lib/validation/common";
import {
  giftRecords,
  importantDates,
  INFO_SOURCES,
  notificationPreferences,
  people,
  PREFERENCE_SENTIMENTS,
  preferenceCategories,
  preferenceItems,
  preferenceValues,
  profiles,
  relationshipEntries,
  relationshipEvents,
} from "../db/schema";
import { withAnon, withUser, type Tx } from "../db/tx";
import { AppError, invalid, notFound } from "../errors";
import { audit } from "./audit";

const RELATIONSHIPS = ["partner", "family", "friend", "colleague", "other"] as const;

export const personSchema = z.object({
  nickname: z.string().trim().min(1).max(80),
  relationship: z.enum(RELATIONSHIPS).default("other"),
  note: optionalText(4000),
  // Left out = unchanged; "" = cleared.
  ageBand: z.union([z.literal(""), z.enum(AGE_BANDS)]).optional(),
  gender: z.union([z.literal(""), z.enum(GENDERS)]).optional(),
});

/** The optional gift-idea basics, as columns to set (only those the form sent). */
function basics(d: z.infer<typeof personSchema>) {
  return {
    ...(d.ageBand !== undefined ? { ageBand: d.ageBand || null } : {}),
    ...(d.gender !== undefined ? { gender: d.gender || null } : {}),
  };
}

async function ownPerson(tx: Tx, userId: string, personId: string) {
  const [p] = await tx
    .select()
    .from(people)
    .where(and(eq(people.id, uuid.parse(personId)), eq(people.userId, userId)));
  if (!p) throw notFound();
  return p;
}

export async function createPerson(userId: string, input: unknown) {
  const d = personSchema.parse(input);
  return withUser(userId, async (tx) => {
    const [p] = await tx.insert(people).values({ userId, nickname: d.nickname, relationship: d.relationship, note: d.note ?? null, ...basics(d) }).returning();
    return p!.id;
  });
}

export async function updatePerson(userId: string, personId: string, input: unknown) {
  const d = personSchema.parse(input);
  await withUser(userId, async (tx) => {
    await ownPerson(tx, userId, personId);
    await tx
      .update(people)
      .set({ nickname: d.nickname, relationship: d.relationship, note: d.note ?? null, ...basics(d), updatedAt: new Date() })
      .where(eq(people.id, personId));
  });
}

/** Just the age group and gender (from the gift ideas form). */
export async function setGiftBasics(userId: string, personId: string, input: unknown) {
  const d = personSchema.pick({ ageBand: true, gender: true }).parse(input);
  const set = basics(d as z.infer<typeof personSchema>);
  if (!Object.keys(set).length) return;
  await withUser(userId, async (tx) => {
    await ownPerson(tx, userId, personId);
    await tx.update(people).set({ ...set, updatedAt: new Date() }).where(eq(people.id, personId));
  });
}

/** Deletes the person and every note, event, gift, preference and date about them. */
export async function deletePerson(userId: string, personId: string) {
  await withUser(userId, async (tx) => {
    await ownPerson(tx, userId, personId);
    await tx.delete(people).where(eq(people.id, personId));
  });
}

/**
 * Merge two entries for the same person (e.g. one written before you connected, one added from
 * the connection): everything recorded on `sourceId` — notes, events, gifts, dates, favourites,
 * the people tagged in records — moves to `targetId`, which keeps (or takes over) the
 * connection; the notes are joined, and the source entry is deleted. One transaction.
 */
export async function mergePeople(userId: string, targetId: string, sourceId: string) {
  const tid = uuid.parse(targetId);
  const sid = uuid.parse(sourceId);
  if (tid === sid) throw invalid();
  await withUser(userId, async (tx) => {
    const target = await ownPerson(tx, userId, tid);
    const source = await ownPerson(tx, userId, sid);
    if (target.connectionSessionId && source.connectionSessionId) throw new AppError("both_connected", 409);
    for (const t of ["relationship_entries", "relationship_events", "gift_records", "important_dates"]) {
      await tx.execute(sql`update ${sql.identifier(t)} set person_id = ${tid} where user_id = ${userId} and person_id = ${sid}`);
    }
    await tx.execute(sql`
      insert into memory_people (entry_id, person_id, user_id)
      select entry_id, ${tid}, user_id from memory_people where user_id = ${userId} and person_id = ${sid}
      on conflict do nothing`);
    await tx.execute(sql`delete from memory_people where user_id = ${userId} and person_id = ${sid}`);
    // Favourites: the same item on both keeps one item with both histories.
    const items = await tx.select().from(preferenceItems).where(and(eq(preferenceItems.userId, userId), eq(preferenceItems.personId, sid)));
    for (const it of items) {
      const [same] = await tx
        .select({ id: preferenceItems.id })
        .from(preferenceItems)
        .where(and(eq(preferenceItems.userId, userId), eq(preferenceItems.personId, tid), eq(preferenceItems.categoryId, it.categoryId), sql`lower(${preferenceItems.label}) = lower(${it.label})`));
      if (same) {
        await tx.update(preferenceValues).set({ itemId: same.id }).where(and(eq(preferenceValues.userId, userId), eq(preferenceValues.itemId, it.id)));
        await tx.delete(preferenceItems).where(eq(preferenceItems.id, it.id));
      } else {
        await tx.update(preferenceItems).set({ personId: tid }).where(eq(preferenceItems.id, it.id));
      }
    }
    const note = [target.note, source.note].filter((x) => x && x.trim()).join("\n\n") || null;
    const link = target.connectionSessionId ?? source.connectionSessionId;
    await tx.delete(people).where(eq(people.id, sid));
    await tx.update(people).set({ note, connectionSessionId: link, updatedAt: new Date() }).where(eq(people.id, tid));
    await audit(tx, userId, "person.merged", "person", tid);
  });
}

export async function listPeople(userId: string) {
  return withUser(userId, (tx) => tx.select().from(people).where(eq(people.userId, userId)).orderBy(asc(people.nickname)));
}

// ---------------------------------------------------------------------------
// Preferences (self when personId is null) — values are append-only history
// ---------------------------------------------------------------------------

export const preferenceSchema = z.object({
  personId: z.preprocess((v) => (v === "" ? null : v), uuid.nullable().default(null)),
  categoryId: z.string().min(1).max(40),
  label: z.string().trim().min(1).max(200),
  sentiment: z.enum(PREFERENCE_SENTIMENTS),
  source: z.enum(INFO_SOURCES),
  note: optionalText(1000),
});

/** Sources that make sense for each subject. AI suggestions are recorded only via acceptAiSuggestion. */
const SELF_SOURCES = ["self_stated"] as const;
const PERSON_SOURCES = ["person_stated", "observed", "guess", "unverified"] as const;

export async function addPreference(userId: string, input: unknown, opts: { allowAi?: boolean } = {}) {
  const d = preferenceSchema.parse(input);
  const allowed: readonly string[] = d.personId === null ? SELF_SOURCES : [...PERSON_SOURCES, ...(opts.allowAi ? ["ai_suggested"] : [])];
  if (!allowed.includes(d.source)) throw invalid("invalid_source");
  return withUser(userId, async (tx) => {
    if (d.personId) await ownPerson(tx, userId, d.personId);
    const [cat] = await tx.select().from(preferenceCategories).where(eq(preferenceCategories.id, d.categoryId));
    if (!cat) throw invalid("unknown_category");
    const [existing] = await tx
      .select()
      .from(preferenceItems)
      .where(
        and(
          eq(preferenceItems.userId, userId),
          d.personId ? eq(preferenceItems.personId, d.personId) : isNull(preferenceItems.personId),
          eq(preferenceItems.categoryId, d.categoryId),
          sql`lower(${preferenceItems.label}) = lower(${d.label})`,
        ),
      );
    const item: typeof preferenceItems.$inferSelect =
      existing ??
      (await tx
        .insert(preferenceItems)
        .values({ userId, personId: d.personId, categoryId: d.categoryId, label: d.label })
        .returning()
        .then((r) => r[0]!));
    await tx.insert(preferenceValues).values({ userId, itemId: item.id, sentiment: d.sentiment, source: d.source, note: d.note ?? null });
    return item.id;
  });
}

export interface PreferenceView {
  itemId: string;
  categoryId: string;
  label: string;
  current: { sentiment: string; source: string; note: string | null; recordedAt: Date };
  history: { sentiment: string; source: string; note: string | null; recordedAt: Date }[];
}

export async function listPreferences(userId: string, personId: string | null): Promise<PreferenceView[]> {
  return withUser(userId, async (tx) => {
    if (personId) await ownPerson(tx, userId, personId);
    return loadPreferences(tx, userId, personId);
  });
}

export async function loadPreferences(tx: Tx, userId: string, personId: string | null): Promise<PreferenceView[]> {
  const items = await tx
    .select()
    .from(preferenceItems)
    .where(and(eq(preferenceItems.userId, userId), personId ? eq(preferenceItems.personId, personId) : isNull(preferenceItems.personId)))
    .orderBy(asc(preferenceItems.categoryId), asc(preferenceItems.label));
  if (items.length === 0) return [];
  const values = await tx
    .select()
    .from(preferenceValues)
    .where(inArray(preferenceValues.itemId, items.map((i) => i.id)))
    .orderBy(desc(preferenceValues.recordedAt), desc(preferenceValues.id));
  return items.flatMap((i) => {
    const hist = values.filter((v) => v.itemId === i.id).map(({ sentiment, source, note, recordedAt }) => ({ sentiment, source, note, recordedAt }));
    return hist.length ? [{ itemId: i.id, categoryId: i.categoryId, label: i.label, current: hist[0]!, history: hist }] : [];
  });
}

/**
 * Edits a preference. Renaming or moving it changes the item; a different feeling, source or note
 * is added to its history (the earlier value stays visible as history), so nothing is lost.
 */
export async function updatePreference(userId: string, itemId: string, input: unknown) {
  const id = uuid.parse(itemId);
  const d = preferenceSchema.omit({ personId: true }).parse(input);
  await withUser(userId, async (tx) => {
    const [item] = await tx.select().from(preferenceItems).where(and(eq(preferenceItems.id, id), eq(preferenceItems.userId, userId)));
    if (!item) throw notFound();
    const allowed: readonly string[] = item.personId === null ? SELF_SOURCES : PERSON_SOURCES;
    if (!allowed.includes(d.source)) throw invalid("invalid_source");
    if (item.label !== d.label || item.categoryId !== d.categoryId) {
      const [cat] = await tx.select().from(preferenceCategories).where(eq(preferenceCategories.id, d.categoryId));
      if (!cat) throw invalid("unknown_category");
      const [clash] = await tx
        .select({ id: preferenceItems.id })
        .from(preferenceItems)
        .where(
          and(
            eq(preferenceItems.userId, userId),
            item.personId ? eq(preferenceItems.personId, item.personId) : isNull(preferenceItems.personId),
            eq(preferenceItems.categoryId, d.categoryId),
            sql`lower(${preferenceItems.label}) = lower(${d.label})`,
            sql`${preferenceItems.id} <> ${id}`,
          ),
        );
      if (clash) throw new AppError("duplicate_preference", 409);
      await tx.update(preferenceItems).set({ label: d.label, categoryId: d.categoryId }).where(eq(preferenceItems.id, id));
    }
    const [current] = await tx.select().from(preferenceValues).where(eq(preferenceValues.itemId, id)).orderBy(desc(preferenceValues.recordedAt), desc(preferenceValues.id)).limit(1);
    const note = d.note ?? null;
    if (!current || current.sentiment !== d.sentiment || current.source !== d.source || (current.note ?? null) !== note) {
      await tx.insert(preferenceValues).values({ userId, itemId: id, sentiment: d.sentiment, source: d.source, note });
    }
  });
}

export async function deletePreferenceItem(userId: string, itemId: string) {
  await withUser(userId, async (tx) => {
    const r = await tx
      .delete(preferenceItems)
      .where(and(eq(preferenceItems.id, uuid.parse(itemId)), eq(preferenceItems.userId, userId)))
      .returning({ id: preferenceItems.id });
    if (!r.length) throw notFound();
  });
}

// ---------------------------------------------------------------------------
// Relationship notes, shared events, gifts, important dates
// ---------------------------------------------------------------------------

export const entrySchema = z.object({
  kind: z.enum(["conversation", "joy", "wish_together", "note"]),
  body: z.string().trim().min(1).max(5000),
  source: z.enum(["person_stated", "observed", "guess", "unverified", "self_stated"]).default("observed"),
  occurredOn: optionalDate,
});

export async function addRelationshipEntry(userId: string, personId: string, input: unknown) {
  const d = entrySchema.parse(input);
  return withUser(userId, async (tx) => {
    await ownPerson(tx, userId, personId);
    const [r] = await tx
      .insert(relationshipEntries)
      .values({ userId, personId, kind: d.kind, body: d.body, source: d.source, occurredOn: d.occurredOn ?? null })
      .returning();
    return r!.id;
  });
}

export const eventSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: optionalText(5000),
  place: optionalText(200),
  occurredOn: optionalDate,
});

export async function addRelationshipEvent(userId: string, personId: string, input: unknown) {
  const d = eventSchema.parse(input);
  return withUser(userId, async (tx) => {
    await ownPerson(tx, userId, personId);
    const [r] = await tx
      .insert(relationshipEvents)
      .values({ userId, personId, title: d.title, description: d.description ?? null, place: d.place ?? null, occurredOn: d.occurredOn ?? null })
      .returning();
    return r!.id;
  });
}

export const giftSchema = z.object({
  item: z.string().trim().min(1).max(200),
  occasion: optionalText(120),
  givenOn: optionalDate,
  priceAmount: z.preprocess((v) => (v === "" || v === null ? undefined : v), z.coerce.number().int().min(0).max(1_000_000_000).optional()),
  priceCurrency: z.preprocess((v) => (v === "" ? undefined : v), z.string().regex(/^[A-Z]{3}$/).optional()),
  reaction: z.enum(["loved", "liked", "neutral", "disliked", "unknown"]).default("unknown"),
  note: optionalText(2000),
});

export async function addGift(userId: string, personId: string, input: unknown) {
  const d = giftSchema.parse(input);
  return withUser(userId, async (tx) => {
    await ownPerson(tx, userId, personId);
    const [r] = await tx
      .insert(giftRecords)
      .values({
        userId,
        personId,
        item: d.item,
        occasion: d.occasion ?? null,
        givenOn: d.givenOn ?? null,
        priceAmount: d.priceAmount ?? null,
        priceCurrency: d.priceCurrency ?? null,
        reaction: d.reaction,
        note: d.note ?? null,
      })
      .returning();
    return r!.id;
  });
}

export const dateSchema = z
  .object({
    personId: z.preprocess((v) => (v === "" ? null : v), uuid.nullable().default(null)),
    label: z.string().trim().min(1).max(120),
    kind: z.enum(["birthday", "anniversary", "custom"]),
    month: z.coerce.number().int().min(1).max(12),
    day: z.coerce.number().int().min(1).max(31),
    year: z.preprocess((v) => (v === "" || v === null ? undefined : v), z.coerce.number().int().min(1900).max(2200).optional()),
    remindDaysBefore: z.preprocess((v) => (v === "" || v === null ? undefined : v), z.coerce.number().int().min(0).max(60).optional()),
  })
  .refine((d) => d.day <= new Date(Date.UTC(2024, d.month, 0)).getUTCDate(), { message: "invalid_date", path: ["day"] });

export async function addImportantDate(userId: string, input: unknown) {
  const d = dateSchema.parse(input);
  return withUser(userId, async (tx) => {
    if (d.personId) await ownPerson(tx, userId, d.personId);
    const [r] = await tx
      .insert(importantDates)
      .values({
        userId,
        personId: d.personId,
        label: d.label,
        kind: d.kind,
        month: d.month,
        day: d.day,
        year: d.year ?? null,
        remindDaysBefore: d.remindDaysBefore ?? null,
      })
      .returning();
    return r!.id;
  });
}

type DeletableTable = typeof relationshipEntries | typeof relationshipEvents | typeof giftRecords | typeof importantDates;
const DELETABLE: Record<string, DeletableTable> = {
  entry: relationshipEntries,
  event: relationshipEvents,
  gift: giftRecords,
  date: importantDates,
};

export async function deletePersonRecord(userId: string, kind: string, id: string) {
  const table = DELETABLE[kind];
  if (!table) throw invalid();
  await withUser(userId, async (tx) => {
    const r = await tx
      .delete(table)
      .where(and(eq(table.id, uuid.parse(id)), eq(table.userId, userId)))
      .returning({ id: table.id });
    if (!r.length) throw notFound();
  });
}

/** Edits a note, shared event, gift or important date in place (the person it belongs to does not change). */
export async function updatePersonRecord(userId: string, kind: string, id: string, input: unknown) {
  const rid = uuid.parse(id);
  await withUser(userId, async (tx) => {
    let r: { id: string }[];
    if (kind === "entry") {
      const d = entrySchema.parse(input);
      r = await tx
        .update(relationshipEntries)
        .set({ kind: d.kind, body: d.body, source: d.source, occurredOn: d.occurredOn ?? null })
        .where(and(eq(relationshipEntries.id, rid), eq(relationshipEntries.userId, userId)))
        .returning({ id: relationshipEntries.id });
    } else if (kind === "event") {
      const d = eventSchema.parse(input);
      r = await tx
        .update(relationshipEvents)
        .set({ title: d.title, description: d.description ?? null, place: d.place ?? null, occurredOn: d.occurredOn ?? null })
        .where(and(eq(relationshipEvents.id, rid), eq(relationshipEvents.userId, userId)))
        .returning({ id: relationshipEvents.id });
    } else if (kind === "gift") {
      const d = giftSchema.parse(input);
      r = await tx
        .update(giftRecords)
        .set({
          item: d.item,
          occasion: d.occasion ?? null,
          givenOn: d.givenOn ?? null,
          priceAmount: d.priceAmount ?? null,
          priceCurrency: d.priceCurrency ?? null,
          reaction: d.reaction,
          // The gift form has no note field; keep an existing note unless one is sent.
          ...(typeof input === "object" && input !== null && "note" in input ? { note: d.note ?? null } : {}),
        })
        .where(and(eq(giftRecords.id, rid), eq(giftRecords.userId, userId)))
        .returning({ id: giftRecords.id });
    } else if (kind === "date") {
      const d = dateSchema.parse(input);
      r = await tx
        .update(importantDates)
        .set({ label: d.label, kind: d.kind, month: d.month, day: d.day, year: d.year ?? null, remindDaysBefore: d.remindDaysBefore ?? null })
        .where(and(eq(importantDates.id, rid), eq(importantDates.userId, userId)))
        .returning({ id: importantDates.id });
    } else throw invalid();
    if (!r.length) throw notFound();
  });
}

export async function getPerson(userId: string, personId: string) {
  return withUser(userId, async (tx) => {
    const person = await ownPerson(tx, userId, personId);
    // Sequential: a transaction holds one connection, which must not run queries concurrently.
    const entries = await tx.select().from(relationshipEntries).where(eq(relationshipEntries.personId, person.id)).orderBy(desc(relationshipEntries.createdAt));
    const events = await tx.select().from(relationshipEvents).where(eq(relationshipEvents.personId, person.id)).orderBy(desc(relationshipEvents.occurredOn), desc(relationshipEvents.createdAt));
    const gifts = await tx.select().from(giftRecords).where(eq(giftRecords.personId, person.id)).orderBy(desc(giftRecords.givenOn), desc(giftRecords.createdAt));
    const dates = await tx.select().from(importantDates).where(eq(importantDates.personId, person.id)).orderBy(asc(importantDates.month), asc(importantDates.day));
    const prefs = await loadPreferences(tx, userId, person.id);
    return { person, entries, events, gifts, dates, preferences: prefs };
  });
}

// ---------------------------------------------------------------------------
// Upcoming dates & reminders (in-app)
// ---------------------------------------------------------------------------

export interface UpcomingDate {
  id: string;
  label: string;
  kind: string;
  personId: string | null;
  personName: string | null;
  date: string;
  daysUntil: number;
  /** Years since the original year (age / anniversary count), if the year is known. */
  years: number | null;
  reminderDue: boolean;
}

/** Next occurrence of month/day on or after `today` (Feb 29 → Feb 28 in non-leap years). */
export function nextOccurrence(month: number, day: number, today: string): { date: string; daysUntil: number; year: number } {
  const [ty, tm, td] = today.split("-").map(Number) as [number, number, number];
  const t = Date.UTC(ty, tm - 1, td);
  for (const y of [ty, ty + 1]) {
    const last = new Date(Date.UTC(y, month, 0)).getUTCDate();
    const d = Date.UTC(y, month - 1, Math.min(day, last));
    if (d >= t) {
      const iso = new Date(d).toISOString().slice(0, 10);
      return { date: iso, daysUntil: Math.round((d - t) / 86400_000), year: y };
    }
  }
  throw new Error("unreachable");
}

export async function upcomingDates(userId: string, withinDays = 60, now = new Date()): Promise<UpcomingDate[]> {
  return withUser(userId, async (tx) => {
    const [p] = await tx.select({ tz: profiles.timeZone }).from(profiles).where(eq(profiles.userId, userId));
    const [np] = await tx.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId));
    const today = todayIn(p?.tz ?? "UTC", now);
    const rows = await tx
      .select({ d: importantDates, name: people.nickname })
      .from(importantDates)
      .leftJoin(people, eq(people.id, importantDates.personId))
      .where(eq(importantDates.userId, userId));
    return rows
      .map(({ d, name }) => {
        const next = nextOccurrence(d.month, d.day, today);
        return {
          id: d.id,
          label: d.label,
          kind: d.kind,
          personId: d.personId,
          personName: name,
          date: next.date,
          daysUntil: next.daysUntil,
          years: d.year ? next.year - d.year : null,
          reminderDue: (np?.dateReminders ?? true) && d.remindDaysBefore !== null && next.daysUntil <= d.remindDaysBefore,
        };
      })
      .filter((x) => x.daysUntil <= withinDays)
      .sort((a, b) => a.daysUntil - b.daysUntil);
  });
}

export async function listCategories() {
  // Catalog data (no personal data); read without identity.
  return withAnon((tx) => tx.select().from(preferenceCategories).orderBy(asc(preferenceCategories.sortOrder)));
}

export interface PersonSummary {
  id: string;
  nickname: string;
  relationship: string;
  connected: boolean;
  /** The next date to remember (within a year), if any. */
  nextDate: { label: string; date: string; daysUntil: number; kind: string } | null;
  /** The latest thing done together, or else the latest note. */
  latest: { text: string; on: string | null } | null;
  /** Up to three things they love or like (latest feeling). */
  loves: string[];
  counts: { notes: number; events: number; gifts: number };
}

/** One panel's worth per person, for the People overview. Private: the user's own entries only. */
export async function peopleSummaries(userId: string): Promise<PersonSummary[]> {
  const list = await listPeople(userId);
  if (!list.length) return [];
  const dates = await upcomingDates(userId, 366);
  const live = new Set((await withUser(userId, (tx) => tx.execute<{ id: string }>(sql`
    select p.id from people p join comparison_sessions s on s.id = p.connection_session_id
    where p.user_id = ${userId} and s.status = 'active'`))).rows.map((r) => r.id));
  return withUser(userId, async (tx) => {
    const ids = list.map((p) => p.id);
    const events = await tx.select().from(relationshipEvents).where(and(eq(relationshipEvents.userId, userId), inArray(relationshipEvents.personId, ids))).orderBy(desc(relationshipEvents.occurredOn), desc(relationshipEvents.createdAt));
    const entries = await tx.select().from(relationshipEntries).where(and(eq(relationshipEntries.userId, userId), inArray(relationshipEntries.personId, ids))).orderBy(desc(relationshipEntries.createdAt));
    const gifts = await tx.select({ personId: giftRecords.personId }).from(giftRecords).where(and(eq(giftRecords.userId, userId), inArray(giftRecords.personId, ids)));
    const prefs = await tx
      .select({ personId: preferenceItems.personId, label: preferenceItems.label, sentiment: preferenceValues.sentiment, at: preferenceValues.recordedAt })
      .from(preferenceItems)
      .innerJoin(preferenceValues, eq(preferenceValues.itemId, preferenceItems.id))
      .where(and(eq(preferenceItems.userId, userId), inArray(preferenceItems.personId, ids)));
    return list.map((p) => {
      const d = dates.find((x) => x.personId === p.id);
      const ev = events.find((e) => e.personId === p.id);
      const en = entries.find((e) => e.personId === p.id);
      const latestFeel = new Map<string, { s: string; at: Date }>();
      for (const x of prefs.filter((y) => y.personId === p.id)) {
        const cur = latestFeel.get(x.label);
        if (!cur || cur.at < x.at) latestFeel.set(x.label, { s: x.sentiment, at: x.at });
      }
      const loves = [...latestFeel.entries()]
        .filter(([, v]) => v.s === "love" || v.s === "like")
        .sort((a, b) => (a[1].s === b[1].s ? b[1].at.getTime() - a[1].at.getTime() : a[1].s === "love" ? -1 : 1))
        .slice(0, 3)
        .map(([k]) => k);
      return {
        id: p.id,
        nickname: p.nickname,
        relationship: p.relationship,
        connected: live.has(p.id),
        nextDate: d ? { label: d.label, date: d.date, daysUntil: d.daysUntil, kind: d.kind } : null,
        latest: ev ? { text: ev.title, on: ev.occurredOn } : en ? { text: en.body, on: en.occurredOn } : null,
        loves,
        counts: {
          notes: entries.filter((e) => e.personId === p.id).length,
          events: events.filter((e) => e.personId === p.id).length,
          gifts: gifts.filter((g) => g.personId === p.id).length,
        },
      };
    });
  });
}
