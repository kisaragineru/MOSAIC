import Link from "next/link";
import type { ReactNode } from "react";
import { getT } from "@/lib/i18n/server";

/** A page's frame: its title (with a way back, named in the reader's language) and its content. Server only. */
export async function Page({ title, children, back, actions }: { title: string; children: ReactNode; back?: string; actions?: ReactNode }) {
  const { t } = await getT();
  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-28 pt-4">
      <div className="mb-4 flex items-center gap-3">
        {back && (
          <Link href={back} className="rounded-full px-2 py-1 text-stone-500 hover:bg-stone-200" aria-label={t.common.back}>
            ←
          </Link>
        )}
        <h1 className="flex-1 text-2xl font-semibold tracking-tight text-stone-900">{title}</h1>
        {actions}
      </div>
      <div className="stagger space-y-4">{children}</div>
    </main>
  );
}
