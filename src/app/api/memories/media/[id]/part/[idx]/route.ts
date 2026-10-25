import { NextResponse, type NextRequest } from "next/server";
import { MEDIA_CHUNK_BYTES, putChunk } from "@/server/services/media";
import { dmRoute, noStore } from "../../../../../dm/guard";

/** The next 4 MiB of a video upload (raw bytes). */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; idx: string }> }) {
  const { id, idx } = await params;
  return dmRoute(req, async (uid) => {
    if (Number(req.headers.get("content-length") ?? 0) > MEDIA_CHUNK_BYTES) return NextResponse.json({ error: "media_too_large" }, { status: 413 });
    const bytes = new Uint8Array(await req.arrayBuffer());
    if (bytes.length > MEDIA_CHUNK_BYTES) return NextResponse.json({ error: "media_too_large" }, { status: 413 });
    return NextResponse.json({ complete: await putChunk(uid, id, Number(idx), bytes) }, { headers: noStore });
  });
}
