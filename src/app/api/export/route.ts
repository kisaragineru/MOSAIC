import { NextResponse, type NextRequest } from "next/server";
import { currentUserId } from "@/server/auth/session";
import { AppError } from "@/server/errors";
import { logError } from "@/server/log";
import { buildExport } from "@/server/services/export";

/** POST-only, same-origin download of the user's full data export. */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const expected = new URL(process.env.APP_ORIGIN ?? req.nextUrl.origin).origin;
  if (origin !== expected) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const uid = await currentUserId();
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const { json, filename } = await buildExport(uid);
    return new NextResponse(json, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    if (e instanceof AppError) return NextResponse.redirect(new URL(`/settings?e=${e.code}`, expected), 303);
    logError("export", e);
    return NextResponse.json({ error: "generic" }, { status: 500 });
  }
}
