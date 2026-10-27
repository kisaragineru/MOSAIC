/**
 * A group's photo. The browser crops it like a profile photo (a 512px square); the server checks
 * the bytes are a real image. Any member may change it, and the change is told in the
 * conversation; a group MOSAIC runs (the beta testers') takes one only from an admin.
 * Rules live in migration 0068.
 */
import { sql } from "drizzle-orm";
import { uuid } from "@/lib/validation/common";
import { withUser } from "../db/tx";
import { invalid, mapDbError } from "../errors";
import { isAdmin } from "./admin";
import { audit } from "./audit";
import { AVATAR_MAX_BYTES } from "./avatars";
import { sniffImage } from "./dm";

export async function setGroupPhoto(userId: string, conversationId: string, bytes: Uint8Array): Promise<number> {
  const id = uuid.parse(conversationId);
  if (bytes.length === 0 || bytes.length > AVATAR_MAX_BYTES) throw invalid("image_too_large");
  const mime = sniffImage(bytes);
  if (!mime) throw invalid("invalid_image");
  const admin = await isAdmin(userId);
  return withUser(userId, async (tx) => {
    try {
      const v = (await tx.execute<{ v: number }>(sql`select dm_group_photo_set(${id}, ${mime}, ${Buffer.from(bytes)}, ${admin}) as v`)).rows[0]!.v;
      await audit(tx, userId, "dm.group_photo_set", "dm_conversation", id);
      return Number(v);
    } catch (e) {
      mapDbError(e);
    }
  });
}

export async function removeGroupPhoto(userId: string, conversationId: string) {
  const id = uuid.parse(conversationId);
  const admin = await isAdmin(userId);
  await withUser(userId, async (tx) => {
    try {
      await tx.execute(sql`select dm_group_photo_remove(${id}, ${admin})`);
      await audit(tx, userId, "dm.group_photo_removed", "dm_conversation", id);
    } catch (e) {
      mapDbError(e);
    }
  });
}

export async function getGroupPhoto(userId: string, conversationId: string): Promise<{ mime: string; bytes: Buffer; version: number } | null> {
  const id = uuid.safeParse(conversationId);
  if (!id.success) return null;
  const r = await withUser(userId, (tx) => tx.execute<{ mime: string; bytes: Buffer; version: number }>(sql`select * from dm_group_photo_get(${id.data})`));
  const p = r.rows[0];
  return p ? { ...p, version: Number(p.version) } : null;
}

/** Links to the photos of these groups I am (or was) in; groups without one are left out. */
export async function groupPhotoUrls(userId: string, ids: string[]): Promise<Map<string, string>> {
  const list = [...new Set(ids.filter((x) => uuid.safeParse(x).success))].slice(0, 200);
  if (!list.length) return new Map();
  const r = await withUser(userId, (tx) => tx.execute<{ conversation_id: string; version: number }>(sql`select * from dm_group_photo_versions(${`{${list.join(",")}}`}::uuid[])`));
  return new Map(r.rows.map((x) => [x.conversation_id, `/api/dm/${x.conversation_id}/icon?v=${Number(x.version)}`]));
}
