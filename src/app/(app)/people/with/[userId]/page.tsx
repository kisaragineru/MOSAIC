import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { listComparisons } from "@/server/services/sharing";

/**
 * Where someone's icon leads: my page about them in My people, or, while they aren't there yet,
 * our connection page (which offers to add them). Only someone I'm connected to; me is my own page.
 */
export default async function PersonWith({ params }: { params: Promise<{ userId: string }> }) {
  const uid = await requireUser();
  const { userId } = await params;
  if (userId === uid) redirect("/me");
  const mine = (await listComparisons(uid)).filter((c) => c.otherId === userId && c.status !== "revoked");
  const c = mine.find((x) => x.personId) ?? mine.find((x) => x.status === "active") ?? mine[0];
  if (!c) notFound();
  redirect(c.personId ? `/people/${c.personId}` : `/compare/${c.id}`);
}
