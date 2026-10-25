/**
 * Photos and videos on records (up to 5 per record). The browser makes the picture sizes
 * (a full photo of at most 2048px and a small one for lists, or a video's first frame), so the
 * server only checks what the bytes really are and stores them. Videos arrive and are served in
 * 4 MiB parts, so neither an upload nor a response grows past what a function may carry.
 * Who may see an item follows its record (memory_media_* in migration 0029).
 */
import { sql } from "drizzle-orm";
import { z } from "zod";
import { uuid } from "@/lib/validation/common";
import { hitInTx } from "../auth/rate-limit";
import { MEDIA_CHUNK_BYTES } from "../db/schema";
import { withUser, type Tx } from "../db/tx";
import { AppError, invalid, mapDbError } from "../errors";

export const MAX_MEDIA = 5;
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 30 * 1024 * 1024;
export { MEDIA_CHUNK_BYTES };

export interface MediaItem {
  id: string;
  kind: "image" | "video";
  width: number;
  height: number;
  durationMs: number | null;
}

async function run<T>(userId: string, fn: (tx: Tx) => Promise<T>) {
  return withUser(userId, async (tx) => {
    try {
      return await fn(tx);
    } catch (e) {
      mapDbError(e);
    }
  });
}

/** What the bytes really are (never what the browser says they are). */
export function sniffMedia(b: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | "video/mp4" | "video/quicktime" | "video/webm" | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length > 8 && b[0] === 0x89 && ascii(1, 4) === "PNG") return "image/png";
  if (b.length > 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (b.length > 12 && ascii(4, 8) === "ftyp") return ascii(8, 10) === "qt" ? "video/quicktime" : "video/mp4";
  if (b.length > 4 && b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return "video/webm";
  return null;
}

const startSchema = z.object({
  kind: z.enum(["image", "video"]),
  width: z.coerce.number().int().min(1).max(10000),
  height: z.coerce.number().int().min(1).max(10000),
  durationMs: z.coerce.number().int().min(0).max(24 * 3600_000).optional(),
  size: z.coerce.number().int().min(1),
});

/**
 * Start an upload. A photo comes whole (`first` is all of it); a video brings its first part and
 * says its full size, the rest follows with putChunk. Returns the id and whether it is complete.
 */
export async function startUpload(userId: string, input: unknown, thumb: Uint8Array, first: Uint8Array): Promise<{ id: string; complete: boolean }> {
  const d = startSchema.parse(input);
  const mime = sniffMedia(first);
  const tmime = sniffMedia(thumb);
  if (!mime || (d.kind === "image") !== mime.startsWith("image/") || tmime !== "image/jpeg") throw invalid("invalid_media");
  if (d.size > (d.kind === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES)) throw new AppError("media_too_large", 413);
  const chunks = d.kind === "image" ? 1 : Math.ceil(d.size / MEDIA_CHUNK_BYTES);
  return run(userId, async (tx) => {
    if (!(await hitInTx(tx, "memoryMedia", userId))) throw new AppError("rate_limited", 429);
    const r = await tx.execute<{ id: string }>(
      sql`select memory_media_create(${d.kind}, ${mime}, ${d.width}, ${d.height}, ${d.durationMs ?? null}, ${d.size}, ${chunks}, ${Buffer.from(thumb)}) as id`,
    );
    const id = r.rows[0]!.id;
    const c = await tx.execute<{ done: boolean }>(sql`select memory_media_put(${id}, 0, ${Buffer.from(first)}) as done`);
    return { id, complete: c.rows[0]!.done };
  });
}

/** One more part of a video upload; true once all of it is in. */
export async function putChunk(userId: string, mediaId: string, idx: number, bytes: Uint8Array): Promise<boolean> {
  const id = uuid.parse(mediaId);
  if (!Number.isInteger(idx) || idx < 1 || idx > 64) throw invalid("invalid_media");
  return run(userId, async (tx) => (await tx.execute<{ done: boolean }>(sql`select memory_media_put(${id}, ${idx}, ${Buffer.from(bytes)}) as done`)).rows[0]!.done);
}

/** Set a record's photos and videos (in order), inside the transaction that saves it. */
export async function attachMedia(tx: Tx, entryId: string, ids: string[]) {
  const list = z.array(uuid).max(MAX_MEDIA).parse(ids);
  try {
    await tx.execute(sql`select memory_media_attach(${entryId}, ${`{${list.join(",")}}`}::uuid[])`);
  } catch (e) {
    mapDbError(e);
  }
}

/** The photos and videos of these records that I may see, by record. */
export async function mediaFor(userId: string, entryIds: string[]): Promise<Map<string, MediaItem[]>> {
  const out = new Map<string, MediaItem[]>();
  const ids = [...new Set(entryIds)].filter((x) => uuid.safeParse(x).success);
  if (!ids.length) return out;
  const rows = await run(userId, (tx) =>
    tx.execute<{ id: string; entry_id: string; kind: "image" | "video"; width: number; height: number; duration_ms: number | null }>(
      sql`select * from memory_media_for(${`{${ids.join(",")}}`}::uuid[])`,
    ),
  );
  for (const r of rows.rows) {
    const list = out.get(r.entry_id) ?? [];
    list.push({ id: r.id, kind: r.kind, width: r.width, height: r.height, durationMs: r.duration_ms });
    out.set(r.entry_id, list);
  }
  return out;
}

export async function mediaInfo(userId: string, mediaId: string) {
  if (!uuid.safeParse(mediaId).success) return null;
  const r = await run(userId, (tx) => tx.execute<{ kind: string; mime: string; size: number; chunks: number; complete: boolean }>(sql`select * from memory_media_get(${mediaId})`));
  return r.rows[0] ?? null;
}

export async function mediaThumb(userId: string, mediaId: string): Promise<Buffer | null> {
  if (!uuid.safeParse(mediaId).success) return null;
  const r = await run(userId, (tx) => tx.execute<{ b: Buffer | null }>(sql`select memory_media_thumb(${mediaId}) as b`));
  return r.rows[0]?.b ?? null;
}

export async function mediaChunk(userId: string, mediaId: string, idx: number): Promise<Buffer | null> {
  const r = await run(userId, (tx) => tx.execute<{ b: Buffer | null }>(sql`select memory_media_chunk(${mediaId}, ${idx}) as b`));
  return r.rows[0]?.b ?? null;
}
