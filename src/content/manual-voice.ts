/**
 * MOSAIC's own voice in the manual: third-person sentences that turn what someone answered into a
 * short portrait instead of quoting it back. Each sentence takes one fact (a tendency, a choice,
 * the Tử Vi type, an answer) and says what it suggests; nothing is invented about the person.
 */
import type { I18nText } from "./questions";

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const listEn = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);
const listVi = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} và ${xs.at(-1)}`);

type Like = (n: string, value: string, label: I18nText) => I18nText | null;

/** A sentence for some "things you love" answers: what the choice says about how they like to live. */
export const LIKE_LINES: Record<string, Like> = {
  "l.place_relax": (n, v, a) => ({
    ja: `${n}さんがいちばんくつろげるのは${a.ja}。${v === "home" ? "自分の場所で、気をつかわずに過ごす時間が力になるようです。" : v === "cafe" || v === "city" ? "人の気配がほどよくある場所で、ほっとできる人のようです。" : "自然の広がりの中で、心がほどけていく人のようです。"}`,
    en: `${n} relaxes best ${lower(a.en)} — ${v === "home" ? "time in their own space, with nothing to keep up, is what recharges them." : v === "cafe" || v === "city" ? "somewhere with a gentle hum of people around." : "open nature is where they unwind."}`,
    vi: `${n} thư giãn tốt nhất ${lower(a.vi)} — ${v === "home" ? "khoảng thời gian trong không gian riêng, không phải giữ ý, giúp họ hồi sức." : v === "cafe" || v === "city" ? "một nơi có chút nhộn nhịp vừa đủ." : "giữa thiên nhiên rộng mở là nơi họ được thả lỏng."}`,
  }),
  "l.season": (n, _v, a) => ({ ja: `好きな季節は${a.ja}。`, en: `${n}'s favourite season is ${lower(a.en)}.`, vi: `Mùa ${n} thích nhất là ${lower(a.vi)}.` }),
  "l.weekend_morning": (n, v, a) => ({
    ja: `週末の朝は「${a.ja}」が理想。${v === "sleep" || v === "coffee" ? "ゆっくり始まる一日を大切にしています。" : "朝から動き出すと気分がいいタイプです。"}`,
    en: `${n}'s ideal weekend morning: ${lower(a.en)}. ${v === "sleep" || v === "coffee" ? "A slow start matters to them." : "Getting going early puts them in a good mood."}`,
    vi: `Sáng cuối tuần lý tưởng của ${n}: ${lower(a.vi)}. ${v === "sleep" || v === "coffee" ? "Một khởi đầu thong thả rất quan trọng với họ." : "Bắt đầu sớm khiến họ thấy vui."}`,
  }),
  "l.gift_receive": (n, _v, a) => ({ ja: `いちばんうれしい贈り物は「${a.ja}」。`, en: `The gift that makes ${n} happiest: ${lower(a.en)}.`, vi: `Món quà làm ${n} vui nhất: ${lower(a.vi)}.` }),
  "l.coffee_tea": (n, v, a) => (v === "neither" ? null : { ja: `飲みものは${a.ja}派。`, en: `${n} is a ${v === "both" ? "coffee-and-tea" : lower(a.en)} person.`, vi: `${n} thuộc phe ${lower(a.vi)}.` }),
  "l.travel_style": (n, _v, a) => ({ ja: `旅でいちばんの楽しみは${a.ja}。`, en: `On a trip, ${n} most enjoys ${lower(a.en)}.`, vi: `Khi đi du lịch, ${n} thích nhất ${lower(a.vi)}.` }),
  "l.interior": (n, _v, a) => ({ ja: `理想の部屋は「${a.ja}」。暮らしの心地よさにも、その人らしさが出ています。`, en: `${n}'s ideal room: ${lower(a.en)}.`, vi: `Căn phòng lý tưởng của ${n}: ${lower(a.vi)}.` }),
  "l.things": (n, v, _a) => ({
    ja: v === "few" ? `モノは少なく持つ派。身軽さを大事にしています。` : v === "collect" ? `好きなものは集めたくなる派。` : `モノとはほどほどの距離で付き合っています。`,
    en: v === "few" ? `${n} keeps few things and likes travelling light.` : v === "collect" ? `${n} collects the things they love.` : `${n} keeps a middle way with things.`,
    vi: v === "few" ? `${n} giữ ít đồ và thích sự gọn nhẹ.` : v === "collect" ? `${n} thích sưu tầm những thứ mình yêu.` : `${n} giữ khoảng cách vừa phải với đồ đạc.`,
  }),
  "l.music_listen": (n, v, a) => (v === "rarely" ? null : { ja: `音楽は「${a.ja}」がいちばん。`, en: `Music, for ${n}: ${lower(a.en)}.`, vi: `Âm nhạc với ${n}: ${lower(a.vi)}.` }),
  "l.reading": (n, v, _a) => (v === "rarely" ? null : { ja: v === "often" ? "本は毎週のように読む読書家です。" : "本もときどき手に取ります。", en: v === "often" ? `${n} reads every week.` : `${n} picks up a book now and then.`, vi: v === "often" ? `${n} đọc sách mỗi tuần.` : `${n} thỉnh thoảng đọc sách.` }),
  "l.sweets": (n, v, _a) => (v === "love" ? { ja: "甘いものには目がありません。", en: `${n} has a sweet tooth.`, vi: `${n} rất mê đồ ngọt.` } : null),
  "h.pets": (n, v, a) => (v === "neither" ? null : { ja: `${a.ja}が好き。`, en: `${n} is a ${v === "both" ? "cat-and-dog" : lower(a.en).replace(/s$/, "")} person.`, vi: `${n} thích ${lower(a.vi)}.` }),
};

