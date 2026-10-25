/**
 * "Our story" for two connected people: how long they have been connected, how much has passed
 * between them, what they have in common and share, and the moments along the way. Both see the
 * same thing; it is built only from what both already know (no message content, no private notes).
 */
import { sql } from "drizzle-orm";
import { todayIn } from "@/lib/validation/common";
import { withUser } from "../db/tx";
import type { ComparisonView } from "./sharing";
import { listComparisons } from "./sharing";

export type PairEventKind = "connected" | "agreed" | "firstMessage" | "messages100" | "messages500" | "messages1000" | "firstComment" | "days100" | "years";

export interface PairEvent {
  kind: PairEventKind;
  /** Local date (YYYY-MM-DD) in the reader's time zone. */
  on: string;
  /** For "years": how many. */
  n?: number;
}

export interface PairHistory {
  /** Days since connecting (0 on the day itself). */
  days: number;
  connectedOn: string;
  /** Both people's messages together. */
  messages: number;
  comments: number;
  /** Shared answers both gave the same. */
  common: number;
  /** Answers both have shared with each other. */
  sharedAnswers: number;
  scopes: string[];
  /** Newest first. */
  events: PairEvent[];
}

const localDate = (d: Date | string, tz: string) => todayIn(tz, new Date(d));
const dayNumber = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))) / 86_400_000;
const addDays = (iso: string, n: number) => new Date((dayNumber(iso) + n) * 86_400_000).toISOString().slice(0, 10);

/** The anniversaries from connecting up to `today`: day 100, then each year. */
export function anniversaries(connectedOn: string, today: string): PairEvent[] {
  const out: PairEvent[] = [];
  const d100 = addDays(connectedOn, 100);
  if (d100 <= today) out.push({ kind: "days100", on: d100 });
  for (let y = 1; ; y++) {
    // 29 February falls back to 28 February in other years.
    const year = Number(connectedOn.slice(0, 4)) + y;
    let on = `${year}${connectedOn.slice(4)}`;
    if (connectedOn.slice(5) === "02-29" && !(year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0))) on = `${year}-02-28`;
    if (on > today) break;
    out.push({ kind: "years", on, n: y });
  }
  return out;
}

export async function pairHistory(userId: string, v: ComparisonView, tz: string, now = new Date()): Promise<PairHistory> {
  const raw = await withUser(userId, async (tx) => (await tx.execute<{ h: Record<string, unknown> }>(sql`select pair_history(${v.id}) as h`)).rows[0]!.h);
  const today = todayIn(tz, now);
  const connectedOn = localDate(raw.connectedAt as string, tz);
  const items = v.result?.preferences?.items ?? [];
  const marks = (raw.messageMarks ?? {}) as Record<string, string>;
  const events: PairEvent[] = [{ kind: "connected", on: connectedOn }];
  if (raw.agreedAt) events.push({ kind: "agreed", on: localDate(raw.agreedAt as string, tz) });
  if (raw.firstMessageAt) events.push({ kind: "firstMessage", on: localDate(raw.firstMessageAt as string, tz) });
  for (const n of [100, 500, 1000] as const) if (marks[n]) events.push({ kind: `messages${n}`, on: localDate(marks[n]!, tz) });
  if (raw.firstCommentAt) events.push({ kind: "firstComment", on: localDate(raw.firstCommentAt as string, tz) });
  if (v.status !== "revoked") events.push(...anniversaries(connectedOn, today));
  // Newest first; on the same day, the later step first (e.g. the first message after connecting).
  const order: PairEventKind[] = ["connected", "agreed", "firstMessage", "firstComment", "messages100", "messages500", "messages1000", "days100", "years"];
  events.sort((a, b) => (a.on === b.on ? order.indexOf(b.kind) - order.indexOf(a.kind) : a.on < b.on ? 1 : -1));
  return {
    days: Math.max(0, dayNumber(today) - dayNumber(connectedOn)),
    connectedOn,
    messages: Number(raw.messages ?? 0),
    comments: Number(raw.comments ?? 0),
    common: items.filter((x) => x.kind === "same").length,
    sharedAnswers: items.length,
    scopes: v.result?.agreedScopes ?? [],
    events,
  };
}

/** Just how long and how many messages (for a one-line summary elsewhere). */
export async function pairSummary(userId: string, sessionId: string, tz: string, now = new Date()): Promise<{ days: number; messages: number }> {
  const raw = await withUser(userId, async (tx) => (await tx.execute<{ h: Record<string, unknown> }>(sql`select pair_history(${sessionId}) as h`)).rows[0]!.h);
  return { days: Math.max(0, dayNumber(todayIn(tz, now)) - dayNumber(localDate(raw.connectedAt as string, tz))), messages: Number(raw.messages ?? 0) };
}

/** Anniversaries of active connections that fell today or in the last few days (for Home). */
export async function recentAnniversaries(userId: string, tz: string, now = new Date(), withinDays = 3): Promise<{ sessionId: string; name: string; event: PairEvent; today: boolean }[]> {
  const today = todayIn(tz, now);
  const out = [];
  for (const c of await listComparisons(userId)) {
    if (c.status !== "active") continue;
    const recent = anniversaries(localDate(c.createdAt, tz), today).filter((e) => dayNumber(today) - dayNumber(e.on) <= withinDays);
    const last = recent.at(-1);
    if (last) out.push({ sessionId: c.id, name: c.otherName, event: last, today: last.on === today });
  }
  return out;
}
