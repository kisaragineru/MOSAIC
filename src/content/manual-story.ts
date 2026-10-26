/**
 * "Your story": the last chapter of the manual, told like a light novel — third person, short
 * episodes, the user's own words quoted as they wrote them. Every sentence comes from something
 * the user answered or recorded (or from their Tử Vi chart); nothing is invented about them.
 */
import type { I18nText } from "./questions";

type Line = (name: string, a: string) => I18nText;

/** Story questions and how their answer enters the story. */
export const STORY_LINES: Record<string, { episode: "childhood" | "path" | "future"; line: Line }> = {
  "s.child_dream": { episode: "childhood", line: (n, a) => ({ ja: `子どもの頃の${n}は、「${a}」を夢見ていた。`, en: `As a child, ${n} dreamed of “${a}”.`, vi: `Thuở nhỏ, ${n} từng mơ về “${a}”.` }) },
  "past.childhood_memory": { episode: "childhood", line: (n, a) => ({ ja: `${n}には、今でもときどき思い出す光景がある。「${a}」`, en: `There's a scene ${n} still goes back to: “${a}”`, vi: `Có một khung cảnh ${n} vẫn hay nhớ lại: “${a}”` }) },
  "s.shaped_by": { episode: "childhood", line: (n, a) => ({ ja: `${n}という人をつくったもののひとつは、「${a}」だった。`, en: `One of the things that made ${n} who they are was “${a}”.`, vi: `Một trong những điều tạo nên con người ${n} là “${a}”.` }) },
  "past.turning_point": { episode: "path", line: (n, a) => ({ ja: `そして、転機が訪れる。「${a}」`, en: `Then a turning point came: “${a}”`, vi: `Rồi một bước ngoặt đến: “${a}”` }) },
  "s.hard_time": { episode: "path", line: (n, a) => ({ ja: `つらい時期もあった。「${a}」——それでも${n}は、ここまで歩いてきた。`, en: `There were hard times too: “${a}” — and still ${n} kept walking.`, vi: `Cũng có những lúc khó khăn: “${a}” — vậy mà ${n} vẫn bước tiếp.` }) },
  "past.lesson": { episode: "path", line: (n, a) => ({ ja: `その日々から、${n}はひとつのことを学んだ。「${a}」`, en: `From those days, ${n} learned one thing: “${a}”`, vi: `Từ những ngày ấy, ${n} học được một điều: “${a}”` }) },
  "s.proud_recent": { episode: "path", line: (n, a) => ({ ja: `最近、${n}は小さな誇りを手にした。「${a}」`, en: `Not long ago, ${n} earned a small pride: “${a}”`, vi: `Gần đây, ${n} có được một niềm tự hào nhỏ: “${a}”` }) },
  "s.changed_year": { episode: "path", line: (n, a) => ({ ja: `この一年で、${n}の中で何かが変わった。「${a}」`, en: `Something in ${n} changed this past year: “${a}”`, vi: `Trong năm qua, có điều gì đó trong ${n} đã đổi khác: “${a}”` }) },
  "s.bucket": { episode: "future", line: (n, a) => ({ ja: `${n}には、いつか叶えたいことがある。「${a}」`, en: `There's something ${n} wants to do someday: “${a}”`, vi: `${n} có một điều muốn làm vào một ngày nào đó: “${a}”` }) },
  "fut.one_thing": { episode: "future", line: (n, a) => ({ ja: `今年のうちに、${n}にはやってみたいことがある。「${a}」`, en: `Before the year is out, ${n} wants to do one thing: “${a}”.`, vi: `Trước khi năm nay khép lại, ${n} muốn làm một điều: “${a}”.` }) },
  "fut.five_years": { episode: "future", line: (n, a) => ({ ja: `五年後の自分を思い描くと——「${a}」`, en: `Picturing five years from now: “${a}”`, vi: `Hình dung năm năm nữa: “${a}”` }) },
  "s.ten_years": { episode: "future", line: (n, a) => ({ ja: `十年後は「${a}」でいたい、と${n}は答えた。`, en: `In ten years, ${n} hopes for “${a}”.`, vi: `Mười năm nữa, ${n} mong là “${a}”.` }) },
  "fut.where_live": { episode: "future", line: (n, a) => ({ ja: `暮らしてみたい場所は、「${a}」。`, en: `Where ${n} would like to live: “${a}”.`, vi: `Nơi ${n} muốn sống: “${a}”.` }) },
};

