import { addCommentAction, deleteCommentAction } from "@/app/actions/comments";
import type { Dict } from "@/lib/i18n/messages/en";
import type { Locale } from "@/lib/i18n/locales";
import type { Comment } from "@/server/services/comments";
import { ConfirmButton } from "./confirm-button";

/**
 * One one-to-one conversation about a record: my words on the right, theirs on the left, and a
 * box to write more. `partnerId` is set when the record is mine (I'm answering that person).
 */
export function CommentThread({
  t,
  locale,
  tz,
  comments,
  otherName,
  entryId,
  partnerId,
  back,
  reply = false,
}: {
  t: Dict;
  locale: Locale;
  tz: string;
  comments: Comment[];
  otherName: string;
  entryId: string;
  partnerId: string | null;
  back: string;
  reply?: boolean;
}) {
  const c = t.comments;
  const when = new Intl.DateTimeFormat(locale, { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: tz });
  return (
    <div className="space-y-3">
      {comments.length > 0 ? (
        <ol className="stagger space-y-2">
          {comments.map((m) => (
            <li key={m.id} className={`flex flex-col ${m.mine ? "items-end" : "items-start"}`}>
              <p className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${m.mine ? "rounded-br-md bg-teal-700 text-white" : "rounded-bl-md bg-white text-stone-900 ring-1 ring-stone-200"}`}>
                {m.body}
              </p>
              <span className="mt-0.5 flex items-center gap-2 px-1 text-[11px] text-stone-500">
                <time dateTime={m.createdAt.toISOString()}>{when.format(m.createdAt)}</time>
                {m.mine && (
                  <form action={deleteCommentAction}>
                    <input type="hidden" name="commentId" value={m.id} />
                    <input type="hidden" name="back" value={back} />
                    <ConfirmButton bare message={c.deleteConfirm} className="rounded-full px-1 text-[11px] text-stone-500 underline-offset-2 hover:text-rose-700 hover:underline">
                      {c.delete}
                    </ConfirmButton>
                  </form>
                )}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-stone-500">{c.none}</p>
      )}
      <form action={addCommentAction} className="flex items-end gap-2">
        <input type="hidden" name="entryId" value={entryId} />
        {partnerId && <input type="hidden" name="partnerId" value={partnerId} />}
        <input type="hidden" name="back" value={back} />
        <textarea
          name="body"
          required
          maxLength={2000}
          rows={1}
          aria-label={reply ? c.reply : c.write}
          placeholder={reply ? c.replyPlaceholder(otherName) : c.placeholder(otherName)}
          className="field-sizing-content max-h-40 min-h-11 flex-1 resize-none rounded-2xl border border-stone-200 bg-white px-3.5 py-2.5 text-base text-stone-900 placeholder:text-stone-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
        />
        <button type="submit" className="min-h-11 shrink-0 rounded-full bg-teal-700 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800 active:scale-95">
          {c.send}
        </button>
      </form>
    </div>
  );
}
