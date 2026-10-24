"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { monthKey, parseMonth, saveLookBack } from "@/server/services/monthly";
import { attempt, str } from "./util";

export async function saveLookBackAction(form: FormData) {
  const uid = await requireUser();
  const m = parseMonth(str(form, "month"));
  if (!m) redirect("/reflection");
  const { t } = await getT();
  const mo = t.monthly;
  const r = await attempt("monthly.save", () =>
    saveLookBack(uid, m, mo.prompts, [0, 1, 2].map((i) => str(form, `p${i}`)), mo.monthTitle(m.year, m.month), mo.tag),
  );
  revalidatePath("/memories");
  redirect(`/reflection/${monthKey(m)}?${r.ok ? "ok=saved#lookback" : `e=${r.error}`}`);
}
