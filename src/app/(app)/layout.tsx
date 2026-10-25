import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { BrandMark, BrandWordmark } from "@/components/brand";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { getAccount } from "@/server/services/account";
import { dmUnreadTotal } from "@/server/services/dm";
import { myAvatarUrl } from "@/server/services/avatars";
import { Avatar } from "@/components/avatar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const uid = await requireUser();
  const { t } = await getT();
  const acc = await getAccount(uid);
  const unread = await dmUnreadTotal(uid);
  const avatar = await myAvatarUrl(uid);
  const initial = Array.from(acc.profile.displayName.trim())[0]?.toUpperCase() ?? "?";
  return (
    <>
      <header className="sticky top-0 z-10 print:hidden border-b border-white/60 bg-[#faf8f5]/75 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-2">
          <Link href="/home" className="flex items-center gap-2">
            <BrandMark className="h-7 w-7" />
            <BrandWordmark className="h-3.5 w-auto" />
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
              href="/messages"
              aria-label={unread ? `${t.messages.title} (${unread})` : t.messages.title}
              title={t.messages.title}
              className="relative flex h-9 w-9 items-center justify-center rounded-full text-stone-600 transition-colors hover:bg-stone-200 hover:text-stone-900"
            >
              <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M21 3 10 14" />
                <path d="M21 3 14.5 21l-4.5-7-7-4.5Z" />
              </svg>
              {unread > 0 && (
                <span aria-hidden className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white ring-2 ring-[#faf8f5]">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
            <Link
              href="/me"
              aria-label={t.nav.profileMenu}
              title={t.nav.profileMenu}
              className="flex h-9 w-9 items-center justify-center rounded-full ring-2 ring-white transition hover:ring-teal-300"
            >
              <Avatar name={acc.profile.displayName} src={avatar} className="h-9 w-9 text-sm" />
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
