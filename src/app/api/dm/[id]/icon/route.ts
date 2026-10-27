import { NextResponse, type NextRequest } from "next/server";
import { getGroupPhoto } from "@/server/services/group-photo";
import { dmRoute } from "../../guard";

/** A group's photo, for its members. Links carry the photo's version, so a matching request can be kept. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return dmRoute(req, async (uid) => {
    const p = await getGroupPhoto(uid, id);
    if (!p) return NextResponse.json({ error: "not_found" }, { status: 404, headers: { "Cache-Control": "private, no-store" } });
    const current = req.nextUrl.searchParams.get("v") === String(p.version);
    return new NextResponse(new Uint8Array(p.bytes), {
      headers: {
        "Content-Type": p.mime,
        "Cache-Control": current ? "private, max-age=31536000, immutable" : "private, no-cache",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'",
      },
    });
  });
}