/** How a record of each kind is introduced. */
export const RECORD_KIND: Record<string, I18nText> = {
  achievement: { ja: "ひとつの到達点", en: "a milestone", vi: "một cột mốc" },
  decision: { ja: "ひとつの決断", en: "a decision", vi: "một quyết định" },
  memory: { ja: "忘れられない記憶", en: "a memory that stayed", vi: "một kỷ niệm khó quên" },
  regret: { ja: "胸に残る後悔", en: "a regret that lingered", vi: "một nỗi tiếc nuối còn đọng lại" },
  value: { ja: "大切にしたい信念", en: "a belief worth keeping", vi: "một niềm tin đáng giữ" },
  goal: { ja: "目指したい場所", en: "somewhere to aim for", vi: "một nơi muốn hướng tới" },
  dream: { ja: "胸に抱いた夢", en: "a dream held close", vi: "một giấc mơ ấp ủ" },
};

export const STORY = {
  title: (name: string): I18nText => ({ ja: `『${name}の物語』`, en: `“The Story of ${name}”`, vi: `“Câu chuyện của ${name}”` }),
  subtitle: (persona: string): I18nText => ({ ja: `〜${persona}の、まだ途中の章〜`, en: `— ${persona}, a story still being written —`, vi: `— ${persona}, câu chuyện vẫn đang được viết —` }),
  subtitlePlain: { ja: "〜まだ途中の章〜", en: "— a story still being written —", vi: "— câu chuyện vẫn đang được viết —" } as I18nText,
  episodes: {
    prologue: { ja: "プロローグ", en: "Prologue", vi: "Mở đầu" },
    childhood: { ja: "第1話　夢を見ていた頃", en: "Episode 1 · When there were dreams", vi: "Tập 1 · Thuở còn mơ mộng" },
    path: { ja: "第2話　選んできた道", en: "Episode 2 · The road so far", vi: "Tập 2 · Con đường đã chọn" },
    now: { ja: "第3話　いまの", en: "Episode 3 · ", vi: "Tập 3 · " },
    future: { ja: "第4話　まだ見ぬ明日へ", en: "Episode 4 · Toward a tomorrow not yet seen", vi: "Tập 4 · Hướng về ngày mai chưa tới" },
    epilogue: { ja: "エピローグ", en: "Epilogue", vi: "Kết" },
  } as Record<"prologue" | "childhood" | "path" | "now" | "future" | "epilogue", I18nText>,
  nowTitle: (name: string): I18nText => ({ ja: `第3話　いまの${name}`, en: `Episode 3 · ${name}, now`, vi: `Tập 3 · ${name} của hiện tại` }),
  born: (name: string, year: string, napAm: string): I18nText => ({
    ja: `${year}の年、${name}は生まれた。古い暦によれば、その年の響きは「${napAm}」だったという。`,
    en: `In the year ${year}, ${name} was born. By the old calendar, the year rang with the element ${napAm}.`,
    vi: `Năm ${year}, ${name} chào đời. Theo lịch xưa, năm ấy mang âm hưởng ${napAm}.`,
  }),
  star: (persona: string): I18nText => ({
    ja: `命盤のまん中には「${persona}」が座っていた——昔の人なら、きっとそう言うだろう。`,
    en: `At the heart of the chart sat “${persona}” — or so the old masters would have said.`,
    vi: `Ở trung tâm lá số là “${persona}” — người xưa hẳn sẽ nói như vậy.`,
  }),
  bornUnknown: (name: string): I18nText => ({
    ja: `${name}がいつ、どこで生まれたのか。この物語は、まだそれを知らない。`,
    en: `When and where ${name} was born, this story does not yet know.`,
    vi: `${name} sinh ra khi nào, ở đâu — câu chuyện này vẫn chưa biết.`,
  }),
  record: (date: string, title: string, name: string, kind: string): I18nText => ({
    ja: `${date}。「${title}」——${name}にとって、それは${kind}だった。`,
    en: `${date}. “${title}” — for ${name}, that was ${kind}.`,
    vi: `${date}. “${title}” — với ${name}, đó là ${kind}.`,
  }),
  nowTraits: (name: string, poles: { ja: string; en: string; vi: string }[]): I18nText => ({
    ja: `いまの${name}は、${poles.map((p) => p.ja).join("。")}。`,
    en: `These days, ${name} ${listEn(poles.map((p) => p.en))}.`,
    vi: `${name} của hiện tại là người ${listVi(poles.map((p) => p.vi))}.`,
  }),
  nowCombo: (name: string, title: I18nText): I18nText => ({
    ja: `人は、そんな${name}を「${title.ja}」と呼ぶかもしれない。`,
    en: `People might call ${name} “${title.en}”.`,
    vi: `Người ta có lẽ sẽ gọi ${name} là “${title.vi}”.`,
  }),
  nowAsk: (ask: string): I18nText => ({
    ja: `もし身近な人にひとつだけ伝えるとしたら——${ask}`,
    en: `If there were one thing to tell the people close by: ${ask}`,
    vi: `Nếu chỉ được nói một điều với người thân cận: ${ask}`,
  }),
  nowPeers: (name: string, k: number): I18nText => ({
    ja: `${k}人が、${name}のことを言葉にしてくれた。自分では見えない背中を、誰かが見てくれている。`,
    en: `${k} ${k === 1 ? "person has" : "people have"} put ${name} into words. Someone is watching the back ${name} can't see.`,
    vi: `${k} người đã viết về ${name}. Có ai đó đang nhìn thấy phía sau lưng mà ${name} không tự thấy.`,
  }),
  nowCycle: (topic: string): I18nText => ({
    ja: `暦の上では、いまは「${topic}」がテーマの十年なのだという。`,
    en: `By the old calendar, this decade is about ${topic}.`,
    vi: `Theo lịch xưa, mười năm này xoay quanh ${topic}.`,
  }),
  nowUnknown: (name: string): I18nText => ({
    ja: `いまの${name}がどんな人なのか——物語は、まだその輪郭しか知らない。`,
    en: `Who ${name} is now — the story knows only the outline so far.`,
    vi: `${name} bây giờ là người thế nào — câu chuyện mới chỉ biết những đường nét.`,
  }),
  giftLine: (date: string | null, from: string, text: string): I18nText => ({
    ja: `${date ? `${date}。` : ""}${from}は、こう書き残している。「${text}」`,
    en: `${date ? `${date}. ` : ""}${from} wrote it down: “${text}”`,
    vi: `${date ? `${date}. ` : ""}${from} đã ghi lại: “${text}”`,
  }),
  letter: (date: string): I18nText => ({
    ja: `そして、${date}に開く手紙が一通、静かにその日を待っている。`,
    en: `And a letter waits quietly to be opened on ${date}.`,
    vi: `Và một lá thư đang lặng lẽ chờ ngày ${date} để được mở.`,
  }),
  epilogue: (name: string): I18nText => ({
    ja: `この物語は、まだ途中だ。${name}が答えるたび、記録するたびに、新しいページが書き足されていく。\n——つづく。`,
    en: `This story isn't finished. Every answer, every record ${name} adds writes a new page.\n— To be continued.`,
    vi: `Câu chuyện này chưa kết thúc. Mỗi câu trả lời, mỗi ghi chép của ${name} lại viết thêm một trang mới.\n— Còn tiếp.`,
  }),
  locked: {
    ja: "思い出や、うれしかったこと、決断したことを記録すると、ここに「第1話」が書きはじめられます。",
    en: "Record a memory, something you're proud of or a decision, and episode one will start here.",
    vi: "Ghi lại một kỷ niệm, điều bạn tự hào hay một quyết định, tập một sẽ bắt đầu ở đây.",
  } as I18nText,
  lockedButton: { ja: "記録を書く", en: "Write a record", vi: "Viết ghi chép" } as I18nText,
};

function listEn(xs: string[]) {
  return xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")}, and ${xs[xs.length - 1]}`;
}
function listVi(xs: string[]) {
  return xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} và ${xs[xs.length - 1]}`;
}
