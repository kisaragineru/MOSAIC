/**
 * The axes MOSAIC uses to describe a person, grouped into chapters.
 *
 * Each axis is one tendency key (see questions.ts) with two poles; neither pole is better.
 * Chapters order the questions ("answer by chapter"), the mosaic tiles and the self manual.
 * The four axis chapters loosely follow well-known models — temperament (Big Five-like),
 * decision style, relationships and values (Schwartz-like) — without claiming to measure them.
 */
import type { I18nText, QuestionCategory, QuestionDef, TendencyKey } from "./questions";

export const CHAPTERS = ["self", "mind", "people", "life", "likes", "story"] as const;
export type Chapter = (typeof CHAPTERS)[number];
export const AXIS_CHAPTERS = ["self", "mind", "people", "life"] as const satisfies readonly Chapter[];

export const AXIS_CHAPTER: Record<TendencyKey, Chapter> = {
  social_energy: "self",
  planning: "self",
  novelty: "self",
  calm: "self",
  pace: "self",
  decision_style: "mind",
  risk: "mind",
  independence: "mind",
  detail: "mind",
  expressiveness: "people",
  conflict: "people",
  closeness: "people",
  care_style: "people",
  giving: "people",
  saving: "life",
  ambition: "life",
  tradition: "life",
};

/** Axes in reading order (chapter by chapter). */
export const AXES: TendencyKey[] = (Object.keys(AXIS_CHAPTER) as TendencyKey[]).sort(
  (a, b) => CHAPTERS.indexOf(AXIS_CHAPTER[a]) - CHAPTERS.indexOf(AXIS_CHAPTER[b]),
);

/** Short names: the axis, and a word for each pole (for tiles and chips). */
export const AXIS_LABEL: Record<TendencyKey, { name: I18nText; pos: I18nText; neg: I18nText }> = {
  social_energy: { name: { en: "Energy", vi: "Năng lượng", ja: "元気の源" }, pos: { en: "With people", vi: "Bên mọi người", ja: "人と過ごす" }, neg: { en: "Alone time", vi: "Một mình", ja: "ひとり時間" } },
  planning: { name: { en: "Planning", vi: "Kế hoạch", ja: "段取り" }, pos: { en: "Planner", vi: "Có kế hoạch", ja: "計画派" }, neg: { en: "Go with the flow", vi: "Tùy hứng", ja: "その場派" } },
  novelty: { name: { en: "Newness", vi: "Cái mới", ja: "新しさ" }, pos: { en: "Explorer", vi: "Khám phá", ja: "冒険派" }, neg: { en: "Familiar", vi: "Quen thuộc", ja: "定番派" } },
  calm: { name: { en: "Feelings", vi: "Cảm xúc", ja: "心の揺れ" }, pos: { en: "Steady", vi: "Vững vàng", ja: "落ち着き" }, neg: { en: "Deep feeler", vi: "Nhạy cảm", ja: "感受性" } },
  pace: { name: { en: "Pace", vi: "Nhịp độ", ja: "スピード" }, pos: { en: "Quick start", vi: "Nhanh nhẹn", ja: "即行動" }, neg: { en: "Take time", vi: "Từ tốn", ja: "じっくり" } },
  decision_style: { name: { en: "Deciding", vi: "Quyết định", ja: "決め方" }, pos: { en: "Analysis", vi: "Phân tích", ja: "分析" }, neg: { en: "Intuition", vi: "Trực giác", ja: "直感" } },
  risk: { name: { en: "Risk", vi: "Rủi ro", ja: "挑戦" }, pos: { en: "Takes chances", vi: "Dám thử", ja: "挑戦派" }, neg: { en: "Plays safe", vi: "An toàn", ja: "慎重派" } },
  independence: { name: { en: "Working", vi: "Cách làm", ja: "進め方" }, pos: { en: "On my own", vi: "Tự lập", ja: "ひとりで" }, neg: { en: "Together", vi: "Cùng nhau", ja: "みんなで" } },
  detail: { name: { en: "Focus", vi: "Góc nhìn", ja: "視点" }, pos: { en: "Details", vi: "Chi tiết", ja: "細部" }, neg: { en: "Big picture", vi: "Tổng thể", ja: "全体" } },
  expressiveness: { name: { en: "Expressing", vi: "Bày tỏ", ja: "気持ちの表し方" }, pos: { en: "Open", vi: "Cởi mở", ja: "表に出す" }, neg: { en: "Inward", vi: "Kín đáo", ja: "内に秘める" } },
  conflict: { name: { en: "Disagreeing", vi: "Bất đồng", ja: "意見の違い" }, pos: { en: "Direct", vi: "Thẳng thắn", ja: "率直" }, neg: { en: "Calm first", vi: "Dịu trước", ja: "まず落ち着く" } },
  closeness: { name: { en: "Circle", vi: "Vòng bạn bè", ja: "つながり方" }, pos: { en: "Few & deep", vi: "Ít mà sâu", ja: "少数を深く" }, neg: { en: "Wide", vi: "Rộng rãi", ja: "幅広く" } },
  care_style: { name: { en: "Caring", vi: "Quan tâm", ja: "思いやりの形" }, pos: { en: "Words", vi: "Lời nói", ja: "言葉" }, neg: { en: "Actions", vi: "Hành động", ja: "行動" } },
  giving: { name: { en: "Giving", vi: "Cho đi", ja: "人との距離" }, pos: { en: "Others first", vi: "Người khác trước", ja: "相手優先" }, neg: { en: "Own limits", vi: "Giữ giới hạn", ja: "自分も大切" } },
  saving: { name: { en: "Money", vi: "Tiền bạc", ja: "お金" }, pos: { en: "Saver", vi: "Tiết kiệm", ja: "貯める" }, neg: { en: "Enjoy now", vi: "Tận hưởng", ja: "使って楽しむ" } },
  ambition: { name: { en: "Drive", vi: "Động lực", ja: "向上心" }, pos: { en: "Aim higher", vi: "Vươn lên", ja: "上を目指す" }, neg: { en: "Content", vi: "Đủ đầy", ja: "いまに満足" } },
  tradition: { name: { en: "Tradition", vi: "Truyền thống", ja: "伝統" }, pos: { en: "Tradition", vi: "Giữ gìn", ja: "伝統を大切に" }, neg: { en: "Own way", vi: "Cách riêng", ja: "自分流" } },
};

