import { notFound } from "next/navigation";
import { deleteMemoryAction, editMemoryAction } from "@/app/actions/memories";
import { ConfirmButton } from "@/components/confirm-button";
import { Flash } from "@/components/flash";
import { MemoryForm } from "@/components/memory-form";
import { Card, LinkButton, Notice, Page, Pill } from "@/components/ui";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { AppError } from "@/server/errors";
import { getMemory } from "@/server/services/memories";
import { getAccount } from "@/server/services/account";
import { listPeople } from "@/server/services/people";
import { shareTargets } from "@/server/services/memory-share";
import { CIRCLE_ICON } from "@/components/circle-icon";
import { todayIn } from "@/lib/validation/common";
import { CommentThread } from "@/components/comment-thread";
import { commentInbox, readThread } from "@/server/services/comments";
import { MediaGallery } from "@/components/media-grid";
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
  const editing = sp.edit === "1" && !m.sealed;
  const media = m.sealed ? [] : ((await mediaFor(uid, [m.id])).get(m.id) ?? []);
  const people = await listPeople(uid);
  const canShare = (await shareTargets(uid)).length > 0;
  const ta = t.memories.audience;
  // One conversation per person who commented (each sees only theirs); unread counted before reading.
  const threads = m.sealed ? [] : (await commentInbox(uid)).filter((x) => x.entryId === m.id && x.iOwn);
  const convos = await Promise.all(threads.map(async (th) => ({ th, comments: await readThread(uid, m.id, th.partnerId) })));
  return (
    <Page title={m.title ?? t.memories.kinds[m.kind]} back="/memories">
      <Flash t={t} sp={sp} />
      <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
        <Pill tone="teal">{t.memories.kinds[m.kind]}</Pill>
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
              submitLabel={t.common.save}
            />
          </div>
        </Card>
      ) : (
        <Card>
          {m.body && <p className="whitespace-pre-line text-stone-900">{m.body}</p>}
          {media.length > 0 && <div className={m.body ? "mt-3" : ""}><MediaGallery media={media} label={t.memories.media.label} /></div>}
          {m.reason && <p className="mt-3 whitespace-pre-line text-sm text-stone-600">→ {m.reason}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <LinkButton href={`/memories/${m.id}?edit=1`}>{t.common.edit}</LinkButton>
            {m.visibility !== "private" && <LinkButton href={`/messages/new?record=${m.id}`} variant="secondary">{t.messages.shareRecord}</LinkButton>}
          </div>
        </Card>
      )}
      {(convos.length > 0 || (!m.sealed && m.visibility !== "private")) && (
        <section id="comments" className="scroll-mt-24">
          <Card title={`💬 ${t.comments.title}`}>
            <p className="-mt-1 mb-3 text-xs leading-relaxed text-stone-500">{t.comments.privateOwner}</p>
            {convos.length === 0 ? (
              <p className="text-sm text-stone-500">{t.comments.noneOwner}</p>
            ) : (
              <div className="space-y-5">
                {convos.map(({ th, comments }) => (
                  <section key={th.partnerId} id={`c-${th.partnerId}`} className="rounded-2xl bg-stone-50/80 p-3 ring-1 ring-stone-100">
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-stone-800">
                      {t.comments.with(th.otherName)}
                      {th.unread > 0 && <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">{t.comments.newBadge}</span>}
                    </h3>
                    <CommentThread t={t} locale={locale} tz={tz} comments={comments} otherName={th.otherName} entryId={m.id} partnerId={th.partnerId} back={`/memories/${m.id}`} reply />
                  </section>
                ))}
              </div>
            )}
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
                <p className="whitespace-pre-line text-sm text-stone-700">{v.body}</p>
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
