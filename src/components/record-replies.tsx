import Link from "next/link";
import { addReplyAction, deleteReplyAction } from "@/app/actions/comments";
import type { Dict } from "@/lib/i18n/messages/en";
import type { Locale } from "@/lib/i18n/locales";
import type { Reply } from "@/server/services/replies";
import { Avatar } from "./avatar";
import { ConfirmButton } from "./confirm-button";

/**
 * The replies under a record, as a thread hanging from it: the owner's follow-ups and the words of
 * the people it's shared with, each with their name. Anyone who can see the record can reply; the
 * writer, or the record's owner, can delete a reply.
 */
export function RecordReplies({
  t,
  locale,
  tz,
  replies,
  entryId,
  ownerId,
  ownerName,
  ownRecord,
  back,
  note,
  nameNote,
  avatars,
  connections,
}: {
  t: Dict;
  locale: Locale;
  tz: string;
  replies: Reply[];
  entryId: string;
  ownerId: string;
  ownerName: string;
  /** The record is mine (I can delete every reply under it). */
  ownRecord: boolean;
  back: string;
  /** Who can see them. */
  note?: string;
  /** Under someone else's record: that my name shows to the others who can see it. */
  nameNote?: string;
  avatars: Map<string, string>;
  /** People I'm connected to among the writers: their id → our connection. */
  connections: Map<string, string>;
}) {
  const r = t.replies;
  const when = new Intl.DateTimeFormat(locale, { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: tz });
  return (
    <section id="replies" aria-label={r.title} className="scroll-mt-24 space-y-2" data-testid="record-replies">
      <h2 className="px-1 text-sm font-semibold text-stone-700">
        ↳ {r.title}
        {replies.length > 0 && <span className="ml-1.5 text-stone-400">{replies.length}</span>}
      </h2>
      {replies.length > 0 && (
        <ol className="ml-4 space-y-3 border-l-2 border-teal-200 pl-4">
          {replies.map((x) => {
            const byOwner = x.authorId === ownerId;
            const session = x.mine ? undefined : connections.get(x.authorId);
            const link = session && x.authorName ? `/compare/${session}` : null;
            return (
              <li key={x.id} className="relative">
                {/* Someone I'm connected to: the icon and name open our page together. */}
                {link ? (
                  <Link href={link} aria-label={r.openProfile(x.authorName ?? "")} className="absolute -left-[1.95rem] top-0 rounded-full transition hover:scale-110 focus-visible:outline-2 focus-visible:outline-teal-600">
                    <Avatar name={x.authorName ?? "?"} src={avatars.get(x.authorId)} className="h-7 w-7 text-[10px] ring-2 ring-white" />
                  </Link>
                ) : (
                  <Avatar name={x.authorName ?? "?"} src={avatars.get(x.authorId)} className="absolute -left-[1.95rem] top-0 h-7 w-7 text-[10px] ring-2 ring-white" />
                )}
                <p className="flex flex-wrap items-center gap-1.5 px-1 text-xs">
                  {link ? (
                    <Link href={link} className="font-semibold text-stone-800 underline-offset-2 hover:text-teal-800 hover:underline">{x.authorName}</Link>
                  ) : (
                    <span className={`font-semibold ${x.mine ? "text-teal-800" : "text-stone-800"}`}>{x.mine ? r.you : (x.authorName ?? r.friendOf(ownerName))}</span>
                  )}
                  {byOwner && <span className="rounded-full bg-teal-50 px-1.5 py-px text-[10px] font-semibold text-teal-800 ring-1 ring-teal-100">{r.author}</span>}
                </p>
                <p className={`emoji-color mt-0.5 whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed text-stone-900 shadow-sm ring-1 ${byOwner ? "bg-white ring-stone-200/70" : "bg-sky-50/70 ring-sky-100"}`}>{x.body}</p>
                <span className="mt-0.5 flex items-center gap-2 px-1 text-[11px] text-stone-500">
                  <time dateTime={x.createdAt.toISOString()}>{when.format(x.createdAt)}</time>
                  {(x.mine || ownRecord) && (
                    <form action={deleteReplyAction}>
                      <input type="hidden" name="replyId" value={x.id} />
                      <input type="hidden" name="back" value={back} />
                      <ConfirmButton bare message={r.deleteConfirm} className="rounded-full px-1 text-[11px] text-stone-500 underline-offset-2 hover:text-rose-700 hover:underline">
                        {r.delete}
                      </ConfirmButton>
                    </form>
                  )}
                </span>
              </li>
            );
          })}
        </ol>
      )}
      <form action={addReplyAction} className="flex items-end gap-2">
        <input type="hidden" name="entryId" value={entryId} />
        <input type="hidden" name="back" value={back} />
        <textarea
          name="body"
          required
          maxLength={2000}
          rows={1}
          aria-label={r.label}
          placeholder={ownRecord ? r.placeholderOwn : r.placeholder(ownerName)}
          className="field-sizing-content max-h-40 min-h-11 flex-1 resize-none rounded-2xl border border-stone-200 bg-white px-3.5 py-2.5 text-base text-stone-900 placeholder:text-stone-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
        />
        <button type="submit" className="min-h-11 shrink-0 rounded-full bg-teal-700 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800 active:scale-95">
          {t.comments.send}
        </button>
      </form>
      {note && <p className="px-1 text-[11px] leading-4 text-stone-500">{note}</p>}
      {nameNote && <p className="px-1 text-[11px] leading-4 text-stone-500" data-testid="reply-name-note">{nameNote}</p>}
    </section>
  );
}
