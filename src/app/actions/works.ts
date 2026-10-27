"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getLocale } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { extendLink, handOver, makeWork, revokeLink } from "@/server/services/works";
import { attempt, str, withParam } from "./util";

const PAGE = "/me/work";

/** Fix the story, as the owner just read it, into a work. */
export async function makeWorkAction(form: FormData) {
  const uid = await requireUser();
  const answerIds = form.getAll("answer").filter((x): x is string => typeof x === "string");
  const r = await attempt("work.make", async () => makeWork(uid, await getLocale(), { title: str(form, "title"), answerIds }));
  revalidatePath(PAGE);
  redirect(`${withParam(PAGE, r.ok ? "ok" : "e", r.ok ? "saved" : r.error)}#work`);
}

/** Hand the work to someone: their link is shown once, on the page. */
export async function handOverAction(form: FormData) {
  const uid = await requireUser();
  const recipient = str(form, "recipient");
  const r = await attempt("work.hand", () => handOver(uid, str(form, "workId"), { recipient, note: str(form, "note"), days: str(form, "days") || 14 }));
  revalidatePath(PAGE);
  if (!r.ok) redirect(`${withParam(PAGE, "e", r.error)}#give`);
  redirect(`${PAGE}?${new URLSearchParams({ link: r.value.token, who: recipient })}#handed`);
}

export async function extendLinkAction(form: FormData) {
  const uid = await requireUser();
  const r = await attempt("work.extend", () => extendLink(uid, str(form, "linkId"), 14));
  revalidatePath(PAGE);
  redirect(`${withParam(PAGE, r.ok ? "ok" : "e", r.ok ? "saved" : r.error)}#links`);
}

export async function revokeLinkAction(form: FormData) {
  const uid = await requireUser();
  const r = await attempt("work.revoke", () => revokeLink(uid, str(form, "linkId")));
  revalidatePath(PAGE);
  redirect(`${withParam(PAGE, r.ok ? "ok" : "e", r.ok ? "saved" : r.error)}#links`);
}
