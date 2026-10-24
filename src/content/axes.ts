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
  expressiveness: { name: { en: "Sharing", vi: "Bày tỏ", ja: "表現" }, pos: { en: "Open", vi: "Cởi mở", ja: "表に出す" }, neg: { en: "Inward", vi: "Kín đáo", ja: "内に秘める" } },
  conflict: { name: { en: "Conflict", vi: "Bất đồng", ja: "意見" }, pos: { en: "Direct", vi: "Thẳng thắn", ja: "率直" }, neg: { en: "Calm first", vi: "Dịu trước", ja: "まず落ち着く" } },
  closeness: { name: { en: "Circle", vi: "Bạn bè", ja: "つながり" }, pos: { en: "Few & deep", vi: "Ít mà sâu", ja: "少数を深く" }, neg: { en: "Wide", vi: "Rộng rãi", ja: "幅広く" } },
  care_style: { name: { en: "Caring", vi: "Quan tâm", ja: "思いやり" }, pos: { en: "Words", vi: "Lời nói", ja: "言葉" }, neg: { en: "Actions", vi: "Hành động", ja: "行動" } },
  giving: { name: { en: "Giving", vi: "Cho đi", ja: "優先" }, pos: { en: "Others first", vi: "Người khác trước", ja: "相手優先" }, neg: { en: "Own limits", vi: "Giữ giới hạn", ja: "自分も大切" } },
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

/**
 * How a friend is asked about you: each pole as a short, neutral description of what you do.
 * Read as "<name>…" — e.g. "Hana… plans ahead / goes with the flow".
 */
export const PEER_POLES: Record<TendencyKey, { pos: I18nText; neg: I18nText }> = {
  social_energy: { pos: { en: "gets energy from being with people", vi: "nạp năng lượng khi ở bên mọi người", ja: "人と過ごして元気になる" }, neg: { en: "gets energy from time alone", vi: "nạp năng lượng khi ở một mình", ja: "ひとりの時間で元気になる" } },
  planning: { pos: { en: "plans ahead", vi: "lên kế hoạch trước", ja: "先に計画を立てる" }, neg: { en: "goes with the flow", vi: "tùy cơ ứng biến", ja: "その場の流れで動く" } },
  novelty: { pos: { en: "jumps at new things", vi: "thích thử cái mới", ja: "新しいものに飛びつく" }, neg: { en: "sticks with the familiar", vi: "thích những gì quen thuộc", ja: "慣れたものを好む" } },
  calm: { pos: { en: "stays steady whatever happens", vi: "luôn điềm tĩnh dù có chuyện gì", ja: "何があっても落ち着いている" }, neg: { en: "feels things deeply and for a long time", vi: "cảm nhận sâu và lâu", ja: "感じたことが心に長く残る" } },
  pace: { pos: { en: "acts before overthinking", vi: "hành động trước khi nghĩ nhiều", ja: "考えるより先に動く" }, neg: { en: "thinks it through before acting", vi: "suy nghĩ kỹ rồi mới làm", ja: "じっくり考えてから動く" } },
  decision_style: { pos: { en: "decides with facts and reasons", vi: "quyết định bằng dữ kiện và lý lẽ", ja: "理屈や情報で決める" }, neg: { en: "decides by gut feeling", vi: "quyết định theo trực giác", ja: "直感で決める" } },
  risk: { pos: { en: "takes the leap", vi: "dám liều", ja: "思い切って挑戦する" }, neg: { en: "plays it safe", vi: "chọn sự an toàn", ja: "慎重に安全を選ぶ" } },
  independence: { pos: { en: "gets things done alone", vi: "tự mình làm xong", ja: "ひとりでやり遂げる" }, neg: { en: "works things out with others", vi: "cùng người khác giải quyết", ja: "人と相談しながら進める" } },
  detail: { pos: { en: "notices the small details", vi: "để ý từng chi tiết nhỏ", ja: "細かいところに気づく" }, neg: { en: "sees the big picture", vi: "nhìn bức tranh tổng thể", ja: "全体をざっくりつかむ" } },
  expressiveness: { pos: { en: "shows how they feel", vi: "thể hiện rõ cảm xúc", ja: "気持ちが表に出る" }, neg: { en: "keeps feelings inside", vi: "giữ cảm xúc trong lòng", ja: "気持ちを内に秘める" } },
  conflict: { pos: { en: "says difficult things plainly", vi: "nói thẳng điều khó nói", ja: "言いにくいこともはっきり言う" }, neg: { en: "calms things down first", vi: "làm dịu tình hình trước", ja: "まず場を落ち着かせる" } },
  closeness: { pos: { en: "has a few close people", vi: "có vài người thật thân", ja: "少数の人と深くつきあう" }, neg: { en: "knows lots of people", vi: "quen biết rất nhiều người", ja: "たくさんの人と広くつきあう" } },
  care_style: { pos: { en: "shows care in words", vi: "quan tâm bằng lời nói", ja: "言葉で気持ちを伝える" }, neg: { en: "shows care in actions", vi: "quan tâm bằng hành động", ja: "行動で気持ちを示す" } },
  giving: { pos: { en: "puts others first", vi: "đặt người khác lên trước", ja: "自分より人を優先する" }, neg: { en: "looks after their own limits", vi: "biết giữ giới hạn của mình", ja: "自分の限度も大切にする" } },
  saving: { pos: { en: "saves for later", vi: "để dành cho sau này", ja: "将来のために貯める" }, neg: { en: "enjoys money now", vi: "tận hưởng tiền bạc hiện tại", ja: "いまを楽しむために使う" } },
  ambition: { pos: { en: "keeps aiming higher", vi: "luôn hướng lên cao hơn", ja: "もっと上を目指している" }, neg: { en: "is content with what they have", vi: "hài lòng với những gì đang có", ja: "いまに満足している" } },
  tradition: { pos: { en: "values tradition", vi: "coi trọng truyền thống", ja: "伝統やしきたりを大切にする" }, neg: { en: "finds their own way", vi: "chọn cách riêng của mình", ja: "自分なりのやり方を選ぶ" } },
};
