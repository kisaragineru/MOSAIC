"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import {
  setQuestionFeedback,
  answerQuestion,
  deleteResponse,
  requestAnotherQuestion,
  setChangeKind,
  setResponsePrivacy,
  setResponsesPrivacy,
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
      note: str(form, "note"),
    }),
  );
  if (!r.ok) redirect(withParam(back, "e", r.error));
  revalidatePath("/discover");
  revalidatePath("/home");
  if (r.value.changedFromPrevious) redirect(`/discover?changed=${r.value.responseId}`);
  // The type quiz keeps its own pace: no follow-ups in between.
  if (r.value.followUpQuestionId && !back.startsWith("/tuvi/type")) {
    // Inside a run of questions (all, or a chapter) the follow-up is asked in place.
    const inFlow = back.startsWith("/discover/all") || back.startsWith("/discover/chapter/");
    redirect(inFlow ? withParam(withParam(back.split("?")[0]!, "f", r.value.followUpQuestionId), "ok", "answered") : `/discover/q/${encodeURIComponent(r.value.followUpQuestionId)}?ok=answered`);
  }
  // Ask once, lightly, how the question was (fb = the question just answered).
  redirect(withParam(withParam(back, "ok", "answered"), "fb", str(form, "questionId")));
}

export async function feedbackAction(form: FormData) {
  const uid = await requireUser();
  const back = safeNext(str(form, "back"), "/discover");
  const r = await attempt("discover.feedback", () => setQuestionFeedback(uid, str(form, "questionId"), str(form, "rating")));
  redirect(withParam(back, r.ok ? "fbdone" : "e", r.ok ? "1" : r.error));
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
  const back = safeNext(str(form, "back"), "/discover/history");
  revalidatePath(back);
  redirect(withParam(back, r.ok ? "ok" : "e", r.ok ? "saved" : r.error));
}

/** Many answers shown or kept to oneself at once (a section's buttons, or the ones picked). */
export async function bulkPrivacyAction(form: FormData) {
  const uid = await requireUser();
  const ids = form.getAll("responseId").filter((x): x is string => typeof x === "string" && x !== "");
  const back = safeNext(str(form, "back"), "/me/preview");
  if (ids.length === 0) redirect(withParam(back, "e", "nothing_picked"));
  const r = await attempt("discover.bulkPrivacy", () => setResponsesPrivacy(uid, ids, str(form, "privacy")));
  revalidatePath(back.split("?")[0]!.split("#")[0]!);
  redirect(withParam(back, r.ok ? "ok" : "e", r.ok ? "saved" : r.error));
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
