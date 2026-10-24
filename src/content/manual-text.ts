/**
 * The framing text of the self manual: section titles, lead-ins and the small phrases that
 * stitch the per-axis text (manual-axes.ts) into one piece of reading.
 */
import type { Chapter } from "./axes";
import type { I18nText } from "./questions";

export const MANUAL_SECTIONS = ["intro", "summary", "self", "mind", "people", "life", "likes", "tips", "others", "tuvi", "story", "future", "changes", "unknown", "novel"] as const;
export type ManualSectionId = (typeof MANUAL_SECTIONS)[number];

export const SECTION_TEXT: Record<ManualSectionId, { title: I18nText; icon: string; lead?: I18nText }> = {
  intro: {
    icon: "📖",
    title: { ja: "はじめに", en: "Before you read", vi: "Lời mở đầu" },
  },
  summary: {
    icon: "✨",
    title: { ja: "ひとことで言うと", en: "In a few words", vi: "Tóm lại trong vài dòng" },
    lead: { ja: "これまでの答えの中で、いちばんはっきり表れているところです。", en: "These are the things your answers show most clearly so far.", vi: "Đây là những điều câu trả lời của bạn thể hiện rõ nhất cho đến nay." },
  },
  self: {
    icon: "🌱",
    title: { ja: "第1章　気質 ― エネルギーとリズム", en: "Chapter 1 · Temperament: energy and rhythm", vi: "Chương 1 · Khí chất: năng lượng và nhịp sống" },
    lead: { ja: "元気の戻り方、予定との付き合い方、新しいものへの距離感。毎日の土台になっている部分です。", en: "How you recharge, how you treat plans, how close you keep to the new — the ground your days stand on.", vi: "Cách bạn nạp năng lượng, cách bạn đối xử với kế hoạch, khoảng cách của bạn với điều mới — nền tảng của mỗi ngày." },
  },
  mind: {
    icon: "🧭",
    title: { ja: "第2章　考え方 ― 決めて、進める", en: "Chapter 2 · Mind: deciding and doing", vi: "Chương 2 · Tư duy: quyết định và hành động" },
    lead: { ja: "迷ったときにどう決めるか、どこを見て、誰と進めるか。", en: "How you decide when unsure, where you look, and who you move with.", vi: "Bạn quyết định thế nào khi phân vân, bạn nhìn vào đâu, và cùng ai bước tiếp." },
  },
  people: {
    icon: "🤝",
    title: { ja: "第3章　人との関わり", en: "Chapter 3 · With other people", vi: "Chương 3 · Với mọi người" },
    lead: { ja: "気持ちの出し方、意見がぶつかったとき、思いやりの形。あなたと付き合う人にいちばん関わる章です。", en: "How you show feelings, what happens when views clash, the shape of your care. This is the chapter the people close to you will find most useful.", vi: "Cách bạn bộc lộ cảm xúc, điều xảy ra khi bất đồng, hình dạng sự quan tâm của bạn. Đây là chương hữu ích nhất với người thân của bạn." },
  },
  life: {
    icon: "🏡",
    title: { ja: "第4章　暮らしと価値観", en: "Chapter 4 · Life and values", vi: "Chương 4 · Cuộc sống và giá trị" },
    lead: { ja: "お金、向上心、受け継がれてきたもの。あなたが何を大切に暮らしているか。", en: "Money, drive, and what's been handed down — what you live by.", vi: "Tiền bạc, động lực và những gì được truyền lại — điều bạn sống theo." },
  },
  likes: {
    icon: "🍀",
    title: { ja: "好きなもの・心地よいもの", en: "What you love", vi: "Những điều bạn yêu thích" },
    lead: { ja: "贈り物や誘いの参考にもなる、あなたの「好き」です。", en: "Your favourite things — handy for gifts and invitations, too.", vi: "Những điều bạn thích — cũng hữu ích khi chọn quà hay rủ đi chơi." },
  },
  tips: {
    icon: "💌",
    title: { ja: "私と付き合うためのヒント", en: "Tips for getting along with me", vi: "Gợi ý để hòa hợp với tôi" },
    lead: { ja: "ここだけは、あなた自身の言葉として書いています。身近な人に伝えたいことの下書きとして使ってください。", en: "This part is written in your own voice — a draft of what you might want the people close to you to know.", vi: "Phần này được viết bằng giọng của chính bạn — bản nháp của những điều bạn muốn người thân biết." },
  },
  others: {
    icon: "💭",
    title: { ja: "周りから見た私", en: "As others see me", vi: "Tôi trong mắt người khác" },
  },
  tuvi: {
    icon: "🌌",
    title: { ja: "Tử Vi から見た私", en: "Through Tử Vi", vi: "Qua lá số Tử Vi" },
    lead: { ja: "ここはベトナムの伝統的な命術 Tử Vi の読み方です。あなたの答えから出したものではないので、読み物として楽しんでください。", en: "This is the traditional Vietnamese reading of your Tử Vi chart. It doesn't come from your answers — enjoy it as a different lens.", vi: "Đây là cách luận giải truyền thống của lá số Tử Vi. Nó không đến từ câu trả lời của bạn — hãy xem như một góc nhìn khác." },
  },
  story: {
    icon: "📚",
    title: { ja: "これまでの私", en: "My story so far", vi: "Câu chuyện của tôi" },
  },
  future: {
    icon: "🔭",
    title: { ja: "これからの私", en: "Where I'm heading", vi: "Tôi của sau này" },
  },
  changes: {
    icon: "🔄",
    title: { ja: "変わってきたこと", en: "What has changed", vi: "Những điều đã thay đổi" },
    lead: { ja: "考えが変わったのは、あなたが動いてきた証拠です。", en: "A changed view is a sign that you've been moving.", vi: "Một suy nghĩ thay đổi là dấu hiệu bạn đã luôn tiến về phía trước." },
  },
  novel: {
    icon: "📜",
    title: { ja: "あなたの物語", en: "Your story", vi: "Câu chuyện của bạn" },
    lead: { ja: "最後に、ここまでのことをひとつの物語にしてみました。登場する言葉は、すべてあなたが答え、記録したものです。", en: "Finally, everything so far told as one story. Every word quoted in it is something you answered or recorded.", vi: "Cuối cùng, mọi điều đến nay được kể thành một câu chuyện. Mọi lời được trích đều là điều bạn đã trả lời hoặc ghi lại." },
  },
  unknown: {
    icon: "🧩",
    title: { ja: "まだ分からないこと", en: "Still unwritten", vi: "Những điều chưa viết" },
    lead: { ja: "この説明書は、答えるほど書き足されていきます。次に答えると章が増えるところです。", en: "This manual grows as you answer. These are the parts your next answers will fill in.", vi: "Cuốn cẩm nang này dày thêm khi bạn trả lời. Đây là những phần câu trả lời tiếp theo sẽ lấp đầy." },
  },
};