/** How someone decides big things (the guide's question), said in a full sentence. */
const DECIDE: Record<string, (n: string) => I18nText> = {
  facts: (n) => ({ ja: `大事なことを決めるときは、事実を集めて比べてから選ぶ人です。`, en: `For big choices, ${n} gathers the facts and compares before choosing.`, vi: `Với những lựa chọn lớn, ${n} thu thập dữ kiện và so sánh trước khi quyết.` }),
  gut: (n) => ({ ja: `大事なことを決めるときは、最後は自分の直感を信じる人です。`, en: `For big choices, ${n} trusts their own gut in the end.`, vi: `Với những lựa chọn lớn, cuối cùng ${n} tin vào trực giác của mình.` }),
  people: (n) => ({ ja: `大事なことを決めるときは、信頼する人の声に耳を傾ける人です。`, en: `For big choices, ${n} listens to the people they trust.`, vi: `Với những lựa chọn lớn, ${n} lắng nghe những người mình tin.` }),
};

export const VOICE = {
  traits: (n: string, poles: I18nText[]): I18nText => {
    const [a, b, c] = poles;
    return {
      ja: [a && `${n}さんは、${a.ja}人です。`, b && `そのうえで、${b.ja}ところもあります。`, c && `どちらかといえば、${c.ja}ほうでもあります。`].filter(Boolean).join(""),
      en: [a && `${n} is someone who ${a.en}.`, b && `${n} also ${b.en}.`, c && `And, if anything, ${n} ${c.en}.`].filter(Boolean).join(" "),
      vi: [a && `${n} là người ${a.vi}.`, b && `${n} cũng ${b.vi}.`, c && `Nếu nói thêm, ${n} ${c.vi}.`].filter(Boolean).join(" "),
    };
  },
  combo: (n: string, title: I18nText): I18nText => ({ ja: `その組み合わせから見えてくるのは、「${title.ja}」という一面です。`, en: `Put together, ${n} comes across as “${title.en}”.`, vi: `Gộp lại, ${n} hiện lên như “${title.vi}”.` }),
  decide: (n: string, value: string): I18nText | null => DECIDE[value]?.(n) ?? null,
  tuvi: (n: string, persona: string, keywords: string[]): I18nText => ({
    ja: `生まれた日の命盤では「${persona}」。${keywords.length ? `${keywords.join("、")}が持ち味とされます。` : ""}答えから見えた姿と重ねて読むと、${n}さんらしさがより立体的に見えてきます。`,
    en: `By the birth chart, ${n} is “${persona}”${keywords.length ? ` — known for ${listEn(keywords)}` : ""}. Read alongside the answers, it rounds out the picture.`,
    vi: `Theo lá số, ${n} là “${persona}”${keywords.length ? ` — nổi bật ở ${listVi(keywords)}` : ""}. Đọc cùng các câu trả lời, bức chân dung trở nên trọn vẹn hơn.`,
  }),
  goal: (n: string, a: string): I18nText => ({
    ja: `そして今年は、「${a}」をやってみたいと考えています。応援したいことがひとつ見つかりました。`,
    en: `And this year, ${n} wants to make this happen: “${a}”. Something to cheer them on with.`,
    vi: `Và năm nay, ${n} muốn thực hiện điều này: “${a}”. Một điều để cổ vũ họ.`,
  }),
  ask: (ask: string): I18nText => ({ ja: `身近な人へ、本人からのひとこと——${ask}`, en: `A word for the people close by: ${ask}`, vi: `Một lời gửi người thân cận: ${ask}` }),
  likesIntro: (n: string): I18nText => ({ ja: `${n}さんが心地よく過ごせるのは、こんなときです。`, en: `This is what makes ${n} feel at home.`, vi: `Đây là những điều khiến ${n} thấy dễ chịu.` }),
  favourites: (n: string, xs: string[]): I18nText => ({ ja: `好きなものとして、${xs.join("、")}を挙げています。`, en: `${n} lists ${listEn(xs)} among the things they love.`, vi: `${n} kể ${listVi(xs)} trong số những điều mình yêu thích.` }),
  hint: (idea: I18nText): I18nText => ({ ja: `贈り物や一緒に過ごす時間なら、${idea.ja}が喜ばれそうです。`, en: `For a gift or time together: ${lower(idea.en)} would likely go down well.`, vi: `Nếu tặng quà hay dành thời gian bên nhau: ${lower(idea.vi)} có lẽ sẽ được đón nhận.` }),
  likesList: { ja: "答えの一覧", en: "All your answers", vi: "Tất cả câu trả lời" } as I18nText,
  bioLead: (n: string): I18nText => ({ ja: `${n}さんは、大切な人に向けてこう書いています。`, en: `In ${n}'s own words, for the people who matter:`, vi: `Bằng lời của chính ${n}, gửi những người quan trọng:` }),
  thin: { ja: "答えが増えるほど、この人物像はくっきりしていきます。", en: "The more you answer, the sharper this portrait becomes.", vi: "Bạn càng trả lời nhiều, bức chân dung này càng rõ nét." } as I18nText,
};
