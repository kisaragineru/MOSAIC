import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { CommentThread } from "@/components/comment-thread";
import { avatarUrls } from "@/server/services/avatars";
import { Flash } from "@/components/flash";
import { Card, Page, Pill } from "@/components/ui";
import { KIND_ICON } from "@/lib/timeline";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { getAccount } from "@/server/services/account";
import { readThread, sharedEntry } from "@/server/services/comments";
import { uuid } from "@/lib/validation/common";
import { MediaGallery } from "@/components/media-grid";
import { mediaFor } from "@/server/services/media";

/** Someone else's shared record, and my one-to-one conversation with them about it. */
export default async function SharedRecordPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const sp = await searchParams;
  const { t, locale } = await getT();
  const e = await sharedEntry(uid, id);
  if (!e) notFound();
  const tz = (await getAccount(uid)).profile.timeZone;
  const comments = await readThread(uid, id, null).catch(() => []);
  const media = (await mediaFor(uid, [e.id])).get(e.id) ?? [];
  return (
    <Page title={t.comments.recordOf(e.ownerName)} back="/memories?view=friends">
      <Flash t={t} sp={sp} />
      <article className="rounded-3xl border border-rose-100 bg-rose-50/50 p-4 shadow-sm">
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <Avatar name={e.ownerName} src={(await avatarUrls(uid, [e.ownerId])).get(e.ownerId)} className="h-8 w-8 text-xs" />
          <span className="text-sm font-semibold text-rose-900">{e.ownerName}</span>
          {e.kind !== "note" && <Pill tone="rose">{KIND_ICON[e.kind]} {t.memories.kinds[e.kind]}</Pill>}
          <time dateTime={e.createdAt.toISOString()} className="text-xs text-stone-500">
            {e.occurredOn ?? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: tz }).format(e.createdAt)}
          </time>
        </div>
        {e.title && <p className="emoji-color font-semibold text-stone-900">{e.title}</p>}
        {e.body && <p className="emoji-color whitespace-pre-line leading-relaxed text-stone-800">{e.body}</p>}
        {media.length > 0 && <div className={e.body ? "mt-3" : ""}><MediaGallery media={media} label={t.memories.media.label} /></div>}
      </article>
      <Link href={`/messages/new?record=${e.id}`} className="inline-flex min-h-10 items-center rounded-full bg-white px-4 text-sm font-semibold text-teal-800 ring-1 ring-stone-200 transition hover:ring-teal-300">
        {t.messages.shareRecord}
      </Link>
      <section id="comments" className="scroll-mt-24">
        <Card title={`💬 ${t.comments.title}`}>
          <p className="-mt-1 mb-3 text-xs leading-relaxed text-stone-500">{t.comments.private(e.ownerName)}</p>
          <CommentThread t={t} locale={locale} tz={tz} comments={comments} otherName={e.ownerName} entryId={e.id} partnerId={null} back={`/memories/shared/${e.id}`} />
        </Card>
      </section>
    </Page>
  );
}
