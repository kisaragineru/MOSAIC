/**
 * Daily Discovery question bank.
 *
 * Questions are curated content, not AI-generated. Each has a stable id and an integer
 * version; once seeded, a version's content is immutable (answers reference
 * question_id + version). To change wording, add a new version number.
 *
 * `signals` connect an answer to a tendency claim (see src/server/services/tendencies.ts).
 * A single answer never produces a claim on its own (minimum evidence is enforced there).
 */

export type QuestionCategory =
  | "personality"
  | "values"
  | "relationships"
  | "food"
  | "travel"
  | "music"
  | "hobbies"
  | "money_work"
  | "past"
  | "future"
  | "change";

/** Text stored in versioned question content (English + Vietnamese; Japanese lives in questions-ja.ts). */
export type BankText = { en: string; vi: string };
/** Display text in every supported UI language. Adding a locale here makes the compiler list every missing translation. */
export type I18nText = { en: string; vi: string; ja: string };

export interface QuestionOption {
  value: string;
  label: BankText;
}

export interface Signal {
  claimKey: TendencyKey;
  /** +1 supports the positive pole, -1 the negative pole. */
  direction: 1 | -1;
  whenValue?: string;
  whenScaleAtLeast?: number;
  whenScaleAtMost?: number;
}

export interface QuestionDef {
  id: string;
  version: number;
  category: QuestionCategory;
  sensitivity: "low" | "medium" | "high";
  comparable: boolean;
  followUpOnly?: boolean;
  active?: boolean;
  format: "single" | "multi" | "scale" | "short" | "free";
  prompt: BankText;
  options?: QuestionOption[];
  maxChoices?: number;
  scale?: { min: number; max: number; minLabel: BankText; maxLabel: BankText };
  followUps?: { whenValue: string; questionId: string }[];
  signals?: Signal[];
}

export const TENDENCY_KEYS = [
  "planning",
  "social_energy",
  "risk",
  "decision_style",
  "novelty",
  "conflict",
  "saving",
  "expressiveness",
] as const;
export type TendencyKey = (typeof TENDENCY_KEYS)[number];

/** Human-readable statement for each pole of a tendency. */
export const TENDENCY_TEXT: Record<TendencyKey, { pos: I18nText; neg: I18nText }> = {
  planning: {
    pos: { en: "You often prefer to plan ahead.", vi: "Bạn thường thích lên kế hoạch trước." , ja: "先に計画を立てるのを好むことが多いようです。" },
    neg: { en: "You often prefer to keep things open and spontaneous.", vi: "Bạn thường thích để mọi thứ linh hoạt, tùy hứng." , ja: "予定を決めず、その場に合わせるのを好むことが多いようです。" },
  },
  social_energy: {
    pos: { en: "Time with other people often recharges you.", vi: "Ở bên người khác thường giúp bạn nạp lại năng lượng." , ja: "人と過ごす時間で元気が戻ることが多いようです。" },
    neg: { en: "Time alone often recharges you.", vi: "Thời gian một mình thường giúp bạn nạp lại năng lượng." , ja: "一人の時間で元気が戻ることが多いようです。" },
  },
  risk: {
    pos: { en: "You are often comfortable taking chances.", vi: "Bạn thường thoải mái với việc chấp nhận rủi ro." , ja: "思い切って挑戦することに抵抗が少ないようです。" },
    neg: { en: "You often prefer safety and stability.", vi: "Bạn thường ưu tiên sự an toàn và ổn định." , ja: "安全や安定を優先することが多いようです。" },
  },
  decision_style: {
    pos: { en: "You often decide by analysing facts.", vi: "Bạn thường quyết định dựa trên phân tích dữ kiện." , ja: "事実を分析して決めることが多いようです。" },
    neg: { en: "You often decide by feeling and intuition.", vi: "Bạn thường quyết định dựa trên cảm xúc và trực giác." , ja: "気持ちや直感で決めることが多いようです。" },
  },
  novelty: {
    pos: { en: "You are often drawn to new experiences.", vi: "Bạn thường bị cuốn hút bởi trải nghiệm mới." , ja: "新しい体験に惹かれることが多いようです。" },
    neg: { en: "You often find comfort in the familiar.", vi: "Bạn thường thấy yên tâm với những điều quen thuộc." , ja: "慣れ親しんだものに安心することが多いようです。" },
  },
  conflict: {
    pos: { en: "You tend to address disagreements directly.", vi: "Bạn có xu hướng nói thẳng khi có bất đồng." , ja: "意見の違いには率直に向き合う傾向があるようです。" },
    neg: { en: "You tend to calm things down before talking about disagreements.", vi: "Bạn có xu hướng làm dịu tình hình trước khi nói về bất đồng." , ja: "意見の違いは、まず場を落ち着かせてから話す傾向があるようです。" },
  },
  saving: {
    pos: { en: "You often lean toward saving for later.", vi: "Bạn thường nghiêng về tiết kiệm cho sau này." , ja: "将来のために貯めることに気持ちが傾きやすいようです。" },
    neg: { en: "You often lean toward enjoying money now.", vi: "Bạn thường nghiêng về tận hưởng tiền bạc hiện tại." , ja: "いまお金を楽しむことに気持ちが傾きやすいようです。" },
  },
  expressiveness: {
    pos: { en: "You often share your feelings openly.", vi: "Bạn thường chia sẻ cảm xúc một cách cởi mở." , ja: "気持ちを率直に伝えることが多いようです。" },
    neg: { en: "You often keep your feelings to yourself.", vi: "Bạn thường giữ cảm xúc cho riêng mình." , ja: "気持ちを自分の中にしまっておくことが多いようです。" },
  },
};

