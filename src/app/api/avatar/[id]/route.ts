import { NextResponse, type NextRequest } from "next/server";
import { getAvatar } from "@/server/services/avatars";
import { dmRoute } from "../../dm/guard";

/**
 * A profile photo, for people allowed to see it. Links carry the photo's version, so a matching
 * request can be kept by the browser; a changed photo gets a new link.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return dmRoute(req, async (uid) => {
    const a = await getAvatar(uid, id);
    if (!a) return NextResponse.json({ error: "not_found" }, { status: 404, headers: { "Cache-Control": "private, no-store" } });
    const current = req.nextUrl.searchParams.get("v") === String(a.version);
    return new NextResponse(new Uint8Array(a.bytes), {
      headers: {
        "Content-Type": a.mime,
        "Cache-Control": current ? "private, max-age=31536000, immutable" : "private, no-cache",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'",
      },
    });
  });
}
