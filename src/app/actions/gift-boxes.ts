"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import {
  connectGiftWriter, createGiftBox, linkCode, receivePath, deleteGiftEntry, deliverAsBook, inviteGiftWriter, issueReceiveCode, joinGiftBox, receiveGift, removeGiftWriter,
  saveGiftEntry, updateGiftBox,
} from "@/server/services/gift-boxes";
import { appOrigin } from "@/server/services/sharing";
import { attempt, str, withParam } from "./util";

const boxUrl = (id: string, tab?: string) => `/gifts/${id}${tab ? `?tab=${tab}` : ""}`;

export async function createGiftBoxAction(form: FormData) {
  const uid = await requireUser();
  const r = await attempt("gift.create", () =>
    createGiftBox(uid, { childName: str(form, "childName"), childBirthday: str(form, "childBirthday"), deliverOn: str(form, "deliverOn"), role: str(form, "role"), label: str(form, "label") }),
  );
  revalidatePath("/gifts");
  redirect(r.ok ? withParam(boxUrl(r.value), "ok", "saved") : `/gifts?e=${r.error}`);
}

export async function updateGiftBoxAction(form: FormData) {
  const uid = await requireUser();
  const id = str(form, "boxId");
  const r = await attempt("gift.update", () => updateGiftBox(uid, id, { childName: str(form, "childName"), childBirthday: str(form, "childBirthday"), deliverOn: str(form, "deliverOn") }));
  redirect(withParam(boxUrl(id, "manage"), r.ok ? "ok" : "e", r.ok ? "saved" : r.error));
}

export async function joinGiftBoxAction(form: FormData) {
  const uid = await requireUser();
  const r = await attempt("gift.join", () => joinGiftBox(uid, str(form, "code"), str(form, "label")));
  revalidatePath("/gifts");
  redirect(r.ok ? withParam(boxUrl(r.value), "ok", "saved") : `/gifts?e=${r.error}`);
}

export async function receiveGiftAction(form: FormData) {
  const uid = await requireUser();
  const code = str(form, "code");
  const r = await attempt("gift.receive", () => receiveGift(uid, code));
  revalidatePath("/gifts");
  // From a receive link: a refusal is said on the link's own page.
  const link = str(form, "from") === "link" ? linkCode(code) : null;
  redirect(r.ok ? withParam(boxUrl(r.value), "ok", "saved") : link ? `/g/${link}?e=${r.error}` : `/gifts?e=${r.error}`);
}

/** The child connects with one of the box's writers; the book page shows where they stand. */
export async function connectGiftWriterAction(form: FormData) {
  const uid = await requireUser();
  const id = str(form, "boxId");
  const r = await attempt("gift.connect", () => connectGiftWriter(uid, id, str(form, "userId")));
  revalidatePath("/people");
  redirect(`/gifts/${id}/book?${r.ok ? "ok=saved" : `e=${r.error}`}#writers`);
}

export async function giftEntryAction(form: FormData) {
  const uid = await requireUser();
  const id = str(form, "boxId");
  const kind = str(form, "kind");
  const tab = kind === "letter" ? "letters" : "growth";
  const r = await attempt("gift.entry", () =>
    saveGiftEntry(
      uid,
      id,
      {
        kind,
        occurredOn: str(form, "occurredOn"),
        title: str(form, "title"),
        body: str(form, "body"),
        ...(form.has("mediaField") && kind === "growth" ? { media: form.getAll("media").filter((x): x is string => typeof x === "string" && x !== "") } : {}),
      },
      str(form, "entryId") || undefined,
    ),
  );
  redirect(withParam(boxUrl(id, tab), r.ok ? "ok" : "e", r.ok ? "saved" : r.error));
}

export async function deleteGiftEntryAction(form: FormData) {
  const uid = await requireUser();
  const id = str(form, "boxId");
  const r = await attempt("gift.entry_delete", () => deleteGiftEntry(uid, str(form, "entryId")));
  redirect(withParam(boxUrl(id, str(form, "tab") || "growth"), r.ok ? "ok" : "e", r.ok ? "deleted" : r.error));
}

export async function removeGiftWriterAction(form: FormData) {
  const uid = await requireUser();
  const id = str(form, "boxId");
  const r = await attempt("gift.remove", () => removeGiftWriter(uid, id, str(form, "userId"), str(form, "keep") !== "no"));
  redirect(withParam(boxUrl(id, "manage"), r.ok ? "ok" : "e", r.ok ? "saved" : r.error));
}

export async function deliverAsBookAction(form: FormData) {
  const uid = await requireUser();
  const id = str(form, "boxId");
  const r = await attempt("gift.book", () => deliverAsBook(uid, id));
  revalidatePath("/gifts");
  redirect(r.ok ? `/gifts/${id}/book` : withParam(boxUrl(id, "manage"), "e", r.error));
}

/** `link`: the same code as a link to send (receive codes only). */
export type CodeState = { code?: string; link?: string; error?: string };

export async function inviteCodeAction(_prev: CodeState, form: FormData): Promise<CodeState> {
  const uid = await requireUser();
  const r = await attempt("gift.invite", () => inviteGiftWriter(uid, str(form, "boxId"), str(form, "role")));
  return r.ok ? { code: r.value } : { error: r.error };
}

export async function receiveCodeAction(_prev: CodeState, form: FormData): Promise<CodeState> {
  const uid = await requireUser();
  const r = await attempt("gift.code", () => issueReceiveCode(uid, str(form, "boxId")));
  revalidatePath(`/gifts/${str(form, "boxId")}`);
  return r.ok ? { code: r.value, link: `${appOrigin()}${receivePath(r.value)}` } : { error: r.error };
}
