"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { splitTags } from "@/lib/validation/common";
import { requireUser } from "@/server/auth/session";
import { createMemory, deleteMemory, deleteTag, editMemory, renameTag, setMemoryFeeling, setMemoryLabels, setTagNote } from "@/server/services/memories";
import { tagHref } from "@/lib/tag-href";
import { setMemoriesAudience, setMemoryAudience } from "@/server/services/memory-share";
import { attempt, safeNext, str, withParam } from "./util";

function fromForm(f: FormData) {
  const kind = str(f, "kind") || "note";
  return {
    kind,
    title: str(f, "title"),
    body: str(f, "body"),
    reason: str(f, "reason"),
    mood: str(f, "mood"),
    occurredOn: str(f, "occurredOn"),
    // The opening day is only shown for letters; a date left there after switching kind is dropped.
    revealOn: kind === "letter_to_future" ? str(f, "revealOn") : "",
    tags: splitTags(str(f, "tags")),
    personIds: f.getAll("personIds").filter((x): x is string => typeof x === "string" && x !== ""),
    // Photos and videos come as ordered ids, only from forms that offer them.
    ...(f.has("mediaField") && kind !== "letter_to_future" ? { media: f.getAll("media").filter((x): x is string => typeof x === "string" && x !== "") } : {}),
  };
}

/**
 * Who may read it; letters always stay private (the field isn't shown for them). The full form
 * sends visibility + circle checkboxes; the quick composer sends one value ("circle:family").
 */
function audienceFromForm(f: FormData) {
  const v = str(f, "visibility");
  if (v.startsWith("circle:")) return { visibility: "circles", circles: [v.slice(7)], people: [] };
  // One person by name (the privacy page's bulk change).
  if (v.startsWith("person:")) return { visibility: "circles", circles: [], people: [v.slice(7)] };
  return {
    visibility: v === "connections" || v === "circles" ? v : "private",
    circles: v === "circles" ? f.getAll("circles").filter((x): x is string => typeof x === "string" && x !== "") : [],
    people: v === "circles" ? f.getAll("people").filter((x): x is string => typeof x === "string" && x !== "") : [],
  };
}

export async function createMemoryAction(form: FormData) {
  const uid = await requireUser();
  const back = safeNext(str(form, "back"), "/memories/new");
  const data = fromForm(form);
  const r = await attempt("memory.create", () => createMemory(uid, data));
  if (!r.ok) redirect(withParam(back, "e", r.error));
  const audience = audienceFromForm(form);
  if (data.kind !== "letter_to_future" && audience.visibility !== "private") {
    // The record is saved (privately) even if the audience is refused: fix it on the record.
    const a = await attempt("memory.audience", () => setMemoryAudience(uid, r.value, audience));
    if (!a.ok) redirect(`/memories/${r.value}?edit=1&e=${a.error}`);
  }
  revalidatePath("/memories");
  revalidatePath("/home");
  redirect(str(form, "stay") ? withParam(back, "ok", "saved") : `/memories/${r.value}?ok=saved${data.kind === "letter_to_future" ? "" : "&ask=feeling"}`);
}

export async function editMemoryAction(form: FormData) {
  const uid = await requireUser();
  const id = str(form, "id");
  const data = fromForm(form);
  const r = await attempt("memory.edit", async () => {
    await editMemory(uid, id, data);
    if (data.kind !== "letter_to_future") await setMemoryAudience(uid, id, audienceFromForm(form));
  });
  if (!r.ok) redirect(`/memories/${encodeURIComponent(id)}?edit=1&e=${r.error}`);
  revalidatePath("/home");
  revalidatePath("/memories");
  redirect(`/memories/${id}?ok=saved`);
}

export async function deleteMemoryAction(form: FormData) {
  const uid = await requireUser();
  const r = await attempt("memory.delete", () => deleteMemory(uid, str(form, "id")));
  if (!r.ok) redirect(`/memories?e=${r.error}`);
  revalidatePath("/memories");
  redirect("/memories?ok=deleted");
}

export type QuickState = { ok: true; at: number; id: string } | { ok: false; error: string } | null;

