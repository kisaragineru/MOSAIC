import { notFound } from "next/navigation";
import { deleteMemoryAction, editMemoryAction } from "@/app/actions/memories";
import { ConfirmButton } from "@/components/confirm-button";
import { Flash } from "@/components/flash";
import { MemoryForm } from "@/components/memory-form";
import { Card, LinkButton, Notice, Page, Pill } from "@/components/ui";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { AppError } from "@/server/errors";
import { getMemory, markLetterRead } from "@/server/services/memories";
import { getAccount } from "@/server/services/account";
import { listPeople } from "@/server/services/people";
import { shareTargets } from "@/server/services/memory-share";
import { CIRCLE_ICON } from "@/components/circle-icon";
import { todayIn } from "@/lib/validation/common";
import { CommentThread } from "@/components/comment-thread";
import { RecordReplies } from "@/components/record-replies";
import { readReplies } from "@/server/services/replies";
import { activeConnectionsWith } from "@/server/services/sharing";
import { avatarUrls } from "@/server/services/avatars";
import { commentInbox, readThread } from "@/server/services/comments";
import { MediaGallery } from "@/components/media-grid";
import { PostAbout } from "@/components/post-about";
import { mediaFor } from "@/server/services/media";

export default async function MemoryPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const { t, locale } = await getT();
  const tz = (await getAccount(uid)).profile.timeZone;
  let m;
  try {
    m = await getMemory(uid, id);
  } catch (e) {
    if (e instanceof AppError || (e as Error).name === "ZodError") notFound();
    throw e;
  }
  // An opened letter, now read: Home stops announcing it.
  if (m.kind === "letter_to_future" && !m.sealed) await markLetterRead(uid, m.id);
  const editing = sp.edit === "1" && !m.sealed;
  const media = m.sealed ? [] : ((await mediaFor(uid, [m.id])).get(m.id) ?? []);
  const people = await listPeople(uid);
  const canShare = (await shareTargets(uid)).length > 0;
  const ta = t.memories.audience;
  // One conversation per person who commented (each sees only theirs); unread counted before reading.
  const threads = m.sealed ? [] : (await commentInbox(uid)).filter((x) => x.entryId === m.id && x.iOwn);
  const replies = m.sealed || m.kind === "letter_to_future" ? [] : await readReplies(uid, m.id);
  const replyAvatars = await avatarUrls(uid, replies.map((x) => x.authorId));
  const convos = await Promise.all(threads.map(async (th) => ({ th, comments: await readThread(uid, m.id, th.partnerId) })));
  return (
    <Page title={m.title ?? (m.kind === "letter_to_future" ? t.memories.kinds[m.kind] : t.memories.post.titleOf)} back="/memories">
      <Flash t={t} sp={sp} />
      <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
        {m.kind === "letter_to_future" && <Pill tone="violet">{t.memories.kinds[m.kind]}</Pill>}
        {m.occurredOn && <span>{m.occurredOn}</span>}
        <span>{t.common.created} {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: tz }).format(m.createdAt)}</span>
        <span>{t.common.version} {m.version}</span>
        {m.tags.map((x) => <Pill key={x}>#{x}</Pill>)}
        {m.people.map((p) => <Pill key={p.id} tone="rose">{p.nickname}</Pill>)}
      </div>
      {m.kind === "letter_to_future" && !m.sealed && m.revealOn && (
        <p className="rounded-2xl bg-linear-to-br from-violet-50 to-amber-50 px-4 py-2.5 text-sm text-violet-900 ring-1 ring-violet-100">
          {t.memories.timeline.letterArrived}
          <span className="block text-xs text-violet-800/80">
            {t.memories.timeline.letterFrom(
              new Intl.DateTimeFormat(locale, { year: "numeric", month: "long", day: "numeric", timeZone: tz }).format(m.createdAt),
              Math.max(Math.round((Date.parse(`${m.revealOn}T00:00:00Z`) - Date.parse(`${todayIn(tz, m.createdAt)}T00:00:00Z`)) / 86_400_000), 0),
            )}
          </span>
        </p>
      )}
      {m.kind !== "letter_to_future" && (
        <p className={`rounded-2xl px-4 py-2 text-xs ${m.visibility === "private" ? "bg-stone-100 text-stone-600" : "bg-rose-50 text-rose-900"}`}>
          {m.visibility === "private"
            ? `🔒 ${ta.private}`
            : m.visibility === "connections"
              ? `🔗 ${t.memories.timeline.sharedAll}`
              : `👪 ${t.memories.timeline.sharedCircles(m.circles.map((c) => `${CIRCLE_ICON[c]}${t.people.relationships[c]}`).join(locale === "ja" ? "・" : ", "))}`}
        </p>
      )}
      {m.sealed ? (
        <Notice>✉ {t.memories.sealed(m.revealOn!)}</Notice>
      ) : editing ? (
        <Card>
          <Notice>{t.memories.editNote}</Notice>
          <div className="mt-3">
            <MemoryForm
              t={t}
              action={editMemoryAction}
              people={people}
              back={`/memories/${m.id}?edit=1`}
              d={{ ...m, personIds: m.people.map((p) => p.id), body: m.body, reason: m.reason, media }}
              canShare={canShare}
              submitLabel={m.kind === "letter_to_future" ? t.common.save : t.memories.post.saveChanges}
            />
          </div>
        </Card>
      ) : (
        <Card>
          {m.body && <p className="emoji-color whitespace-pre-line text-stone-900">{m.body}</p>}
          {media.length > 0 && <div className={m.body ? "mt-3" : ""}><MediaGallery media={media} label={t.memories.media.label} /></div>}
          {m.reason && <p className="emoji-color mt-3 whitespace-pre-line text-sm text-stone-600">→ {m.reason}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <LinkButton href={`/memories/${m.id}?edit=1`}>{t.common.edit}</LinkButton>
            {m.visibility !== "private" && <LinkButton href={`/messages/new?record=${m.id}`} variant="secondary">{t.messages.shareRecord}</LinkButton>}
          </div>
        </Card>
      )}
      {!m.sealed && !editing && m.kind !== "letter_to_future" && (
        <RecordReplies t={t} locale={locale} tz={tz} replies={replies} entryId={m.id} ownerId={uid} ownerName="" ownRecord back={`/memories/${m.id}`} avatars={replyAvatars} connections={await activeConnectionsWith(uid, replies.map((x) => x.authorId))} note={m.visibility === "private" ? t.replies.privateNote : t.replies.sharedNote} />
      )}
      {!m.sealed && !editing && m.kind !== "letter_to_future" && <PostAbout t={t} id={m.id} labels={m.labels} by={m.labelsBy} feeling={m.feeling} ask={sp.ask === "feeling"} />}
      {/* Earlier one-to-one comments (ended): still readable by the two people, nothing new. */}
      {convos.length > 0 && (
        <section id="comments" className="scroll-mt-24">
          <Card title={`💬 ${t.replies.legacyTitle}`}>
            <p className="-mt-1 mb-3 text-xs leading-relaxed text-stone-500">{t.replies.legacyNote}</p>
            <div className="space-y-5">
              {convos.map(({ th, comments }) => (
                <section key={th.partnerId} id={`c-${th.partnerId}`} className="rounded-2xl bg-stone-50/80 p-3 ring-1 ring-stone-100">
                  <h3 className="mb-2 text-sm font-semibold text-stone-800">{t.comments.with(th.otherName)}</h3>
                  <CommentThread t={t} locale={locale} tz={tz} comments={comments} back={`/memories/${m.id}`} />
                </section>
              ))}
            </div>
          </Card>
        </section>
      )}
      {m.versions.length > 1 && (
        <Card title={t.memories.versions}>
          <ol className="space-y-3">
            {[...m.versions].reverse().map((v) => (
              <li key={v.id} className="border-l-2 border-stone-200 pl-3">
                <p className="text-xs text-stone-500">{t.memories.versionLabel(v.version)} · {v.createdAt.toISOString().slice(0, 16).replace("T", " ")}</p>
                {v.title && <p className="text-sm font-medium">{v.title}</p>}
                <p className="emoji-color whitespace-pre-line text-sm text-stone-700">{v.body}</p>
              </li>
            ))}
          </ol>
        </Card>
      )}
      <form action={deleteMemoryAction}>
        <input type="hidden" name="id" value={m.id} />
        <ConfirmButton message={t.common.confirmDelete}>{t.common.delete}</ConfirmButton>
      </form>
    </Page>
  );
}
