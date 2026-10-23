"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import {
  answerQuestion,
  deleteResponse,
  requestAnotherQuestion,
  setChangeKind,
  setResponsePrivacy,
  skipQuestion,
} from "@/server/services/discovery";
import { setTendencyFeedback } from "@/server/services/tendencies";
import { attempt, bool, safeNext, str, withParam } from "./util";

function answerFrom(f: FormData) {
  switch (str(f, "format")) {
    case "single":
      return { choice: str(f, "choice") };
    case "multi":
      return { choices: f.getAll("choices").filter((x) => typeof x === "string") };
    case "scale":
      return { scale: str(f, "scale") };
    default:
      return { text: str(f, "text") };
  }
}

export async function answerAction(form: FormData) {
  const uid = await requireUser();
  const back = safeNext(str(form, "back"), "/discover");
  const r = await attempt("discover.answer", () =>
    answerQuestion(uid, {
      questionId: str(form, "questionId"),
      questionVersion: str(form, "questionVersion"),
      answer: answerFrom(form),
      privacy: bool(form, "comparable") ? "comparable" : "private",
    }),
  );
  if (!r.ok) redirect(withParam(back, "e", r.error));
  revalidatePath("/discover");
  revalidatePath("/home");
  if (r.value.changedFromPrevious) redirect(`/discover?changed=${r.value.responseId}`);
  if (r.value.followUpQuestionId) redirect(`/discover/q/${encodeURIComponent(r.value.followUpQuestionId)}?ok=answered`);
  redirect(withParam(back, "ok", "answered"));
}

export async function skipAction(form: FormData) {
  const uid = await requireUser();
  const back = safeNext(str(form, "back"), "/discover");
  const r = await attempt("discover.skip", () => skipQuestion(uid, str(form, "questionId")));
  if (!r.ok) redirect(withParam(back, "e", r.error));
  revalidatePath("/discover");
  redirect(back);
}

export async function changeKindAction(form: FormData) {
  const uid = await requireUser();
  const kind = str(form, "kind") as "changed_mind" | "correction" | "reanswer";
  const r = await attempt("discover.changeKind", () => setChangeKind(uid, str(form, "responseId"), kind));
  redirect(r.ok ? "/discover?ok=answered" : `/discover?e=${r.error}`);
}

export async function anotherQuestionAction() {
  const uid = await requireUser();
  const r = await attempt("discover.another", () => requestAnotherQuestion(uid));
  revalidatePath("/discover");
  redirect(r.ok ? "/discover" : `/discover?e=${r.error}`);
}

export async function privacyAction(form: FormData) {
  const uid = await requireUser();
  const r = await attempt("discover.privacy", () => setResponsePrivacy(uid, str(form, "responseId"), str(form, "privacy")));
  redirect(r.ok ? "/discover/history?ok=saved" : `/discover/history?e=${r.error}`);
}

export async function deleteResponseAction(form: FormData) {
  const uid = await requireUser();
  const r = await attempt("discover.delete", () => deleteResponse(uid, str(form, "responseId")));
  revalidatePath("/insights");
  redirect(r.ok ? "/discover/history?ok=deleted" : `/discover/history?e=${r.error}`);
}

export async function tendencyFeedbackAction(form: FormData) {
  const uid = await requireUser();
  const r = await attempt("tendency.feedback", () => setTendencyFeedback(uid, str(form, "claimId"), { status: str(form, "status"), note: str(form, "note") }));
  redirect(r.ok ? "/insights?ok=saved" : `/insights?e=${r.error}`);
}
