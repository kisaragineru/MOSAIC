import { NextResponse, type NextRequest } from "next/server";
import { dmMessages } from "@/server/services/dm";
import { dmRoute, noStore } from "../../guard";

/** The page of messages before `before`. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return dmRoute(req, async (uid) => NextResponse.json({ messages: await dmMessages(uid, id, { before: req.nextUrl.searchParams.get("before"), limit: 40 }) }, { headers: noStore }));
}
