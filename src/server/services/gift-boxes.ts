/**
 * Gift boxes: parents and grandparents write for a child — growth records, letters, and how they
 * see the child — and the child receives it all on a date the box's owner sets, either into
 * their own MOSAIC account (with a one-time code) or as a printed book. Every read and write goes
 * through the SECURITY DEFINER functions of migration 0011, which hold the rules: who may write,
 * who sees which letters, when the box can be handed over, and that it closes for good after.
 */
import { randomInt } from "node:crypto";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { TENDENCY_KEYS, type TendencyKey } from "@/content/questions";
import { isoDate, optionalDate, uuid } from "@/lib/validation/common";
import { sha256 } from "../auth/crypto";
import { enforceRateLimit } from "../auth/rate-limit";
import { GIFT_ROLES } from "../db/schema";
import { withUser } from "../db/tx";
import { mapDbError } from "../errors";
import { audit } from "./audit";
import type { MediaItem } from "./media";

export type GiftRole = (typeof GIFT_ROLES)[number];

export interface GiftWriter {
  user_id: string;
  name: string;
  role: GiftRole;
  label: string | null;
  owner: boolean;
  removed: boolean;
}
export interface GiftEntry {
  id: string;
  /** Null once the writer has left MOSAIC; author_label/author_role say who they were. */
  author_id: string | null;
  author_label: string | null;
  author_role: GiftRole | null;
  kind: "growth" | "letter";
  occurred_on: string | null;
  title: string | null;
  body: string;
  created_at: string;
}
export interface GiftBox {
  id: string;
  child_name: string;
  child_birthday: string | null;
  deliver_on: string;
  status: "open" | "delivered";
  delivered_via: "account" | "pdf" | null;
  delivered_at: string | null;
  code_active: boolean;
  my_role: "owner" | "writer" | "child";
  me: string;
  owner_name: string;
  writers: GiftWriter[];
  entries: GiftEntry[];
  views: { author_id: string | null; author_label: string | null; author_role: GiftRole | null; answers: Partial<Record<TendencyKey, 1 | 0 | -1>>; comment: string | null }[];
  hidden_letters: number;
}
export interface GiftSummary {
  id: string;
  child_name: string;
  deliver_on: string;
  status: "open" | "delivered";
  my_role: "owner" | "writer" | "child";
  writers: number;
  delivered_at: Date | null;
  delivered_via: "account" | "pdf" | null;
}

/** Who wrote a record or view: their label in the box, else their role (also after they left MOSAIC). */
export function writerName(box: Pick<GiftBox, "writers">, x: { author_id: string | null; author_label: string | null; author_role: GiftRole | null }, roles: Record<GiftRole, string>): string {
  const w = x.author_id ? box.writers.find((y) => y.user_id === x.author_id) : undefined;
  const label = w ? w.label : x.author_label;
  const role = w ? w.role : x.author_role;
  return label ?? (role ? roles[role] : "");
}

// Codes people type: 12 characters without look-alikes, shown as XXXX-XXXX-XXXX.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function newCode(): string {
  const c = Array.from({ length: 12 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `${c.slice(0, 4)}-${c.slice(4, 8)}-${c.slice(8)}`;
}
/** Hash of a code as typed: case, spaces and dashes don't matter. */
export const codeHash = (code: string) => sha256(`gift:${code.toUpperCase().replace(/[^A-Z0-9]/g, "")}`);

async function call<T = unknown>(userId: string, q: ReturnType<typeof sql>, action?: string, target?: string): Promise<T[]> {
  return withUser(userId, async (tx) => {
    try {
      const r = await tx.execute<Record<string, unknown>>(q);
      if (action) await audit(tx, userId, action, "gift_box", target);
      return r.rows as T[];
    } catch (e) {
      mapDbError(e);
    }
  });
}

const role = z.enum(GIFT_ROLES);
const label = z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().trim().max(20).optional());
const boxSchema = z.object({
  childName: z.string().trim().min(1).max(60),
  childBirthday: optionalDate,
  deliverOn: isoDate,
});

export async function createGiftBox(userId: string, input: unknown): Promise<string> {
  const d = boxSchema.extend({ role, label }).parse(input);
  const rows = await call<{ id: string }>(userId, sql`select gift_box_create(${d.childName}, ${d.childBirthday ?? null}::date, ${d.deliverOn}::date, ${d.role}, ${d.label ?? null}) as id`, "gift.created");
  return rows[0]!.id;
}

export async function updateGiftBox(userId: string, boxId: string, input: unknown) {
  const id = uuid.parse(boxId);
  const d = boxSchema.parse(input);
  await call(userId, sql`select gift_box_update(${id}, ${d.childName}, ${d.childBirthday ?? null}::date, ${d.deliverOn}::date)`, "gift.updated", id);
}

/** A one-time invite for another parent or grandparent; the raw code is returned once. */
export async function inviteGiftWriter(userId: string, boxId: string, r: unknown): Promise<string> {
  const id = uuid.parse(boxId);
  const code = newCode();
  await call(userId, sql`select gift_invite_create(${id}, ${role.parse(r)}, ${codeHash(code)})`, "gift.invited", id);
  return code;
}

