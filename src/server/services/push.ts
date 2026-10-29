/**
 * Push notifications (Web Push) for messages, and only for messages: someone wrote to you. Off
 * until each person turns them on in a browser; a muted conversation stays quiet; by default only
 * who wrote is shown, not what (pushPreview). Notifications of one conversation replace each
 * other on the device (one tag), so a burst of messages is one notification.
 *
 * Needs VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT in the hosting settings (an admin can
 * make the key pair in their own browser on /admin). Unset: nothing is offered or sent.
 */
import { eq, sql } from "drizzle-orm";
import webpush from "web-push";
import { z } from "zod";
import type { Locale } from "@/lib/i18n/locales";
import { notificationPreferences, pushSubscriptions } from "../db/schema";
import { withUser } from "../db/tx";
import { mapDbError } from "../errors";

export const pushConfigured = () => !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
export const pushPublicKey = () => (pushConfigured() ? process.env.VAPID_PUBLIC_KEY! : null);

const b64url = z.string().regex(/^[A-Za-z0-9_-]+=*$/);
const subscription = z.object({
  endpoint: z.string().url().startsWith("https://").max(1000),
  keys: z.object({ p256dh: b64url.max(200), auth: b64url.max(100) }),
});

/** Turn push on for this browser (its subscription from the Push API). */
export async function subscribePush(userId: string, input: unknown) {
  const s = subscription.parse(input);
  await withUser(userId, async (tx) => {
    try {
      await tx.execute(sql`select push_subscribe(${s.endpoint}, ${s.keys.p256dh}, ${s.keys.auth})`);
    } catch (e) {
      mapDbError(e);
    }
  });
}

/** Turn push off for this browser. */
export async function unsubscribePush(userId: string, endpoint: unknown) {
  const e = z.string().max(1000).parse(endpoint);
  await withUser(userId, (tx) => tx.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, e)));
}

/** How many browsers I get notifications in. */
export async function pushDevices(userId: string): Promise<number> {
  const rows = await withUser(userId, (tx) => tx.select({ id: pushSubscriptions.id }).from(pushSubscriptions));
  return rows.length;
}

export async function setPushPreview(userId: string, on: boolean) {
  await withUser(userId, (tx) =>
    tx
      .insert(notificationPreferences)
      .values({ userId, pushPreview: on })
      .onConflictDoUpdate({ target: notificationPreferences.userId, set: { pushPreview: on, updatedAt: new Date() } }),
  );
}

const WORDS: Record<Locale, { from: (n: string) => string; inGroup: (n: string, g: string) => string; mentioned: (n: string, g: string) => string; photo: string; record: string; someone: string; group: string }> = {
  ja: { from: (n) => `${n}さんからメッセージ`, inGroup: (n, g) => `${g}：${n}さんからメッセージ`, mentioned: (n, g) => `${g}：${n}さんがあなたをメンションしました`, photo: "📷 写真", record: "📄 記録", someone: "だれか", group: "グループ" },
  en: { from: (n) => `A message from ${n}`, inGroup: (n, g) => `${g}: a message from ${n}`, mentioned: (n, g) => `${g}: ${n} mentioned you`, photo: "📷 Photo", record: "📄 A record", someone: "Someone", group: "Group" },
  vi: { from: (n) => `Tin nhắn từ ${n}`, inGroup: (n, g) => `${g}: tin nhắn từ ${n}`, mentioned: (n, g) => `${g}: ${n} đã nhắc đến bạn`, photo: "📷 Ảnh", record: "📄 Ghi chép", someone: "Ai đó", group: "Nhóm" },
};

export type PushTarget = {
  user_id: string;
  locale: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  conversation_id: string;
  conv_kind: "direct" | "group";
  conv_title: string | null;
  sender_name: string | null;
  msg_kind: "text" | "image" | "record";
  body: string | null;
  /** The message mentions this reader (reaches them even in a muted group). */
  mentioned?: boolean;
};

