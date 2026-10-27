"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { updateNotificationPrefs, getNotificationPrefs } from "@/server/services/account";
import { getDaily } from "@/server/services/discovery";
import { dismissNotices } from "@/server/services/notices";
import { attempt, safeNext, str } from "./util";

/** The notices posted with the form: key, kind and (dated) day, one triple per notice. */
function refs(form: FormData) {
  const keys = form.getAll("key").map(String);
  const kinds = form.getAll("kind").map(String);
  const ons = form.getAll("on").map(String);
  return keys.map((key, i) => ({ key, kind: kinds[i], ...(ons[i] ? { on: ons[i] } : {}) }));
}

/** Close one notice, or all that are showing ("close all"). */
export async function dismissNoticesAction(form: FormData) {
  const uid = await requireUser();
  const today = (await getDaily(uid)).day;
  await attempt("notice.dismiss", () => dismissNotices(uid, refs(form), today));
  revalidatePath("/", "layout");
  redirect(safeNext(str(form, "back")));
}

/** After a week of closing today's question: keep the reminder, or stop it. */
export async function questionReminderAction(form: FormData) {
  const uid = await requireUser();
  const today = (await getDaily(uid)).day;
  if (str(form, "keep") !== "1") {
    const np = await getNotificationPrefs(uid);
    await attempt("notice.question_off", () => updateNotificationPrefs(uid, { dailyQuestion: false, dateReminders: np.dateReminders }));
  }
  await attempt("notice.dismiss", () => dismissNotices(uid, [{ key: `question-ask:${today}`, kind: "once" }], today));
  revalidatePath("/", "layout");
  redirect("/home");
}
