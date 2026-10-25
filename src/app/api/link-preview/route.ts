import { NextResponse, type NextRequest } from "next/server";
import { getLinkPreview } from "@/server/services/link-preview";
import { dmRoute } from "../dm/guard";

/** The Open Graph card for a web link (or null when the page has nothing to show). */
export async function GET(req: NextRequest) {
  return dmRoute(req, async (uid) => {
    const url = req.nextUrl.searchParams.get("url") ?? "";
    const preview = await getLinkPreview(uid, url);
    return NextResponse.json({ preview }, { headers: { "Cache-Control": "private, max-age=3600" } });
  });
}
