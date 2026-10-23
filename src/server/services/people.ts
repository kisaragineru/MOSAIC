import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
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
import { withUser, type Tx } from "../db/tx";
import { invalid, notFound } from "../errors";

const RELATIONSHIPS = ["partner", "family", "friend", "colleague", "other"] as const;

export const personSchema = z.object({
  nickname: z.string().trim().min(1).max(80),
  relationship: z.enum(RELATIONSHIPS).default("other"),
  note: optionalText(4000),
});

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
    const [p] = await tx.insert(people).values({ userId, nickname: d.nickname, relationship: d.relationship, note: d.note ?? null }).returning();
    return p!.id;
  });
}

export async function updatePerson(userId: string, personId: string, input: unknown) {
  const d = personSchema.parse(input);
  await withUser(userId, async (tx) => {
    await ownPerson(tx, userId, personId);
    await tx
      .update(people)
      .set({ nickname: d.nickname, relationship: d.relationship, note: d.note ?? null, updatedAt: new Date() })
      .where(eq(people.id, personId));
  });
}

/** Deletes the person and every note, event, gift, preference and date about them. */
export async function deletePerson(userId: string, personId: string) {
  await withUser(userId, async (tx) => {
    await ownPerson(tx, userId, personId);
    await tx.delete(people).where(eq(people.id, personId));
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
  // Catalog data; any authenticated context may read it.
  return (await import("../db/client")).getDb().select().from(preferenceCategories).orderBy(asc(preferenceCategories.sortOrder));
}