/** What the notification says, in the reader's language: who (and, if they chose, what). */
export function pushPayload(t: PushTarget) {
  const w = WORDS[(["ja", "en", "vi"] as const).find((l) => l === t.locale) ?? "ja"];
  const name = t.sender_name ?? w.someone;
  const title = t.conv_kind !== "group" ? w.from(name) : t.mentioned ? w.mentioned(name, t.conv_title ?? w.group) : w.inGroup(name, t.conv_title ?? w.group);
  // The text only for those who chose to see it (the SQL leaves it out otherwise).
  const what = t.msg_kind === "image" ? (t.body ? `${w.photo} ${t.body}` : w.photo) : t.msg_kind === "record" ? w.record : (t.body ?? "");
  return { title: "MOSAIC", body: t.body !== null || t.msg_kind !== "text" ? `${title}\n${what}`.trim() : title, url: `/messages/${t.conversation_id}`, tag: `dm-${t.conversation_id}` };
}

let configured = false;
function vapid() {
  if (!configured) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT!, process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
    configured = true;
  }
}

/** Tell the others in the conversation about a message I sent. Never throws: a message is sent whether or not anyone is told. */
export async function notifyMessage(senderId: string, messageId: string): Promise<number> {
  if (!pushConfigured()) return 0;
  try {
    const r = await withUser(senderId, (tx) => tx.execute<PushTarget>(sql`select * from dm_push_targets(${messageId})`));
    if (!r.rows.length) return 0;
    vapid();
    const sent = await Promise.allSettled(
      r.rows.map(async (t) => {
        try {
          await webpush.sendNotification({ endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } }, JSON.stringify(pushPayload(t)), { TTL: 60 * 60 * 24, urgency: "normal", timeout: 5000 });
        } catch (e) {
          const status = (e as { statusCode?: number }).statusCode;
          // The browser turned it off or is gone: forget it.
          if (status === 404 || status === 410) await withUser(senderId, (tx) => tx.execute(sql`select push_forget(${t.endpoint})`));
          throw e;
        }
      }),
    );
    return sent.filter((x) => x.status === "fulfilled").length;
  } catch (e) {
    console.error("push.notify", e);
    return 0;
  }
}

/** notifyMessage after the response has gone (the sender doesn't wait for it). */
export async function notifyMessageLater(senderId: string, messageId: string) {
  if (!pushConfigured()) return;
  try {
    const { after } = await import("next/server");
    after(() => notifyMessage(senderId, messageId));
  } catch {
    // Outside a request (scripts, tests): now.
    await notifyMessage(senderId, messageId);
  }
}

export interface PushTestResult {
  /** The push service (its host), e.g. fcm.googleapis.com, web.push.apple.com. */
  service: string;
  ok: boolean;
  status: number | null;
  message: string | null;
}

/** A test notification to my own browsers, with what each push service answered (Settings' check). */
export async function sendTestPush(userId: string, text: { title: string; body: string }): Promise<PushTestResult[]> {
  if (!pushConfigured()) return [];
  const subs = await withUser(userId, (tx) => tx.select({ endpoint: pushSubscriptions.endpoint, p256dh: pushSubscriptions.p256dh, auth: pushSubscriptions.auth }).from(pushSubscriptions));
  vapid();
  return Promise.all(
    subs.map(async (s) => {
      const service = new URL(s.endpoint).host;
      try {
        const r = await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify({ title: text.title, body: text.body, url: "/settings#push", tag: "test" }), { TTL: 60, urgency: "high", timeout: 8000 });
        return { service, ok: true, status: r.statusCode, message: null };
      } catch (e) {
        const err = e as { statusCode?: number; body?: string; message?: string };
        if (err.statusCode === 404 || err.statusCode === 410) await withUser(userId, (tx) => tx.execute(sql`select push_forget(${s.endpoint})`));
        return { service, ok: false, status: err.statusCode ?? null, message: (err.body || err.message || "").slice(0, 200) };
      }
    }),
  );
}
