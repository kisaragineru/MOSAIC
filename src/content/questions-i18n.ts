import { QUESTION_BANK, type BankText, type I18nText, type QuestionDef } from "./questions";
import { QUESTION_JA } from "./questions-ja";

/** A question with display text in every UI language. */
export interface LocalizedQuestion extends Omit<QuestionDef, "prompt" | "options" | "scale"> {
  prompt: I18nText;
  options?: { value: string; label: I18nText }[];
  scale?: { min: number; max: number; minLabel: I18nText; maxLabel: I18nText };
}

const withJa = (t: BankText, ja: string | undefined): I18nText => ({ ...t, ja: ja ?? t.en });

/** Merge Japanese display text into versioned bank content (falls back to English if missing). */
export function localizeQuestionContent(
  id: string,
  c: { prompt: BankText; options?: { value: string; label: BankText }[] | null; scale?: { min: number; max: number; minLabel: BankText; maxLabel: BankText } | null },
) {
  const ja = QUESTION_JA[id];
  return {
    prompt: withJa(c.prompt, ja?.prompt),
    options: c.options ? c.options.map((o) => ({ value: o.value, label: withJa(o.label, ja?.options?.[o.value]) })) : null,
    scale: c.scale
      ? { ...c.scale, minLabel: withJa(c.scale.minLabel, ja?.scale?.[0]), maxLabel: withJa(c.scale.maxLabel, ja?.scale?.[1]) }
      : null,
  };
}

export const LOCALIZED_BANK: LocalizedQuestion[] = QUESTION_BANK.map((q) => {
  const l = localizeQuestionContent(q.id, q);
  return { ...q, prompt: l.prompt, options: l.options ?? undefined, scale: l.scale ?? undefined };
});
