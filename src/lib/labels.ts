/**
 * What a post is about, read from its own words (no AI, nothing leaves the server). Two groups:
 * everyday things (a passing word, the day, a memo, something funny, something liked or found),
 * light and never read as who you are; and getting to know yourself (a decision, an achievement,
 * a goal or dream, a regret, a feeling, a value, a memory or a thought), which the manual and the
 * reflections draw on. A post can be several. Clear wording is caught; subtle wording may be
 * missed, so the owner can confirm or correct it, and what they set is kept as theirs.
 */
export const DAILY_LABELS = ["note", "daily", "memo", "fun", "like"] as const;
export const SELF_LABELS = ["achievement", "decision", "goal", "dream", "regret", "feeling", "value", "memory", "thought"] as const;
export const LABELS = [...DAILY_LABELS, ...SELF_LABELS] as const;
export type Label = (typeof LABELS)[number];
type SelfLabel = (typeof SELF_LABELS)[number];
type DailyLabel = (typeof DAILY_LABELS)[number];

/** The post's kind (an older, single field): its first getting-to-know-yourself label, else a note. */
export function kindOf(labels: readonly string[]): string {
  return labels.find((l) => (SELF_LABELS as readonly string[]).includes(l)) ?? "note";
}

/** How someone felt, asked once after posting (optional). */
export const FEELINGS = ["happy", "calm", "grateful", "sad", "frustrated", "anxious"] as const;
export type Feeling = (typeof FEELINGS)[number];
export const FEELING_EMOJI: Record<Feeling, string> = { happy: "😊", calm: "😌", grateful: "🥰", sad: "😢", frustrated: "😤", anxious: "😰" };

