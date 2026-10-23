import { answerAction, skipAction } from "@/app/actions/discovery";
import type { Locale } from "@/lib/i18n/locales";
import type { Dict } from "@/lib/i18n/messages/en";
import type { QuestionView } from "@/server/services/discovery";
import { Button, Checkbox, Input, Textarea } from "./ui";

export function QuestionForm({ q, t, locale, back, allowSkip = true }: { q: QuestionView; t: Dict; locale: Locale; back: string; allowSkip?: boolean }) {
  return (
    <form action={answerAction} className="space-y-3">
      <input type="hidden" name="questionId" value={q.id} />
      <input type="hidden" name="questionVersion" value={q.version} />
      <input type="hidden" name="format" value={q.format} />
      <input type="hidden" name="back" value={back} />
      <fieldset className="space-y-2">
        <legend className="mb-2 text-lg text-stone-900">{q.prompt[locale]}</legend>
        {q.format === "single" &&
          q.options?.map((o) => (
            <label key={o.value} className="flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2 has-[:checked]:border-teal-600 has-[:checked]:bg-teal-50">
              <input type="radio" name="choice" value={o.value} required className="accent-teal-700" />
              <span>{o.label[locale]}</span>
            </label>
          ))}
        {q.format === "multi" && (
          <>
            {q.maxChoices && <p className="text-xs text-stone-500">{t.discover.chooseUpTo(q.maxChoices)}</p>}
            <div className="grid grid-cols-2 gap-2">
              {q.options?.map((o) => (
                <label key={o.value} className="flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2 has-[:checked]:border-teal-600 has-[:checked]:bg-teal-50">
                  <input type="checkbox" name="choices" value={o.value} className="accent-teal-700" />
                  <span className="text-sm">{o.label[locale]}</span>
                </label>
              ))}
            </div>
          </>
        )}
        {q.format === "scale" && q.scale && (
          <div>
            <div className="flex justify-between gap-1">
              {Array.from({ length: q.scale.max - q.scale.min + 1 }, (_, i) => q.scale!.min + i).map((v) => (
                <label key={v} className="flex flex-1 cursor-pointer flex-col items-center rounded-xl border border-stone-200 py-2 has-[:checked]:border-teal-600 has-[:checked]:bg-teal-50">
                  <input type="radio" name="scale" value={v} required className="accent-teal-700" />
                  <span className="text-sm">{v}</span>
                </label>
              ))}
            </div>
            <div className="mt-1 flex justify-between text-xs text-stone-500">
              <span>{q.scale.minLabel[locale]}</span>
              <span className="text-right">{q.scale.maxLabel[locale]}</span>
            </div>
          </div>
        )}
        {q.format === "short" && <Input name="text" required maxLength={280} aria-label={q.prompt[locale]} />}
        {q.format === "free" && <Textarea name="text" required maxLength={5000} rows={5} aria-label={q.prompt[locale]} />}
      </fieldset>
      {q.comparable && <Checkbox name="comparable" label={<>{t.discover.allowCompare}<span className="block text-xs text-stone-500">{t.discover.allowCompareHelp}</span></>} />}
      <div className="flex gap-2">
        <Button type="submit">{t.discover.submit}</Button>
        {allowSkip && (
          <Button type="submit" variant="ghost" formAction={skipAction} formNoValidate>
            {t.discover.skip}
          </Button>
        )}
      </div>
    </form>
  );
}