const agree5 = {
  min: 1,
  max: 5,
  minLabel: { en: "1 = Not like me at all", vi: "1 = Hoàn toàn không giống tôi" },
  maxLabel: { en: "5 = Very much like me", vi: "5 = Rất giống tôi" },
};
const scaleSignals = (claimKey: TendencyKey): Signal[] => [
  { claimKey, direction: 1, whenScaleAtLeast: 4 },
  { claimKey, direction: -1, whenScaleAtMost: 2 },
];
const opt = (value: string, en: string, vi: string): QuestionOption => ({ value, label: { en, vi } });

export const QUESTION_BANK: QuestionDef[] = [
  // --- personality -------------------------------------------------------
  {
    id: "p.weekend_plan", version: 1, category: "personality", sensitivity: "low", comparable: true, format: "single",
    prompt: { en: "A free weekend appears. What do you do first?", vi: "Bạn có một cuối tuần rảnh. Việc đầu tiên bạn làm là gì?" },
    options: [
      opt("plan", "Make a plan for it", "Lên kế hoạch cho nó"),
      opt("see", "See how I feel when it comes", "Đến lúc đó tính sau"),
      opt("rest", "Keep it completely empty to rest", "Để trống hoàn toàn để nghỉ ngơi"),
    ],
    signals: [
      { claimKey: "planning", direction: 1, whenValue: "plan" },
      { claimKey: "planning", direction: -1, whenValue: "see" },
    ],
  },
  {
    id: "p.recharge", version: 1, category: "personality", sensitivity: "low", comparable: true, format: "single",
    prompt: { en: "After a tiring week, what recharges you most?", vi: "Sau một tuần mệt mỏi, điều gì giúp bạn hồi phục nhất?" },
    options: [
      opt("friends", "Meeting friends", "Gặp gỡ bạn bè"),
      opt("alone", "Quiet time alone", "Thời gian yên tĩnh một mình"),
      opt("family", "Time with family at home", "Ở nhà với gia đình"),
      opt("outside", "Being outdoors", "Ra ngoài trời"),
    ],
    signals: [
      { claimKey: "social_energy", direction: 1, whenValue: "friends" },
      { claimKey: "social_energy", direction: -1, whenValue: "alone" },
    ],
  },
  {
    id: "p.lists", version: 1, category: "personality", sensitivity: "low", comparable: false, format: "scale",
    prompt: { en: "\"I like to have a to-do list for the day.\"", vi: "\"Tôi thích có danh sách việc cần làm trong ngày.\"" },
    scale: agree5, signals: scaleSignals("planning"),
  },
  {
    id: "p.party", version: 1, category: "personality", sensitivity: "low", comparable: false, format: "scale",
    prompt: { en: "\"At a party, I enjoy meeting people I don't know.\"", vi: "\"Ở một bữa tiệc, tôi thích làm quen với người lạ.\"" },
    scale: agree5, signals: scaleSignals("social_energy"),
  },
  {
    id: "p.decide", version: 1, category: "personality", sensitivity: "low", comparable: true, format: "single",
    prompt: { en: "When making an important choice, what do you trust more?", vi: "Khi đưa ra lựa chọn quan trọng, bạn tin vào điều gì hơn?" },
    options: [
      opt("facts", "Facts and comparisons", "Dữ kiện và so sánh"),
      opt("gut", "My gut feeling", "Cảm giác của mình"),
      opt("people", "Advice from people I trust", "Lời khuyên của người tôi tin"),
    ],
    signals: [
      { claimKey: "decision_style", direction: 1, whenValue: "facts" },
      { claimKey: "decision_style", direction: -1, whenValue: "gut" },
    ],
  },
  {
    id: "p.disagree", version: 1, category: "personality", sensitivity: "medium", comparable: true, format: "single",
    prompt: { en: "When you disagree with someone close, you usually…", vi: "Khi bất đồng với người thân thiết, bạn thường…" },
    options: [
      opt("talk_now", "Talk about it right away", "Nói ra ngay"),
      opt("cool_down", "Wait until we both calm down", "Đợi cả hai bình tĩnh lại"),
      opt("let_go", "Let it go if it's small", "Bỏ qua nếu là chuyện nhỏ"),
    ],
    signals: [
      { claimKey: "conflict", direction: 1, whenValue: "talk_now" },
      { claimKey: "conflict", direction: -1, whenValue: "cool_down" },
    ],
  },
  {
    id: "p.feelings", version: 1, category: "personality", sensitivity: "medium", comparable: false, format: "scale",
    prompt: { en: "\"When I'm upset, the people close to me usually know.\"", vi: "\"Khi tôi buồn, những người thân thiết thường nhận ra.\"" },
    scale: agree5, signals: scaleSignals("expressiveness"),
  },
  {
    id: "p.new_food", version: 1, category: "personality", sensitivity: "low", comparable: true, format: "single",
    prompt: { en: "At a restaurant you know well, you usually…", vi: "Ở một nhà hàng quen, bạn thường…" },
    options: [
      opt("favorite", "Order my usual favourite", "Gọi món quen thuộc"),
      opt("new", "Try something new", "Thử món mới"),
    ],
    signals: [
      { claimKey: "novelty", direction: -1, whenValue: "favorite" },
      { claimKey: "novelty", direction: 1, whenValue: "new" },
    ],
  },
  {
    id: "p.risk", version: 1, category: "personality", sensitivity: "low", comparable: false, format: "scale",
    prompt: { en: "\"I'd rather try and fail than never try.\"", vi: "\"Tôi thà thử rồi thất bại còn hơn không bao giờ thử.\"" },
    scale: agree5, signals: scaleSignals("risk"),
  },
  {
    id: "p.morning", version: 1, category: "personality", sensitivity: "low", comparable: true, format: "single",
    prompt: { en: "Are you more of a morning or a night person?", vi: "Bạn là người của buổi sáng hay buổi tối?" },
    options: [opt("morning", "Morning", "Buổi sáng"), opt("night", "Night", "Buổi tối"), opt("depends", "It depends", "Tùy lúc")],
  },
  // --- values ------------------------------------------------------------
  {
    id: "v.top_values", version: 1, category: "values", sensitivity: "low", comparable: true, format: "multi",
    prompt: { en: "Which of these matter most to you right now? (up to 3)", vi: "Điều nào quan trọng nhất với bạn lúc này? (tối đa 3)" },
    maxChoices: 3,
    options: [
      opt("family", "Family", "Gia đình"),
      opt("freedom", "Freedom", "Tự do"),
      opt("security", "Security", "Sự an toàn"),
      opt("growth", "Growth", "Phát triển bản thân"),
      opt("honesty", "Honesty", "Sự trung thực"),
      opt("fun", "Fun", "Niềm vui"),
      opt("kindness", "Kindness", "Lòng tốt"),
      opt("achievement", "Achievement", "Thành tựu"),
    ],
    signals: [
      { claimKey: "risk", direction: -1, whenValue: "security" },
      { claimKey: "novelty", direction: 1, whenValue: "freedom" },
    ],
  },
  {
    id: "v.success", version: 1, category: "values", sensitivity: "low", comparable: true, format: "single",
    prompt: { en: "What does a successful life look like to you?", vi: "Với bạn, một cuộc sống thành công trông như thế nào?" },
    options: [
      opt("peace", "A peaceful, stable life", "Bình yên, ổn định"),
      opt("impact", "Having an impact on others", "Tạo ảnh hưởng tích cực đến người khác"),
      opt("loved", "Being surrounded by people I love", "Được ở bên những người mình thương"),
      opt("mastery", "Becoming excellent at something", "Trở nên xuất sắc ở một lĩnh vực"),
    ],
  },
  {
    id: "v.honesty_kindness", version: 1, category: "values", sensitivity: "medium", comparable: true, format: "single",
    prompt: { en: "A friend asks your opinion on something you don't like. You…", vi: "Bạn bè hỏi ý kiến về điều bạn không thích. Bạn…" },
    options: [
      opt("honest", "Say honestly what I think", "Nói thật suy nghĩ của mình"),
      opt("gentle", "Find something kind to say first", "Tìm điều tích cực để nói trước"),
      opt("ask", "Ask what they hope to hear", "Hỏi xem họ mong nghe điều gì"),
    ],
    signals: [{ claimKey: "conflict", direction: 1, whenValue: "honest" }],
  },
  {
    id: "v.believe", version: 1, category: "values", sensitivity: "medium", comparable: false, format: "free",
    prompt: { en: "What is something you believe that many people around you don't?", vi: "Điều gì bạn tin mà nhiều người xung quanh không tin?" },
  },
  {
    id: "v.proud", version: 1, category: "values", sensitivity: "low", comparable: false, format: "short",
    prompt: { en: "What is one thing about yourself you are quietly proud of?", vi: "Một điều về bản thân mà bạn thầm tự hào là gì?" },
  },
  // --- relationships -----------------------------------------------------
  {
    id: "r.love_language", version: 1, category: "relationships", sensitivity: "medium", comparable: true, format: "single",
    prompt: { en: "What makes you feel most cared for?", vi: "Điều gì khiến bạn cảm thấy được quan tâm nhất?" },
    options: [
      opt("words", "Kind words", "Lời nói yêu thương"),
      opt("time", "Time together", "Thời gian bên nhau"),
      opt("help", "Help with everyday things", "Được giúp đỡ việc hằng ngày"),
      opt("gifts", "Thoughtful gifts", "Món quà tinh tế"),
      opt("touch", "A hug or physical closeness", "Một cái ôm, sự gần gũi"),
    ],
  },
  {
    id: "r.reply_speed", version: 1, category: "relationships", sensitivity: "low", comparable: true, format: "single",
    prompt: { en: "How quickly do you expect replies from close friends?", vi: "Bạn mong bạn thân trả lời tin nhắn nhanh đến đâu?" },
    options: [
      opt("fast", "Within the hour", "Trong vòng một giờ"),
      opt("day", "Within the day", "Trong ngày"),
      opt("whenever", "Whenever they can", "Lúc nào tiện thì trả lời"),
    ],
  },
  {
    id: "r.grateful_person", version: 1, category: "relationships", sensitivity: "medium", comparable: false, format: "short",
    prompt: { en: "Who is someone you're grateful for this week, and why?", vi: "Tuần này bạn biết ơn ai, và vì sao?" },
  },
  {
    id: "r.apology", version: 1, category: "relationships", sensitivity: "medium", comparable: true, format: "single",
    prompt: { en: "After an argument, who usually reaches out first?", vi: "Sau khi cãi nhau, ai thường là người làm lành trước?" },
    options: [
      opt("me", "Usually me", "Thường là tôi"),
      opt("them", "Usually the other person", "Thường là người kia"),
      opt("both", "It varies", "Tùy lúc"),
    ],
  },
  // --- food --------------------------------------------------------------
  {
    id: "f.spicy", version: 1, category: "food", sensitivity: "low", comparable: true, format: "scale",
    prompt: { en: "How much do you enjoy spicy food?", vi: "Bạn thích đồ ăn cay đến mức nào?" },
    scale: {
      min: 1, max: 5,
      minLabel: { en: "1 = I avoid it", vi: "1 = Tôi tránh ăn cay" },
      maxLabel: { en: "5 = The spicier the better", vi: "5 = Càng cay càng thích" },
    },
  },
  {
    id: "f.comfort", version: 1, category: "food", sensitivity: "low", comparable: false, format: "short",
    prompt: { en: "What is your comfort food?", vi: "Món ăn \"chữa lành\" của bạn là gì?" },
  },
  {
    id: "f.drink", version: 1, category: "food", sensitivity: "low", comparable: true, format: "single",
    prompt: { en: "Your go-to drink?", vi: "Đồ uống quen thuộc của bạn?" },
    options: [
      opt("coffee", "Coffee", "Cà phê"),
      opt("tea", "Tea", "Trà"),
      opt("juice", "Juice / smoothie", "Nước ép / sinh tố"),
      opt("water", "Just water", "Nước lọc"),
      opt("milk_tea", "Milk tea", "Trà sữa"),
    ],
  },
  {
    id: "f.cuisines", version: 1, category: "food", sensitivity: "low", comparable: true, format: "multi",
    prompt: { en: "Which cuisines do you love?", vi: "Bạn yêu thích ẩm thực nào?" },
    options: [
      opt("vietnamese", "Vietnamese", "Việt Nam"),
      opt("japanese", "Japanese", "Nhật Bản"),
      opt("korean", "Korean", "Hàn Quốc"),
      opt("chinese", "Chinese", "Trung Hoa"),
      opt("thai", "Thai", "Thái Lan"),
      opt("italian", "Italian", "Ý"),
      opt("french", "French", "Pháp"),
      opt("indian", "Indian", "Ấn Độ"),
    ],
  },
  {
    id: "f.sweet_savory", version: 1, category: "food", sensitivity: "low", comparable: true, format: "single",
    prompt: { en: "Sweet or savoury?", vi: "Ngọt hay mặn?" },
    options: [opt("sweet", "Sweet", "Ngọt"), opt("savory", "Savoury", "Mặn"), opt("both", "Both!", "Cả hai!")],
  },
  // --- travel ------------------------------------------------------------
  {
    id: "t.style", version: 1, category: "travel", sensitivity: "low", comparable: true, format: "single",
    prompt: { en: "Your ideal trip is…", vi: "Chuyến đi lý tưởng của bạn là…" },
    options: [
      opt("beach", "Relaxing by the sea", "Thư giãn bên biển"),
      opt("city", "Exploring a city", "Khám phá thành phố"),
      opt("nature", "Mountains and nature", "Núi rừng, thiên nhiên"),
      opt("food", "A food trip", "Một chuyến đi ăn uống"),
    ],
  },
  {
    id: "t.itinerary", version: 1, category: "travel", sensitivity: "low", comparable: true, format: "single",
    prompt: { en: "When traveling, do you prefer a detailed itinerary?", vi: "Khi đi du lịch, bạn có thích lịch trình chi tiết không?" },
    options: [
      opt("detailed", "Yes, hour by hour", "Có, chi tiết từng giờ"),
      opt("rough", "A rough outline", "Chỉ cần khung sơ bộ"),
      opt("none", "No plan at all", "Không cần kế hoạch"),
    ],
    signals: [
      { claimKey: "planning", direction: 1, whenValue: "detailed" },
      { claimKey: "planning", direction: -1, whenValue: "none" },
    ],
  },
  {
    id: "t.dream_place", version: 1, category: "travel", sensitivity: "low", comparable: false, format: "short",
    prompt: { en: "Where would you go if you could leave tomorrow?", vi: "Nếu có thể đi ngay ngày mai, bạn sẽ đi đâu?" },
  },
  {
    id: "t.new_place", version: 1, category: "travel", sensitivity: "low", comparable: false, format: "scale",
    prompt: { en: "\"I prefer going somewhere new over returning to a place I love.\"", vi: "\"Tôi thích đến nơi mới hơn là quay lại nơi mình yêu thích.\"" },
    scale: agree5, signals: scaleSignals("novelty"),
  },
  // --- music -------------------------------------------------------------
  {
    id: "m.genres", version: 1, category: "music", sensitivity: "low", comparable: true, format: "multi",
    prompt: { en: "Which kinds of music do you enjoy?", vi: "Bạn thích thể loại nhạc nào?" },
    options: [
      opt("pop", "Pop", "Pop"),
      opt("ballad", "Ballads", "Ballad"),
      opt("rock", "Rock", "Rock"),
      opt("hiphop", "Hip-hop / rap", "Hip-hop / rap"),
      opt("edm", "Electronic", "Nhạc điện tử"),
      opt("classical", "Classical", "Cổ điển"),
      opt("jazz", "Jazz", "Jazz"),
      opt("bolero", "Bolero / traditional", "Bolero / nhạc truyền thống"),
      opt("indie", "Indie", "Indie"),
    ],
  },
  {
    id: "m.song_now", version: 1, category: "music", sensitivity: "low", comparable: false, format: "short",
    prompt: { en: "Which song is stuck in your head lately?", vi: "Gần đây bài hát nào cứ vang trong đầu bạn?" },
  },
  {
    id: "m.when", version: 1, category: "music", sensitivity: "low", comparable: true, format: "single",
    prompt: { en: "When do you listen to music most?", vi: "Bạn nghe nhạc nhiều nhất khi nào?" },
    options: [
      opt("commute", "Commuting", "Khi di chuyển"),
      opt("work", "While working or studying", "Khi làm việc hoặc học"),
      opt("relax", "To relax", "Khi thư giãn"),
      opt("rarely", "Rarely", "Hiếm khi"),
    ],
  },
  // --- hobbies -----------------------------------------------------------
  {
    id: "h.free_time", version: 1, category: "hobbies", sensitivity: "low", comparable: true, format: "multi",
    prompt: { en: "How do you like to spend free time?", vi: "Bạn thích dành thời gian rảnh như thế nào?" },
    options: [
      opt("reading", "Reading", "Đọc sách"),
      opt("films", "Films & series", "Xem phim"),
      opt("sports", "Sports & exercise", "Thể thao"),
      opt("games", "Games", "Chơi game"),
      opt("cooking", "Cooking", "Nấu ăn"),
      opt("making", "Making things (art, crafts, music)", "Sáng tạo (vẽ, thủ công, âm nhạc)"),
      opt("cafe", "Cafés", "Ngồi cà phê"),
      opt("outdoors", "Being outdoors", "Hoạt động ngoài trời"),
    ],
    signals: [
      { claimKey: "social_energy", direction: 1, whenValue: "cafe" },
    ],
  },
  {
    id: "h.learn", version: 1, category: "hobbies", sensitivity: "low", comparable: false, format: "short",
    prompt: { en: "What is something you'd like to learn this year?", vi: "Năm nay bạn muốn học điều gì?" },
  },
  {
    id: "h.pets", version: 1, category: "hobbies", sensitivity: "low", comparable: true, format: "single",
    prompt: { en: "Cats, dogs, or neither?", vi: "Mèo, chó, hay không con nào?" },
    options: [opt("cats", "Cats", "Mèo"), opt("dogs", "Dogs", "Chó"), opt("both", "Both", "Cả hai"), opt("neither", "Neither", "Không con nào")],
  },
  // --- money & work ------------------------------------------------------
  {
    id: "w.bonus", version: 1, category: "money_work", sensitivity: "medium", comparable: true, format: "single",
    prompt: { en: "You receive an unexpected bonus. You would mostly…", vi: "Bạn nhận được một khoản thưởng bất ngờ. Bạn sẽ chủ yếu…" },
    options: [
      opt("save", "Save or invest it", "Tiết kiệm hoặc đầu tư"),
      opt("treat", "Treat myself or others", "Tự thưởng hoặc chiêu đãi người khác"),
      opt("experience", "Spend it on an experience", "Dành cho một trải nghiệm"),
      opt("family", "Give it to family", "Gửi cho gia đình"),
    ],
    signals: [
      { claimKey: "saving", direction: 1, whenValue: "save" },
      { claimKey: "saving", direction: -1, whenValue: "treat" },
      { claimKey: "saving", direction: -1, whenValue: "experience" },
    ],
  },
  {
    id: "w.job_choice", version: 1, category: "money_work", sensitivity: "medium", comparable: true, format: "single",
    prompt: { en: "Two job offers: which do you lean toward?", vi: "Có hai lời mời làm việc: bạn nghiêng về bên nào?" },
    options: [
      opt("stable", "A stable job with steady pay", "Công việc ổn định, lương đều"),
      opt("startup", "An exciting job with uncertain future", "Công việc thú vị nhưng tương lai bất định"),
    ],
    signals: [
      { claimKey: "risk", direction: -1, whenValue: "stable" },
      { claimKey: "risk", direction: 1, whenValue: "startup" },
    ],
  },
  {
    id: "w.budget", version: 1, category: "money_work", sensitivity: "medium", comparable: false, format: "scale",
    prompt: { en: "\"I usually know where my money went this month.\"", vi: "\"Tôi thường biết tiền của mình tháng này đã tiêu vào đâu.\"" },
    scale: agree5, signals: scaleSignals("saving"),
  },
  {
    id: "w.meaning", version: 1, category: "money_work", sensitivity: "low", comparable: false, format: "short",
    prompt: { en: "What part of your work (or study) feels most meaningful?", vi: "Phần nào trong công việc (hoặc việc học) khiến bạn thấy ý nghĩa nhất?" },
  },
  // --- past --------------------------------------------------------------
  {
    id: "past.childhood_memory", version: 1, category: "past", sensitivity: "medium", comparable: false, format: "free",
    prompt: { en: "Describe a small, happy memory from childhood.", vi: "Hãy kể một kỷ niệm nhỏ mà vui từ thời thơ ấu." },
  },
  {
    id: "past.turning_point", version: 1, category: "past", sensitivity: "high", comparable: false, format: "free",
    prompt: { en: "Was there a moment that changed the direction of your life?", vi: "Có khoảnh khắc nào đã thay đổi hướng đi cuộc đời bạn không?" },
  },
  {
    id: "past.lesson", version: 1, category: "past", sensitivity: "medium", comparable: false, format: "short",
    prompt: { en: "What is a lesson you learned the hard way?", vi: "Bài học nào bạn đã phải trả giá mới học được?" },
  },
  // --- future ------------------------------------------------------------
  {
    id: "fut.five_years", version: 1, category: "future", sensitivity: "low", comparable: false, format: "free",
    prompt: { en: "What would you like your life to look like in five years?", vi: "Bạn muốn cuộc sống của mình như thế nào sau năm năm nữa?" },
  },
  {
    id: "fut.one_thing", version: 1, category: "future", sensitivity: "low", comparable: false, format: "short",
    prompt: { en: "One thing you want to do before the end of this year?", vi: "Một điều bạn muốn làm trước khi hết năm nay?" },
  },
  {
    id: "fut.where_live", version: 1, category: "future", sensitivity: "low", comparable: true, format: "single",
    prompt: { en: "Where would you most like to live someday?", vi: "Sau này bạn muốn sống ở đâu nhất?" },
    options: [
      opt("big_city", "A big city", "Thành phố lớn"),
      opt("small_town", "A small town", "Thị trấn nhỏ"),
      opt("countryside", "The countryside", "Vùng quê"),
      opt("abroad", "Abroad", "Nước ngoài"),
      opt("hometown", "My hometown", "Quê nhà"),
    ],
    signals: [{ claimKey: "novelty", direction: 1, whenValue: "abroad" }],
  },
  // --- change ------------------------------------------------------------
  {
    id: "c.changed_mind", version: 1, category: "change", sensitivity: "low", comparable: false, format: "single",
    prompt: { en: "Have you changed your mind about something important recently?", vi: "Gần đây bạn có thay đổi suy nghĩ về điều gì quan trọng không?" },
    options: [opt("yes", "Yes", "Có"), opt("no", "No", "Không"), opt("unsure", "Not sure", "Không chắc")],
    followUps: [{ whenValue: "yes", questionId: "c.changed_mind_what" }],
  },
  {
    id: "c.changed_mind_what", version: 1, category: "change", sensitivity: "medium", comparable: false, followUpOnly: true, format: "free",
    prompt: { en: "What changed, and what made you see it differently?", vi: "Điều gì đã thay đổi, và điều gì khiến bạn nhìn nhận khác đi?" },
  },
  {
    id: "c.mood_week", version: 1, category: "change", sensitivity: "low", comparable: false, format: "scale",
    prompt: { en: "How was this week for you overall?", vi: "Nhìn chung tuần này của bạn thế nào?" },
    scale: {
      min: 1, max: 5,
      minLabel: { en: "1 = Very hard", vi: "1 = Rất khó khăn" },
      maxLabel: { en: "5 = Very good", vi: "5 = Rất tốt" },
    },
  },
  {
    id: "c.habit", version: 1, category: "change", sensitivity: "low", comparable: false, format: "short",
    prompt: { en: "A habit you've started or stopped recently?", vi: "Một thói quen bạn vừa bắt đầu hoặc vừa bỏ gần đây?" },
  },
];

export const QUESTION_CATEGORIES: { id: QuestionCategory; label: I18nText }[] = [
  { id: "personality", label: { en: "Personality", vi: "Tính cách", ja: "性格" } },
  { id: "values", label: { en: "Values", vi: "Giá trị sống", ja: "価値観" } },
  { id: "relationships", label: { en: "Relationships", vi: "Các mối quan hệ", ja: "人間関係" } },
  { id: "food", label: { en: "Food", vi: "Ăn uống", ja: "食べもの" } },
  { id: "travel", label: { en: "Travel", vi: "Du lịch", ja: "旅行" } },
  { id: "music", label: { en: "Music", vi: "Âm nhạc", ja: "音楽" } },
  { id: "hobbies", label: { en: "Hobbies", vi: "Sở thích", ja: "趣味" } },
  { id: "money_work", label: { en: "Money & work", vi: "Tiền bạc & công việc", ja: "お金と仕事" } },
  { id: "past", label: { en: "The past", vi: "Quá khứ", ja: "過去" } },
  { id: "future", label: { en: "The future", vi: "Tương lai", ja: "未来" } },
  { id: "change", label: { en: "Change", vi: "Sự thay đổi", ja: "変化" } },
];