const RULES: Record<SelfLabel, RegExp[]> = {
  achievement: [
    /(でき(た|ました)|達成|合格|完走|完成(した|させた)|成功|受賞|優勝|昇進|やり(きった|遂げた|とげた)|うまくいった|初めて.{0,12}(でき|成功))/,
    /\b(i |we )?(finally )?(did it|made it|finished|completed|passed|won|achieved|got promoted|succeeded)\b/i,
    /(đã làm được|hoàn thành|đậu|đỗ|thành công|chiến thắng|đạt được)/i,
  ],
  decision: [
    /(決め(た|ました|る)|決心|決断|することにした|ことにしました|やめることにした|選んだ|踏み切った)/,
    /\b(decided|i('ve| have)? chosen|made up my mind|i('m| am) going to|i will now)\b/i,
    /(quyết định|đã chọn|sẽ bắt đầu)/i,
  ],
  goal: [
    /(目標|までに.{0,20}(する|したい|終える)|を目指(す|して)|頑張る|がんばる|続けたい|習慣にしたい)/,
    /\b(my goal|aim to|by (next|the end of)|i want to (finish|learn|start|get))\b/i,
    /(mục tiêu|cố gắng|phấn đấu|trước khi hết năm)/i,
  ],
  dream: [/(いつか|夢|憧れ|一度でいいから|行ってみたい|してみたい|なりたい)/, /\b(someday|one day|i dream|my dream|i'd love to|bucket list)\b/i, /(ước mơ|một ngày nào đó|mơ ước|muốn thử)/i],
  regret: [
    /(後悔|ればよかった|べきだった|しなければよかった|心残り|悔やまれる|反省|申し訳なかった)/,
    /\b(regret|should have|shouldn't have|wish i had|i wish i'd|if only)\b/i,
    /(hối tiếc|hối hận|lẽ ra|giá mà)/i,
  ],
  feeling: [
    /(嬉し|うれし|楽し|悲し|かなし|寂し|さみし|不安|怖|こわ|腹が立|イライラ|もやもや|モヤモヤ|ほっと|幸せ|しあわせ|つら|辛い|泣|感動|落ち込|ワクワク|わくわく|疲れ|ありがた|感謝)/,
    /\b(happy|sad|lonely|anxious|afraid|angry|upset|grateful|thankful|relieved|excited|tired|frustrated|moved|cried)\b/i,
    /(vui|buồn|cô đơn|lo lắng|sợ|tức giận|hạnh phúc|biết ơn|nhẹ nhõm|mệt|xúc động)/i,
  ],
  value: [
    /(大切にしたい|大事にしたい|大切だと思|大事だと思|ポリシー|信念|譲れない|生き方|価値観|一番大事|いちばん大事)/,
    /\b(matters most|what matters|i believe|i value|important to me|my principle)\b/i,
    /(quan trọng nhất|điều quan trọng|tôi tin rằng|giá trị sống|trân trọng)/i,
  ],
  memory: [
    /(行った|行ってきた|見た|食べた|会った|遊んだ|旅行|思い出|あの頃|昔|子どもの頃|子供の頃|久しぶりに|出かけた)/,
    /\b(went to|visited|we had|remember when|back then|years ago|trip to|met up)\b/i,
    /(đã đi|đã gặp|kỷ niệm|hồi nhỏ|ngày xưa|chuyến đi)/i,
  ],
  thought: [/(と思う|と思った|気がする|考えた|考えている|かもしれない|だろうか|なのかな)/, /\b(i think|i wonder|maybe|it seems|i realized|i've been thinking)\b/i, /(tôi nghĩ|có lẽ|tự hỏi|nhận ra)/i],
};

const DAILY_RULES: Record<Exclude<DailyLabel, "note">, RegExp[]> = {
  like: [
    /(好き|お気に入り|ハマって|はまって|推し|見つけた|発見|気に入った|美味しかった|おいしかった|最高だった)/,
    /\b(i love|i really like|my favou?rite|obsessed with|found (a|this|the)|discovered|so good)\b/i,
    /(yêu thích|mê|phát hiện|tìm thấy|ngon quá|thích lắm)/i,
  ],
  memo: [
    /(メモ|覚えておく|忘れないように|忘れないうちに|買うもの|買い物リスト|やること|TODO|ToDo|todo|アイデア|ネタ帳)/,
    /\b(note to self|memo|to-?do|remember to|shopping list|idea:)\b/i,
    /(ghi chú|ghi nhớ|nhớ mua|danh sách|ý tưởng)/i,
  ],
  fun: [
    /(笑った|笑える|笑い|\(笑\)|ウケた|ウケる|爆笑|面白|おもしろ|(^|[^a-z])w{2,}($|[^a-z.]))/i,
    /\b(lol|lmao|haha+|so funny|hilarious|cracked me up)\b/i,
    /(buồn cười|hài quá|haha)/i,
  ],
  daily: [
    /(今日は|きょうは|朝ごはん|昼ごはん|晩ごはん|夜ごはん|夕飯|お昼|ランチ|仕事帰り|散歩|天気|雨|晴れ|寝坊|早起き)/,
    /\b(today|this morning|tonight|breakfast|lunch|dinner|weather|commute|overslept)\b/i,
    /(hôm nay|bữa sáng|bữa trưa|bữa tối|thời tiết|đi dạo|ngủ dậy)/i,
  ],
};

/**
 * The labels a text reads as, most telling first (a photo of an outing counts as a memory).
 * Getting-to-know-yourself labels come first; a liked or found thing is added beside them; the
 * other everyday labels only when nothing deeper was read; and anything left is a passing word.
 */
export function inferLabels(text: string, opts: { hasMedia?: boolean } = {}): Label[] {
  const t = text.normalize("NFKC");
  let self: SelfLabel[] = SELF_LABELS.filter((l) => RULES[l].some((re) => re.test(t)));
  if (opts.hasMedia && !self.includes("memory") && !self.some((l) => l === "goal" || l === "dream")) self.push("memory");
  // A plain "I think" adds little next to a sharper label.
  if (self.length > 1) self = self.filter((l) => l !== "thought");
  const reads = (l: Exclude<DailyLabel, "note">) => DAILY_RULES[l].some((re) => re.test(t));
  const daily: DailyLabel[] = [];
  if (reads("like")) daily.push("like");
  if (!self.length) for (const l of ["memo", "fun", "daily"] as const) if (reads(l)) daily.push(l);
  const found: Label[] = [...self, ...daily];
  if (!found.length && t.trim()) found.push("note");
  return found;
}
