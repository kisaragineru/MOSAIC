"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { TENDENCY_KEYS } from "@/content/questions";
import { requireUser } from "@/server/auth/session";
import { answerPeer, askPeer, cancelPeer, declinePeer, withdrawPeerAnswer } from "@/server/services/peers";
import { attempt, safeNext, str, withParam } from "./util";

export async function askPeerAction(form: FormData) {
  const uid = await requireUser();
  const back = safeNext(str(form, "back"), "/me/others");
  const r = await attempt("peer.ask", () => askPeer(uid, str(form, "sessionId")));
  revalidatePath("/me/others");
  redirect(withParam(back, r.ok ? "ok" : "e", r.ok ? "saved" : r.error));
}

export async function answerPeerAction(form: FormData) {
  const uid = await requireUser();
  const id = str(form, "requestId");
  const answers: Record<string, number> = {};
  for (const k of TENDENCY_KEYS) {
    const v = str(form, `a_${k}`);
    if (v === "1" || v === "0" || v === "-1") answers[k] = Number(v);
  }
  const r = await attempt("peer.answer", () =>
    answerPeer(uid, id, { anonymous: str(form, "identity") !== "named", answers, comment: str(form, "comment") }),
  );
  revalidatePath("/home");
  redirect(`/others/${id}?${r.ok ? "ok=saved" : `e=${r.error}`}`);
}

export async function declinePeerAction(form: FormData) {
  const uid = await requireUser();
  const r = await attempt("peer.decline", () => declinePeer(uid, str(form, "requestId")));
  revalidatePath("/home");
  redirect(r.ok ? "/home" : `/others/${str(form, "requestId")}?e=${r.error}`);
}

export async function cancelPeerAction(form: FormData) {
  const uid = await requireUser();
  const r = await attempt("peer.cancel", () => cancelPeer(uid, str(form, "requestId")));
  revalidatePath("/me/others");
  redirect(`/me/others?${r.ok ? "ok=saved" : `e=${r.error}`}`);
}

export async function withdrawPeerAction(form: FormData) {
  const uid = await requireUser();
  const id = str(form, "requestId");
  const r = await attempt("peer.withdraw", () => withdrawPeerAnswer(uid, id));
  redirect(`/others/${id}?${r.ok ? "ok=deleted" : `e=${r.error}`}`);
}
