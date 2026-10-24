import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { getAccount } from "@/server/services/account";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const uid = await requireUser();
  const { t } = await getT();
  const acc = await getAccount(uid);
  const initial = Array.from(acc.profile.displayName.trim())[0]?.toUpperCase() ?? "?";
  return (
    <>
      <header className="sticky top-0 z-10 print:hidden border-b border-white/60 bg-[#fbf7f3]/75 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-2">
          <Link href="/home" className="flex items-center gap-2">
            <span className="mosaic-mark h-6 w-6 rounded-md" aria-hidden />
            <span className="text-sm font-semibold tracking-[0.2em]">MOSAIC</span>
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <Link
              href="/share"
              aria-label={t.nav.share}
              title={t.nav.share}
              className="flex h-9 w-9 items-center justify-center rounded-full text-stone-600 transition-colors hover:bg-stone-200 hover:text-stone-900"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden>
                <rect x="4" y="4" width="6" height="6" rx="1" />
                <rect x="14" y="4" width="6" height="6" rx="1" />
                <rect x="4" y="14" width="6" height="6" rx="1" />
                <path d="M14 14h2v2h-2zM18 18h2v2h-2zM18 14h2M14 18v2" />
              </svg>
            </Link>
            <Link
              href="/me"
              aria-label={t.nav.profileMenu}
              title={t.nav.profileMenu}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-br from-teal-200 to-violet-200 text-sm font-bold text-teal-900 ring-2 ring-white transition hover:ring-teal-300"
            >
              {initial}
            </Link>
          </div>
        </div>
      </header>
      {children}
      <BottomNav
        items={[
          { href: "/home", label: t.nav.tabs.home, icon: "home" },
          { href: "/tuvi", label: t.nav.tabs.tuvi, icon: "tuvi" },
          { href: "/discover", label: t.nav.tabs.discover, icon: "discover" },
          { href: "/insights", label: t.nav.tabs.insights, icon: "insights" },
          { href: "/memories", label: t.nav.tabs.memories, icon: "memories" },
          { href: "/people", label: t.nav.tabs.people, icon: "people" },
        ]}
      />
    </>
  );
}
