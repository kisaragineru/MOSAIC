import { NextResponse, type NextRequest } from "next/server";
import { sendMessageFast } from "@/server/services/dm";
import { dmRoute, noStore } from "../../guard";

/** Send a message named by the browser (JSON). Repeating the same id is safe. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return dmRoute(req, async (uid) => {
    const body = await req.json().catch(() => null);
    return NextResponse.json({ id: await sendMessageFast(uid, id, body) }, { headers: noStore });
  });
}
