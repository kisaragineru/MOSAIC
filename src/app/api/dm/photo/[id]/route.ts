import { NextResponse, type NextRequest } from "next/server";
import { dmAttachment } from "@/server/services/dm";
import { dmRoute } from "../../guard";

/** A photo from a message, for members who can see it. Private to the browser; ids never change. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return dmRoute(req, async (uid) => {
    const a = await dmAttachment(uid, id);
    if (!a) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return new NextResponse(new Uint8Array(a.bytes), {
      headers: { "Content-Type": a.mime, "Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'" },
    });
  });
}
