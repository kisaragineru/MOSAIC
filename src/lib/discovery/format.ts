import type { I18nText } from "@/content/questions";
import type { Locale } from "@/lib/i18n/locales";
import type { Answer } from "./answers";

/** Human-readable answer in the given locale. */
export function answerLabel(options: { value: string; label: I18nText }[] | null, answer: Answer | null, locale: Locale): string {
  if (!answer) return "—";
  const label = (v: string) => {
    const l = options?.find((o) => o.value === v)?.label as Partial<Record<string, string>> | undefined;
    return l?.[locale] ?? l?.en ?? v;
  };
  if ("choice" in answer) return label(answer.choice);
  if ("choices" in answer) return answer.choices.map(label).join(", ");
  if ("scale" in answer) return String(answer.scale);
  return answer.text;
}
