import type { I18nText } from "@/content/questions";
import type { Locale } from "@/lib/i18n/locales";
import type { Answer } from "./answers";

type Text = I18nText | { en: string; vi: string };

/** The five words for each 1–5 scale, told apart by the scale's low end. */
const AGREE: I18nText[] = [
  { ja: "そう思わない", en: "Not like me", vi: "Không giống tôi" },
  { ja: "あまりそう思わない", en: "Not really like me", vi: "Không giống lắm" },
  { ja: "どちらともいえない", en: "Somewhere in between", vi: "Lưng chừng" },
  { ja: "ややそう思う", en: "Somewhat like me", vi: "Khá giống tôi" },
  { ja: "そう思う", en: "Very much like me", vi: "Rất giống tôi" },
];
const SPICY: I18nText[] = [
  { ja: "避けている", en: "I avoid it", vi: "Tôi tránh ăn cay" },
  { ja: "少し苦手", en: "Not much", vi: "Không thích lắm" },
  { ja: "ふつう", en: "It's fine", vi: "Bình thường" },
  { ja: "わりと好き", en: "I like it", vi: "Khá thích" },
  { ja: "辛いほどいい", en: "The spicier the better", vi: "Càng cay càng thích" },
];
const WEEK: I18nText[] = [
  { ja: "とても大変だった", en: "Very hard", vi: "Rất khó khăn" },
  { ja: "少し大変だった", en: "A bit hard", vi: "Hơi khó khăn" },
  { ja: "ふつう", en: "Okay", vi: "Bình thường" },
  { ja: "まあまあよかった", en: "Fairly good", vi: "Khá tốt" },
  { ja: "とてもよかった", en: "Very good", vi: "Rất tốt" },
];

/** A question's 1–5 scale in words (agreement unless its low end says otherwise). */
export function scaleWords(scale: { minLabel?: Text } | null | undefined): I18nText[] {
  const low = scale?.minLabel?.en ?? "";
  if (/avoid/i.test(low)) return SPICY;
  if (/hard/i.test(low)) return WEEK;
  return AGREE;
}

export function scaleWord(scale: { minLabel?: Text } | null | undefined, n: number, locale: Locale): string {
  return scaleWords(scale)[Math.min(5, Math.max(1, Math.round(n))) - 1]![locale];
}

type Asked = { options?: { value: string; label: I18nText }[] | null; scale?: { minLabel?: Text } | null } | null | undefined;

/** Human-readable answer in the given locale (a 1–5 scale in words). */
export function answerLabel(question: Asked, answer: Answer | null, locale: Locale): string {
  if (!answer) return "—";
  const options = question?.options ?? null;
  const label = (v: string) => {
    const l = options?.find((o) => o.value === v)?.label as Partial<Record<string, string>> | undefined;
    return l?.[locale] ?? l?.en ?? v;
  };
  if ("choice" in answer) return label(answer.choice);
  if ("choices" in answer) return answer.choices.map(label).join(", ");
  if ("scale" in answer) return scaleWord(question?.scale, answer.scale, locale);
  return answer.text;
}
