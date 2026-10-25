import { NextResponse, type NextRequest } from "next/server";
import { currentUserId } from "@/server/auth/session";
import { AppError } from "@/server/errors";
import { logError } from "@/server/log";

/**
 * Message reads for the signed-in user, from this site only (Fetch Metadata), never cached.
 * Known failures become their status; anything else is logged without details.
 */
export async function dmRoute(req: NextRequest, fn: (uid: string) => Promise<NextResponse>) {
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  // Writes also need this site's Origin (CSRF), as server actions do.
  if (req.method !== "GET") {
    const origin = req.headers.get("origin");
    const expected = new URL(process.env.APP_ORIGIN ?? req.nextUrl.origin).origin;
    if (origin !== expected && !((origin === null || origin === "null") && site === "same-origin")) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const uid = await currentUserId();
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    return await fn(uid);
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.code }, { status: e.status ?? 400 });
    if ((e as Error).name === "ZodError") return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    logError("dm.route", e);
    return NextResponse.json({ error: "generic" }, { status: 500 });
  }
}

export const noStore = { "Cache-Control": "no-store" };
