import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { BrandMark, BrandWordmark } from "@/components/brand";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { getAccount } from "@/server/services/account";
import { dmUnreadTotal } from "@/server/services/dm";
import { myAvatarUrl } from "@/server/services/avatars";
import { Avatar } from "@/components/avatar";
import { TrialBar } from "@/components/trial-bar";
import { GuideBar } from "@/components/guide-bar";
import { HeaderBrand } from "@/components/header-brand";
import { Suspense } from "react";
import { onboardingState, resumeStep } from "@/server/services/onboarding";
import { trialReturnUser } from "@/server/services/dev-trial";
import { hasWaitingNotices } from "@/server/services/notices";
import { myTint } from "@/server/services/card";
import { PushReadiness } from "@/components/push-nudge";
import { pushConfigured } from "@/server/services/push";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const uid = await requireUser();
  // All at once: none of these waits on another.
  // trialOwner — development: trying sign-up with a test account, with the way back to your own.
  // waiting — a dot on the bell when someone is waiting on you (no number: a nudge, not a count).
  const [{ t }, acc, unread, avatar, trialOwner, waiting, tint] = await Promise.all([
    getT(),
    getAccount(uid),
    dmUnreadTotal(uid),
    myAvatarUrl(uid),
    trialReturnUser(),
    hasWaitingNotices(uid),
    myTint(uid),
  ]);
  const initial = Array.from(acc.profile.displayName.trim())[0]?.toUpperCase() ?? "?";
  const guideStep = acc.profile.onboardedAt ? null : resumeStep(await onboardingState(uid));
  return (
    <>
      {trialOwner && trialOwner !== uid && <TrialBar t={t} />}
      {/* The welcome guide, not finished yet: always said, with the way back and a way to end it. */}
      {guideStep !== null && (
        <GuideBar step={guideStep} labels={{ bar: t.welcome.guideBar(guideStep, 6), back: t.welcome.backToGuide, end: t.welcome.endGuide, confirm: t.welcome.endConfirm }} />
      )}
      <header className="sticky top-0 z-10 print:hidden border-b border-white/60 bg-[#faf8f5]/75 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-2">
          <Suspense>
            <HeaderBrand>
              <BrandMark className="h-7 w-7" />
              <BrandWordmark className="h-3.5 w-auto" />
            </HeaderBrand>
          </Suspense>
          <div className="ml-auto flex items-center gap-1">
            <Link
              href="/notices"
              aria-label={t.notices.bell}
              title={t.notices.bell}
              className="relative flex h-9 w-9 items-center justify-center rounded-full text-stone-600 transition-colors hover:bg-stone-200 hover:text-stone-900"
              data-testid="bell"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6.5 2 6.5H4S6 14 6 9Z" />
                <path d="M10 19a2 2 0 0 0 4 0" />
              </svg>
              {waiting && <span aria-hidden className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-[#faf8f5]" data-testid="bell-dot" />}
            </Link>
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
              <Avatar name={acc.profile.displayName} src={avatar} type={tint} className="h-9 w-9 text-sm" />
            </Link>
          </div>
        </div>
      </header>
      {children}
      {/* This device's notification state, for Home's suggestion (only where notifications exist). */}
      {pushConfigured() && <PushReadiness />}
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
