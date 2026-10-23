"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearSessionCookie, requireUser, sessionToken } from "@/server/auth/session";
import { changePassword, deleteAccount, getAccount, updateNotificationPrefs, updateProfile } from "@/server/services/account";
import { setAiOptIn } from "@/server/services/reflection";
import { attempt, bool, str } from "./util";

export async function updateProfileAction(form: FormData) {
  const uid = await requireUser();
  const back = str(form, "back") === "/me" ? "/me" : "/settings";
  const current = await getAccount(uid);
  const r = await attempt("settings.profile", () =>
    updateProfile(uid, {
      displayName: str(form, "displayName") || current.profile.displayName,
      bio: form.has("bio") ? str(form, "bio") : current.profile.bio,
      locale: str(form, "locale") || current.profile.locale,
      timeZone: str(form, "timeZone") || current.profile.timeZone,
    }),
  );
  revalidatePath("/", "layout");
  redirect(r.ok ? `${back}?ok=saved` : `${back}?e=${r.error}`);
}

export async function notificationsAction(form: FormData) {
  const uid = await requireUser();
  const r = await attempt("settings.notifications", () =>
    updateNotificationPrefs(uid, { dailyQuestion: bool(form, "dailyQuestion"), dateReminders: bool(form, "dateReminders") }),
  );
  redirect(r.ok ? "/settings?ok=saved" : `/settings?e=${r.error}`);
}

export async function aiOptInAction(form: FormData) {
  const uid = await requireUser();
  const r = await attempt("settings.ai", () => setAiOptIn(uid, bool(form, "aiOptIn")));
  redirect(r.ok ? "/settings?ok=saved" : `/settings?e=${r.error}`);
}

export async function changePasswordAction(form: FormData) {
  const uid = await requireUser();
  const token = (await sessionToken()) ?? "";
  const r = await attempt("settings.password", () =>
    changePassword(uid, token, { currentPassword: str(form, "currentPassword"), newPassword: str(form, "newPassword") }),
  );
  redirect(r.ok ? "/settings?ok=password" : `/settings?e=${r.error}`);
}

export async function deleteAccountAction(form: FormData) {
  const uid = await requireUser();
  const r = await attempt("settings.delete", () => deleteAccount(uid, { password: str(form, "password"), confirm: str(form, "confirm") }));
  if (!r.ok) redirect(`/settings?e=${r.error}`);
  await clearSessionCookie();
  redirect("/login?ok=deleted");
}
