import { deleteCommentAction } from "@/app/actions/comments";
import type { Dict } from "@/lib/i18n/messages/en";
import type { Locale } from "@/lib/i18n/locales";
import type { Comment } from "@/server/services/comments";
import { ConfirmButton } from "./confirm-button";

/**
 * An earlier one-to-one conversation about a record (they've ended; replies under the record took
 * their place): my words on the right, theirs on the left. Each can take back their own words.
 */
export function CommentThread({
  t,
  locale,
  tz,
  comments,
  back,
}: {
  t: Dict;
  locale: Locale;
  tz: string;
  comments: Comment[];
  back: string;
}) {
  const c = t.comments;
  const when = new Intl.DateTimeFormat(locale, { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: tz });
  return (
    <div className="space-y-3">
      {comments.length > 0 ? (
        <ol className="stagger space-y-2">
          {comments.map((m) => (
            <li key={m.id} className={`flex flex-col ${m.mine ? "items-end" : "items-start"}`}>
              <p className={`emoji-color max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${m.mine ? "rounded-br-md bg-teal-700 text-white" : "rounded-bl-md bg-white text-stone-900 ring-1 ring-stone-200"}`}>
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
    </div>
  );
}