/** The in-place composer on the journal: saves and stays, reporting back instead of redirecting. */
export async function quickMemoryAction(_prev: QuickState, form: FormData): Promise<QuickState> {
  const uid = await requireUser();
  const data = fromForm(form);
  if (data.kind === "letter_to_future") return { ok: false, error: "invalid_input" };
  const audience = audienceFromForm(form);
  // Checked before saving, so a retry doesn't post twice.
  if (audience.visibility === "circles" && audience.circles.length === 0) return { ok: false, error: "choose_audience" };
  let created = "";
  const r = await attempt("memory.quick", async () => {
    const id = await createMemory(uid, data);
    created = id;
    if (audience.visibility !== "private") await setMemoryAudience(uid, id, audience);
  });
  if (!r.ok) return { ok: false, error: r.error };
  revalidatePath("/memories");
  revalidatePath("/home");
  return { ok: true, at: Date.now(), id: created };
}

/** The owner confirms ("labels" as they are) or corrects what a post is about. */
export async function setLabelsAction(form: FormData) {
  const uid = await requireUser();
  const id = str(form, "id");
  const r = await attempt("memory.labels", () => setMemoryLabels(uid, id, form.getAll("labels").filter((x): x is string => typeof x === "string")));
  revalidatePath("/memories");
  redirect(`/memories/${encodeURIComponent(id)}?${r.ok ? "ok=saved" : `e=${r.error}`}`);
}

/** How they felt (a button on the record page). */
export async function setFeelingAction(form: FormData) {
  const uid = await requireUser();
  const id = str(form, "id");
  const r = await attempt("memory.feeling", () => setMemoryFeeling(uid, id, str(form, "feeling")));
  revalidatePath("/memories");
  revalidatePath("/home");
  redirect(`/memories/${encodeURIComponent(id)}${r.ok ? "" : `?e=${r.error}`}`);
}

/** The question right after posting from the sheet: answered in place. */
export async function quickFeelingAction(id: string, feeling: string): Promise<boolean> {
  const uid = await requireUser();
  const r = await attempt("memory.feeling", () => setMemoryFeeling(uid, id, feeling));
  if (r.ok) {
    revalidatePath("/memories");
    revalidatePath("/home");
  }
  return r.ok;
}

/** Many records to one audience at once (from the privacy page's list). */
export async function bulkAudienceAction(form: FormData) {
  const uid = await requireUser();
  const show = str(form, "show");
  const back = `/me/privacy/records${show === "private" || show === "all" ? `?show=${show}` : ""}`;
  const ids = form.getAll("id").filter((x): x is string => typeof x === "string" && x !== "");
  if (!ids.length) redirect(withParam(back, "e", "choose_records"));
  const r = await attempt("memory.bulk_audience", () => setMemoriesAudience(uid, ids, audienceFromForm(form)));
  revalidatePath("/", "layout");
  redirect(withParam(back, r.ok ? "ok" : "e", r.ok ? "saved" : r.error));
}

/** Rename (or merge into) another tag; back to the tag under its new name. */
export async function renameTagAction(form: FormData) {
  const uid = await requireUser();
  const from = str(form, "tag");
  const r = await attempt("memories.tag.rename", () => renameTag(uid, from, str(form, "to")));
  revalidatePath("/memories");
  redirect(r.ok ? `${tagHref(r.value)}?ok=saved` : `${tagHref(from)}?e=${r.error}`);
}

/** Take a tag off every record (the records stay). */
export async function deleteTagAction(form: FormData) {
  const uid = await requireUser();
  const tag = str(form, "tag");
  const r = await attempt("memories.tag.delete", () => deleteTag(uid, tag));
  revalidatePath("/memories");
  redirect(r.ok ? "/memories/tags?ok=deleted" : `${tagHref(tag)}?e=${r.error}`);
}

export async function tagNoteAction(form: FormData) {
  const uid = await requireUser();
  const tag = str(form, "tag");
  const r = await attempt("memories.tag.note", () => setTagNote(uid, tag, str(form, "note")));
  redirect(withParam(tagHref(tag), r.ok ? "ok" : "e", r.ok ? "saved" : r.error));
}
