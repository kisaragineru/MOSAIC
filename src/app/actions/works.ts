"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getLocale } from "@/lib/i18n/server";
import { currentUserId, requireUser } from "@/server/auth/session";
import { acceptOffer, answerStart, dismissOffer, extendLink, handOver, makeWork, markStoryAsked, markWorkOpened, revokeLink } from "@/server/services/works";
import { attempt, safeNext, str, withParam } from "./util";

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

/** Take the writer's offer: connected in one tap. */
export async function acceptOfferAction(form: FormData) {
  const uid = await requireUser();
  const back = safeNext(str(form, "back"), "/home");
  const r = await attempt("work.offer_accept", () => acceptOffer(uid, str(form, "offerId")));
  revalidatePath("/home");
  revalidatePath("/people");
  redirect(withParam(back, r.ok ? "ok" : "e", r.ok ? "saved" : r.error));
}

export async function dismissOfferAction(form: FormData) {
  const uid = await requireUser();
  const back = safeNext(str(form, "back"), "/home");
  const r = await attempt("work.offer_dismiss", () => dismissOffer(uid, str(form, "offerId")));
  revalidatePath("/home");
  redirect(r.ok ? back : withParam(back, "e", r.error));
}

/** Tell the writer I started my own story, or keep it to myself. */
export async function answerStartAction(form: FormData) {
  const uid = await requireUser();
  const r = await attempt("work.offer_start", () => answerStart(uid, str(form, "offerId"), str(form, "tell") === "1"));
  revalidatePath("/home");
  redirect(r.ok ? "/home" : withParam("/home", "e", r.error));
}

/** Home's one-time question about handing the story to someone: answered either way, not asked again. */
export async function storyAskAction(form: FormData) {
  const uid = await requireUser();
  await attempt("work.story_asked", () => markStoryAsked(uid));
  revalidatePath("/home");
  redirect(str(form, "go") === "work" ? `${PAGE}#give` : "/home");
}

/** The reader opened the envelope of a work they were handed (the writer is told, once). */
export async function openEnvelopeAction(token: string) {
  await markWorkOpened(String(token), await currentUserId());
}
