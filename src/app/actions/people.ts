"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import {
  addGift,
  addImportantDate,
  addPreference,
  addRelationshipEntry,
  addRelationshipEvent,
  createPerson,
  deletePerson,
  deletePersonRecord,
  deletePreferenceItem,
  updatePerson,
} from "@/server/services/people";
import { attempt, safeNext, str, withParam } from "./util";

async function done(back: string, r: { ok: boolean; error?: string }, ok = "saved") {
  revalidatePath(back.split("?")[0]!);
  redirect(withParam(back, r.ok ? "ok" : "e", r.ok ? ok : (r.error ?? "generic")));
}

export async function createPersonAction(form: FormData) {
  const uid = await requireUser();
  const r = await attempt("people.create", () => createPerson(uid, { nickname: str(form, "nickname"), relationship: str(form, "relationship") || "other", note: str(form, "note") }));
  if (!r.ok) redirect(`/people?e=${r.error}`);
  redirect(`/people/${r.value}?ok=saved`);
}

export async function updatePersonAction(form: FormData) {
  const uid = await requireUser();
  const id = str(form, "personId");
  const r = await attempt("people.update", () => updatePerson(uid, id, { nickname: str(form, "nickname"), relationship: str(form, "relationship"), note: str(form, "note") }));
  await done(`/people/${id}`, r);
}

export async function deletePersonAction(form: FormData) {
  const uid = await requireUser();
  const r = await attempt("people.delete", () => deletePerson(uid, str(form, "personId")));
  revalidatePath("/people");
  redirect(r.ok ? "/people?ok=deleted" : `/people?e=${r.error}`);
}

export async function addPreferenceAction(form: FormData) {
  const uid = await requireUser();
  const personId = str(form, "personId") || null;
  const back = safeNext(str(form, "back"), personId ? `/people/${personId}` : "/me");
  const r = await attempt("pref.add", () =>
    addPreference(uid, {
      personId,
      categoryId: str(form, "categoryId"),
      label: str(form, "label"),
      sentiment: str(form, "sentiment"),
      source: personId ? str(form, "source") : "self_stated",
      note: str(form, "note"),
    }),
  );
  await done(back, r);
}

export async function deletePreferenceAction(form: FormData) {
  const uid = await requireUser();
  const back = safeNext(str(form, "back"), "/me");
  const r = await attempt("pref.delete", () => deletePreferenceItem(uid, str(form, "itemId")));
  await done(back, r, "deleted");
}

export async function addEntryAction(form: FormData) {
  const uid = await requireUser();
  const id = str(form, "personId");
  const r = await attempt("people.entry", () =>
    addRelationshipEntry(uid, id, { kind: str(form, "kind"), body: str(form, "body"), source: str(form, "source") || "observed", occurredOn: str(form, "occurredOn") }),
  );
  await done(`/people/${id}`, r);
}

export async function addEventAction(form: FormData) {
  const uid = await requireUser();
  const id = str(form, "personId");
  const r = await attempt("people.event", () =>
    addRelationshipEvent(uid, id, { title: str(form, "title"), description: str(form, "description"), place: str(form, "place"), occurredOn: str(form, "occurredOn") }),
  );
  await done(`/people/${id}`, r);
}

export async function addGiftAction(form: FormData) {
  const uid = await requireUser();
  const id = str(form, "personId");
  const r = await attempt("people.gift", () =>
    addGift(uid, id, {
      item: str(form, "item"),
      occasion: str(form, "occasion"),
      givenOn: str(form, "givenOn"),
      priceAmount: str(form, "priceAmount"),
      priceCurrency: str(form, "priceCurrency").toUpperCase(),
      reaction: str(form, "reaction") || "unknown",
      note: str(form, "note"),
    }),
  );
  await done(`/people/${id}`, r);
}

export async function addDateAction(form: FormData) {
  const uid = await requireUser();
  const personId = str(form, "personId");
  const back = personId ? `/people/${personId}` : "/me";
  const r = await attempt("people.date", () =>
    addImportantDate(uid, {
      personId,
      label: str(form, "label"),
      kind: str(form, "kind"),
      month: str(form, "month"),
      day: str(form, "day"),
      year: str(form, "year"),
      remindDaysBefore: str(form, "remindDaysBefore"),
    }),
  );
  revalidatePath("/home");
  await done(back, r);
}

export async function deleteRecordAction(form: FormData) {
  const uid = await requireUser();
  const back = safeNext(str(form, "back"), "/people");
  const r = await attempt("people.record.delete", () => deletePersonRecord(uid, str(form, "kind"), str(form, "id")));
  await done(back, r, "deleted");
}
