import { NextResponse, type NextRequest } from "next/server";
import { dmSync } from "@/server/services/dm";
import { dmRoute, noStore } from "../../guard";

/**
 * What changed since `since` (new, edited, unsent, reacted), plus who's typing and read state, in
 * one database call. `read=1` marks it read; `typing=1` says I'm typing.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const q = req.nextUrl.searchParams;
  return dmRoute(req, async (uid) => NextResponse.json(await dmSync(uid, id, { since: q.get("since"), read: q.get("read") === "1", typing: q.get("typing") === "1" }), { headers: noStore }));
}
