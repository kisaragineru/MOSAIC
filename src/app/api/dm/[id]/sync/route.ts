import { NextResponse, type NextRequest } from "next/server";
import { dmChanges, dmConversation, markRead } from "@/server/services/dm";
import { dmRoute, noStore } from "../../guard";

/** What changed since `since` (new, edited, unsent, reacted), plus who's typing and read state. `read=1` marks it read. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return dmRoute(req, async (uid) => {
    const since = req.nextUrl.searchParams.get("since");
    if (req.nextUrl.searchParams.get("read") === "1") await markRead(uid, id);
    const [messages, conversation] = [since ? await dmChanges(uid, id, since) : [], await dmConversation(uid, id)];
    return NextResponse.json({ messages, conversation }, { headers: noStore });
  });
}
