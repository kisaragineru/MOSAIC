import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { lookBackDue, monthKey, thisMonth } from "@/server/services/monthly";

/** Opens the month just ended during the first week of a month, otherwise this month. */
export default async function ReflectionIndex() {
  const uid = await requireUser();
  redirect(`/reflection/${monthKey((await lookBackDue(uid)) ?? (await thisMonth(uid)))}`);
}
