import Link from "next/link";
import { DmInbox } from "@/components/dm-inbox";
import { Flash } from "@/components/flash";
import { Page } from "@/components/ui";
import { dmPreview, dmTitle } from "@/lib/dm-text";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { getAccount } from "@/server/services/account";
import { dmInbox } from "@/server/services/dm";
import { avatarUrls } from "@/server/services/avatars";
import { myTint, typeTints } from "@/server/services/card";

const nowMs = () => Date.now();

/** Every conversation, newest first. */
export default async function MessagesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const sp = await searchParams;
  const { t, locale } = await getT();
  const tz = (await getAccount(uid)).profile.timeZone;
  const inbox = await dmInbox(uid);
  const pics = await avatarUrls(uid, inbox.flatMap((c) => c.others.map((o) => o.id)));
  const tints = await typeTints(uid, inbox.flatMap((c) => c.others.map((o) => o.id)));
  const now = nowMs();
  const when = (d: Date) => {
    const mins = (now - d.getTime()) / 60_000;
    if (mins < 60 * 20) return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone: tz }).format(d);
    if (mins < 60 * 24 * 6) return new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: tz }).format(d);
    return new Intl.DateTimeFormat(locale, { month: "numeric", day: "numeric", timeZone: tz }).format(d);
  };
  return (
    <Page
      title={t.messages.title}
      actions={
        <Link href="/messages/new" aria-label={t.messages.newMessage} className="flex h-10 items-center gap-1.5 rounded-full bg-teal-700 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800 active:scale-95">
          <span aria-hidden>✎</span>
          {t.messages.newMessage}
        </Link>
      }
    >
      <Flash t={t} sp={sp} />
      {inbox.length === 0 ? (
        <p className="rounded-3xl bg-white/80 p-6 text-center text-sm leading-6 text-stone-600 ring-1 ring-stone-200/60">{t.messages.empty}</p>
      ) : (
        <DmInbox
          searchLabel={t.messages.search}
          mutedLabel={t.messages.mutedNote}
          rows={inbox.map((c) => ({
            id: c.id,
            title: dmTitle(c, t),
            names: c.others.map((o) => o.name),
            srcs: c.others.map((o) => pics.get(o.id) ?? null),
            types: c.others.map((o) => tints.get(o.id) ?? null),
            preview: dmPreview(c, t, uid),
            when: when(c.last.at),
            unread: c.unread,
            muted: c.muted,
            inactive: !c.canSend,
          }))}
        />
      )}
    </Page>
  );
}
