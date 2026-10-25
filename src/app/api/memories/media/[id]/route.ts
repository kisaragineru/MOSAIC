import { NextResponse, type NextRequest } from "next/server";
import { MEDIA_CHUNK_BYTES, mediaChunk, mediaInfo } from "@/server/services/media";
import { dmRoute } from "../../../dm/guard";

const HEAD = { "Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'", "Accept-Ranges": "bytes" };

/**
 * A record's photo or video, for whoever may see the record. Videos are served by range, one
 * stored part at most per response (players ask for the next range as they go); without a
 * range the parts are streamed one after another.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return dmRoute(req, async (uid) => {
    const m = await mediaInfo(uid, id);
    if (!m || !m.complete) return NextResponse.json({ error: "not_found" }, { status: 404, headers: { "Cache-Control": "private, no-store" } });
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "");
    if (range && (range[1] || range[2])) {
      // "bytes=-N" is the last N bytes.
      let start = range[1] ? Number(range[1]) : Math.max(m.size - Number(range[2]), 0);
      let end = range[1] && range[2] ? Number(range[2]) : m.size - 1;
      if (start >= m.size || end < start) return new NextResponse(null, { status: 416, headers: { ...HEAD, "Content-Range": `bytes */${m.size}` } });
      const idx = Math.floor(start / MEDIA_CHUNK_BYTES);
      end = Math.min(end, m.size - 1, (idx + 1) * MEDIA_CHUNK_BYTES - 1);
      const part = await mediaChunk(uid, id, idx);
      if (!part) return NextResponse.json({ error: "not_found" }, { status: 404 });
      const from = start - idx * MEDIA_CHUNK_BYTES;
      start = idx * MEDIA_CHUNK_BYTES + from;
      return new NextResponse(new Uint8Array(part.subarray(from, from + (end - start) + 1)), {
        status: 206,
        headers: { ...HEAD, "Content-Type": m.mime, "Content-Range": `bytes ${start}-${end}/${m.size}`, "Content-Length": String(end - start + 1) },
      });
    }
    let i = 0;
    const body = new ReadableStream<Uint8Array>({
      async pull(c) {
        if (i >= m.chunks) return c.close();
        const part = await mediaChunk(uid, id, i++);
        if (!part) return c.error(new Error("missing part"));
        c.enqueue(new Uint8Array(part));
      },
    });
    return new NextResponse(body, { headers: { ...HEAD, "Content-Type": m.mime, "Content-Length": String(m.size) } });
  });
}
