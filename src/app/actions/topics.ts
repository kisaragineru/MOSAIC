"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getLocale } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { answerTopic, closeTopic, sendTopic } from "@/server/services/topics";
import { attempt, safeNext, str, withParam } from "./util";

/** Back to the topics on our connection page, with how it went. */
function done(form: FormData, r: { ok: boolean; error?: string }, ok = "saved") {
  const back = safeNext(str(form, "back"), `/compare/${str(form, "sessionId")}`);
  revalidatePath(back);
  redirect(`${withParam(back, r.ok ? "ok" : "e", r.ok ? ok : r.error!)}#topics`);
}

export async function sendTopicAction(form: FormData) {
  const uid = await requireUser();
  const locale = await getLocale();
  const r = await attempt("topics.send", () => sendTopic(uid, str(form, "sessionId"), { preset: str(form, "preset"), prompt: str(form, "prompt"), answer: str(form, "answer") }, locale));
  done(form, r, "sent");
}

export async function answerTopicAction(form: FormData) {
  const uid = await requireUser();
  const locale = await getLocale();
  const r = await attempt("topics.answer", () => answerTopic(uid, str(form, "sessionId"), str(form, "promptId"), str(form, "answer"), locale));
  done(form, r);
}

export async function passTopicAction(form: FormData) {
  const uid = await requireUser();
  done(form, await attempt("topics.pass", () => closeTopic(uid, str(form, "promptId"), "passed")));
}

export async function cancelTopicAction(form: FormData) {
  const uid = await requireUser();
  done(form, await attempt("topics.cancel", () => closeTopic(uid, str(form, "promptId"), "canceled")));
}
