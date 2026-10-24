/**
 * Development only: the made-up person behind the first test companion, "Mina" — a woman in her
 * early sixties, about the age of the developer's mother. Entirely fictional; nothing here is
 * about a real person. Used by dev-companion.ts to fill the companion's profile.
 */
import type { TendencyKey } from "@/content/questions";

/** Which way she leans on each axis (+1 = the first pole, e.g. "plans ahead"). */
export const LEAN: Record<TendencyKey, 1 | -1> = {
  social_energy: 1, // 人と過ごす
  planning: 1, // 計画派
  novelty: -1, // 定番派
  calm: 1, // 落ち着き
  pace: -1, // じっくり
  decision_style: -1, // 直感
  risk: -1, // 慎重派
  independence: -1, // みんなで
  detail: 1, // 細部
  expressiveness: 1, // 表に出す
  conflict: -1, // まず落ち着く
  closeness: 1, // 少数を深く
  care_style: -1, // 行動
  giving: 1, // 相手優先
  saving: 1, // 貯める
  ambition: -1, // いまに満足
  tradition: 1, // 伝統を大切に
};

/** Answers to questions that don't feed an axis: a choice, choices, a 1–5 scale or her words. */
export const ANSWERS: Record<string, { choice: string } | { choices: string[] } | { scale: number } | { text: string }> = {
  "p.morning": { choice: "morning" },
  "v.success": { choice: "loved" },
  "v.believe": { text: "子どもは、信じて待てば自分で育つ力を持っている。急がせなくていいと思う。" },
  "v.proud": { text: "38年間、一日も手を抜かずに子どもたちと向き合ってきたこと。" },
  "r.love_language": { choice: "time" },
  "r.reply_speed": { choice: "day" },
  "r.grateful_person": { text: "畑を手伝ってくれたお隣の佐藤さん。大根を一緒に抜いてくれた。" },
  "r.apology": { choice: "me" },
  "f.spicy": { scale: 2 },
  "f.comfort": { text: "母の作ってくれた、けんちん汁" },
  "f.drink": { choice: "tea" },
  "f.cuisines": { choices: ["japanese", "chinese", "italian"] },
  "f.sweet_savory": { choice: "sweet" },
  "t.style": { choice: "nature" },
  "t.dream_place": { text: "京都の秋。ひとりで寺をゆっくり歩きたい" },
  "m.genres": { choices: ["ballad", "classical"] },
  "m.song_now": { text: "竹内まりや「いのちの歌」" },
  "m.when": { choice: "relax" },
  "h.learn": { text: "スマホで写真をきれいに撮るコツ" },
  "h.pets": { choice: "cats" },
  "w.meaning": { text: "図書館の読み聞かせで、子どもの目がぱっと輝く瞬間。" },
  "past.childhood_memory": { text: "夏休み、祖父の家の縁側で、すいかを食べながら花火を見た。蚊取り線香の匂いをいまでも覚えている。" },
  "past.turning_point": { text: "新任の年、担任したクラスの子に「先生のおかげで学校が好きになった」と言われた。この仕事を一生続けようと決めた。" },
  "past.lesson": { text: "疲れているときに大事なことを決めないこと。" },
  "fut.five_years": { text: "畑と図書館と、たまの旅行。孫に絵本を読んであげられたら最高。" },
  "fut.one_thing": { text: "年賀状をやめずに、手書きで全部書く" },
  "c.changed_mind": { choice: "yes" },
  "c.mood_week": { scale: 4 },
  "c.habit": { text: "朝のラジオ体操を始めた" },
  "l.season": { choice: "spring" },
  "l.films": { choices: ["drama", "documentary"] },
  "l.reading": { choice: "often" },
  "l.move": { choices: ["walk", "yoga"] },
  "l.place_relax": { choice: "home" },
  "l.meals": { choice: "cook" },
  "l.gift_receive": { choice: "letter" },
  "l.weekend_morning": { choice: "coffee" },
  "l.fashion_style": { choices: ["natural", "simple"] },
  "l.fashion_priority": { choice: "comfort" },
  "l.fashion_colors": { choices: ["earth", "navy"] },
  "l.fashion_shopping": { choice: "regular" },
  "l.accessories": { choice: "sometimes" },
  "l.music_genres": { choices: ["jpop", "classical", "folk"] },
  "l.music_listen": { choice: "background" },
  "l.music_now": { text: "ユーミン「やさしさに包まれたなら」" },
  "l.oshi": { choice: "now" },
  "l.works": { choices: ["novels", "dramas"] },
  "l.coffee_tea": { choice: "tea" },
  "l.alcohol": { choice: "sometimes" },
  "l.cuisine": { choices: ["japanese", "home"] },
  "l.sweets": { choice: "love" },
  "l.food_avoid": { choice: "some" },
  "l.scent": { choices: ["floral", "soap"] },
  "l.interior": { choice: "natural" },
  "l.things": { choice: "between" },
  "l.travel_style": { choice: "culture" },
  "s.child_dream": { text: "パン屋さん。結局、先生になったけど。" },
  "s.proud_recent": { text: "還暦で初めてひとり旅をしたこと（金沢）。" },
  "s.hard_time": { text: "夫が入院したとき。毎日病院に通うのはつらかったけれど、子どもたちからの電話と、同僚のおかずの差し入れに支えられた。" },
  "s.shaped_by": { text: "小学3年の担任の山本先生。叱るときも目を見て話してくれた。" },
  "s.ten_years": { choice: "health" },
  "s.bucket": { text: "オーロラを見ること" },
  "s.changed_year": { text: "人に頼るのが少し上手になった。" },
};