const n = (x: number) => String(x);

export const MANUAL_PHRASE = {
  introBody: (name: string, answers: number, memories: number): I18nText => ({
    ja: `これは、${name}さんがMOSAICに残してきた ${n(answers)} 件の答えと ${n(memories)} 件の記録から組み立てた「取扱説明書」です。占いでも診断でもなく、あなた自身の言葉を、読み物の形に並べ直したものです。`,
    en: `This is ${name}'s manual, put together from ${n(answers)} answers and ${n(memories)} records left in MOSAIC. It isn't a fortune or a diagnosis — it's your own words, rearranged into something to read.`,
    vi: `Đây là cẩm nang của ${name}, được ghép từ ${n(answers)} câu trả lời và ${n(memories)} ghi chép trong MOSAIC. Nó không phải bói toán hay chẩn đoán — mà là chính lời của bạn, sắp xếp lại thành một bài đọc.`,
  }),
  introHow: {
    ja: "文章の言い切り方は、どれだけ確かかで変えています。「はっきり表れています」は答えがそろっているところ、「見えはじめています」はまだ途中のところです。当てはまらないと感じたら、インサイトの画面から「違う」と伝えてください。説明書もそれに合わせて書き変わります。",
    en: "How firmly each part is worded depends on how sure it is: 'clear' means your answers agree; 'emerging' means it's still taking shape. If something doesn't fit, tell MOSAIC on the Insights screen — the manual will rewrite itself.",
    vi: "Mức độ chắc chắn của từng đoạn được thể hiện qua cách viết: 'rõ ràng' nghĩa là các câu trả lời đồng thuận; 'đang hình thành' nghĩa là vẫn còn đang định hình. Nếu điều gì không đúng, hãy cho MOSAIC biết ở màn hình Nhận định — cẩm nang sẽ tự viết lại.",
  } as I18nText,
  bioCite: { ja: "自己紹介より", en: "From your bio", vi: "Từ phần giới thiệu" } as I18nText,
  consistent: { ja: "はっきり表れています", en: "Clear", vi: "Rõ ràng" } as I18nText,
  emerging: { ja: "見えはじめています", en: "Emerging", vi: "Đang hình thành" } as I18nText,
  mixed: { ja: "両方の面があります", en: "Both sides", vi: "Cả hai mặt" } as I18nText,
  thrive: { ja: "力が出やすい場所", en: "Where you thrive", vi: "Nơi bạn tỏa sáng" } as I18nText,
  watch: { ja: "気をつけたいこと", en: "Worth watching", vi: "Điều cần lưu ý" } as I18nText,
  basedOn: (k: number): I18nText => ({ ja: `${n(k)} 件の答えから`, en: `From ${n(k)} answers`, vi: `Từ ${n(k)} câu trả lời` }),
  yourNote: { ja: "あなたのメモ", en: "Your note", vi: "Ghi chú của bạn" } as I18nText,
  rejected: { ja: "この軸は、あなたが「当てはまらない」と答えたので、説明書には書いていません。", en: "You said this axis doesn't describe you, so the manual leaves it out.", vi: "Bạn cho biết trục này không đúng với mình, nên cẩm nang không viết về nó." } as I18nText,
  chapterEmpty: { ja: "この章は、まだ書けるほどの答えがありません。", en: "There aren't enough answers for this chapter yet.", vi: "Chương này chưa có đủ câu trả lời." } as I18nText,
  answerMore: { ja: "質問に答えて章を書き足す", en: "Answer questions to write this chapter", vi: "Trả lời câu hỏi để viết chương này" } as I18nText,
  othersSame: (who: string): I18nText => ({ ja: `${who}も、同じように見ているようです。`, en: `${who} see you the same way.`, vi: `${who} cũng nhìn bạn như vậy.` }),
  othersDiff: (who: string, pole: I18nText): I18nText => ({
    ja: `一方で${who}は、あなたを「${pole.ja}」人だと見ているようです。場面によって見せている顔が違うのかもしれません。`,
    en: `${who}, though, see you as someone who ${pole.en}. You may show a different side in different places.`,
    vi: `Tuy vậy, ${who} lại thấy bạn là người ${pole.vi}. Có lẽ bạn thể hiện những mặt khác nhau ở những nơi khác nhau.`,
  }),
  othersBlind: (who: string, pole: I18nText): I18nText => ({
    ja: `あなたの答えからはまだ見えませんが、${who}は「${pole.ja}」人だと感じているようです。`,
    en: `Your answers don't show it yet, but ${who} feel you're someone who ${pole.en}.`,
    vi: `Câu trả lời của bạn chưa cho thấy điều này, nhưng ${who} cảm thấy bạn là người ${pole.vi}.`,
  }),
  people: { ja: "周りの人", en: "The people you asked", vi: "Những người bạn đã hỏi" } as I18nText,
  othersIntro: (k: number): I18nText => ({
    ja: `${n(k)} 人が、あなたのことを答えてくれました。自分で思う自分と、周りが見ている自分。重なるところも、ずれるところも、どちらもあなたです。`,
    en: `${n(k)} people described you. The you that you see and the you they see — where they overlap and where they don't, both are you.`,
    vi: `${n(k)} người đã mô tả về bạn. Bạn trong mắt mình và bạn trong mắt họ — chỗ trùng nhau hay khác nhau, đều là bạn.`,
  }),
  othersNone: { ja: "まだ誰にも「どう見える？」を聞いていません。つながっている人に頼むと、ここに周りから見たあなたが加わります。", en: "You haven't asked anyone how they see you yet. Ask a connection and their view will appear here.", vi: "Bạn chưa hỏi ai về cách họ nhìn mình. Hãy nhờ một người kết nối, góc nhìn của họ sẽ xuất hiện ở đây." } as I18nText,
  othersAsk: { ja: "周りの人に聞いてみる", en: "Ask the people around you", vi: "Hỏi những người xung quanh" } as I18nText,
  windows: {
    open: { ja: "自分も周りも同じように見ているところ", en: "Where you and they agree", vi: "Nơi bạn và họ nhìn giống nhau" },
    blind: { ja: "周りだけが気づいているところ", en: "What only they notice", vi: "Điều chỉ họ nhận ra" },
    hidden: { ja: "まだ周りには見えていないところ", en: "What they don't see yet", vi: "Điều họ chưa thấy" },
    different: { ja: "見え方がちがうところ", en: "Where views differ", vi: "Nơi góc nhìn khác nhau" },
  } as Record<"open" | "blind" | "hidden" | "different", I18nText>,
  wordsFromOthers: { ja: "寄せられた言葉", en: "In their words", vi: "Lời họ viết" } as I18nText,
  likesFromAnswers: { ja: "質問への答えから", en: "From your answers", vi: "Từ câu trả lời" } as I18nText,
  likesFromPrefs: { ja: "あなたが登録した「好き」", en: "Favourites you saved", vi: "Những điều bạn đã lưu" } as I18nText,
  sentiment: {
    love: { ja: "大好き", en: "Love", vi: "Rất thích" },
    like: { ja: "好き", en: "Like", vi: "Thích" },
    wants: { ja: "ほしい", en: "Want", vi: "Muốn có" },
    dislike: { ja: "苦手", en: "Not for me", vi: "Không hợp" },
    avoid: { ja: "避けたい", en: "Avoid", vi: "Tránh" },
  } as Record<string, I18nText>,
  tipsOutro: { ja: "そして何より、ここに書いたことが全部ではありません。分からないときは、直接聞いてもらうのがいちばんです。", en: "And above all, this isn't everything. When in doubt, just ask me.", vi: "Và trên hết, đây chưa phải là tất cả. Khi không chắc, cứ hỏi trực tiếp tôi nhé." } as I18nText,
  tuviMenh: { ja: "命宮", en: "Mệnh palace", vi: "Cung Mệnh" } as I18nText,
  tuviKeywords: { ja: "伝統的なキーワード", en: "Traditional keywords", vi: "Từ khóa truyền thống" } as I18nText,
  tuviNow: { ja: "いまの大限（10年の流れ）", en: "Your current 10-year cycle", vi: "Đại Hạn hiện tại" } as I18nText,
  tuviMore: { ja: "命盤をくわしく見る", en: "See the full chart", vi: "Xem lá số đầy đủ" } as I18nText,
  tuviNone: { ja: "生年月日を入れると、伝統的な読み方がここに加わります。", en: "Add your birth details and a traditional reading will appear here.", vi: "Thêm ngày giờ sinh để phần luận giải truyền thống xuất hiện ở đây." } as I18nText,
  tuviSetup: { ja: "Tử Vi を設定する", en: "Set up Tử Vi", vi: "Thiết lập Tử Vi" } as I18nText,
  storyAnswers: { ja: "質問への答えから", en: "From your answers", vi: "Từ câu trả lời" } as I18nText,
  storyRecords: { ja: "記録から", en: "From your records", vi: "Từ ghi chép" } as I18nText,
  storyNone: { ja: "まだ過去についての答えや記録がありません。思い出やうれしかったことを記録すると、ここに物語が加わります。", en: "No answers or records about your past yet. Record a memory or an achievement and your story will begin here.", vi: "Chưa có câu trả lời hay ghi chép nào về quá khứ. Hãy ghi lại một kỷ niệm hay thành tựu để câu chuyện bắt đầu." } as I18nText,
  futureNone: { ja: "まだこれからについての答えや記録がありません。目標や夢を記録すると、ここに加わります。", en: "Nothing about the future yet. Record a goal or a dream and it will appear here.", vi: "Chưa có gì về tương lai. Hãy ghi lại một mục tiêu hay ước mơ." } as I18nText,
  letterSealed: (date: string): I18nText => ({ ja: `未来への手紙が1通、${date} に開くのを待っています。`, en: `A letter to the future is waiting to open on ${date}.`, vi: `Một lá thư gửi tương lai đang chờ được mở vào ${date}.` }),
  changedFrom: (before: string, after: string, date: string): I18nText => ({
    ja: `「${before}」から「${after}」へ（${date}）`,
    en: `From “${before}” to “${after}” (${date})`,
    vi: `Từ “${before}” thành “${after}” (${date})`,
  }),
  changesNone: { ja: "まだ答えを変えたことはありません。時間をおいて同じ質問に答え直すと、変化がここに残ります。", en: "You haven't changed an answer yet. Re-answer a question after a while and the change will show here.", vi: "Bạn chưa thay đổi câu trả lời nào. Hãy trả lời lại một câu hỏi sau một thời gian, sự thay đổi sẽ hiện ở đây." } as I18nText,
  unknownAxis: (name: string, k: number): I18nText => ({
    ja: k > 0 ? `${name}（あと ${n(k)} 問）` : `${name}（答えが両方に分かれています）`,
    en: k > 0 ? `${name} (${n(k)} more)` : `${name} (answers point both ways)`,
    vi: k > 0 ? `${name} (còn ${n(k)} câu)` : `${name} (câu trả lời chia đôi)`,
  }),
  unknownDone: { ja: "17の軸すべてに、何かしらの答えが出ています。あとは答え直したり、周りの人に聞いたりして、説明書を育てていってください。", en: "Every one of the 17 axes says something now. Keep growing the manual by re-answering and asking others.", vi: "Cả 17 trục đều đã có thông tin. Hãy tiếp tục làm dày cẩm nang bằng cách trả lời lại và hỏi người khác." } as I18nText,
  lockedAxes: (n: number): I18nText => ({
    ja: `この章は、あと${n}問答えると書きはじめられます。`,
    en: `${n} more answer${n === 1 ? "" : "s"} and this chapter starts to write itself.`,
    vi: `Trả lời thêm ${n} câu nữa là chương này bắt đầu được viết.`,
  }),
  lockedSummary: { ja: "傾向がひとつ見えてくると、ここにあなたをひとことで表す言葉が並びます。", en: "Once a first tendency shows, a few words that sum you up will appear here.", vi: "Khi xu hướng đầu tiên hiện ra, vài dòng tóm tắt về bạn sẽ xuất hiện ở đây." } as I18nText,
  lockedLikes: { ja: "好きなものについての質問に答えると、この章が書けるようになります。", en: "Answer a few questions about what you love and this chapter can be written.", vi: "Trả lời vài câu về những điều bạn thích để chương này được viết." } as I18nText,
  lockedTips: { ja: "傾向が見えてくると、ここに「私と付き合うためのヒント」があなたの言葉で並びます。", en: "As tendencies show, tips for getting along with you will appear here in your own voice.", vi: "Khi các xu hướng hiện ra, những gợi ý để hòa hợp với bạn sẽ xuất hiện ở đây bằng giọng của chính bạn." } as I18nText,
  sample: {
    ja: "休日の朝は少しゆっくり始めて、気に入った店でコーヒーを飲むのが好きです。季節の変わり目には新しい場所に出かけたくなり、旅先では地元の人が通う食堂を探します。人に贈り物をするときは、相手の話を思い出しながら選ぶ時間も楽しんでいます。",
    en: "Weekend mornings start slowly, with coffee at a favourite place. When the seasons change there's a pull to go somewhere new, and on trips the hunt is for the diner the locals use. Choosing a gift means remembering what the other person said — and enjoying that part too.",
    vi: "Sáng cuối tuần bắt đầu thong thả với ly cà phê ở quán quen. Khi giao mùa lại muốn đi đâu đó mới, và khi đi xa thì tìm quán ăn của người địa phương. Chọn quà là lúc nhớ lại những gì người kia từng kể — và cũng tận hưởng điều đó.",
  } as I18nText,
  chapterLink: { ja: "この章の質問へ", en: "Questions for this chapter", vi: "Câu hỏi của chương này" } as I18nText,
};

