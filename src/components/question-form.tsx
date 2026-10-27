import { scaleWords } from "@/lib/discovery/format";
import { answerAction, skipAction } from "@/app/actions/discovery";
import { SubmitButton } from "./submit-button";
import { AXIS_LABEL, CHAPTER_INFO, chapterOf } from "@/content/axes";
import { QUESTION_BANK } from "@/content/questions";
import type { Locale } from "@/lib/i18n/locales";
import type { Dict } from "@/lib/i18n/messages/en";
import type { QuestionView } from "@/server/services/discovery";
import { Button, Input, Textarea } from "./ui";

const optionCls =
  "flex cursor-pointer items-center gap-2 rounded-2xl border border-stone-200 bg-white/80 px-3 py-2.5 transition-colors hover:border-teal-300 has-[:checked]:border-teal-600 has-[:checked]:bg-teal-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-teal-600/30";

export function QuestionForm({ q, t, locale, back, allowSkip = true }: { q: QuestionView; t: Dict; locale: Locale; back: string; allowSkip?: boolean }) {
  const def = QUESTION_BANK.find((x) => x.id === q.id);
  const chapter = def ? chapterOf(def) : null;
  const axes = [...new Set((q.signals ?? []).map((s) => s.claimKey))];
  const d = t.discover;
  return (
    <form action={answerAction} className="space-y-4">
      <input type="hidden" name="questionId" value={q.id} />
      <input type="hidden" name="questionVersion" value={q.version} />
      <input type="hidden" name="format" value={q.format} />
      <input type="hidden" name="back" value={back} />
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        {chapter && (
          <span className="rounded-full bg-violet-100/70 px-2.5 py-0.5 font-semibold text-violet-800">
            {CHAPTER_INFO[chapter].icon} {CHAPTER_INFO[chapter].title[locale]}
          </span>
        )}
        <span
          title={q.comparable ? d.comparableBadgeHelp : d.privateBadgeHelp}
          className={`rounded-full px-2.5 py-0.5 font-semibold ${q.comparable ? "bg-teal-50 text-teal-800" : "bg-stone-100 text-stone-600"}`}
        >
          {q.comparable ? d.comparableBadge : d.privateBadge}
        </span>
      </div>
      <fieldset className="space-y-2">
        <legend className="mb-3 text-lg leading-snug text-stone-900">{q.prompt[locale]}</legend>
        {q.format === "single" &&
          q.options?.map((o) => (
            <label key={o.value} className={optionCls}>
              <input type="radio" name="choice" value={o.value} required className="accent-teal-700" />
              <span>{o.label[locale]}</span>
            </label>
          ))}
        {q.format === "multi" && (
          <>
            {q.maxChoices && <p className="text-xs text-stone-500">{d.chooseUpTo(q.maxChoices)}</p>}
            <div className="grid grid-cols-2 gap-2">
              {q.options?.map((o) => (
                <label key={o.value} className={optionCls}>
                  <input type="checkbox" name="choices" value={o.value} className="accent-teal-700" />
                  <span className="text-sm">{o.label[locale]}</span>
                </label>
              ))}
            </div>
          </>
        )}
        {q.format === "scale" && q.scale && (
          // Five words, from one end to the other (stored as 1–5).
          <div className="space-y-2" data-testid="scale-words">
            {scaleWords(q).map((w, i) => (
              <label key={i} className={optionCls}>
                <input type="radio" name="scale" value={q.scale!.min + i} required className="accent-teal-700" />
                <span className="flex items-center gap-2">
                  <span aria-hidden className="flex gap-0.5">{[1, 2, 3, 4, 5].map((n) => <span key={n} className={`h-1.5 w-1.5 rounded-full ${n <= i + 1 ? "bg-teal-600" : "bg-stone-200"}`} />)}</span>
                  {w[locale]}
                </span>
              </label>
            ))}
          </div>
        )}
        {q.format === "short" && <Input name="text" required maxLength={280} aria-label={q.prompt[locale]} />}
        {q.format === "free" && <Textarea name="text" required maxLength={5000} rows={5} aria-label={q.prompt[locale]} />}
      </fieldset>
      {axes.length > 0 && (
        <p className="flex flex-wrap items-center gap-1 text-xs text-stone-500">
          <span>{d.informs}:</span>
          {axes.map((k) => (
            <span key={k} className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-800">{AXIS_LABEL[k].name[locale]}</span>
          ))}
        </p>
      )}
      {(q.format === "single" || q.format === "multi" || q.format === "scale") && (
        <details className="rounded-2xl border border-dashed border-stone-200 px-3 py-2 text-sm">
          <summary className="cursor-pointer text-stone-600">{d.noteToggle}</summary>
          <Textarea name="note" maxLength={1000} rows={2} placeholder={d.notePlaceholder} aria-label={d.noteToggle} className="mt-2" />
        </details>
      )}
      {q.comparable && (
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-stone-50 px-3 py-2.5 text-sm">
          <input type="checkbox" name="comparable" className="mt-0.5 h-5 w-5 shrink-0 accent-teal-700" />
          <span>
            <span className="font-medium text-stone-800">{d.shareToggle}</span>
            <span className="block text-xs text-stone-500">{d.allowCompareHelp}</span>
          </span>
        </label>
      )}
      <div className="flex gap-2">
        <SubmitButton pending={d.saving}>{d.submit}</SubmitButton>
        {allowSkip && (
          <Button type="submit" variant="ghost" formAction={skipAction} formNoValidate>
            {d.skip}
          </Button>
        )}
      </div>
    </form>
  );
}
