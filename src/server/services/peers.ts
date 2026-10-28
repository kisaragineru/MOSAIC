/**
 * "How do you see me?" — asking connected people to describe you on the 17 axes.
 * Every call goes through the SECURITY DEFINER functions of migration 0009, which check who may
 * ask, answer, decline, cancel or withdraw, and keep anonymous answers out of the owner's reach
 * until there are at least three of them.
 */
import { sql } from "drizzle-orm";
import { z } from "zod";
import { AXES } from "@/content/axes";
import { TENDENCY_KEYS, type TendencyKey } from "@/content/questions";
import { windowOf, type PeerCounts, type Window } from "@/lib/johari";
import { uuid } from "@/lib/validation/common";
import { withUser } from "../db/tx";
import { mapDbError } from "../errors";
import { audit } from "./audit";
import { receivedGifts, type GiftRole } from "./gift-boxes";
import { listTendencies } from "./tendencies";

export type PeerStatus = "pending" | "answered" | "declined" | "cancelled" | "withdrawn";

export interface PeerRequestRow {
  id: string;
  role: "owner" | "responder";
  otherId: string;
  otherName: string;
  sessionId: string;
  status: PeerStatus;
  createdAt: Date;
  answeredAt: Date | null;
  /** Only for requests made to me: my own choice and words. */
  anonymous: boolean | null;
  comment: string | null;
  answers: Partial<Record<TendencyKey, -1 | 0 | 1>> | null;
}

async function call<T>(userId: string, q: ReturnType<typeof sql>, action: string, target?: string) {
  return withUser(userId, async (tx) => {
    try {
      const r = await tx.execute<T & Record<string, unknown>>(q);
      if (target) await audit(tx, userId, action, "peer_request", target);
      return r.rows;
    } catch (e) {
      mapDbError(e);
    }
  });
}

export async function askPeer(userId: string, sessionId: string): Promise<string> {
  const id = uuid.parse(sessionId);
  const rows = await call<{ id: string }>(userId, sql`select peer_request_create(${id}) as id`, "peer.asked");
  await withUser(userId, (tx) => audit(tx, userId, "peer.asked", "comparison_session", id));
  return rows[0]!.id as string;
}

const answerSchema = z.object({
  anonymous: z.boolean(),
  answers: z.partialRecord(z.enum(TENDENCY_KEYS), z.union([z.literal(1), z.literal(0), z.literal(-1)])).refine((a) => Object.keys(a).length > 0, "invalid_answers"),
  comment: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().trim().max(1000).optional()),
});

export async function answerPeer(userId: string, requestId: string, input: unknown) {
  const id = uuid.parse(requestId);
  const d = answerSchema.parse(input);
  await call(userId, sql`select peer_request_answer(${id}, ${d.anonymous}, ${JSON.stringify(d.answers)}::jsonb, ${d.comment ?? null})`, "peer.answered", id);
}

export async function declinePeer(userId: string, requestId: string) {
  const id = uuid.parse(requestId);
  await call(userId, sql`select peer_request_decline(${id})`, "peer.declined", id);
}

export async function cancelPeer(userId: string, requestId: string) {
  const id = uuid.parse(requestId);
  await call(userId, sql`select peer_request_cancel(${id})`, "peer.cancelled", id);
}

export async function withdrawPeerAnswer(userId: string, requestId: string) {
  const id = uuid.parse(requestId);
  await call(userId, sql`select peer_response_withdraw(${id})`, "peer.withdrawn", id);
}

export async function myPeerRequests(userId: string): Promise<PeerRequestRow[]> {
  const rows = await call<{
    id: string; role: "owner" | "responder"; other_id: string; other_name: string; session_id: string; status: PeerStatus;
    created_at: Date; answered_at: Date | null; anonymous: boolean | null; comment: string | null; answers: PeerRequestRow["answers"];
  }>(userId, sql`select * from peer_requests_mine() order by created_at desc`, "");
  return rows.map((r) => ({
    id: r.id as string,
    role: r.role as "owner" | "responder",
    otherId: r.other_id as string,
    otherName: r.other_name as string,
    sessionId: r.session_id as string,
    status: r.status as PeerStatus,
    createdAt: new Date(r.created_at as Date),
    answeredAt: r.answered_at ? new Date(r.answered_at as Date) : null,
    anonymous: r.anonymous as boolean | null,
    comment: r.comment as string | null,
    answers: r.answers as PeerRequestRow["answers"],
  }));
}

