import { NextResponse, type NextRequest } from "next/server";
import { getLinkPreviewImage } from "@/server/services/link-preview";
import { dmRoute } from "../../../dm/guard";

/** A link preview's image, served from here (only real image bytes; never run as anything else). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  return dmRoute(req, async (uid) => {
    const img = await getLinkPreviewImage(uid, hash);
    if (!img) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return new NextResponse(new Uint8Array(img.bytes), {
      headers: { "Content-Type": img.mime, "Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'" },
    });
  });
}
