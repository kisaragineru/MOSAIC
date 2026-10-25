import { NextResponse, type NextRequest } from "next/server";
import { mediaThumb } from "@/server/services/media";
import { dmRoute } from "../../../../dm/guard";

/** The small picture of a record's photo or video, for whoever may see the record. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return dmRoute(req, async (uid) => {
    const b = await mediaThumb(uid, id);
    if (!b) return NextResponse.json({ error: "not_found" }, { status: 404, headers: { "Cache-Control": "private, no-store" } });
    return new NextResponse(new Uint8Array(b), {
      headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'" },
    });
  });
}
