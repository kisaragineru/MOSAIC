"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { getT } from "@/lib/i18n/server";
import { pushDevices, sendTestPush, setPushPreview, subscribePush, unsubscribePush } from "@/server/services/push";
import { attempt, bool } from "./util";

/** This browser's subscription, once the person allowed notifications (returns a result). */
export async function subscribePushAction(subscription: unknown) {
  const uid = await requireUser();
  const r = await attempt("push.subscribe", () => subscribePush(uid, subscription));
  if (r.ok) revalidatePath("/settings");
  return r;
}

export async function unsubscribePushAction(endpoint: string) {
  const uid = await requireUser();
  const r = await attempt("push.unsubscribe", () => unsubscribePush(uid, endpoint));
  if (r.ok) revalidatePath("/settings");
  return r;
}

export async function pushPreviewAction(form: FormData) {
  const uid = await requireUser();
  const r = await attempt("push.preview", () => setPushPreview(uid, bool(form, "preview")));
  redirect(r.ok ? "/settings?ok=saved#push" : `/settings?e=${r.error}#push`);
}

/** Settings' check: how many browsers the server has for me, and a test notification to each. */
export async function testPushAction() {
  const uid = await requireUser();
  const { t } = await getT();
  const results = await sendTestPush(uid, { title: "MOSAIC", body: t.settings.push.diag.testBody });
  return { devices: await pushDevices(uid), results };
}

export async function pushDevicesAction() {
  const uid = await requireUser();
  return pushDevices(uid);
}
