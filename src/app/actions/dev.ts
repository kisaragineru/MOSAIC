"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { companionAnswersAsks, companionWrites, createCompanion, deleteCompanion, enrichCompanion, reconnectCompanion } from "@/server/services/dev-companion";
import { attempt, str } from "./util";

// Development only: every service call refuses unless DEV_TOOLS=on.

function done(r: { ok: boolean; error?: string }, ok = "saved") {
  revalidatePath("/settings");
  revalidatePath("/home");
  revalidatePath("/memories");
  revalidatePath("/people");
  redirect(`/settings?${r.ok ? `ok=${ok}` : `e=${r.error}`}#dev`);
}

export async function createCompanionAction(form: FormData) {
  const uid = await requireUser();
  done(await attempt("dev.companion", () => createCompanion(uid, str(form, "relationship"))));
}

export async function companionWritesAction(form: FormData) {
  const uid = await requireUser();
  done(await attempt("dev.companion_write", () => companionWrites(uid, str(form, "id"))));
}

export async function deleteCompanionAction(form: FormData) {
  const uid = await requireUser();
  done(await attempt("dev.companion_delete", () => deleteCompanion(uid, str(form, "id"))), "deleted");
}

export async function enrichCompanionAction(form: FormData) {
  const uid = await requireUser();
  done(await attempt("dev.companion_enrich", () => enrichCompanion(uid, str(form, "id"))));
}

export async function reconnectCompanionAction(form: FormData) {
  const uid = await requireUser();
  done(await attempt("dev.companion_reconnect", () => reconnectCompanion(uid, str(form, "id"))));
}

export async function companionAnswersAction(form: FormData) {
  const uid = await requireUser();
  done(await attempt("dev.companion_answer", () => companionAnswersAsks(uid, str(form, "id"))));
}
