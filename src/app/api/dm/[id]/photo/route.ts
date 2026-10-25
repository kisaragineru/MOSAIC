import { NextResponse, type NextRequest } from "next/server";
import { DM_MAX_PHOTO_BYTES, uploadPhotoFast } from "@/server/services/dm";
import { dmRoute, noStore } from "../../guard";

/** Upload one photo (multipart: photo, width, height) for a message about to be sent. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return dmRoute(req, async (uid) => {
    if (Number(req.headers.get("content-length") ?? 0) > DM_MAX_PHOTO_BYTES + 100_000) return NextResponse.json({ error: "image_too_large" }, { status: 413 });
    const form = await req.formData().catch(() => null);
    const file = form?.get("photo");
    if (!(file instanceof File)) return NextResponse.json({ error: "invalid_image" }, { status: 400 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    return NextResponse.json({ id: await uploadPhotoFast(uid, id, bytes, form!.get("width"), form!.get("height")) }, { headers: noStore });
  });
}
