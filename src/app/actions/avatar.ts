"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { removeAvatar, setAvatar } from "@/server/services/avatars";
import { attempt } from "./util";

/** The cropped photo from the editor (returns a result; the editor moves on). */
export async function uploadAvatarAction(form: FormData) {
  const uid = await requireUser();
  const file = form.get("photo");
  if (!(file instanceof File)) return { ok: false as const, error: "invalid_image" };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const r = await attempt("avatar.set", () => setAvatar(uid, bytes));
  if (r.ok) revalidatePath("/", "layout");
  return r;
}

export async function removeAvatarAction() {
  const uid = await requireUser();
  const r = await attempt("avatar.remove", () => removeAvatar(uid));
  revalidatePath("/", "layout");
  redirect(`/me/photo?${r.ok ? "ok=deleted" : `e=${r.error}`}`);
}
