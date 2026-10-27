/**
 * Home's notices, in one tray at the top: what each one is, and whether it's showing. Closing one
 * keeps it away by its kind, so the tray nudges without nagging:
 * - "action" (someone is waiting on you): comes back once, three days later; closed again, it's gone.
 * - "dated" (a day that's coming): comes back on the day itself; closed then, it's gone.
 * - "once" (news) and "habit" (today's question; its key carries the day): gone when closed.
 */
import { and, eq, gt, inArray, like } from "drizzle-orm";
import { z } from "zod";
import { noticeDismissals } from "../db/schema";
import { withUser } from "../db/tx";
import { myCard } from "./card";
import { myPeerRequests } from "./peers";
import { replyInbox } from "./replies";
import { listComparisons } from "./sharing";
import { myOffers, newOpens, writerNews } from "./works";

export type NoticeKind = "action" | "dated" | "once" | "habit";
export interface NoticeRef {
  key: string;
  kind: NoticeKind;
  /** For a dated notice: its day (YYYY-MM-DD). */
  on?: string;
}

const AGAIN_DAYS = 3;
/** Closing today's question this many days running asks whether to keep the reminder. */
export const QUESTION_STREAK = 7;

/** The keys among these that are showing (never closed, or due back). */
export async function visibleNotices(userId: string, refs: NoticeRef[]): Promise<Set<string>> {
  const keys = [...new Set(refs.map((r) => r.key))];
  if (!keys.length) return new Set();
  const rows = await withUser(userId, (tx) => tx.select().from(noticeDismissals).where(and(eq(noticeDismissals.userId, userId), inArray(noticeDismissals.key, keys))));
  const now = Date.now();
  const hidden = new Set(rows.filter((r) => r.until === null || r.until.getTime() > now).map((r) => r.key));
  return new Set(keys.filter((k) => !hidden.has(k)));
}

const refSchema = z.object({ key: z.string().min(1).max(200), kind: z.enum(["action", "dated", "once", "habit"]), on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() });

/** Close notices (one, or all that are showing); `today` is the user's day (YYYY-MM-DD). */
export async function dismissNotices(userId: string, input: unknown, today: string) {
  const refs = z.array(refSchema).min(1).max(50).parse(input);
  await withUser(userId, async (tx) => {
    for (const r of refs) {
      const [prev] = await tx.select().from(noticeDismissals).where(and(eq(noticeDismissals.userId, userId), eq(noticeDismissals.key, r.key)));
      const times = (prev?.times ?? 0) + 1;
      let until: Date | null = null;
      if (r.kind === "action" && times === 1) until = new Date(Date.now() + AGAIN_DAYS * 86_400_000);
      // Back on its day (from midnight UTC: the morning in Asia), unless that day has come.
      if (r.kind === "dated" && r.on && r.on > today) until = new Date(`${r.on}T00:00:00Z`);
      const values = { userId, key: r.key, times, until, dismissedAt: new Date() };
      await tx
        .insert(noticeDismissals)
        .values(values)
        .onConflictDoUpdate({ target: [noticeDismissals.userId, noticeDismissals.key], set: { times, until, dismissedAt: values.dismissedAt } });
    }
  });
}

/** The keys Home gives these notices (the bell in the header checks the same ones). */
export const noticeKey = {
  offer: (id: string) => `offer:${id}`,
  peer: (id: string) => `peer:${id}`,
  conn: (id: string) => `conn:${id}`,
  // A new reply makes a new notice.
  reply: (entryId: string, lastAt: Date | null) => `reply:${entryId}:${lastAt?.getTime() ?? 0}`,
};

/**
 * For the bell in the header: whether someone is waiting on you (cheap checks only; the rest of
 * the tray shows on Home).
 */
export async function hasWaitingNotices(userId: string): Promise<boolean> {
  if ((await newOpens(userId)).length) return true;
  const news = await writerNews(userId);
  if (news.connected.length || news.started.length) return true;
  if ((await myCard(userId)) === null) return true;
  const refs: NoticeRef[] = [
    ...(await myOffers(userId)).filter((x) => !x.accepted && !x.dismissed).map((x) => ({ key: noticeKey.offer(x.id), kind: "action" as const })),
    ...(await myPeerRequests(userId)).filter((r) => r.role === "responder" && r.status === "pending").map((r) => ({ key: noticeKey.peer(r.id), kind: "action" as const })),
    ...(await listComparisons(userId)).filter((c) => c.waitingOn === "you").map((c) => ({ key: noticeKey.conn(c.id), kind: "action" as const })),
    ...(await replyInbox(userId)).filter((x) => x.unread > 0).map((x) => ({ key: noticeKey.reply(x.entryId, x.lastAt), kind: "action" as const })),
  ];
  return (await visibleNotices(userId, refs)).size > 0;
}

/** Whether today's question was closed every day of the last week (then: keep reminding?). */
export async function questionClosedStreak(userId: string): Promise<boolean> {
  // Counted from the last time this was asked, so "keep it" isn't asked again the next day.
  const asked = await withUser(userId, (tx) =>
    tx.select({ at: noticeDismissals.dismissedAt }).from(noticeDismissals).where(and(eq(noticeDismissals.userId, userId), like(noticeDismissals.key, "question-ask:%"))),
  );
  const last = Math.max(0, ...asked.map((r) => r.at.getTime()));
  const since = new Date(Math.max(last, Date.now() - QUESTION_STREAK * 86_400_000));
  const rows = await withUser(userId, (tx) =>
    tx
      .select({ key: noticeDismissals.key })
      .from(noticeDismissals)
      .where(and(eq(noticeDismissals.userId, userId), like(noticeDismissals.key, "question:%"), gt(noticeDismissals.dismissedAt, since))),
  );
  return rows.length >= QUESTION_STREAK;
}