export const CHAPTER_INFO: Record<Chapter, { title: I18nText; intro: I18nText; icon: string }> = {
  self: {
    title: { en: "Temperament", vi: "Tính khí", ja: "気質" },
    intro: { en: "How you recharge, plan, react and move.", vi: "Cách bạn nạp năng lượng, lên kế hoạch, phản ứng và hành động.", ja: "元気の戻り方、段取り、気持ちの揺れ、動き出す速さ。" },
    icon: "◎",
  },
  mind: {
    title: { en: "How you decide", vi: "Cách bạn quyết định", ja: "考え方・決め方" },
    intro: { en: "How you choose, take risks and work.", vi: "Cách bạn lựa chọn, đón nhận rủi ro và làm việc.", ja: "選び方、挑戦との向き合い方、仕事の進め方。" },
    icon: "◇",
  },
  people: {
    title: { en: "You and others", vi: "Bạn và mọi người", ja: "人との関わり" },
    intro: { en: "How you show feelings, disagree, care and connect.", vi: "Cách bạn bày tỏ, bất đồng, quan tâm và kết nối.", ja: "気持ちの伝え方、意見の違い、思いやり、つながり方。" },
    icon: "∞",
  },
  life: {
    title: { en: "Values & living", vi: "Giá trị & lối sống", ja: "価値観・暮らし" },
    intro: { en: "Money, drive and what you hold on to.", vi: "Tiền bạc, động lực và những điều bạn gìn giữ.", ja: "お金、向上心、大切にしたいもの。" },
    icon: "▲",
  },
  likes: {
    title: { en: "Things you love", vi: "Những điều bạn thích", ja: "好きなもの" },
    intro: { en: "Food, travel, music and how you spend free time.", vi: "Ăn uống, du lịch, âm nhạc và cách bạn dùng thời gian rảnh.", ja: "食べもの、旅、音楽、自由な時間の過ごし方。" },
    icon: "♡",
  },
  story: {
    title: { en: "Your story", vi: "Câu chuyện của bạn", ja: "これまでとこれから" },
    intro: { en: "Where you come from, what changed you and where you are heading.", vi: "Bạn đến từ đâu, điều gì đã thay đổi bạn và bạn đang hướng tới đâu.", ja: "どこから来て、何に変えられ、どこへ向かうのか。" },
    icon: "✦",
  },
};

const CATEGORY_CHAPTER: Record<QuestionCategory, Chapter> = {
  personality: "self",
  values: "life",
  relationships: "people",
  money_work: "life",
  food: "likes",
  travel: "likes",
  music: "likes",
  hobbies: "likes",
  past: "story",
  future: "story",
  change: "story",
};

/** A question's chapter: the axis its first signal informs, otherwise its category's chapter. */
export function chapterOf(q: Pick<QuestionDef, "category" | "signals">): Chapter {
  const key = q.signals?.[0]?.claimKey;
  return key ? AXIS_CHAPTER[key] : CATEGORY_CHAPTER[q.category];
}