export async function joinGiftBox(userId: string, code: unknown, writerLabel?: unknown): Promise<string> {
  await enforceRateLimit("giftCode", userId);
  const c = z.string().trim().min(8).max(40).parse(code);
  const rows = await call<{ id: string }>(userId, sql`select gift_invite_accept(${codeHash(c)}, ${label.parse(writerLabel) ?? null}) as id`);
  await withUser(userId, (tx) => audit(tx, userId, "gift.joined", "gift_box", rows[0]!.id));
  return rows[0]!.id;
}

export async function removeGiftWriter(userId: string, boxId: string, writerId: string, keep: boolean) {
  const id = uuid.parse(boxId);
  await call(userId, sql`select gift_writer_remove(${id}, ${uuid.parse(writerId)}, ${keep})`, keep ? "gift.writer_removed" : "gift.writer_removed_with_entries", id);
}

const entrySchema = z.object({
  kind: z.enum(["growth", "letter"]),
  occurredOn: optionalDate,
  title: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().trim().max(120).optional()),
  body: z.string().trim().max(5000).default(""),
  /** Photos and videos (growth records only), as uploaded for records. */
  media: z.array(uuid).max(5).default([]),
});

export async function saveGiftEntry(userId: string, boxId: string, input: unknown, entryId?: string): Promise<string> {
  const id = uuid.parse(boxId);
  const d = entrySchema.parse(input);
  const rows = await call<{ id: string }>(
    userId,
    sql`select gift_entry_save(${entryId ? uuid.parse(entryId) : null}::uuid, ${id}, ${d.kind}, ${d.occurredOn ?? null}::date, ${d.title ?? null}, ${d.body}, ${`{${d.media.join(",")}}`}::uuid[]) as id`,
    entryId ? "gift.entry_updated" : "gift.entry_added",
    id,
  );
  return rows[0]!.id;
}

/** The photos and videos of a box's records that I may see, by record. */
export async function giftMedia(userId: string, boxId: string): Promise<Map<string, MediaItem[]>> {
  const rows = await call<{ id: string; entry_id: string; kind: "image" | "video"; width: number; height: number; duration_ms: number | null }>(
    userId,
    sql`select * from gift_media_for(${uuid.parse(boxId)})`,
  );
  const out = new Map<string, MediaItem[]>();
  for (const r of rows) out.set(r.entry_id, [...(out.get(r.entry_id) ?? []), { id: r.id, kind: r.kind, width: r.width, height: r.height, durationMs: r.duration_ms }]);
  return out;
}

export async function deleteGiftEntry(userId: string, entryId: string) {
  await call(userId, sql`select gift_entry_delete(${uuid.parse(entryId)})`, "gift.entry_deleted");
}

const viewSchema = z.object({
  answers: z.partialRecord(z.enum(TENDENCY_KEYS), z.union([z.literal(1), z.literal(0), z.literal(-1)])),
  comment: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().trim().max(1000).optional()),
});

export async function saveGiftView(userId: string, boxId: string, input: unknown) {
  const id = uuid.parse(boxId);
  const d = viewSchema.parse(input);
  await call(userId, sql`select gift_view_save(${id}, ${JSON.stringify(d.answers)}::jsonb, ${d.comment ?? null})`, "gift.view_saved", id);
}

/** Once the date has come: a one-time code for the child (the raw code is returned once). */
export async function issueReceiveCode(userId: string, boxId: string): Promise<string> {
  const id = uuid.parse(boxId);
  const code = newCode();
  await call(userId, sql`select gift_code_issue(${id}, ${codeHash(code)})`, "gift.code_issued", id);
  return code;
}

export async function receiveGift(userId: string, code: unknown): Promise<string> {
  await enforceRateLimit("giftCode", userId);
  const c = z.string().trim().min(8).max(40).parse(code);
  const rows = await call<{ id: string }>(userId, sql`select gift_receive(${codeHash(c)}) as id`);
  await withUser(userId, (tx) => audit(tx, userId, "gift.received", "gift_box", rows[0]!.id));
  return rows[0]!.id;
}

export async function deliverAsBook(userId: string, boxId: string) {
  const id = uuid.parse(boxId);
  await call(userId, sql`select gift_deliver_pdf(${id})`, "gift.delivered_as_book", id);
}

export async function myGiftBoxes(userId: string): Promise<GiftSummary[]> {
  return call<GiftSummary>(userId, sql`select * from gift_boxes_mine()`);
}

export async function readGiftBox(userId: string, boxId: string): Promise<GiftBox> {
  const id = uuid.parse(boxId);
  const rows = await call<{ b: GiftBox }>(userId, sql`select gift_box_read(${id}) as b`);
  return rows[0]!.b;
}

/** Received boxes, in full (for the child's manual and export). */
export async function receivedGifts(userId: string): Promise<GiftBox[]> {
  const mine = await myGiftBoxes(userId);
  const out: GiftBox[] = [];
  for (const g of mine.filter((x) => x.my_role === "child")) out.push(await readGiftBox(userId, g.id));
  return out;
}