export interface PeerResults {
  /** `gift`: written in a gift box this user received (how a parent or grandparent saw them then). */
  named: { name: string; answers: Partial<Record<TendencyKey, -1 | 0 | 1>>; comment: string | null; answeredAt: Date; gift?: { role: GiftRole } }[];
  /** Anonymous answers: counts per axis and comments once there are three or more; else how many wait. */
  anonymous: { n: number; counts: Partial<Record<TendencyKey, [number, number, number]>> | null; comments: string[] };
  responders: number;
}

export async function peerResults(userId: string): Promise<PeerResults> {
  const rows = await call<{ kind: string; responder_name: string | null; answers: unknown; comment: string | null; answered_at: Date | null; n: number }>(
    userId,
    sql`select * from peer_results()`,
    "",
  );
  const named = rows
    .filter((r) => r.kind === "named")
    .map((r) => ({ name: r.responder_name as string, answers: r.answers as PeerResults["named"][number]["answers"], comment: r.comment as string | null, answeredAt: new Date(r.answered_at as Date) }));
  const summary = rows.find((r) => r.kind === "anon_summary");
  const pending = rows.find((r) => r.kind === "anon_pending");
  const anonymous = summary
    ? { n: Number(summary.n), counts: summary.answers as PeerResults["anonymous"]["counts"], comments: rows.filter((r) => r.kind === "anon_comment").map((r) => r.comment as string) }
    : { n: pending ? Number(pending.n) : 0, counts: null, comments: [] };
  return { named, anonymous, responders: named.length + (summary ? anonymous.n : 0) };
}

export interface JohariAxis {
  key: TendencyKey;
  self: 1 | -1 | 0;
  counts: PeerCounts;
  window: Window;
}

/** "Your view" from the gift boxes I received, as named answers under the name each writer wrote as. */
async function giftViews(userId: string): Promise<PeerResults["named"]> {
  return (await receivedGifts(userId)).flatMap((b) =>
    b.views
      .filter((v) => Object.keys(v.answers).length > 0 || v.comment)
      .map((v) => {
        const w = v.author_id ? b.writers.find((x) => x.user_id === v.author_id) : undefined;
        return {
          name: (w ? w.label ?? w.name : v.author_label) ?? "",
          answers: v.answers,
          comment: v.comment,
          answeredAt: new Date(b.delivered_at ?? Date.now()),
          gift: { role: (w?.role ?? v.author_role ?? "parent") as GiftRole },
        };
      }),
  );
}

/**
 * Per axis: your own reading beside what the people you asked said (shown answers only), and by
 * default the views written in gift boxes you received. The manual leaves those out (`gifts: false`):
 * a box's words count for no chapter but the story's.
 */
export async function johari(userId: string, opts: { gifts?: boolean } = {}): Promise<{ axes: JohariAxis[]; results: PeerResults }> {
  const asked = await peerResults(userId);
  const fromGifts = opts.gifts === false ? [] : await giftViews(userId);
  const results: PeerResults = { ...asked, named: [...asked.named, ...fromGifts], responders: asked.responders + fromGifts.length };
  const claims = await listTendencies(userId);
  const axes = AXES.map((key) => {
    const counts: PeerCounts = { pos: 0, neutral: 0, neg: 0 };
    for (const n of results.named) {
      const v = n.answers[key];
      if (v === 1) counts.pos++;
      else if (v === -1) counts.neg++;
      else if (v === 0) counts.neutral++;
    }
    const a = results.anonymous.counts?.[key];
    if (a) {
      counts.pos += a[0];
      counts.neutral += a[1];
      counts.neg += a[2];
    }
    const c = claims.find((x) => x.claimKey === key);
    const self: 1 | -1 | 0 = c && (c.state === "consistent" || c.state === "emerging") && c.userStatus !== "rejected" ? c.direction : 0;
    return { key, self, counts, window: windowOf(self, counts) };
  });
  return { axes, results };
}
