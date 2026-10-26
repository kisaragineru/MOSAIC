import { addReplyAction, deleteReplyAction } from "@/app/actions/comments";
import type { Dict } from "@/lib/i18n/messages/en";
import type { Locale } from "@/lib/i18n/locales";
import type { Reply } from "@/server/services/replies";
import { ConfirmButton } from "./confirm-button";

/**
 * The owner's replies under a record, as a thread hanging from it. On my own record I can add and
 * delete them; on someone else's I only read them.
 */
export function RecordReplies({
  t,
  locale,
  tz,
  replies,
  entryId,
  editable,
  note,
  title,
}: {
  t: Dict;
  locale: Locale;
  tz: string;
  replies: Reply[];
  entryId: string;
  editable: boolean;
  /** Who can see them (on my own record). */
  note?: string;
  title: string;
}) {
  const r = t.replies;
  const when = new Intl.DateTimeFormat(locale, { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: tz });
  if (!editable && replies.length === 0) return null;
  return (
    <section id="replies" aria-label={title} className="scroll-mt-24 space-y-2" data-testid="record-replies">
      <h2 className="px-1 text-sm font-semibold text-stone-700">↳ {title}</h2>
      {replies.length > 0 && (
        <ol className="ml-4 space-y-2 border-l-2 border-teal-200 pl-4">
          {replies.map((x) => (
            <li key={x.id} className="relative">
              <span aria-hidden className="absolute -left-[1.4rem] top-3 h-2.5 w-2.5 rounded-full bg-teal-400 ring-2 ring-white" />
              <p className="emoji-color whitespace-pre-line rounded-2xl bg-white px-3.5 py-2.5 text-sm leading-relaxed text-stone-900 shadow-sm ring-1 ring-stone-200/70">{x.body}</p>
              <span className="mt-0.5 flex items-center gap-2 px-1 text-[11px] text-stone-500">
                <time dateTime={x.createdAt.toISOString()}>{when.format(x.createdAt)}</time>
                {editable && (
                  <form action={deleteReplyAction}>
                    <input type="hidden" name="replyId" value={x.id} />
                    <input type="hidden" name="entryId" value={entryId} />
                    <ConfirmButton bare message={r.deleteConfirm} className="rounded-full px-1 text-[11px] text-stone-500 underline-offset-2 hover:text-rose-700 hover:underline">
                      {r.delete}
                    </ConfirmButton>
                  </form>
                )}
              </span>
            </li>
          ))}
        </ol>
      )}
      {editable && (
        <>
          <form action={addReplyAction} className="flex items-end gap-2">
            <input type="hidden" name="entryId" value={entryId} />
            <textarea
              name="body"
              required
              maxLength={2000}
              rows={1}
              aria-label={r.label}
              placeholder={r.placeholder}
              className="field-sizing-content max-h-40 min-h-11 flex-1 resize-none rounded-2xl border border-stone-200 bg-white px-3.5 py-2.5 text-base text-stone-900 placeholder:text-stone-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
            />
            <button type="submit" className="min-h-11 shrink-0 rounded-full bg-teal-700 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800 active:scale-95">
              {t.comments.send}
            </button>
          </form>
          {note && <p className="px-1 text-[11px] leading-4 text-stone-500">{note}</p>}
        </>
      )}
    </section>
  );
}
