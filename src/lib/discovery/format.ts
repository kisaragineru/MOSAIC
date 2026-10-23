import type { QuestionOption } from "@/content/questions";
import type { Locale } from "@/lib/i18n/locales";
import type { Answer } from "./answers";

/** Human-readable answer in the given locale. */
export function answerLabel(options: QuestionOption[] | null, answer: Answer | null, locale: Locale): string {
  if (!answer) return "—";
  const label = (v: string) => options?.find((o) => o.value === v)?.label[locale] ?? v;
  if ("choice" in answer) return label(answer.choice);
  if ("choices" in answer) return answer.choices.map(label).join(", ");
  if ("scale" in answer) return String(answer.scale);
  return answer.text;
}
