"use server";
import { setManualShare } from "@/server/services/manual-share";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { currentUserId, requireUser } from "@/server/auth/session";
import {
  addPersonFromConnection,
  createShare,
  getComparison,
  giveConsent,
  linkPersonToConnection,
  lookupShare,
  openComparison,
  revokeComparison,
  revokeShare,
  unlinkPerson,
} from "@/server/services/sharing";
import { attempt, bool, safeNext, str, withParam } from "./util";

export type ShareState = { url: string; qr: string; expiresAt: string } | { error: string } | null;

export async function createShareAction(_prev: ShareState, form: FormData): Promise<ShareState> {
  const uid = await requireUser();
  const r = await attempt("share.create", () =>
    createShare(uid, { label: str(form, "label"), expiresInDays: str(form, "expiresInDays") || "7", maxUses: str(form, "maxUses") }),
  );
  if (!r.ok) return { error: r.error };
  const svg = await QRCode.toString(r.value.url, { type: "svg", errorCorrectionLevel: "M", margin: 2 });
  revalidatePath("/share");
  return { url: r.value.url, qr: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`, expiresAt: r.value.expiresAt.toISOString() };
}

export async function revokeShareAction(form: FormData) {
  const uid = await requireUser();
  const r = await attempt("share.revoke", () => revokeShare(uid, str(form, "shareId")));
  revalidatePath("/share");
  redirect(r.ok ? "/share?ok=saved" : `/share?e=${r.error}`);
}

export type LookupState = { ownerDisplayName: string; isOwn: boolean } | { error: string };

export async function lookupShareAction(token: string): Promise<LookupState> {
  const uid = await currentUserId();
  if (!uid) return { error: "unauthorized" };
  const r = await attempt("share.lookup", () => lookupShare(uid, token));
  return r.ok ? r.value : { error: r.error };
}

export async function openComparisonAction(token: string): Promise<{ id: string } | { error: string }> {
  const uid = await currentUserId();
  if (!uid) return { error: "unauthorized" };
  const r = await attempt("comparison.open", () => openComparison(uid, token));
  return r.ok ? { id: r.value } : { error: r.error };
}

export async function consentAction(form: FormData) {
  const uid = await requireUser();
  const id = str(form, "sessionId");
  const scopes = form.getAll("scopes").filter((x): x is string => typeof x === "string");
  const r = await attempt("comparison.consent", () => giveConsent(uid, id, { scopes, agree: bool(form, "agree") }));
  revalidatePath(`/compare/${id}`);
  const back = safeNext(str(form, "back"), `/compare/${id}`);
  redirect(withParam(back, r.ok ? "ok" : "e", r.ok ? "saved" : r.error));
}

export async function endComparisonAction(form: FormData) {
  const uid = await requireUser();
  const id = str(form, "sessionId");
  const r = await attempt("comparison.revoke", () => revokeComparison(uid, id));
  revalidatePath("/share");
  revalidatePath("/people");
  const back = safeNext(str(form, "back"), `/compare/${id}`);
  redirect(r.ok ? back : withParam(back, "e", r.error));
}

export async function recomputeAction(form: FormData) {
  const uid = await requireUser();
  const id = str(form, "sessionId");
  const r = await attempt("comparison.recompute", () => getComparison(uid, id, { recompute: true }));
  redirect(r.ok ? `/compare/${id}?ok=saved` : `/compare/${id}?e=${r.error}`);
}

export async function addPersonFromConnectionAction(form: FormData) {
  const uid = await requireUser();
  const id = str(form, "sessionId");
  const existing = str(form, "personId");
  // Someone already in People: attach the connection to them (relationship as it was).
  const r = existing
    ? await attempt("person.link", async () => {
        await linkPersonToConnection(uid, existing, id);
        return existing;
      })
    : await attempt("person.fromConnection", () => addPersonFromConnection(uid, id, str(form, "relationship") || "friend"));
  revalidatePath("/people");
  redirect(r.ok ? `/people/${r.value}?ok=saved` : `/compare/${id}?e=${r.error}`);
}

export async function linkPersonAction(form: FormData) {
  const uid = await requireUser();
  const personId = str(form, "personId");
  const r = await attempt("person.link", () => linkPersonToConnection(uid, personId, str(form, "sessionId")));
  revalidatePath("/people");
  redirect(withParam(safeNext(str(form, "back"), `/people/${personId}`), r.ok ? "ok" : "e", r.ok ? "saved" : r.error));
}

export async function unlinkPersonAction(form: FormData) {
  const uid = await requireUser();
  const personId = str(form, "personId");
  const r = await attempt("person.unlink", () => unlinkPerson(uid, personId));
  revalidatePath("/people");
  redirect(withParam(safeNext(str(form, "back"), `/people/${personId}`), r.ok ? "ok" : "e", r.ok ? "saved" : r.error));
}

export async function manualShareAction(form: FormData) {
  const uid = await requireUser();
  const id = str(form, "sessionId");
  const r = await attempt("manual.share", () => setManualShare(uid, id, str(form, "preset")));
  revalidatePath(`/compare/${id}`);
  const back = safeNext(str(form, "back"), `/compare/${id}`);
  redirect(withParam(back, r.ok ? "ok" : "e", r.ok ? "saved" : r.error));
}
