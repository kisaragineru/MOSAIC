import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  const { t } = await getT();
  return (
    <>
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-[#faf8f5]/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-2">
          <Link href="/home" className="flex items-center gap-2">
            <span className="mosaic-mark h-6 w-6 rounded-md" aria-hidden />
            <span className="text-sm font-semibold tracking-[0.2em]">MOSAIC</span>
          </Link>
        </div>
      </header>
      {children}
      <BottomNav
        items={[
          { href: "/home", label: t.nav.home, icon: "◐" },
          { href: "/memories", label: t.nav.memories, icon: "▤" },
          { href: "/discover", label: t.nav.discover, icon: "✦" },
          { href: "/people", label: t.nav.people, icon: "♡" },
          { href: "/more", label: t.nav.more, icon: "☰" },
        ]}
      />
    </>
  );
}
