/**
 * The records timeline: my records and the ones people I'm connected with shared, as one list
 * of days. A record sits on the day it was about (or the day it was written), with the time it
 * was written in the viewer's time zone; when it was written on another day, that is shown too.
 */
import { todayIn } from "./validation/common";

export type Audience = "private" | "connections" | "circles";

export interface TimelineEntry {
  id: string;
  /** Mine (links to the record) or someone else's (shown in full, read-only). */
  mine: boolean;
  ownerName: string | null;
  /** Someone else's record: who wrote it (for their photo). */
  ownerId?: string | null;
  kind: string;
  title: string | null;
  body: string | null;
  sealed: boolean;
  revealOn: string | null;
  occurredOn: string | null;
  createdAt: Date;
  audience: Audience;
  circles: string[];
  version: number;
  tags: string[];
  people: { id: string; nickname: string }[];
}

export interface TimelineItem {
  entry: TimelineEntry;
  /** An opened letter to the future: the day it was written and how long it waited. */
  letter: { writtenOn: string; days: number } | null;
  /** HH:mm the record was written, in the viewer's time zone. */
  time: string;
  /** "M/D HH:mm" when it was written on another day than the one it is about. */
  writtenOn: string | null;
}

export interface TimelineDay {
  day: string;
  items: TimelineItem[];
}

function clock(tz: string, at: Date) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: tz, month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(at)
      .map((x) => [x.type, x.value]),
  );
  return { time: `${p.hour}:${p.minute}`, md: `${p.month}/${p.day}` };
}

/** An opened letter to the future sits on the day it opened; anything else on the day it was about. */
export function timelineDay(e: Pick<TimelineEntry, "kind" | "sealed" | "revealOn" | "occurredOn">): string | null {
  return e.kind === "letter_to_future" && !e.sealed && e.revealOn ? e.revealOn : e.occurredOn;
}

const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000);

/** Group into days, newest day first; within a day, newest written first. */
export function buildTimeline(entries: TimelineEntry[], tz: string): TimelineDay[] {
  const items = entries.map((entry) => {
    const written = todayIn(tz, entry.createdAt);
    const day = timelineDay(entry) ?? written;
    const c = clock(tz, entry.createdAt);
    const opened = entry.kind === "letter_to_future" && !entry.sealed && !!entry.revealOn;
    return {
      day,
      item: {
        entry,
        time: c.time,
        writtenOn: opened || written === day ? null : `${c.md} ${c.time}`,
        letter: opened ? { writtenOn: written, days: Math.max(daysBetween(day, written), 0) } : null,
      },
    };
  });
  items.sort((a, b) => (a.day === b.day ? b.item.entry.createdAt.getTime() - a.item.entry.createdAt.getTime() || a.item.entry.id.localeCompare(b.item.entry.id) : a.day < b.day ? 1 : -1));
  const days: TimelineDay[] = [];
  for (const { day, item } of items) {
    const last = days.at(-1);
    if (last?.day === day) last.items.push(item);
    else days.push({ day, items: [item] });
  }
  return days;
}

/** "today", "yesterday" or null, for a day relative to today in the viewer's time zone. */
export function relativeDay(day: string, tz: string, now = new Date()): "today" | "yesterday" | null {
  const today = todayIn(tz, now);
  if (day === today) return "today";
  const y = new Date(`${today}T00:00:00Z`);
  y.setUTCDate(y.getUTCDate() - 1);
  return day === y.toISOString().slice(0, 10) ? "yesterday" : null;
}

export const KIND_ICON: Record<string, string> = {
  note: "✏️",
  thought: "💭",
  feeling: "🌤",
  memory: "📷",
  decision: "🧭",
  goal: "🎯",
  dream: "🌙",
  regret: "🍂",
  achievement: "🏆",
  value: "💎",
  letter_to_future: "✉️",
};
