import type { I18nText } from "@/content/questions";
import type { Locale } from "@/lib/i18n/locales";
import type { Answer } from "./answers";

type Text = I18nText | { en: string; vi: string };

/** The five words for a 1–5 scale, chosen to answer each question in its own terms. */
const W = (ja: string, en: string, vi: string): I18nText => ({ ja, en, vi });
// Opinions and preferences: do you agree?
const AGREE: I18nText[] = [
  W("そう思わない", "Disagree", "Không đồng ý"),
  W("あまりそう思わない", "Somewhat disagree", "Hơi không đồng ý"),
  W("どちらともいえない", "Neither", "Lưng chừng"),
  W("ややそう思う", "Somewhat agree", "Khá đồng ý"),
  W("とてもそう思う", "Strongly agree", "Rất đồng ý"),
];
// Describing yourself: is it like you?
const FIT: I18nText[] = [
  W("当てはまらない", "Not like me", "Không giống tôi"),
  W("あまり当てはまらない", "Not really like me", "Không giống lắm"),
  W("どちらともいえない", "Somewhere in between", "Lưng chừng"),
  W("やや当てはまる", "Somewhat like me", "Khá giống tôi"),
  W("とても当てはまる", "Very much like me", "Rất giống tôi"),
];
// Habits and things that happen: how often?
const OFTEN: I18nText[] = [
  W("ほとんどない", "Hardly ever", "Hầu như không"),
  W("あまりない", "Rarely", "Hiếm khi"),
  W("ときどき", "Sometimes", "Thỉnh thoảng"),
  W("よくある", "Often", "Thường xuyên"),
  W("いつもそう", "Almost always", "Hầu như luôn luôn"),
];
// A feeling: do you feel it?
const FEEL: I18nText[] = [
  W("感じない", "I don't feel that", "Không thấy vậy"),
  W("あまり感じない", "Not really", "Không thấy lắm"),
  W("どちらともいえない", "Somewhere in between", "Lưng chừng"),
  W("少し感じる", "A little", "Hơi thấy vậy"),
  W("とても感じる", "Very much", "Rất thấy vậy"),
];
const BOTHER: I18nText[] = [
  W("気にならない", "Doesn't bother me", "Không bận tâm"),
  W("あまり気にならない", "Hardly bothers me", "Ít bận tâm"),
  W("どちらともいえない", "Somewhere in between", "Lưng chừng"),
  W("わりと気になる", "Bothers me a bit", "Khá bận tâm"),
  W("とても気になる", "Bothers me a lot", "Rất bận tâm"),
];
const ENJOY: I18nText[] = [
  W("楽しくない", "Not fun for me", "Không vui"),
  W("あまり楽しくない", "Not much fun", "Không vui lắm"),
  W("どちらともいえない", "Somewhere in between", "Lưng chừng"),
  W("わりと楽しい", "Fairly fun", "Khá vui"),
  W("とても楽しい", "Great fun", "Rất vui"),
];
const RELIEF: I18nText[] = [
  W("特に変わらない", "Makes no difference", "Không khác gì"),
  W("あまり変わらない", "Hardly any difference", "Gần như không khác"),
  W("どちらともいえない", "Somewhere in between", "Lưng chừng"),
  W("少し安心する", "A little reassuring", "Hơi yên tâm"),
  W("とても安心する", "Very reassuring", "Rất yên tâm"),
];
const SPICY: I18nText[] = [
  W("避けている", "I avoid it", "Tôi tránh ăn cay"),
  W("少し苦手", "Not much", "Không thích lắm"),
  W("ふつう", "It's fine", "Bình thường"),
  W("わりと好き", "I like it", "Khá thích"),
  W("辛いほどいい", "The spicier the better", "Càng cay càng thích"),
];
const WEEK: I18nText[] = [
  W("とても大変だった", "Very hard", "Rất khó khăn"),
  W("少し大変だった", "A bit hard", "Hơi khó khăn"),
  W("ふつう", "Okay", "Bình thường"),
  W("まあまあよかった", "Fairly good", "Khá tốt"),
  W("とてもよかった", "Very good", "Rất tốt"),
];

const BY_QUESTION: Record<string, I18nText[]> = {
  "p.lists": RELIEF,
  "p.party": ENJOY,
  "f.spicy": SPICY,
  "c.mood_week": WEEK,
  "ax.det_typos": BOTHER,
  ...Object.fromEntries(["ax.social_weekend", "ax.amb_restless", "ax.amb_enough"].map((id) => [id, FEEL])),
  ...Object.fromEntries(["ax.det_mistakes", "ax.con_clear", "ax.calm_moods", "ax.sav_wait"].map((id) => [id, FIT])),
  ...Object.fromEntries(
    ["p.feelings", "w.budget", "ax.novelty_routine", "ax.calm_words", "ax.pace_act", "ax.dec_gut", "ax.give_first", "ax.give_tired", "ax.exp_say_love", "ax.exp_face"].map((id) => [id, OFTEN]),
  ),
  // The rest (p.risk, t.new_place, ax.risk_challenge, ax.ind_consult, ax.clo_deep, ax.care_actions, ax.tra_reason) are opinions: AGREE.
};

type Scaled = { id?: string; scale?: { minLabel?: Text } | null } | null | undefined;

/** A question's 1–5 scale in words: its own set, else told apart by the scale's low end, else agreement. */
export function scaleWords(question: Scaled): I18nText[] {
  const own = question?.id ? BY_QUESTION[question.id] : undefined;
  if (own) return own;
  const low = question?.scale?.minLabel?.en ?? "";
  if (/avoid/i.test(low)) return SPICY;
  if (/hard/i.test(low)) return WEEK;
  return AGREE;
}

export function scaleWord(question: Scaled, n: number, locale: Locale): string {
  return scaleWords(question)[Math.min(5, Math.max(1, Math.round(n))) - 1]![locale];
}

type Asked = { id?: string; options?: { value: string; label: I18nText }[] | null; scale?: { minLabel?: Text } | null } | null | undefined;

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
  if ("scale" in answer) return scaleWord(question, answer.scale, locale);
  return answer.text;
}
