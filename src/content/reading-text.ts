/** Phrases for the Insights reading: the overview, hypotheses and quotes of your own answers. */
import type { I18nText } from "./questions";

const n = (x: number) => String(x);

export const READING = {
  title: { ja: "いまのあなたの読み解き", en: "Your reading so far", vi: "Bản luận giải hiện tại" } as I18nText,
  none: {
    ja: "まだ手がかりは集まっていません。でも、最初の数問だけでも、あなたの輪郭は少しずつ浮かびはじめます。今日の質問から始めてみましょう。",
    en: "No clues yet. Even the first few answers start to sketch an outline, though — try today's question.",
    vi: "Chưa có manh mối nào. Nhưng chỉ vài câu trả lời đầu tiên cũng bắt đầu phác họa đường nét của bạn — hãy thử câu hỏi hôm nay.",
  } as I18nText,
  onlyHints: (answers: number): I18nText => ({
    ja: `これまでに${n(answers)}問答えてくれました。まだはっきり言えることはありませんが、いくつかの方向は見えはじめています。下の「仮説」は、あと少し答えると確かめられます。`,
    en: `You've answered ${n(answers)} questions. Nothing is certain yet, but a few directions are starting to show. The hypotheses below can be checked with a few more answers.`,
    vi: `Bạn đã trả lời ${n(answers)} câu hỏi. Chưa có gì chắc chắn, nhưng vài hướng đã bắt đầu lộ ra. Các giả thuyết bên dưới có thể kiểm chứng với vài câu trả lời nữa.`,
  }),
  opening: (answers: number, k: number): I18nText => ({
    ja: `これまでの${n(answers)}問の答えから、${n(k)}つの傾向が見えてきました。`,
    en: `From your ${n(answers)} answers so far, ${n(k)} tendenc${k === 1 ? "y has" : "ies have"} come into view.`,
    vi: `Từ ${n(answers)} câu trả lời đến nay, ${n(k)} xu hướng đã hiện ra.`,
  }),
  clearest: (pole: I18nText): I18nText => ({
    ja: `いちばんはっきりしているのは、あなたが「${pole.ja}」人だということです。`,
    en: `The clearest is that you're someone who ${pole.en}.`,
    vi: `Rõ nhất là bạn là người ${pole.vi}.`,
  }),
  alsoTwo: (a: I18nText, b: I18nText): I18nText => ({
    ja: `「${a.ja}」人であると同時に、「${b.ja}」人でもあるようです。一見ちがう向きの二つが、あなたの中では自然に同居しています。`,
    en: `You seem to be someone who ${a.en}, and also someone who ${b.en} — two leanings that sit naturally together in you.`,
    vi: `Bạn có vẻ vừa là người ${a.vi}, vừa là người ${b.vi} — hai khuynh hướng cùng tồn tại tự nhiên trong bạn.`,
  }),
  comboLead: (title: I18nText): I18nText => ({
    ja: `この組み合わせを一言で言うなら「${title.ja}」。`,
    en: `Put together, that's ${title.en.charAt(0).toLowerCase()}${title.en.slice(1)}.`,
    vi: `Gộp lại, đó là “${title.vi}”.`,
  }),
  mixedNote: (names: string): I18nText => ({
    ja: `一方で「${names}」は、場面によって答えが分かれています。決まった型に収まらないところも、あなたらしさです。`,
    en: `Meanwhile your answers on ${names} go both ways — not fitting one mould is part of you too.`,
    vi: `Trong khi đó, câu trả lời về ${names} chia đôi — không khớp một khuôn cũng là một phần của bạn.`,
  }),
  hintsNote: (k: number): I18nText => ({
    ja: `ほかにも${n(k)}つ、まだ仮説の段階の傾向があります。`,
    en: `There ${k === 1 ? "is" : "are"} ${n(k)} more still at the hypothesis stage.`,
    vi: `Còn ${n(k)} xu hướng khác vẫn ở giai đoạn giả thuyết.`,
  }),
  closing: { ja: "この読み解きは、答えるたびに書き変わっていきます。", en: "This reading rewrites itself every time you answer.", vi: "Bản luận giải này tự viết lại mỗi khi bạn trả lời." } as I18nText,
  combosTitle: { ja: "組み合わせから見えること", en: "What the combination says", vi: "Điều sự kết hợp cho thấy" } as I18nText,
  hypothesis: { ja: "仮説", en: "Hypothesis", vi: "Giả thuyết" } as I18nText,
  hypothesisLead: (k: number, pole: I18nText): I18nText => ({
    ja: `まだ${n(k)}問の答えからの仮説ですが、いまのところ「${pole.ja}」寄りです。もしそうなら——`,
    en: `Only ${n(k)} answer${k === 1 ? "" : "s"} so far, but leaning toward someone who ${pole.en}. If so —`,
    vi: `Mới có ${n(k)} câu trả lời, nhưng đang nghiêng về người ${pole.vi}. Nếu đúng vậy —`,
  }),
  quote: (prompt: string, answer: string): I18nText => ({
    ja: `「${prompt}」に「${answer}」と答えました`,
    en: `“${prompt}” — you answered “${answer}”`,
    vi: `“${prompt}” — bạn trả lời “${answer}”`,
  }),
  yourAnswers: { ja: "あなたの答えから", en: "From your answers", vi: "Từ câu trả lời của bạn" } as I18nText,
  confirm: (k: number): I18nText => ({ ja: `あと${n(k)}問で確かめる`, en: `Check it with ${n(k)} more`, vi: `Kiểm chứng với ${n(k)} câu nữa` }),
  deepen: { ja: "もう1問答えて深める", en: "Answer one more to go deeper", vi: "Trả lời thêm một câu để hiểu sâu hơn" } as I18nText,
};
