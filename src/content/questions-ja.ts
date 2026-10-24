/**
 * Japanese display text for the question bank.
 *
 * Kept outside the versioned question content (question_versions.prompt) on purpose: a
 * translation does not change what a question asks, so it must not create a new question
 * version or detach existing answers. tests/unit/discovery.test.ts enforces completeness.
 */
import { AXIS_QUESTIONS_JA } from "./questions-axes";

export interface QuestionJa {
  prompt: string;
  options?: Record<string, string>;
  scale?: [string, string];
}

const AGREE: [string, string] = ["1 = まったく当てはまらない", "5 = とても当てはまる"];

const BASE_JA: Record<string, QuestionJa> = {
  "p.weekend_plan": {
    prompt: "予定のない週末ができました。まず何をしますか？",
    options: { plan: "予定を立てる", see: "その時の気分で決める", rest: "休むために何も入れない" },
  },
  "p.recharge": {
    prompt: "疲れた一週間のあと、いちばん元気が戻るのは？",
    options: { friends: "友だちに会う", alone: "一人で静かに過ごす", family: "家で家族と過ごす", outside: "外で過ごす" },
  },
  "p.lists": { prompt: "「その日のやることリストがあると安心する」", scale: AGREE },
  "p.party": { prompt: "「集まりで初対面の人と話すのが楽しい」", scale: AGREE },
  "p.decide": {
    prompt: "大事な選択をするとき、より信頼するのは？",
    options: { facts: "事実と比較", gut: "自分の直感", people: "信頼する人の助言" },
  },
  "p.disagree": {
    prompt: "親しい人と意見が合わないとき、たいていは…",
    options: { talk_now: "すぐに話し合う", cool_down: "お互い落ち着いてから話す", let_go: "小さなことなら流す" },
  },
  "p.feelings": { prompt: "「落ち込んでいると、身近な人はたいてい気づく」", scale: AGREE },
  "p.new_food": {
    prompt: "よく行くお店では、たいてい…",
    options: { favorite: "いつもの好きなものを頼む", new: "新しいものを試す" },
  },
  "p.risk": { prompt: "「挑戦しないより、挑戦して失敗するほうがいい」", scale: AGREE },
  "p.morning": {
    prompt: "朝型ですか、夜型ですか？",
    options: { morning: "朝型", night: "夜型", depends: "時による" },
  },
  "v.top_values": {
    prompt: "いま、あなたにとって特に大切なものは？（3つまで）",
    options: {
      family: "家族",
      freedom: "自由",
      security: "安心・安定",
      growth: "成長",
      honesty: "誠実さ",
      fun: "楽しさ",
      kindness: "やさしさ",
      achievement: "達成",
    },
  },
  "v.success": {
    prompt: "あなたにとって「うまくいった人生」とは？",
    options: {
      peace: "穏やかで安定した暮らし",
      impact: "人に良い影響を与えること",
      loved: "大切な人に囲まれていること",
      mastery: "何かを極めること",
    },
  },
  "v.honesty_kindness": {
    prompt: "友だちに、あなたが好きではないものについて意見を求められたら…",
    options: { honest: "思ったことを正直に言う", gentle: "まず良いところを探して伝える", ask: "どんな意見を聞きたいか尋ねる" },
  },
  "v.believe": { prompt: "周りの多くの人は信じていないけれど、あなたは信じていることは？" },
  "v.proud": { prompt: "自分について、ひそかに誇りに思っていることを一つ。" },
  "r.love_language": {
    prompt: "どんなときに一番「大切にされている」と感じますか？",
    options: {
      words: "やさしい言葉",
      time: "一緒に過ごす時間",
      help: "日々のことを手伝ってもらう",
      gifts: "心のこもった贈り物",
      touch: "ハグやスキンシップ",
    },
  },
  "r.reply_speed": {
    prompt: "親しい友だちからの返信は、どれくらいの早さを期待しますか？",
    options: { fast: "1時間以内", day: "その日のうち", whenever: "相手の都合のよいときに" },
  },
  "r.grateful_person": { prompt: "今週、感謝している人は誰ですか？それはなぜ？" },
  "r.apology": {
    prompt: "けんかのあと、先に歩み寄るのはたいてい？",
    options: { me: "たいてい自分", them: "たいてい相手", both: "時による" },
  },
  "f.spicy": { prompt: "辛い食べ物はどれくらい好きですか？", scale: ["1 = 避けている", "5 = 辛いほどいい"] },
  "f.comfort": { prompt: "あなたの「ほっとする食べもの」は？" },
  "f.drink": {
    prompt: "いつもの飲みものは？",
    options: { coffee: "コーヒー", tea: "お茶", juice: "ジュース／スムージー", water: "水", milk_tea: "ミルクティー" },
  },
  "f.cuisines": {
    prompt: "好きな料理のジャンルは？",
    options: {
      vietnamese: "ベトナム料理",
      japanese: "日本料理",
      korean: "韓国料理",
      chinese: "中華料理",
      thai: "タイ料理",
      italian: "イタリア料理",
      french: "フランス料理",
      indian: "インド料理",
    },
  },
  "f.sweet_savory": {
    prompt: "甘いものと、しょっぱいもの、どちら派？",
    options: { sweet: "甘いもの", savory: "しょっぱいもの", both: "どちらも！" },
  },
  "t.style": {
    prompt: "理想の旅は…",
    options: { beach: "海辺でのんびり", city: "街を歩いて探検", nature: "山と自然", food: "食べ歩きの旅" },
  },
  "t.itinerary": {
    prompt: "旅行では、細かい旅程があるほうが好きですか？",
    options: { detailed: "はい、時間ごとに", rough: "大まかな流れだけ", none: "予定はなしで" },
  },
  "t.dream_place": { prompt: "明日出発できるなら、どこへ行きたいですか？" },
  "t.new_place": { prompt: "「お気に入りの場所を再訪するより、新しい場所に行きたい」", scale: AGREE },
  "m.genres": {
    prompt: "好きな音楽のジャンルは？",
    options: {
      pop: "ポップ",
      ballad: "バラード",
      rock: "ロック",
      hiphop: "ヒップホップ／ラップ",
      edm: "エレクトロニック",
      classical: "クラシック",
      jazz: "ジャズ",
      bolero: "ボレロ／伝統音楽",
      indie: "インディー",
    },
  },
  "m.song_now": { prompt: "最近、頭から離れない曲は？" },
  "m.when": {
    prompt: "音楽をいちばん聴くのはどんなとき？",
    options: { commute: "移動中", work: "仕事や勉強中", relax: "くつろぐとき", rarely: "あまり聴かない" },
  },
  "h.free_time": {
    prompt: "自由な時間はどう過ごすのが好きですか？",
    options: {
      reading: "読書",
      films: "映画・ドラマ",
      sports: "スポーツ・運動",
      games: "ゲーム",
      cooking: "料理",
      making: "ものづくり（絵、手芸、音楽）",
      cafe: "カフェ",
      outdoors: "屋外で過ごす",
    },
  },
  "h.learn": { prompt: "今年、学んでみたいことは？" },
  "h.pets": {
    prompt: "猫派？犬派？どちらでもない？",
    options: { cats: "猫", dogs: "犬", both: "どちらも", neither: "どちらでもない" },
  },
  "w.bonus": {
    prompt: "思いがけないボーナスが入りました。主に…",
    options: {
      save: "貯金や投資にする",
      treat: "自分や人へのごほうびに使う",
      experience: "体験に使う",
      family: "家族に渡す",
    },
  },
  "w.job_choice": {
    prompt: "2つの仕事のオファー。どちらに気持ちが傾く？",
    options: { stable: "給料が安定した堅実な仕事", startup: "将来は不確かだがわくわくする仕事" },
  },
  "w.budget": { prompt: "「今月お金を何に使ったか、たいてい把握している」", scale: AGREE },
  "w.meaning": { prompt: "仕事（または勉強）のどんなところに一番意味を感じますか？" },
  "past.childhood_memory": { prompt: "子どもの頃の、小さな幸せな思い出を教えてください。" },
  "past.turning_point": { prompt: "人生の方向を変えた瞬間はありましたか？" },
  "past.lesson": { prompt: "痛い思いをして学んだ教訓は？" },
  "fut.five_years": { prompt: "5年後、どんな暮らしをしていたいですか？" },
  "fut.one_thing": { prompt: "今年中にやりたいことを一つ。" },
  "fut.where_live": {
    prompt: "いつか一番住んでみたい場所は？",
    options: { big_city: "大都市", small_town: "小さな町", countryside: "田舎", abroad: "海外", hometown: "地元" },
  },
  "c.changed_mind": {
    prompt: "最近、大切なことについて考えが変わりましたか？",
    options: { yes: "はい", no: "いいえ", unsure: "わからない" },
  },
  "c.changed_mind_what": { prompt: "何が変わりましたか？そして、見方が変わったきっかけは？" },
  "c.mood_week": { prompt: "今週は全体的にどうでしたか？", scale: ["1 = とてもつらかった", "5 = とても良かった"] },
  "c.habit": { prompt: "最近始めた習慣、またはやめた習慣は？" },
};

export const QUESTION_JA: Record<string, QuestionJa> = { ...BASE_JA, ...AXIS_QUESTIONS_JA };