export type ManualPreset = "friend" | "partner";
export const MANUAL_PRESETS: ManualPreset[] = ["friend", "partner"];

/** Chapters each preset shows (the database applies the same rule: manual_preset_keys). */
export const PRESET_CHAPTERS: Record<ManualPreset, Chapter[]> = {
  friend: ["self", "people"],
  partner: ["self", "mind", "people", "life"],
};

export const SHARED_TEXT = {
  presetName: { friend: { ja: "友人向け", en: "For friends", vi: "Dành cho bạn bè" }, partner: { ja: "パートナー向け", en: "For a partner", vi: "Dành cho người thương" } } as Record<ManualPreset, I18nText>,
  presetWhat: {
    friend: { ja: "ひとことで言うと・気質・人との関わり・好きなもの・付き合うためのヒント", en: "In a few words, temperament, with other people, favourites, and tips for getting along", vi: "Tóm tắt, khí chất, cách đối xử với mọi người, sở thích và gợi ý để hòa hợp" },
    partner: { ja: "友人向けの内容に加えて、考え方（決め方・挑戦）と暮らし・価値観（お金・向上心・伝統）", en: "Everything for friends, plus how you think (deciding, risk) and life and values (money, drive, tradition)", vi: "Mọi nội dung dành cho bạn bè, thêm cách suy nghĩ (quyết định, mạo hiểm) và cuộc sống, giá trị (tiền bạc, động lực, truyền thống)" },
  } as Record<ManualPreset, I18nText>,
  never: {
    ja: "どちらの場合も、記録・メモ・自由記述の答え・「自分だけ」にした答え・周りの人からの声・Tử Vi は含まれません（Tử Vi は比べる内容の同意で別に決めます）。",
    en: "Either way, records, notes, written answers, answers kept to yourself, what others said about you and Tử Vi are never included (Tử Vi is chosen separately when you agree what to compare).",
    vi: "Dù chọn gì, ghi chép, ghi chú, câu trả lời tự viết, câu trả lời “chỉ mình tôi”, nhận xét của người khác và Tử Vi đều không bao giờ được đưa vào (Tử Vi được chọn riêng khi đồng ý nội dung so sánh).",
  } as I18nText,
  heading: (name: string, preset: ManualPreset): I18nText => ({
    ja: `${name}さんの取扱説明書（${SHARED_PRESET_JA[preset]}）`,
    en: `${name}'s manual (${preset === "friend" ? "for friends" : "for a partner"})`,
    vi: `Cẩm nang về ${name} (${preset === "friend" ? "dành cho bạn bè" : "dành cho người thương"})`,
  }),
  lead: (name: string): I18nText => ({
    ja: `${name}さんが、あなたに見せることにした部分です。${name}さん自身の答えから見えてきた傾向で、決めつけではありません。`,
    en: `This is what ${name} chose to show you. These are tendencies drawn from ${name}'s own answers — not labels.`,
    vi: `Đây là những gì ${name} chọn cho bạn xem. Đó là các xu hướng rút ra từ chính câu trả lời của ${name} — không phải nhãn dán.`,
  }),
  consistent: (name: string, pole: I18nText): I18nText => ({ ja: `${name}さんは「${pole.ja}」ことが多いようです。`, en: `Usually, ${name} ${pole.en}.`, vi: `${name} thường ${pole.vi}.` }),
  emerging: (name: string, pole: I18nText): I18nText => ({ ja: `${name}さんは「${pole.ja}」傾向が見えはじめています。`, en: `It's starting to show that ${name} ${pole.en}.`, vi: `${name} có vẻ ${pole.vi}.` }),
  mixed: (name: string, a: I18nText, b: I18nText): I18nText => ({ ja: `${name}さんは「${a.ja}」ときも「${b.ja}」ときもあるようです。`, en: `${name} sometimes ${a.en}, and sometimes ${b.en}.`, vi: `${name} lúc thì ${a.vi}, lúc thì ${b.vi}.` }),
  askLabel: (name: string): I18nText => ({ ja: `${name}さんから`, en: `From ${name}`, vi: `Lời ${name}` }),
  likesTitle: { ja: "好きなもの", en: "Favourites", vi: "Sở thích" } as I18nText,
  nothing: (name: string): I18nText => ({ ja: `${name}さんの答えがまだ少ないため、見せられる内容がありません。`, en: `${name} hasn't answered enough yet for there to be anything to show.`, vi: `${name} chưa trả lời đủ nhiều nên chưa có gì để hiển thị.` }),
  outro: (name: string): I18nText => ({
    ja: `ここにあるのは、${name}さんが見せることにした部分だけです。いちばん確かなのは、${name}さん本人に聞くことです。`,
    en: `This is only what ${name} chose to share. The surest way to know ${name} is still to ask.`,
    vi: `Đây chỉ là phần ${name} chọn chia sẻ. Cách chắc chắn nhất để hiểu ${name} vẫn là hỏi trực tiếp.`,
  }),
};
const SHARED_PRESET_JA: Record<ManualPreset, string> = { friend: "友人向け", partner: "パートナー向け" };

export const MANUAL_CHAPTERS: Chapter[] = ["self", "mind", "people", "life"];
