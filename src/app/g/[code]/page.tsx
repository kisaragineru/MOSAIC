import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { receiveGiftAction } from "@/app/actions/gift-boxes";
import { BrandMark } from "@/components/brand";
import { Flash } from "@/components/flash";
import { SubmitButton } from "@/components/submit-button";
import { getT } from "@/lib/i18n/server";
import { currentUserId } from "@/server/auth/session";
import { linkCode, peekGiftLink } from "@/server/services/gift-boxes";

// A private page: never indexed, and the link isn't passed on to other sites.
export const metadata: Metadata = { title: "MOSAIC", robots: { index: false, follow: false }, referrer: "no-referrer" };

/**
 * A gift box's receive link: its cover before signing in (whom it's for and who it's from,
 * nothing inside), then sign-up without the invite code, or log-in, and one tap to receive.
 */
export default async function GiftLinkPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { code: raw } = await params;
  const sp = await searchParams;
  const code = linkCode(decodeURIComponent(raw));
  if (!code) notFound();
  // One spelling of the link (sign-up recognises it as an invitation).
  if (code !== raw) redirect(`/g/${code}`);
  const cover = await peekGiftLink(code);
  const viewer = await currentUserId();
  const { t, locale } = await getT();
  const g = t.giftBox;
  const l = g.link;
  const here = `/g/${code}`;
  if (!cover)
    return (
      <main className="mx-auto min-h-dvh max-w-2xl px-3 py-6">
        <div className="mx-auto mt-24 max-w-sm rounded-3xl bg-white/90 p-6 text-center shadow-sm ring-1 ring-stone-200" data-testid="gift-link-closed">
          <BrandMark className="mx-auto mb-3 h-10 w-10" />
          <h1 className="font-bold text-stone-900">{l.closedTitle}</h1>
          <p className="mt-2 text-sm leading-6 text-stone-600">{l.closedLead}</p>
          {viewer && <Link href="/gifts" className="mt-4 inline-block text-sm font-semibold text-teal-700 underline underline-offset-4">🎁 {g.title} →</Link>}
        </div>
      </main>
    );
  const names = cover.writers.map((w) => w.label ?? g.roles[w.role]).join(locale === "ja" ? "・" : ", ");
  return (
    <main className="mx-auto min-h-dvh max-w-md space-y-4 px-4 py-8">
      <Flash t={t} sp={sp} />
      <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-sky-100 via-white to-rose-100 px-8 py-12 text-center shadow-[0_20px_50px_-20px_rgba(60,60,120,0.35)]" data-testid="gift-link-cover">
        <div aria-hidden className="absolute -left-16 -top-16 h-48 w-48 rounded-full bg-amber-200/50 blur-2xl" />
        <div aria-hidden className="absolute -bottom-20 -right-10 h-56 w-56 rounded-full bg-violet-200/50 blur-2xl" />
        <p className="relative text-4xl" aria-hidden>🎁</p>
        <p className="relative mt-4 text-xs font-semibold tracking-widest text-amber-800">{l.arrived}</p>
        <h1 className="relative mt-3 text-3xl font-semibold tracking-wide text-[#2e3a4b]">{g.book.to(cover.childName)}</h1>
        {names && <p className="relative mt-3 text-base text-stone-600">{g.book.from(names)}</p>}
        <BrandMark className="relative mx-auto mt-8 h-9 w-9 opacity-80" />
      </section>
      <p className="px-1 text-sm leading-7 text-stone-700">{l.lead2}</p>
      {viewer ? (
        <form action={receiveGiftAction}>
          <input type="hidden" name="code" value={code} />
          <input type="hidden" name="from" value="link" />
          <SubmitButton pending={l.receiving} className="min-h-12 w-full rounded-full bg-teal-700 px-6 text-sm font-bold text-white shadow-md hover:bg-teal-800">🎁 {l.receive}</SubmitButton>
        </form>
      ) : (
        <div className="space-y-3">
          <Link href={`/register?next=${encodeURIComponent(here)}`} className="flex min-h-12 w-full items-center justify-center rounded-full bg-teal-700 px-6 text-sm font-bold text-white shadow-md hover:bg-teal-800">
            {l.signUp}
          </Link>
          <Link href={`/login?next=${encodeURIComponent(here)}`} className="block text-center text-sm font-semibold text-teal-800 underline underline-offset-4">
            {l.logIn}
          </Link>
        </div>
      )}
    </main>
  );
}
