/**
 * Profile photos. The browser crops and resizes (a 512px square); the server only checks that
 * the bytes are a real image and stores them. Who may see a photo is decided in SQL
 * (migration 0023): its owner, people connected with them, people sharing a conversation.
 */
import { sql } from "drizzle-orm";
import { cache } from "react";
import { uuid } from "@/lib/validation/common";
import { withUser } from "../db/tx";
import { invalid } from "../errors";
import { audit } from "./audit";
import { sniffImage } from "./dm";

export const AVATAR_MAX_BYTES = 1_000_000;

export async function setAvatar(userId: string, bytes: Uint8Array): Promise<number> {
  if (bytes.length === 0 || bytes.length > AVATAR_MAX_BYTES) throw invalid("image_too_large");
  const mime = sniffImage(bytes);
  if (!mime) throw invalid("invalid_image");
  return withUser(userId, async (tx) => {
    const v = (await tx.execute<{ v: number }>(sql`select avatar_set(${mime}, ${Buffer.from(bytes)}) as v`)).rows[0]!.v;
    await audit(tx, userId, "profile.avatar_set");
    return Number(v);
  });
}

export async function removeAvatar(userId: string) {
  await withUser(userId, async (tx) => {
    await tx.execute(sql`select avatar_remove()`);
    await audit(tx, userId, "profile.avatar_removed");
  });
}

export async function getAvatar(userId: string, ofUser: string): Promise<{ mime: string; bytes: Buffer; version: number } | null> {
  const id = uuid.safeParse(ofUser);
  if (!id.success) return null;
  const r = await withUser(userId, (tx) => tx.execute<{ mime: string; bytes: Buffer; version: number }>(sql`select * from avatar_get(${id.data})`));
  const a = r.rows[0];
  return a ? { ...a, version: Number(a.version) } : null;
}

const url = (id: string, v: number) => `/api/avatar/${id}?v=${v}`;

/** Links to the photos I may see among these people (people without one, or hidden from me, are left out). */
export async function avatarUrls(userId: string, ids: (string | null | undefined)[]): Promise<Map<string, string>> {
  const list = [...new Set(ids.filter((x): x is string => !!x && uuid.safeParse(x).success))].slice(0, 200);
  if (!list.length) return new Map();
  const r = await withUser(userId, (tx) => tx.execute<{ user_id: string; version: number }>(sql`select * from avatar_versions(${`{${list.join(",")}}`}::uuid[])`));
  return new Map(r.rows.map((x) => [x.user_id, url(x.user_id, Number(x.version))]));
}

/** My own photo's link, once per page render (the header shows it). */
export const myAvatarUrl = cache(async (userId: string) => (await avatarUrls(userId, [userId])).get(userId) ?? null);
