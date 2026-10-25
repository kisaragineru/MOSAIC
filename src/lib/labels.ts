/**
 * What a post is about, read from its own words (no AI, nothing leaves the server): a decision,
 * an achievement, a goal or dream, a regret, a feeling, a value, a memory or a thought. A post
 * can be several; none is fine (a plain note). Clear wording is caught; subtle wording may be
 * missed, so the owner can confirm or correct it, and what they set is kept as theirs.
 */
export const LABELS = ["achievement", "decision", "goal", "dream", "regret", "feeling", "value", "memory", "thought"] as const;
export type Label = (typeof LABELS)[number];

/** How someone felt, asked once after posting (optional). */
export const FEELINGS = ["happy", "calm", "grateful", "sad", "frustrated", "anxious"] as const;
export type Feeling = (typeof FEELINGS)[number];
export const FEELING_EMOJI: Record<Feeling, string> = { happy: "😊", calm: "😌", grateful: "🥰", sad: "😢", frustrated: "😤", anxious: "😰" };

const RULES: Record<Label, RegExp[]> = {
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

/** The labels a text reads as, most telling first (a photo of an outing counts as a memory). */
export function inferLabels(text: string, opts: { hasMedia?: boolean } = {}): Label[] {
  const t = text.normalize("NFKC");
  const found = LABELS.filter((l) => RULES[l].some((re) => re.test(t)));
  if (opts.hasMedia && !found.includes("memory") && !found.some((l) => l === "goal" || l === "dream")) found.push("memory");
  // A plain "I think" adds little next to a sharper label.
  return found.length > 1 ? found.filter((l) => l !== "thought") : found;
}
