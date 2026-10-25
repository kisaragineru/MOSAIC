import { NextResponse, type NextRequest } from "next/server";
import { MAX_IMAGE_BYTES, MEDIA_CHUNK_BYTES, startUpload } from "@/server/services/media";
import { dmRoute, noStore } from "../../dm/guard";

/**
 * Start a photo or video upload for a record (multipart: kind, width, height, durationMs, size,
 * thumb = a small JPEG, part = the photo, or a video's first 4 MiB). Returns its id.
 */
export async function POST(req: NextRequest) {
  return dmRoute(req, async (uid) => {
    if (Number(req.headers.get("content-length") ?? 0) > Math.max(MAX_IMAGE_BYTES, MEDIA_CHUNK_BYTES) + 400_000) return NextResponse.json({ error: "media_too_large" }, { status: 413 });
    const form = await req.formData().catch(() => null);
    const thumb = form?.get("thumb");
    const part = form?.get("part");
    if (!(thumb instanceof File) || !(part instanceof File)) return NextResponse.json({ error: "invalid_media" }, { status: 400 });
    const meta = Object.fromEntries(["kind", "width", "height", "durationMs", "size"].map((k) => [k, form!.get(k) || undefined]));
    const r = await startUpload(uid, meta, new Uint8Array(await thumb.arrayBuffer()), new Uint8Array(await part.arrayBuffer()));
    return NextResponse.json(r, { headers: noStore });
  });
}
