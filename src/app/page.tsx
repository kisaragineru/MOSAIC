import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { IntroFilm } from "@/components/intro-film";
import { getT } from "@/lib/i18n/server";
import { currentUserId } from "@/server/auth/session";

export const metadata: Metadata = { title: "MOSAIC" };

/** Signed in: Home. Otherwise MOSAIC told as a short film, ending with where to begin. */
export default async function Root() {
  if (await currentUserId()) redirect("/home");
  const { t } = await getT();
  return (
    <main className="h-dvh snap-y snap-proximity overflow-y-auto">
      <IntroFilm
        tx={t.film}
        start="/register"
        after={<Link href="/login" className="text-sm text-stone-600 underline underline-offset-4 hover:text-violet-800">{t.film.login}</Link>}
      />
    </main>
  );
}
