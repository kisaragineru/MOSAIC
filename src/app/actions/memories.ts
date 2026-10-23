"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { splitTags } from "@/lib/validation/common";
import { requireUser } from "@/server/auth/session";
import { createMemory, deleteMemory, editMemory } from "@/server/services/memories";
import { attempt, safeNext, str, withParam } from "./util";

function fromForm(f: FormData) {
  return {
    kind: str(f, "kind") || "thought",
    title: str(f, "title"),
    body: str(f, "body"),
    reason: str(f, "reason"),
    mood: str(f, "mood"),
    occurredOn: str(f, "occurredOn"),
    revealOn: str(f, "revealOn"),
    tags: splitTags(str(f, "tags")),
    personIds: f.getAll("personIds").filter((x): x is string => typeof x === "string" && x !== ""),
  };
}

export async function createMemoryAction(form: FormData) {
  const uid = await requireUser();
  const back = safeNext(str(form, "back"), "/memories/new");
  const r = await attempt("memory.create", () => createMemory(uid, fromForm(form)));
  if (!r.ok) redirect(withParam(back, "e", r.error));
  revalidatePath("/memories");
  revalidatePath("/home");
  redirect(str(form, "stay") ? withParam(back, "ok", "saved") : `/memories/${r.value}?ok=saved`);
}

export async function editMemoryAction(form: FormData) {
  const uid = await requireUser();
  const id = str(form, "id");
  const r = await attempt("memory.edit", () => editMemory(uid, id, fromForm(form)));
  if (!r.ok) redirect(`/memories/${encodeURIComponent(id)}?edit=1&e=${r.error}`);
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
