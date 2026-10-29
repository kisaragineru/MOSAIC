import { feedbackAction } from "@/app/actions/discovery";
import type { Dict } from "@/lib/i18n/messages/en";

/**
 * A light "how was that question?" after an answer (?fb=<question id>), and a thank-you once rated
 * (?fbdone=1). Never blocks: ignoring it is fine. With `saved`, it also says the answer was saved,
 * in the same one line (instead of a notice of its own).
 */
export function FeedbackPrompt({ sp, back, t, saved }: { sp: Record<string, string | undefined>; back: string; t: Dict; saved?: boolean }) {
  const d = t.discover;
  if (sp.fbdone) return <p className="text-center text-xs text-stone-500">{d.feedbackThanks}</p>;
  if (!sp.fb) return null;
  return (
    <form action={feedbackAction} className="flex items-center justify-between gap-2 rounded-2xl bg-white/70 px-3 py-1.5 text-xs ring-1 ring-stone-200/70" data-testid="feedback-prompt">
      <input type="hidden" name="questionId" value={sp.fb} />
      <input type="hidden" name="back" value={back} />
      <span className="min-w-0 text-stone-600" role={saved ? "status" : undefined}>
        {saved && <span className="font-semibold text-teal-800">✓ {d.savedShort} · </span>}
        {saved ? d.feedbackAskShort : d.feedbackAsk}
      </span>
      <span className="flex shrink-0 gap-1.5">
      <button name="rating" value="1" className="whitespace-nowrap rounded-full border border-stone-200 bg-white px-2.5 py-1 hover:border-teal-300">{d.feedbackGood}</button>
      <button name="rating" value="-1" className="whitespace-nowrap rounded-full border border-stone-200 bg-white px-2.5 py-1 hover:border-rose-300">{d.feedbackBad}</button>
      </span>
    </form>
  );
}
