/**
 * The story of a year, given on the birthday that ends it: the twelve months since the last
 * birthday, told from the user's own records. Written by AI when they allow AI (and it's set up),
 * otherwise from their words as they are, season by season. Kept once written (per language).
 * Only for a birth date given in the solar calendar; nothing is told for a year with no records.
 */
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { Locale } from "@/lib/i18n/locales";
import { generateStructured } from "../ai/claude";
import { birthProfiles, profiles, yearStories } from "../db/schema";
import { withUser } from "../db/tx";
import { listMemories, type MemorySummary } from "./memories";

/** Days after the birthday the story is announced on Home. */
export const YEAR_STORY_DAYS = 14;

export interface BirthdayYear {
  /** The birthday's year (the story's). */
  year: number;
  /** The age turned on it. */
  age: number;
  /** The twelve months: from the previous birthday up to the day before this one. */
  from: string;
  to: string;
  /** The birthday itself. */
  on: string;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
/** A birthday in a given year (29 February falls on the 28th in other years). */
function birthdayIn(year: number, month: number, day: number): Date {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return new Date(Date.UTC(year, month - 1, Math.min(day, last)));
}

/** The year ending with the latest birthday on or before `today` (YYYY-MM-DD); null without a solar birth date. */
export async function lastBirthday(userId: string, today: string): Promise<BirthdayYear | null> {
  const [b] = await withUser(userId, (tx) => tx.select({ d: birthProfiles.solarDate, cal: birthProfiles.calendarInput }).from(birthProfiles).where(eq(birthProfiles.userId, userId)));
  if (!b?.d || b.cal !== "solar") return null;
  const [by, bm, bd] = b.d.split("-").map(Number) as [number, number, number];
  const ty = Number(today.slice(0, 4));
  let year = ty;
  if (iso(birthdayIn(ty, bm, bd)) > today) year = ty - 1;
  if (year <= by) return null;
  const on = birthdayIn(year, bm, bd);
  const prev = birthdayIn(year - 1, bm, bd);
  return { year, age: year - by, from: iso(prev), to: iso(new Date(on.getTime() - 86_400_000)), on: iso(on) };
}

/** The year whose story is due on Home: its birthday was within the last two weeks, with records in it. */
export async function yearStoryDue(userId: string, today: string): Promise<BirthdayYear | null> {
  const y = await lastBirthday(userId, today);
  if (!y) return null;
  const days = (Date.parse(today) - Date.parse(y.on)) / 86_400_000;
  if (days < 0 || days >= YEAR_STORY_DAYS) return null;
  return (await yearRecords(userId, y)).length ? y : null;
}

async function yearRecords(userId: string, y: BirthdayYear): Promise<MemorySummary[]> {
  const rows = await listMemories(userId, { from: y.from, to: y.to, limit: 200 });
  return rows.filter((m) => m.kind !== "letter_to_future" && !m.sealed && (m.body ?? "").trim());
}

export interface YearStory {
  year: number;
  age: number;
  title: string;
  paragraphs: string[];
  ai: boolean;
}

type Words = {
  title: (age: number) => string;
  open: (age: number, n: number) => string;
  seasons: [string, string, string, string];
  said: (season: string, quotes: string[]) => string;
  close: (age: number) => string;
  join: string;
};

const WORDS: Record<Locale, Words> = {
  ja: {
    title: (age) => `${age}歳の1年`,
    open: (age, n) => `${age - 1}歳から${age}歳へ。この1年、あなたは${n}のことばを残しました。そのいくつかを、季節ごとに。`,
    seasons: ["はじめの3か月", "次の3か月", "その次の3か月", "おわりの3か月"],
    said: (season, q) => `${season}、あなたはこう書いていました。${q.map((x) => `「${x}」`).join("、")}`,
    close: (age) => `そして、${age}歳の1年が始まります。また、ひとことずつ。`,
    join: "、",
  },
  en: {
    title: (age) => `The year you turned ${age}`,
    open: (age, n) => `From ${age - 1} to ${age}. This year you left ${n} notes. Some of them, season by season.`,
    seasons: ["In the first three months", "In the next three months", "In the three after that", "In the last three months"],
    said: (season, q) => `${season}, you wrote: ${q.map((x) => `“${x}”`).join(", ")}`,
    close: (age) => `And so the year of ${age} begins. A line at a time, again.`,
    join: ", ",
  },
  vi: {
    title: (age) => `Một năm tròn ${age} tuổi`,
    open: (age, n) => `Từ ${age - 1} đến ${age} tuổi. Năm nay bạn đã để lại ${n} ghi chép. Một vài trong số đó, theo từng mùa.`,
    seasons: ["Ba tháng đầu", "Ba tháng tiếp theo", "Ba tháng sau đó", "Ba tháng cuối"],
    said: (season, q) => `${season}, bạn đã viết: ${q.map((x) => `“${x}”`).join(", ")}`,
    close: (age) => `Và một năm ${age} tuổi bắt đầu. Lại từng dòng một.`,
    join: ", ",
  },
};

/** A record's first sentence, short enough to quote. */
function quote(body: string): string {
  const first = body.trim().split(/(?<=[。．！？!?\n])/)[0]!.trim();
  return first.length > 60 ? `${first.slice(0, 58)}…` : first;
}

/** The year from the records as they are: a few of the user's own lines, three months at a time. */
function fromRecords(y: BirthdayYear, recs: MemorySummary[], locale: Locale): YearStory {
  const w = WORDS[locale];
  const start = Date.parse(y.from);
  const quarter = (m: MemorySummary) => Math.min(3, Math.floor((Date.parse(m.timelineOn) - start) / (91.3 * 86_400_000)));
  const paragraphs = [w.open(y.age, recs.length)];
  for (let q = 0; q < 4; q++) {
    // The longer records first: they tend to say the most.
    const picks = recs.filter((m) => quarter(m) === q).sort((a, b) => (b.body ?? "").length - (a.body ?? "").length).slice(0, 2).map((m) => quote(m.body!));
    if (picks.length) paragraphs.push(w.said(w.seasons[q]!, picks));
  }
  paragraphs.push(w.close(y.age + 1));
  return { year: y.year, age: y.age, title: w.title(y.age), paragraphs, ai: false };
}

const LANG: Record<Locale, string> = { ja: "Japanese", en: "English", vi: "Vietnamese" };

/** The year written as a short story by AI, from the records only (nothing invented). */
async function byAi(y: BirthdayYear, recs: MemorySummary[], locale: Locale, name: string): Promise<YearStory | null> {
  const lines = recs
    .slice(0, 80)
    .map((m) => ({ on: m.timelineOn, text: (m.body ?? "").slice(0, 400) }))
    .sort((a, b) => a.on.localeCompare(b.on));
  const r = await generateStructured({
    system: `You write a short, warm story in ${LANG[locale]} of one year in someone's life, addressed to them ("you"), from their own notes. Use only what the notes say: never invent events, people or feelings. 4 to 6 short paragraphs, in time order, ending on the year ahead. Quote a few of their own words. Their name is ${name}.`,
    user: JSON.stringify({ turned: y.age, from: y.from, to: y.to, notes: lines }),
    schema: z.object({ title: z.string().min(1).max(80), paragraphs: z.array(z.string().min(1).max(1200)).min(3).max(8) }),
    effort: "low",
    timeoutMs: 25_000,
    maxTokens: 4000,
  });
  return r.ok ? { year: y.year, age: y.age, title: r.data.title, paragraphs: r.data.paragraphs, ai: true } : null;
}

/** The story of the year ending with this birthday: kept, or written now (null: not yet / nothing to tell). */
export async function yearStory(userId: string, year: number, locale: Locale, today: string): Promise<YearStory | null> {
  const y = await lastBirthday(userId, today);
  if (!y || year > y.year || year < y.year - 50) return null;
  // An earlier year: the same birthday, that many years back.
  const back = y.year - year;
  const shift = (d: string, by: number) => `${Number(d.slice(0, 4)) - by}${d.slice(4)}`;
  const span: BirthdayYear = back ? { year, age: y.age - back, from: shift(y.from, back), to: shift(y.to, back), on: shift(y.on, back) } : y;
  const [kept] = await withUser(userId, (tx) => tx.select().from(yearStories).where(and(eq(yearStories.userId, userId), eq(yearStories.year, year), eq(yearStories.locale, locale))));
  if (kept) return { year, age: span.age, title: kept.title, paragraphs: kept.paragraphs as string[], ai: kept.ai };
  const recs = await yearRecords(userId, span);
  if (!recs.length) return null;
  const [p] = await withUser(userId, (tx) => tx.select({ ai: profiles.aiOptIn, name: profiles.displayName }).from(profiles).where(eq(profiles.userId, userId)));
  const story = (p?.ai ? await byAi(span, recs, locale, p.name) : null) ?? fromRecords(span, recs, locale);
  await withUser(userId, (tx) =>
    tx.insert(yearStories).values({ userId, year, locale, title: story.title, paragraphs: story.paragraphs, ai: story.ai }).onConflictDoNothing(),
  );
  return story;
}
