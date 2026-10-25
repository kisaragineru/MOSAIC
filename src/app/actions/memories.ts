"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { splitTags } from "@/lib/validation/common";
import { requireUser } from "@/server/auth/session";
import { createMemory, deleteMemory, editMemory } from "@/server/services/memories";
import { setMemoryAudience } from "@/server/services/memory-share";
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
  if (v.startsWith("circle:")) return { visibility: "circles", circles: [v.slice(7)] };
  return {
    visibility: v === "connections" || v === "circles" ? v : "private",
    circles: v === "circles" ? f.getAll("circles").filter((x): x is string => typeof x === "string" && x !== "") : [],
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
  redirect(str(form, "stay") ? withParam(back, "ok", "saved") : `/memories/${r.value}?ok=saved`);
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

export type QuickState = { ok: true; at: number } | { ok: false; error: string } | null;

/** The in-place composer on the journal: saves and stays, reporting back instead of redirecting. */
export async function quickMemoryAction(_prev: QuickState, form: FormData): Promise<QuickState> {
  const uid = await requireUser();
  const data = fromForm(form);
  if (data.kind === "letter_to_future") return { ok: false, error: "invalid_input" };
  const r = await attempt("memory.quick", async () => {
    const id = await createMemory(uid, data);
    const audience = audienceFromForm(form);
    if (audience.visibility !== "private") await setMemoryAudience(uid, id, audience);
  });
  if (!r.ok) return { ok: false, error: r.error };
  revalidatePath("/memories");
  revalidatePath("/home");
  return { ok: true, at: Date.now() };
}
