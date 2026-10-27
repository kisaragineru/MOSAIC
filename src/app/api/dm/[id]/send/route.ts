import { NextResponse, type NextRequest } from "next/server";
import { sendMessageFast } from "@/server/services/dm";
import { notifyMessageLater } from "@/server/services/push";
import { dmRoute, noStore } from "../../guard";

/** Send a message named by the browser (JSON). Repeating the same id is safe. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return dmRoute(req, async (uid) => {
    const body = await req.json().catch(() => null);
    const sent = await sendMessageFast(uid, id, body);
    await notifyMessageLater(uid, sent);
    return NextResponse.json({ id: sent }, { headers: noStore });
  });
}