export const BIO = "静岡生まれ。小学校の先生を38年つとめて、いまは図書館で絵本の読み聞かせボランティアをしています。家庭菜園と、夫との朝の散歩が日課です。（開発用の架空の人物です）";

export const INTRO =
  "みんなで過ごす時間が好きで、何ごとも先に段取りを決めておくタイプです。新しいものより、使い慣れたものを長く大事にしたい。好きな季節は春。紅茶と甘いものがあれば、たいていの日はいい日になります。どうぞよろしくお願いします。";

export const BIRTH = { calendarInput: "solar", solarDate: "1963-04-12", timeKnown: true, birthTime: "07:20", timeZone: "Asia/Tokyo", sex: "female" };

export const FAVOURITES: { categoryId: string; label: string; sentiment: "love" | "like" | "dislike" }[] = [
  { categoryId: "music", label: "竹内まりや", sentiment: "love" },
  { categoryId: "music", label: "松任谷由実", sentiment: "love" },
  { categoryId: "food", label: "けんちん汁", sentiment: "love" },
  { categoryId: "food", label: "どら焼き", sentiment: "love" },
  { categoryId: "food", label: "パクチー", sentiment: "dislike" },
  { categoryId: "brand", label: "無印良品", sentiment: "like" },
  { categoryId: "brand", label: "ミナ ペルホネン", sentiment: "love" },
  { categoryId: "scent", label: "沈丁花", sentiment: "love" },
  { categoryId: "book_film", label: "向田邦子のエッセイ", sentiment: "love" },
  { categoryId: "book_film", label: "朝ドラ", sentiment: "like" },
  { categoryId: "color", label: "藤色", sentiment: "love" },
  { categoryId: "travel", label: "京都の秋", sentiment: "love" },
  { categoryId: "item", label: "教師時代から使っている万年筆", sentiment: "love" },
  { categoryId: "hobby", label: "家庭菜園", sentiment: "love" },
  { categoryId: "other", label: "人混み", sentiment: "dislike" },
];

type Audience = { visibility: string; circles?: string[] };
export const RECORDS: { kind: string; title?: string; body: string; back: number; audience: Audience }[] = [
  { kind: "memory", body: "駅前に新しいカフェができてた。窓際の席が静かで、ずっと本を読んでいられそう。今度いっしょに行こう。", back: 0, audience: { visibility: "connections" } },
  { kind: "feeling", body: "今週は少し疲れ気味。でも夕方の散歩で金木犀の匂いがして、それだけでちょっと元気になった。", back: 1, audience: { visibility: "circles", circles: ["partner", "family", "friend"] } },
  { kind: "decision", body: "来年はちゃんと休みをとって、ひとり旅に行くと決めた。行き先はまだ迷い中。", back: 3, audience: { visibility: "circles", circles: ["family"] } },
  { kind: "thought", body: "（これは自分だけの記録。テスト相手から見せていないので、あなたには見えないはず）", back: 4, audience: { visibility: "private" } },
  { kind: "achievement", title: "大根、豊作", body: "畑の大根が今年はよく育った。半分はお隣におすそ分け。残りは煮物と、切り干しにする。", back: 6, audience: { visibility: "connections" } },
  { kind: "memory", title: "読み聞かせ", body: "図書館の読み聞かせで『100万回生きたねこ』を読んだ。最後のページで、5歳の子が小さく「よかったね」と言った。", back: 9, audience: { visibility: "connections" } },
  { kind: "feeling", body: "お父さんの検診の結果が問題なしでほっとした。帰りに二人でお蕎麦を食べた。", back: 14, audience: { visibility: "circles", circles: ["family"] } },
  { kind: "thought", body: "このごろ、昔の教え子から年賀状の住所変更の連絡が続く。みんな、それぞれの場所でがんばっているんだな。", back: 21, audience: { visibility: "circles", circles: ["family", "friend"] } },
  { kind: "value", body: "ものは少なくていいけれど、手紙だけは捨てられない。書いた人の時間がそこに残っている気がする。", back: 30, audience: { visibility: "connections" } },
  { kind: "goal", body: "来年の春までに、スマホで撮った写真を一冊のアルバムにまとめる。", back: 40, audience: { visibility: "circles", circles: ["family"] } },
  { kind: "dream", body: "いつかオーロラを見たい。寒いのは苦手だけど、一度だけでいいから。", back: 55, audience: { visibility: "connections" } },
  { kind: "regret", body: "現役のころ、自分の子の運動会に一度も行けなかった。いまでも少し心残り。", back: 70, audience: { visibility: "private" } },
];

export const MORE = [
  "新しいアルバムをずっと聴いてる。歌詞がいまの気分にぴったり。",
  "久しぶりにちらし寿司を作った。思ったよりうまくできて満足。",
  "朝いちばんに窓を開けたら、空気がもう冬の匂いだった。",
  "昔の同僚と長電話。くだらない話で笑いすぎた。",
  "畑のブロッコリーに小さなつぼみ。毎朝見に行くのが楽しみ。",
  "図書館に新しい絵本がたくさん入った。来週はどれを読もうかな。",
];
