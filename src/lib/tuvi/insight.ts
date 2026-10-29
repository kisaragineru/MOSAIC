/**
 * Content for interp-4: the reading made personal and concrete, on top of interpret.ts.
 *
 * - STAR_LIFE: how each main star tends to show in everyday life, one small thing to try and a
 *   question to look back with (used for the Mệnh palace, "you at your core").
 * - PAIRS: the 24 pairs of main stars that can share a palace, read as a combination (each star's
 *   own meaning is still shown on its own).
 * - PALACE_OPTIONS: for each palace a 10-year period falls in, ways people of different ages tend
 *   to meet that palace's theme. This is MOSAIC's own guide on top of the traditional theme, never a
 *   Tử Vi rule: the period's ages and palace come from the engine and are not changed by it.
 *
 * Same register as interpret.ts: traditional associations and possibilities, never events,
 * verdicts or instructions; nothing assumes the reader's health, family or money.
 */
import type { MainStarId, PalaceId } from "./stars";

type T = { en: string; vi: string; ja: string };
type TL = { en: string[]; vi: string[]; ja: string[] };

export const STAR_LIFE: Record<MainStarId, { everyday: T; tryThis: T; ask: T }> = {
  tu_vi: {
    everyday: {
      ja: "集まりや話し合いで、気づけば全体を見渡して「じゃあ、こうしよう」とまとめる側に回っている――そんな場面に、この星の性質が表れやすいと読めます。任された役目は最後まで責任を持とうとする一方、雑に扱われると深く傷つくこともあるでしょう。",
      en: "In a group or a meeting, you may find yourself taking in the whole picture and being the one who says “let's do it this way” — that is where this star's nature tends to show. You may want to carry a role you're trusted with to the end, and feel it keenly when you're treated carelessly.",
      vi: "Trong một nhóm hay buổi bàn bạc, có khi bạn nhận ra mình đang nhìn toàn cục và là người nói “vậy mình làm thế này nhé” — tính chất của sao này thường hiện ra ở những lúc như vậy. Bạn muốn gánh vác đến cùng vai trò được giao, và cũng dễ tổn thương khi bị đối xử qua loa.",
    },
    tryThis: {
      ja: "大事なことを一人で抱えず、ひとつだけ誰かに任せてみる。任せた相手のやり方を、口を出さずに見守ってみる。",
      en: "Hand one important thing to someone else instead of carrying it all — and watch how they do it without stepping in.",
      vi: "Thử giao một việc quan trọng cho người khác thay vì tự gánh hết — và quan sát cách họ làm mà không can thiệp.",
    },
    ask: {
      ja: "これまでに「任されてうれしかった」役目は何でしたか？ そのとき、どんな力を発揮できましたか？",
      en: "Which role were you glad to be trusted with? What did you bring to it?",
      vi: "Vai trò nào bạn từng vui khi được giao? Khi ấy bạn đã phát huy được điều gì?",
    },
  },
  thien_co: {
    everyday: {
      ja: "こみ入った問題を前にすると、原因を整理し、いくつかの選択肢を並べて比べる――そんな場面で、この星の頭の回転が表れやすいと読めます。旅行や行事の段取り、仕組みの改善など、「どうすればもっとうまくいくか」を考えることが自然と楽しい人も多いでしょう。",
      en: "Faced with a tangled problem, you may sort out the causes, lay out a few options and compare them — that is where this star's quick mind tends to show. Planning a trip or an event, or improving how something works, may feel naturally enjoyable: “how could this go better?”",
      vi: "Trước một vấn đề rối rắm, bạn có thể gỡ ra nguyên nhân, bày vài phương án và so sánh — đó là lúc trí óc nhanh nhạy của sao này dễ bộc lộ. Lên kế hoạch cho chuyến đi, sự kiện, hay cải tiến cách làm — nghĩ “làm sao cho tốt hơn” có lẽ tự nhiên khiến bạn thấy vui.",
    },
    tryThis: {
      ja: "迷ったら、選択肢を3つまで書き出し、期限を決めて1つ選ぶ。選ばなかった道は、いったん手放してみる。",
      en: "When torn, write down up to three options, set a deadline and choose one. Let the others go for now.",
      vi: "Khi phân vân, hãy viết ra tối đa ba phương án, đặt hạn và chọn một. Tạm buông những lựa chọn còn lại.",
    },
    ask: {
      ja: "考え抜いた計画や工夫がうまくいった経験はありますか？ 反対に、考えすぎて動けなかったことは？",
      en: "When did a well-thought-out plan or idea of yours work out? And when did thinking too much hold you back?",
      vi: "Đã có lần nào kế hoạch hay ý tưởng bạn nghĩ kỹ thành công? Và có lúc nào nghĩ quá nhiều khiến bạn chần chừ?",
    },
  },
  thai_duong: {
    everyday: {
      ja: "困っている人がいると放っておけず、頼まれる前に動いている――そんな場面に、この星が表れやすいと読めます。人を支える、知っていることを教える、人と人をつなぐといった役割で、まわりを明るくする人も多いでしょう。",
      en: "You may find you can't leave someone struggling alone, and act before you're asked — that is where this star tends to show. Many with it light up those around them by supporting people, teaching what they know, or bringing people together.",
      vi: "Thấy ai gặp khó, bạn khó lòng làm ngơ và hành động trước khi được nhờ — sao này thường hiện ra ở những lúc như thế. Nhiều người có sao này làm sáng bầu không khí bằng cách nâng đỡ người khác, chỉ dạy điều mình biết, hay kết nối mọi người với nhau.",
    },
    tryThis: {
      ja: "一週間に一度、自分のためだけの時間を予定に入れてみる。人に向けるのと同じ温かさを、自分にも。",
      en: "Once a week, put time just for yourself in your calendar — the warmth you give others, turned toward yourself.",
      vi: "Mỗi tuần một lần, dành ra khoảng thời gian chỉ cho riêng mình — sự ấm áp bạn dành cho người khác, hãy dành cả cho bản thân.",
    },
    ask: {
      ja: "誰かの役に立てて、心から満たされたのはどんなときでしたか？",
      en: "When did helping someone leave you truly fulfilled?",
      vi: "Khi nào việc giúp đỡ ai đó khiến bạn thật sự mãn nguyện?",
    },
  },
  vu_khuc: {
    everyday: {
      ja: "話し合いが長引くと「で、どうする？」と結論を出したくなる。お金や時間の使い方を数字で考えると落ち着く――そんな場面に、この星が表れやすいと読めます。気持ちは言葉より、手伝う・用意するといった行動で示すことが多いかもしれません。",
      en: "When a discussion drags on, you may want to ask “so, what do we do?”, and thinking about money or time in numbers may calm you — that is where this star tends to show. You may show care more through actions, like helping out or getting things ready, than through words.",
      vi: "Khi cuộc bàn bạc kéo dài, bạn dễ muốn hỏi “vậy giờ làm sao?”, và nghĩ về tiền bạc hay thời gian bằng con số giúp bạn yên tâm — sao này thường hiện ra ở những lúc như thế. Bạn có lẽ thể hiện sự quan tâm qua hành động, như phụ một tay hay chuẩn bị sẵn, nhiều hơn qua lời nói.",
    },
    tryThis: {
      ja: "行動で示している気持ちを、ひと言だけ言葉にしてみる。「ありがとう」「心配してたよ」など、短くて大丈夫です。",
      en: "Put into words, just once, a feeling you usually show through action — “thank you” or “I was worried about you” is enough.",
      vi: "Thử nói thành lời một cảm xúc bạn thường thể hiện bằng hành động — chỉ cần “cảm ơn” hay “mình lo cho bạn” là đủ.",
    },
    ask: {
      ja: "決めて動いたことで、状況が良くなった経験を思い出せますか？",
      en: "Can you recall a time when deciding and acting made things better?",
      vi: "Bạn có nhớ lần nào nhờ quyết đoán hành động mà tình hình tốt lên?",
    },
  },
  thien_dong: {
    everyday: {
      ja: "ぎくしゃくした場で冗談を言って空気をほぐす、おいしいものや心地よい時間を人と分かち合う――そんな場面に、この星が表れやすいと読めます。急かされるより、自分のペースで進めるほうが力の出る人も多いでしょう。",
      en: "Easing a tense moment with a joke, sharing good food or a pleasant time with others — that is where this star tends to show. Many with it do better at their own pace than when rushed.",
      vi: "Pha trò để làm dịu không khí căng thẳng, chia sẻ món ngon hay khoảng thời gian dễ chịu với người khác — sao này thường hiện ra ở những lúc như thế. Nhiều người có sao này làm tốt hơn khi được theo nhịp của mình thay vì bị hối thúc.",
    },
    tryThis: {
      ja: "後回しにしている小さなことを一つ選んで、今日5分だけ手をつけてみる。",
      en: "Pick one small thing you've been putting off and give it five minutes today.",
      vi: "Chọn một việc nhỏ bạn đang trì hoãn và dành cho nó năm phút ngay hôm nay.",
    },
    ask: {
      ja: "あなたがいたことで、場の空気がやわらいだ場面はありますか？",
      en: "Was there a moment when your being there softened the mood?",
      vi: "Có lúc nào sự có mặt của bạn làm bầu không khí dịu lại không?",
    },
  },
  liem_trinh: {
    everyday: {
      ja: "「それは筋が違う」と感じると黙っていられない、いったん引き受けたことはやり遂げる――そんな場面に、この星が表れやすいと読めます。好きなことには驚くほどの集中力を注ぐ一方、納得できないことには気持ちが動きにくいかもしれません。",
      en: "When something feels wrong in principle you may not stay quiet, and once you take something on you see it through — that is where this star tends to show. You may pour remarkable focus into what you love, and find it hard to engage with what you don't accept.",
      vi: "Khi thấy điều gì trái lẽ, bạn khó im lặng; đã nhận việc thì làm đến nơi đến chốn — sao này thường hiện ra ở những lúc như thế. Bạn có thể dồn sự tập trung đáng kinh ngạc vào điều mình yêu thích, nhưng khó bắt tay vào điều mình chưa thấy thuận.",
    },
    tryThis: {
      ja: "自分のルールを一つ書き出して、「人にも当てはめたいものか、自分だけのものか」を分けてみる。",
      en: "Write down one of your rules and ask: is it for everyone, or just for me?",
      vi: "Viết ra một nguyên tắc của bạn và tự hỏi: điều này dành cho mọi người, hay chỉ cho riêng mình?",
    },
    ask: {
      ja: "あなたが筋を通したことで、信頼が生まれた経験はありますか？",
      en: "When did standing by your principles earn someone's trust?",
      vi: "Có lần nào việc giữ nguyên tắc giúp bạn nhận được sự tin tưởng?",
    },
  },
  thien_phu: {
    everyday: {
      ja: "家計や予定をきちんと管理する、いざというときのために備えておく、散らかったものを整える――そんな場面に、この星が表れやすいと読めます。「あの人がいると安心」と思われやすく、預かったものを大切に守る役割が似合う人も多いでしょう。",
      en: "Keeping a budget or a schedule in order, putting something aside for a rainy day, tidying what's messy — that is where this star tends to show. Others may feel “it's fine when they're around”, and many with it suit roles of looking after what's been entrusted to them.",
      vi: "Quản lý chi tiêu hay lịch trình đâu ra đấy, để dành phòng khi cần, sắp xếp lại những gì bề bộn — sao này thường hiện ra ở những lúc như thế. Mọi người dễ thấy “có người này là yên tâm”, và nhiều người có sao này hợp với vai trò gìn giữ những gì được giao phó.",
    },
    tryThis: {
      ja: "失敗しても大丈夫な小さな挑戦を一つ決めて、やってみる。守る力は、挑戦の土台にもなります。",
      en: "Choose one small challenge where failing is fine, and try it. Your steadiness can be a base for trying, too.",
      vi: "Chọn một thử thách nhỏ mà thất bại cũng không sao, và thử làm. Sự vững vàng của bạn cũng có thể là bệ đỡ cho việc thử.",
    },
    ask: {
      ja: "あなたが備えていたことで、誰かが助かった経験はありますか？",
      en: "Was there a time when something you'd prepared helped someone?",
      vi: "Có lần nào sự chuẩn bị của bạn đã giúp được ai đó?",
    },
  },
  thai_am: {
    everyday: {
      ja: "人のちょっとした表情の変化に気づく、言葉にされない気持ちを察する、景色や音楽に深く心を動かされる――そんな場面に、この星が表れやすいと読めます。にぎやかな場のあとには、ひとりで静かに過ごす時間が必要な人も多いでしょう。",
      en: "Noticing a small change in someone's face, sensing feelings that aren't said, being deeply moved by a view or a piece of music — that is where this star tends to show. Many with it need some quiet time alone after a busy gathering.",
      vi: "Nhận ra thay đổi nhỏ trên nét mặt ai đó, cảm được những điều không nói thành lời, rung động sâu sắc trước cảnh đẹp hay bản nhạc — sao này thường hiện ra ở những lúc như thế. Nhiều người có sao này cần chút thời gian yên tĩnh một mình sau những buổi đông vui.",
    },
    tryThis: {
      ja: "気づいたことや感じたことを、短い文で書き留めてみる。心の中にあるものが、少し形になります。",
      en: "Jot down, in a few lines, something you noticed or felt. What is inside takes a little shape.",
      vi: "Ghi lại vài dòng về điều bạn nhận thấy hay cảm thấy. Những gì ở trong lòng sẽ thành hình rõ hơn.",
    },
    ask: {
      ja: "誰も気づかなかったことに、あなたが気づけた場面はありますか？",
      en: "Was there a moment when you noticed what no one else did?",
      vi: "Có lúc nào bạn nhận ra điều mà không ai khác để ý?",
    },
  },
  tham_lang: {
    everyday: {
      ja: "新しいお店や趣味、初めて会う人に自然と惹かれる、場を盛り上げて人を楽しませる――そんな場面に、この星が表れやすいと読めます。いろいろなことに手を伸ばすうちに、意外な才能やつながりが見つかる人も多いでしょう。",
      en: "Being drawn to a new place, a new hobby or someone you've just met, livening up a room and entertaining people — that is where this star tends to show. Reaching for many things, many with it discover unexpected talents and connections.",
      vi: "Bị cuốn hút bởi quán mới, sở thích mới hay người mới gặp, làm không khí sôi nổi và khiến mọi người vui — sao này thường hiện ra ở những lúc như thế. Thử nhiều điều, nhiều người có sao này tìm ra tài năng và mối quan hệ bất ngờ.",
    },
    tryThis: {
      ja: "たくさんの関心の中から、今月はこれだけ続けたいというものを一つ選んでみる。",
      en: "Out of all your interests, pick one to keep up this month.",
      vi: "Trong số nhiều mối quan tâm, hãy chọn một điều để duy trì trong tháng này.",
    },
    ask: {
      ja: "興味のままに飛び込んだことが、思わぬ出会いや発見につながった経験はありますか？",
      en: "Has following your curiosity ever led to an unexpected meeting or discovery?",
      vi: "Có lần nào đi theo sự tò mò đã đưa bạn đến một cuộc gặp gỡ hay khám phá bất ngờ?",
    },
  },
  cu_mon: {
    everyday: {
      ja: "説明の矛盾にすぐ気づく、「なぜ？」と問い直して本当の原因を探る、言葉で人を納得させる――そんな場面に、この星が表れやすいと読めます。話す・書く・教える・調べるといった、言葉と思考を使う場面で力を発揮する人も多いでしょう。",
      en: "Spotting a contradiction in an explanation at once, asking “why?” to find the real cause, convincing people with words — that is where this star tends to show. Many with it do well where words and thinking are used: speaking, writing, teaching, researching.",
      vi: "Nhận ra ngay chỗ mâu thuẫn trong lời giải thích, hỏi lại “tại sao?” để tìm nguyên nhân thật, thuyết phục người khác bằng lời — sao này thường hiện ra ở những lúc như thế. Nhiều người có sao này phát huy ở những việc dùng lời và tư duy: nói, viết, dạy, nghiên cứu.",
    },
    tryThis: {
      ja: "何かを指摘する前に、相手の良いところを一つ先に伝えてみる。同じ内容でも、届き方が変わります。",
      en: "Before pointing out a problem, name one thing the other person did well. The same point lands differently.",
      vi: "Trước khi góp ý, hãy nói trước một điều người kia làm tốt. Cùng một ý nhưng sẽ đến với họ khác hẳn.",
    },
    ask: {
      ja: "あなたの「なぜ？」という問いが、物事を良い方向に変えた経験はありますか？",
      en: "Has one of your “why?” questions ever changed something for the better?",
      vi: "Có lần nào câu hỏi “tại sao?” của bạn đã làm mọi việc tốt lên?",
    },
  },
  thien_tuong: {
    everyday: {
      ja: "意見の違う二人の間に入って話を整理する、決まりや約束をきちんと守る、身だしなみや場の整え方に気を配る――そんな場面に、この星が表れやすいと読めます。誰かを支える立場で、まわりの信頼を集める人も多いでしょう。",
      en: "Stepping between two people who disagree to sort things out, keeping rules and promises, paying attention to appearance and to doing things properly — that is where this star tends to show. Many with it earn trust in a role of supporting others.",
      vi: "Đứng giữa hai người bất đồng để gỡ rối câu chuyện, giữ đúng quy tắc và lời hứa, chú ý đến dáng vẻ và sự chỉn chu — sao này thường hiện ra ở những lúc như thế. Nhiều người có sao này được tin cậy ở vai trò nâng đỡ người khác.",
    },
    tryThis: {
      ja: "まわりの意見を整える前に、「自分はどうしたいか」を一行だけ書き出してみる。",
      en: "Before balancing everyone's views, write down in one line what you yourself want.",
      vi: "Trước khi dung hòa ý kiến mọi người, hãy viết một dòng về điều chính bạn muốn.",
    },
    ask: {
      ja: "あなたが間に入ったことで、うまくまとまった場面はありますか？",
      en: "Was there a time when your stepping in helped things come together?",
      vi: "Có lúc nào nhờ bạn đứng ra mà mọi việc êm đẹp?",
    },
  },
  thien_luong: {
    everyday: {
      ja: "年下の人の相談に乗る、困っている人を守ろうとする、経験から「こうするといいよ」と伝える――そんな場面に、この星が表れやすいと読めます。年齢にかかわらず、どこか落ち着いて見られ、頼られる人も多いでしょう。",
      en: "Listening to someone younger who comes to you, stepping in to protect someone in trouble, passing on what experience has taught you — that is where this star tends to show. Whatever their age, many with it come across as calm and are relied on.",
      vi: "Lắng nghe người nhỏ tuổi tâm sự, đứng ra che chở người gặp khó, truyền lại điều kinh nghiệm dạy mình — sao này thường hiện ra ở những lúc như thế. Dù ở tuổi nào, nhiều người có sao này trông điềm tĩnh và được tin cậy.",
    },
    tryThis: {
      ja: "助言したくなったら、まず「あなたはどうしたい？」と一度聞いてみる。",
      en: "When you feel like giving advice, first ask once: “what would you like to do?”",
      vi: "Khi muốn khuyên ai, trước hết hãy hỏi một câu: “bạn muốn làm thế nào?”",
    },
    ask: {
      ja: "あなたの言葉や支えが、誰かの力になった経験はありますか？",
      en: "When did your words or support give someone strength?",
      vi: "Có lần nào lời nói hay sự nâng đỡ của bạn đã tiếp sức cho ai đó?",
    },
  },
  that_sat: {
    everyday: {
      ja: "誰もやりたがらない役を引き受ける、迷うより先にまず動いてみる、一人で新しい道を切り開く――そんな場面に、この星が表れやすいと読めます。難しい状況ほど力が湧き、自分で決めたことには粘り強く取り組む人も多いでしょう。",
      en: "Taking on the job no one wants, acting first rather than hesitating, opening a new path on your own — that is where this star tends to show. Many with it find more strength in hard situations, and stick with what they've decided themselves.",
      vi: "Nhận phần việc không ai muốn, hành động trước thay vì do dự, tự mình mở một con đường mới — sao này thường hiện ra ở những lúc như thế. Nhiều người có sao này càng gặp khó càng mạnh mẽ, và bền bỉ với điều mình tự quyết.",
    },
    tryThis: {
      ja: "動き出す前に、関わる人に「なぜそうするか」をひと言だけ伝えてみる。",
      en: "Before you set off, tell the people involved, in one line, why.",
      vi: "Trước khi bắt đầu, hãy nói một câu với những người liên quan về lý do bạn làm vậy.",
    },
    ask: {
      ja: "勇気を出して一歩踏み出したことで、道が開けた経験はありますか？",
      en: "When did a brave first step open a way for you?",
      vi: "Có lần nào một bước đi can đảm đã mở ra con đường cho bạn?",
    },
  },
  pha_quan: {
    everyday: {
      ja: "古いやり方に疑問を持って新しい方法を試す、行き詰まった状況を一度リセットする、環境が変わるときにむしろ生き生きする――そんな場面に、この星が表れやすいと読めます。変化の多い場面で、ほかの人が見ない可能性を見つける人も多いでしょう。",
      en: "Questioning the old way and trying a new one, resetting a situation that's stuck, coming alive when things change — that is where this star tends to show. In times of change, many with it see possibilities others don't.",
      vi: "Đặt câu hỏi với cách làm cũ và thử cách mới, làm lại từ đầu khi mọi việc bế tắc, trở nên hăng hái khi hoàn cảnh thay đổi — sao này thường hiện ra ở những lúc như thế. Giữa những thay đổi, nhiều người có sao này thấy được khả năng mà người khác không thấy.",
    },
    tryThis: {
      ja: "何かを変える前に、「これは残したい」と思うものを一つ決めておく。",
      en: "Before changing something, decide on one thing you want to keep.",
      vi: "Trước khi thay đổi điều gì, hãy chọn sẵn một điều bạn muốn giữ lại.",
    },
    ask: {
      ja: "思い切って何かを変えたことで、新しい道が開けた経験はありますか？",
      en: "When did boldly changing something open a new path for you?",
      vi: "Có lần nào mạnh dạn thay đổi đã mở ra con đường mới cho bạn?",
    },
  },
};

/** The pair's key: the two star ids in alphabetical order. */
export const pairKey = (a: MainStarId, b: MainStarId) => [a, b].sort().join("+");

/** The 24 pairs of main stars that can share a palace: the pair's traditional short name and its reading as a combination. */
export const PAIRS: Record<string, { name: string; reading: T }> = {
  [pairKey("tu_vi", "thien_phu")]: {
    name: "Tử Phủ",
    reading: {
      ja: "人をまとめる星と、蓄えを守る星が重なり、伝統的に、落ち着いた品格と安定を重んじる組み合わせと読まれます。全体を見ながら着実に物事を進める力が表れやすい一方、慎重さが勝って新しいことに踏み出しにくい面もあるとされます。",
      en: "A star of leading and a star of keeping meet here; traditionally the pair is read as calm dignity and a high value on stability. It tends to show as moving things forward steadily with the whole in view, with a side that may hesitate to step into the new.",
      vi: "Sao của sự dẫn dắt gặp sao của sự gìn giữ; theo truyền thống, bộ đôi này được đọc là phong thái đĩnh đạc và coi trọng sự ổn định. Thường thể hiện qua việc nhìn toàn cục mà tiến từng bước vững vàng, đôi khi lại cẩn trọng đến mức ngại bước vào điều mới.",
    },
  },
  [pairKey("tu_vi", "tham_lang")]: {
    name: "Tử Tham",
    reading: {
      ja: "人をまとめる星と、魅力と好奇心の星が重なり、伝統的に、人を惹きつける華やかさと、多くのことを味わいたい気持ちをあわせ持つ組み合わせと読まれます。人付き合いや楽しみの場で輝きやすい一方、欲張りすぎないよう、自分なりの軸を持つことが大切とされます。",
      en: "A star of leading and a star of charm and curiosity meet here; traditionally the pair is read as a magnetism that draws people in, with a wish to taste many things in life. It tends to shine in company and enjoyment; keeping a centre of your own helps it not to spread too thin.",
      vi: "Sao của sự dẫn dắt gặp sao của sức hút và tò mò; theo truyền thống, bộ đôi này được đọc là sức cuốn hút khiến người khác tìm đến, cùng mong muốn nếm trải nhiều điều. Dễ tỏa sáng trong giao tiếp và những cuộc vui; giữ cho mình một trục riêng giúp không bị dàn trải.",
    },
  },
  [pairKey("tu_vi", "thien_tuong")]: {
    name: "Tử Tướng",
    reading: {
      ja: "人をまとめる星と、公平さと支える力の星が重なり、伝統的に、責任感と、物事をきちんと整える力をあわせ持つ組み合わせと読まれます。人の間に立って調整しながら全体を率いる場面で力を発揮しやすいとされます。",
      en: "A star of leading and a star of fairness and support meet here; traditionally the pair is read as responsibility joined with a gift for putting things properly in order. It tends to show its strength when leading by coordinating between people.",
      vi: "Sao của sự dẫn dắt gặp sao của công bằng và nâng đỡ; theo truyền thống, bộ đôi này được đọc là tinh thần trách nhiệm đi cùng khả năng sắp xếp mọi việc chỉn chu. Thường phát huy khi vừa điều phối giữa mọi người vừa dẫn dắt cả nhóm.",
    },
  },
  [pairKey("tu_vi", "that_sat")]: {
    name: "Tử Sát",
    reading: {
      ja: "人をまとめる星と、勇気と行動の星が重なり、伝統的に、意志が強く、決めたことを自ら動いて実現していく組み合わせと読まれます。困難な場面で先頭に立てる力がある一方、強引に見えないよう、周りの声を聞く余裕を持つとよいとされます。",
      en: "A star of leading and a star of courage and action meet here; traditionally the pair is read as a strong will that makes its decisions happen by acting on them. It can stand at the front in hard times; leaving room to hear others keeps it from seeming forceful.",
      vi: "Sao của sự dẫn dắt gặp sao của dũng khí và hành động; theo truyền thống, bộ đôi này được đọc là ý chí mạnh mẽ, tự tay biến quyết định thành hiện thực. Có thể đứng mũi chịu sào lúc khó khăn; chừa chỗ lắng nghe người khác giúp không bị xem là áp đặt.",
    },
  },
  [pairKey("tu_vi", "pha_quan")]: {
    name: "Tử Phá",
    reading: {
      ja: "人をまとめる星と、変化と刷新の星が重なり、伝統的に、大きな理想を持ち、古い枠を変えていこうとする組み合わせと読まれます。新しい流れをつくる力が表れやすい一方、変化が続いて落ち着かない時期もあるとされます。",
      en: "A star of leading and a star of change and renewal meet here; traditionally the pair is read as big ideals and a drive to remake old frames. It tends to show as the power to start new currents, with times when change follows change.",
      vi: "Sao của sự dẫn dắt gặp sao của đổi mới; theo truyền thống, bộ đôi này được đọc là lý tưởng lớn và mong muốn thay đổi khuôn khổ cũ. Thường thể hiện qua khả năng tạo ra dòng chảy mới, kèm những giai đoạn thay đổi liên tiếp chưa yên.",
    },
  },
  [pairKey("thien_co", "thai_am")]: {
    name: "Cơ Âm",
    reading: {
      ja: "頭の回転の星と、繊細な感受性の星が重なり、伝統的に、よく考え、細やかに感じとる組み合わせと読まれます。計画や工夫に美的な感覚が加わりやすく、環境の変化や移動の多い暮らしとも縁があるとされます。",
      en: "A star of quick thinking and a star of fine feeling meet here; traditionally the pair is read as someone who thinks things through and senses things delicately. Plans and ideas tend to carry an aesthetic touch, and the pair is also linked with changes of place and surroundings.",
      vi: "Sao của trí óc nhanh nhạy gặp sao của sự tinh tế; theo truyền thống, bộ đôi này được đọc là người suy nghĩ thấu đáo và cảm nhận tinh tế. Kế hoạch và ý tưởng thường mang nét thẩm mỹ, và bộ đôi cũng gắn với việc thay đổi nơi chốn, môi trường.",
    },
  },
  [pairKey("thien_co", "cu_mon")]: {
    name: "Cơ Cự",
    reading: {
      ja: "頭の回転の星と、言葉と分析の星が重なり、伝統的に、鋭い頭脳と話す力が合わさる組み合わせと読まれます。物事を分析して説明する、議論する、調べて教えるといった場面で力を発揮しやすい一方、考えすぎや言葉の鋭さが重なりやすい点には気を配るとよいとされます。",
      en: "A star of quick thinking and a star of words and analysis meet here; traditionally the pair is read as a sharp mind joined with the power of speech. It tends to do well at analysing and explaining, debating, or researching and teaching; overthinking and sharp words can add up, so they are worth watching.",
      vi: "Sao của trí óc nhanh nhạy gặp sao của lời nói và phân tích; theo truyền thống, bộ đôi này được đọc là trí tuệ sắc bén đi cùng tài ăn nói. Dễ phát huy khi phân tích và giải thích, tranh luận, hay nghiên cứu và giảng dạy; việc nghĩ quá nhiều và lời nói sắc cạnh dễ cộng hưởng, nên cần lưu tâm.",
    },
  },
  [pairKey("thien_co", "thien_luong")]: {
    name: "Cơ Lương",
    reading: {
      ja: "頭の回転の星と、守り導く星が重なり、伝統的に、知恵を生かして人に助言する組み合わせと読まれます。作戦を練る、相談に乗る、教えるといった役割が似合いやすい一方、話すことが先に立ちすぎないよう、行動とのバランスを取るとよいとされます。",
      en: "A star of quick thinking and a star of protecting and guiding meet here; traditionally the pair is read as using wisdom to counsel others. Roles of strategising, advising or teaching tend to suit it; balancing talk with action keeps the words from running ahead.",
      vi: "Sao của trí óc nhanh nhạy gặp sao của che chở, dìu dắt; theo truyền thống, bộ đôi này được đọc là dùng trí tuệ để khuyên bảo người khác. Thường hợp với vai trò bày mưu tính kế, tư vấn hay giảng dạy; cân bằng giữa lời nói và hành động giúp lời không đi trước việc.",
    },
  },
  [pairKey("thai_duong", "thai_am")]: {
    name: "Nhật Nguyệt",
    reading: {
      ja: "太陽と月が同じ宮に並び、伝統的に、外へ向かう明るさと、内に向かう繊細さをあわせ持つ組み合わせと読まれます。場面によって表に立つことも、静かに支えることもできる柔軟さが表れやすい一方、気分の波が出やすい面もあるとされます。",
      en: "The sun and the moon share the palace; traditionally the pair is read as outward brightness together with inward sensitivity. It tends to show as the flexibility to step forward or support quietly as the moment needs, with moods that may rise and fall.",
      vi: "Mặt trời và mặt trăng cùng cung; theo truyền thống, bộ đôi này được đọc là sự rạng rỡ hướng ra ngoài cùng sự tinh tế hướng vào trong. Thường thể hiện qua sự linh hoạt: lúc đứng ra phía trước, lúc lặng lẽ nâng đỡ, dù tâm trạng đôi khi lên xuống.",
    },
  },
  [pairKey("thai_duong", "cu_mon")]: {
    name: "Nhật Cự",
    reading: {
      ja: "太陽と、言葉と分析の星が重なり、伝統的に、言葉の力が明るく外へ向かう組み合わせと読まれます。人前で話す、説明する、伝えるといった場面で評価されやすく、言葉を通じて名が知られる縁があるとされます。",
      en: "The sun and a star of words and analysis meet here; traditionally the pair is read as the power of words turned brightly outward. Speaking in public, explaining and conveying things tend to be appreciated, and the pair is linked with becoming known through one's words.",
      vi: "Mặt trời gặp sao của lời nói và phân tích; theo truyền thống, bộ đôi này được đọc là sức mạnh ngôn từ hướng ra ngoài một cách sáng sủa. Nói trước đám đông, giải thích, truyền đạt thường được đánh giá cao, và bộ đôi gắn với việc được biết đến qua lời nói.",
    },
  },
  [pairKey("thai_duong", "thien_luong")]: {
    name: "Nhật Lương",
    reading: {
      ja: "太陽と、守り導く星が重なり、伝統的に、温かく人を支え、導く組み合わせと読まれます。教える、世話をする、公のために働くといった役割で力を発揮しやすく、学びや試験とも縁があるとされます。",
      en: "The sun and a star of protecting and guiding meet here; traditionally the pair is read as supporting and guiding people warmly. Roles of teaching, caring for others or serving the public tend to suit it, and it is also linked with study and examinations.",
      vi: "Mặt trời gặp sao của che chở, dìu dắt; theo truyền thống, bộ đôi này được đọc là ấm áp nâng đỡ và dẫn dắt người khác. Thường phát huy ở vai trò giảng dạy, chăm sóc hay phục vụ cộng đồng, và cũng gắn với việc học hành, thi cử.",
    },
  },
  [pairKey("vu_khuc", "thien_phu")]: {
    name: "Vũ Phủ",
    reading: {
      ja: "決断と金銭感覚の星と、蓄えを守る星が重なり、伝統的に、現実的で、お金や資源を着実に築いていく組み合わせと読まれます。計画的に積み上げることや管理することで力を発揮しやすいとされます。",
      en: "A star of decisiveness and money sense and a star of keeping meet here; traditionally the pair is read as practical, building money and resources steadily. It tends to do well at planned building-up and at managing things.",
      vi: "Sao của sự quyết đoán và nhạy bén tài chính gặp sao của sự gìn giữ; theo truyền thống, bộ đôi này được đọc là thực tế, xây dựng tiền bạc và nguồn lực từng bước vững chắc. Thường phát huy khi tích lũy có kế hoạch và quản lý.",
    },
  },
  [pairKey("vu_khuc", "tham_lang")]: {
    name: "Vũ Tham",
    reading: {
      ja: "決断と実行の星と、意欲と好奇心の星が重なり、伝統的に、強い行動力と目標への意欲をあわせ持つ組み合わせと読まれます。伝統的には、若いうちより、経験を重ねてから実を結びやすいとも言われます。",
      en: "A star of decision and execution and a star of drive and curiosity meet here; traditionally the pair is read as strong action together with ambition for one's goals. Tradition also says its efforts often bear fruit after experience has built up, rather than early in youth.",
      vi: "Sao của quyết đoán, thực thi gặp sao của khát khao và tò mò; theo truyền thống, bộ đôi này được đọc là sức hành động mạnh đi cùng ý chí hướng tới mục tiêu. Truyền thống cũng nói thành quả thường đến sau khi tích lũy kinh nghiệm hơn là lúc còn rất trẻ.",
    },
  },
  [pairKey("vu_khuc", "thien_tuong")]: {
    name: "Vũ Tướng",
    reading: {
      ja: "決断と実行の星と、公平さと支える力の星が重なり、伝統的に、実務に強く、誠実に物事を進める組み合わせと読まれます。約束を守り、着実に結果を出す人として頼られやすいとされます。",
      en: "A star of decision and execution and a star of fairness and support meet here; traditionally the pair is read as strong in practical work and honest in how it gets things done. It tends to be relied on as someone who keeps promises and delivers.",
      vi: "Sao của quyết đoán, thực thi gặp sao của công bằng và nâng đỡ; theo truyền thống, bộ đôi này được đọc là giỏi việc thực tế và làm việc chính trực. Thường được tin cậy như người giữ lời và làm ra kết quả.",
    },
  },
  [pairKey("vu_khuc", "that_sat")]: {
    name: "Vũ Sát",
    reading: {
      ja: "決断と実行の星と、勇気と行動の星が重なり、伝統的に、思い切りがよく、難しいことにも正面から取り組む組み合わせと読まれます。力強く物事を動かせる一方、厳しさや性急さが出すぎないよう気を配るとよいとされます。",
      en: "A star of decision and execution and a star of courage and action meet here; traditionally the pair is read as bold, taking on hard things head-on. It can move things with force; watching that sternness or haste doesn't take over helps.",
      vi: "Sao của quyết đoán, thực thi gặp sao của dũng khí và hành động; theo truyền thống, bộ đôi này được đọc là dứt khoát, đối mặt trực diện với việc khó. Có thể thúc đẩy mọi việc mạnh mẽ; lưu ý đừng để sự nghiêm khắc hay nóng vội lấn át.",
    },
  },
  [pairKey("vu_khuc", "pha_quan")]: {
    name: "Vũ Phá",
    reading: {
      ja: "決断と実行の星と、変化と刷新の星が重なり、伝統的に、独立心が強く、思い切った変化を起こす組み合わせと読まれます。新しいことに挑む力が表れやすい一方、お金や状況の浮き沈みも大きくなりやすいとされます。",
      en: "A star of decision and execution and a star of change and renewal meet here; traditionally the pair is read as fiercely independent and ready to make bold changes. It tends to show as the power to take on the new, with bigger ups and downs in money or circumstances.",
      vi: "Sao của quyết đoán, thực thi gặp sao của đổi mới; theo truyền thống, bộ đôi này được đọc là độc lập mạnh mẽ và dám tạo thay đổi lớn. Thường thể hiện qua khả năng dấn thân vào điều mới, kèm những thăng trầm lớn hơn về tiền bạc hay hoàn cảnh.",
    },
  },
  [pairKey("thien_dong", "thai_am")]: {
    name: "Đồng Âm",
    reading: {
      ja: "穏やかさの星と、繊細な感受性の星が重なり、伝統的に、やさしく、情緒豊かな組み合わせと読まれます。人の気持ちに寄り添う力や、美しいもの・心地よいものを味わう力が表れやすい一方、受け身になりすぎないことが大切とされます。",
      en: "A star of gentleness and a star of fine feeling meet here; traditionally the pair is read as kind and emotionally rich. It tends to show as a gift for being there for others' feelings and for savouring beauty and comfort; not becoming too passive is said to matter.",
      vi: "Sao của sự hiền hòa gặp sao của sự tinh tế; theo truyền thống, bộ đôi này được đọc là dịu dàng và giàu cảm xúc. Thường thể hiện qua khả năng thấu cảm và biết thưởng thức cái đẹp, sự dễ chịu; điều quan trọng là đừng quá thụ động.",
    },
  },
  [pairKey("thien_dong", "cu_mon")]: {
    name: "Đồng Cự",
    reading: {
      ja: "穏やかさの星と、言葉と分析の星が重なり、伝統的に、心地よさを求める気持ちと、物事を問い直す気持ちが同居する組み合わせと読まれます。言葉にして話し合うことで気持ちが整いやすく、経験を重ねるほど持ち味が生きるとされます。",
      en: "A star of gentleness and a star of words and analysis meet here; traditionally the pair is read as a wish for ease living alongside a habit of questioning. Talking things through tends to settle the heart, and its qualities are said to grow with experience.",
      vi: "Sao của sự hiền hòa gặp sao của lời nói và phân tích; theo truyền thống, bộ đôi này được đọc là mong muốn thoải mái cùng tồn tại với thói quen đặt câu hỏi. Nói ra và trò chuyện thường giúp lòng nhẹ nhõm, và cái hay của bộ đôi được cho là càng rõ khi trải nghiệm nhiều.",
    },
  },
  [pairKey("thien_dong", "thien_luong")]: {
    name: "Đồng Lương",
    reading: {
      ja: "穏やかさの星と、守り導く星が重なり、伝統的に、やさしく面倒見のよい組み合わせと読まれます。人の世話をする、相談に乗る、支えるといった場面で力を発揮しやすい一方、のんびりしすぎて機会を逃さないよう気を配るとよいとされます。",
      en: "A star of gentleness and a star of protecting and guiding meet here; traditionally the pair is read as kind and caring. It tends to do well at looking after people, listening and supporting; taking care not to let chances slip by in an easy-going pace helps.",
      vi: "Sao của sự hiền hòa gặp sao của che chở, dìu dắt; theo truyền thống, bộ đôi này được đọc là hiền lành và chu đáo. Thường phát huy khi chăm sóc, lắng nghe và nâng đỡ người khác; lưu ý đừng quá thong thả mà để lỡ cơ hội.",
    },
  },
  [pairKey("liem_trinh", "thien_phu")]: {
    name: "Liêm Phủ",
    reading: {
      ja: "原則と意志の星と、蓄えを守る星が重なり、伝統的に、筋を通しながら着実に物事を管理する組み合わせと読まれます。規律や責任のある役割で信頼されやすいとされます。",
      en: "A star of principle and will and a star of keeping meet here; traditionally the pair is read as managing things steadily while holding to principle. It tends to be trusted in roles with discipline and responsibility.",
      vi: "Sao của nguyên tắc và ý chí gặp sao của sự gìn giữ; theo truyền thống, bộ đôi này được đọc là quản lý mọi việc vững vàng mà vẫn giữ nguyên tắc. Thường được tin cậy ở những vai trò cần kỷ luật và trách nhiệm.",
    },
  },
  [pairKey("liem_trinh", "tham_lang")]: {
    name: "Liêm Tham",
    reading: {
      ja: "原則と意志の星と、魅力と欲求の星が重なり、伝統的に、強い情熱と魅力をあわせ持つ組み合わせと読まれます。理想と欲求の間で揺れることもあり、自分なりの線を引くことで持ち味が生きるとされます。",
      en: "A star of principle and will and a star of charm and desire meet here; traditionally the pair is read as strong passion together with charm. It may swing between ideals and wants; drawing a line of your own is said to let its qualities shine.",
      vi: "Sao của nguyên tắc và ý chí gặp sao của sức hút và ham muốn; theo truyền thống, bộ đôi này được đọc là đam mê mãnh liệt cùng sức cuốn hút. Có lúc dao động giữa lý tưởng và ham muốn; tự vạch cho mình một giới hạn được cho là giúp cái hay tỏa sáng.",
    },
  },
  [pairKey("liem_trinh", "thien_tuong")]: {
    name: "Liêm Tướng",
    reading: {
      ja: "原則と意志の星と、公平さと支える力の星が重なり、伝統的に、誠実で、規律や公正さを大切にする組み合わせと読まれます。決まりごとや人の間を整える役割で力を発揮しやすいとされます。",
      en: "A star of principle and will and a star of fairness and support meet here; traditionally the pair is read as honest, valuing discipline and fairness. It tends to do well in roles that keep rules and relationships in order.",
      vi: "Sao của nguyên tắc và ý chí gặp sao của công bằng và nâng đỡ; theo truyền thống, bộ đôi này được đọc là chính trực, coi trọng kỷ luật và lẽ công bằng. Thường phát huy ở vai trò giữ gìn quy tắc và sắp xếp các mối quan hệ.",
    },
  },
  [pairKey("liem_trinh", "that_sat")]: {
    name: "Liêm Sát",
    reading: {
      ja: "原則と意志の星と、勇気と行動の星が重なり、伝統的に、意志が強く、困難を自分の力で切り抜けていく組み合わせと読まれます。粘り強さが表れやすい一方、こだわりが強くなりすぎないよう、柔らかさも持つとよいとされます。",
      en: "A star of principle and will and a star of courage and action meet here; traditionally the pair is read as strong-willed, working through difficulties by one's own effort. Tenacity tends to show; a little softness keeps firmness from becoming rigidity.",
      vi: "Sao của nguyên tắc và ý chí gặp sao của dũng khí và hành động; theo truyền thống, bộ đôi này được đọc là ý chí mạnh, tự sức mình vượt qua khó khăn. Sự bền bỉ thường hiện rõ; thêm chút mềm mỏng giúp sự kiên định không thành cứng nhắc.",
    },
  },
  [pairKey("liem_trinh", "pha_quan")]: {
    name: "Liêm Phá",
    reading: {
      ja: "原則と意志の星と、変化と刷新の星が重なり、伝統的に、強い情熱で古いものを変えていく組み合わせと読まれます。思い切った行動力が表れやすい一方、勢いで決めすぎないよう、一呼吸おくことが助けになるとされます。",
      en: "A star of principle and will and a star of change and renewal meet here; traditionally the pair is read as changing old things with strong passion. Bold action tends to show; pausing for a breath helps it not to decide on momentum alone.",
      vi: "Sao của nguyên tắc và ý chí gặp sao của đổi mới; theo truyền thống, bộ đôi này được đọc là dùng nhiệt huyết mạnh mẽ để thay đổi cái cũ. Sức hành động táo bạo thường hiện rõ; dừng lại hít một hơi giúp không quyết định chỉ theo đà.",
    },
  },
};

/**
 * Ages of life for the 10-year options, by the period's middle age. MOSAIC's guide, not a Tử Vi
 * rule (see lifePhase in interpret.ts, which this does not change).
 */
export type LifeBand = "young" | "prime" | "transition" | "elder";
export function lifeBand(from: number, to: number): LifeBand | null {
  const mid = (from + to) / 2;
  return mid < 13 ? null : mid < 30 ? "young" : mid < 55 ? "prime" : mid < 70 ? "transition" : mid < 95 ? "elder" : null;
}

/** How people of different ages tend to meet each palace's theme: possibilities to choose from, never instructions. */
export const PALACE_OPTIONS: Record<PalaceId, Record<LifeBand, TL>> = {
  menh: {
    young: {
      ja: ["自分に合う道を探して、いくつか試してみる", "得意なことや好きなことを言葉にしてみる", "憧れる人の生き方から学ぶ"],
      en: ["trying a few paths to find one that fits you", "putting into words what you're good at and what you love", "learning from the lives of people you admire"],
      vi: ["thử vài con đường để tìm hướng hợp với mình", "gọi tên những điều mình giỏi và yêu thích", "học hỏi từ cách sống của những người mình ngưỡng mộ"],
    },
    prime: {
      ja: ["これまでの経験を生かして、自分らしい役割を広げる", "仕事や暮らしの優先順位を見直す", "自分の強みを人のために使う場面をつくる"],
      en: ["building on experience to grow a role that feels like yours", "rethinking priorities in work and daily life", "finding ways to use your strengths for others"],
      vi: ["dựa vào kinh nghiệm để mở rộng vai trò đúng với mình", "xem lại thứ tự ưu tiên trong công việc và cuộc sống", "tìm dịp dùng thế mạnh của mình cho người khác"],
    },
    transition: {
      ja: ["仕事以外の自分の役割や居場所を考える", "これからの時間を何に使いたいか書き出す", "長く続けてきたことを、次の形に変えていく"],
      en: ["thinking about roles and places for yourself beyond work", "writing down what you'd like to spend the coming years on", "letting something you've long done take a new form"],
      vi: ["nghĩ về vai trò và chốn của mình ngoài công việc", "viết ra điều bạn muốn dành thời gian sắp tới", "để những việc đã gắn bó lâu năm chuyển sang hình thức mới"],
    },
    elder: {
      ja: ["自分らしいペースで、好きなことを続ける", "これまでの生き方を振り返り、言葉に残す", "大切にしてきた考えを、身近な人に伝える"],
      en: ["keeping up what you love at your own pace", "looking back on your life and putting it into words", "sharing the beliefs you've held with people close to you"],
      vi: ["tiếp tục điều mình yêu thích theo nhịp của mình", "nhìn lại cuộc đời và ghi lại thành lời", "chia sẻ những điều mình trân trọng với người thân"],
    },
  },
  phu_mau: {
    young: {
      ja: ["親や先生、先輩から学べることを探す", "相談できる年上の人を見つける", "家族との関わり方を、自分の言葉で考える"],
      en: ["looking for what you can learn from parents, teachers and seniors", "finding an older person you can turn to", "thinking, in your own words, about how you relate to your family"],
      vi: ["tìm điều có thể học từ cha mẹ, thầy cô, đàn anh đàn chị", "tìm một người lớn tuổi để tâm sự", "tự suy nghĩ về cách mình gắn bó với gia đình"],
    },
    prime: {
      ja: ["親や目上の人との関係を見直す", "上司や師から学んだことを、次は自分が伝える", "親との時間を意識してつくる"],
      en: ["reviewing how you relate to parents and elders", "passing on what bosses and mentors taught you", "making time with your parents on purpose"],
      vi: ["nhìn lại mối quan hệ với cha mẹ và bậc trên", "truyền lại những gì cấp trên, thầy dạy cho mình", "chủ động dành thời gian cho cha mẹ"],
    },
    transition: {
      ja: ["親から受け継いだものを見つめ直す", "これまでお世話になった人に感謝を伝える", "自分が「目上の人」として何を手渡せるか考える"],
      en: ["looking again at what you received from your parents", "thanking those who helped you along the way", "thinking about what you can hand on, now as the elder"],
      vi: ["nhìn lại những gì nhận được từ cha mẹ", "gửi lời cảm ơn những người đã giúp mình", "nghĩ xem, ở vị trí người đi trước, mình có thể trao lại điều gì"],
    },
    elder: {
      ja: ["親や恩師の思い出を書き残す", "家族の歴史を、次の世代に話す", "受け継いだ習わしや言葉を伝える"],
      en: ["writing down memories of your parents and mentors", "telling the next generation about your family's history", "passing on customs and sayings you inherited"],
      vi: ["ghi lại kỷ niệm về cha mẹ và người thầy", "kể cho thế hệ sau về lịch sử gia đình", "truyền lại phong tục và lời dạy mình được thừa hưởng"],
    },
  },
  phuc_duc: {
    young: {
      ja: ["心が落ち着く場所や時間を見つける", "自分が大切にしたい価値観を言葉にする", "家族のルーツに興味を持ってみる"],
      en: ["finding places and times that settle your mind", "putting into words the values you want to hold", "getting curious about your family's roots"],
      vi: ["tìm nơi chốn, khoảng thời gian giúp lòng mình yên", "gọi tên những giá trị mình muốn giữ", "tò mò về cội nguồn gia đình"],
    },
    prime: {
      ja: ["忙しさの中でも、心が満たされる習慣を持つ", "働き方や暮らしが自分の価値観に合っているか見直す", "趣味や学びで、心の余白をつくる"],
      en: ["keeping a habit that fills you up, however busy you are", "checking whether your work and life fit your values", "making space in your mind through hobbies or learning"],
      vi: ["giữ một thói quen nuôi dưỡng tâm hồn dù bận rộn", "xem công việc và lối sống có hợp với giá trị của mình không", "tạo khoảng lặng cho tâm trí bằng sở thích hay việc học"],
    },
    transition: {
      ja: ["これからの人生で大切にしたいことを選び直す", "心が穏やかになる暮らし方を考える", "家族や地域とのつながりを見直す"],
      en: ["choosing again what matters most for the years ahead", "thinking about a way of living that brings you calm", "revisiting your ties with family and community"],
      vi: ["chọn lại điều quan trọng nhất cho những năm tới", "nghĩ về lối sống mang lại sự an yên", "nhìn lại sự gắn bó với gia đình và cộng đồng"],
    },
    elder: {
      ja: ["心が満たされる時間を、日々の中に置く", "感謝していることを書き留める", "家族のルーツや思い出を残す"],
      en: ["keeping moments that fill you up in your days", "writing down what you're grateful for", "recording your family's roots and memories"],
      vi: ["giữ những khoảnh khắc an vui trong ngày", "ghi lại những điều mình biết ơn", "lưu giữ cội nguồn và kỷ niệm gia đình"],
    },
  },
  dien_trach: {
    young: {
      ja: ["一人暮らしや引っ越しで、自分の暮らしをつくる", "居心地のいい部屋の整え方を試す", "住む場所を選ぶときの自分の基準を考える"],
      en: ["shaping your own life through living alone or moving", "trying ways to make your room comfortable", "thinking about what matters to you in a place to live"],
      vi: ["tự xây dựng cuộc sống qua việc ở riêng hay chuyển nhà", "thử cách làm cho căn phòng dễ chịu", "nghĩ về tiêu chí của mình khi chọn nơi ở"],
    },
    prime: {
      ja: ["住まいや暮らしの環境を整える", "自分や一緒に暮らす人にとって心地よい家を考える", "住む場所や住まい方を見直す"],
      en: ["putting your home and surroundings in order", "thinking about a home that feels good for you and those you live with", "reconsidering where and how you live"],
      vi: ["sắp xếp lại nhà cửa và môi trường sống", "nghĩ về một ngôi nhà dễ chịu cho mình và người cùng sống", "xem lại nơi ở và cách sống"],
    },
    transition: {
      ja: ["これからの暮らしに合う住まい方を考える", "持ち物を見直し、身軽にする", "地域とのつながりを育てる"],
      en: ["thinking about a way of living that suits the years ahead", "going through your belongings and travelling lighter", "growing ties with your neighbourhood"],
      vi: ["nghĩ về cách ở phù hợp cho những năm tới", "xem lại đồ đạc, sống nhẹ nhàng hơn", "vun đắp gắn kết với khu phố"],
    },
    elder: {
      ja: ["毎日を過ごす場所を、心地よく整える", "思い出の品にまつわる話を、家族に伝える", "身近な環境の小さな変化を楽しむ"],
      en: ["making the place you spend your days comfortable", "telling your family the stories behind keepsakes", "enjoying small changes in your everyday surroundings"],
      vi: ["làm cho nơi mình sống mỗi ngày thêm dễ chịu", "kể cho gia đình câu chuyện về những kỷ vật", "tận hưởng những đổi thay nhỏ quanh mình"],
    },
  },
  quan_loc: {
    young: {
      ja: ["いくつかの仕事や役割を経験して、向き不向きを知る", "学びたいことや身につけたい技術を選ぶ", "働く人の話を聞いてみる"],
      en: ["trying a few kinds of work or roles to learn what suits you", "choosing what you want to learn or master", "listening to people talk about their work"],
      vi: ["thử vài công việc, vai trò để biết mình hợp gì", "chọn điều muốn học hay kỹ năng muốn rèn", "lắng nghe người khác kể về công việc của họ"],
    },
    prime: {
      ja: ["仕事の幅を広げる、または深める", "責任のある役割に挑戦する", "働き方そのものを見直す"],
      en: ["broadening or deepening your work", "stepping into a role with more responsibility", "rethinking the way you work"],
      vi: ["mở rộng hoặc đào sâu công việc", "thử sức với vai trò nhiều trách nhiệm hơn", "nhìn lại chính cách mình làm việc"],
    },
    transition: {
      ja: ["これまでの経験を、後に続く人に伝える", "仕事以外の役割（地域・趣味・学び）を育てる", "働き方や引退の形を、自分で選ぶ"],
      en: ["passing your experience on to those who follow", "growing roles beyond work: community, hobbies, learning", "choosing for yourself how you work or step back"],
      vi: ["truyền kinh nghiệm cho người đi sau", "vun đắp vai trò ngoài công việc: cộng đồng, sở thích, học hỏi", "tự chọn cách làm việc hay lui về nghỉ ngơi"],
    },
    elder: {
      ja: ["積み重ねてきた経験を、話や文章で残す", "地域や趣味の場で、自分らしい役割を持つ", "新しいことを、自分に合った形で学ぶ"],
      en: ["recording your experience in stories or writing", "having a role of your own in community or hobby circles", "learning something new in a way that suits you"],
      vi: ["lưu lại kinh nghiệm qua câu chuyện hay trang viết", "có vai trò riêng ở cộng đồng hay nhóm sở thích", "học điều mới theo cách hợp với mình"],
    },
  },
  no_boc: {
    young: {
      ja: ["価値観の違う人とも交流してみる", "一緒にいて自然体でいられる仲間を大切にする", "サークルや集まりに参加してみる"],
      en: ["spending time with people whose values differ from yours", "valuing friends you can be yourself with", "joining a club or a gathering"],
      vi: ["giao lưu cả với người có giá trị sống khác mình", "trân trọng những người bạn mà ở bên mình được là chính mình", "tham gia một câu lạc bộ hay buổi gặp gỡ"],
    },
    prime: {
      ja: ["支え合える人とのつながりを育てる", "人と人をつなぐ役割を引き受ける", "付き合いの量より質を見直す"],
      en: ["growing ties with people you can support and be supported by", "taking on a role of connecting people", "looking at the quality of your connections more than the number"],
      vi: ["vun đắp quan hệ với những người cùng nâng đỡ nhau", "nhận vai trò kết nối mọi người", "xem lại chất lượng hơn là số lượng các mối quan hệ"],
    },
    transition: {
      ja: ["仕事以外の友人やコミュニティを広げる", "長く付き合ってきた人との時間を大切にする", "新しい集まりに顔を出してみる"],
      en: ["widening friendships and communities beyond work", "treasuring time with people you've known long", "dropping in on a new gathering"],
      vi: ["mở rộng bạn bè và cộng đồng ngoài công việc", "trân trọng thời gian với người quen lâu năm", "thử ghé một buổi gặp gỡ mới"],
    },
    elder: {
      ja: ["友人や仲間と、自分に合った形で連絡を取り合う", "地域や趣味の場で、新しい人と出会う", "人とのつながりの思い出を書き残す"],
      en: ["keeping in touch with friends in a way that suits you", "meeting new people through community or hobbies", "writing down memories of the people in your life"],
      vi: ["giữ liên lạc với bạn bè theo cách hợp với mình", "gặp gỡ người mới qua cộng đồng hay sở thích", "ghi lại kỷ niệm về những người mình quý"],
    },
  },
  thien_di: {
    young: {
      ja: ["新しい場所への挑戦――留学や転職、異文化との交流", "旅で、知らない土地や人に出会う", "外の世界で自分がどう見られているかを知る"],
      en: ["new places: studying abroad, changing jobs, meeting other cultures", "travelling to unfamiliar places and people", "learning how the wider world sees you"],
      vi: ["thử sức ở nơi mới: du học, đổi việc, giao lưu văn hóa", "đi xa để gặp vùng đất và con người mới", "biết thế giới bên ngoài nhìn mình ra sao"],
    },
    prime: {
      ja: ["他の地域や海外との仕事、新しい市場や人脈の開拓", "外での活動を通して、自分の評判を育てる", "出張や旅を、学びの機会にする"],
      en: ["work across regions or abroad, opening new markets or networks", "growing your reputation through what you do outside", "turning trips into chances to learn"],
      vi: ["làm việc với vùng khác hay nước ngoài, mở thị trường hay quan hệ mới", "vun đắp uy tín qua những hoạt động bên ngoài", "biến chuyến công tác, chuyến đi thành dịp học hỏi"],
    },
    transition: {
      ja: ["生活拠点の変更や、二つの場所での暮らしを考える", "行ってみたかった場所への旅", "地域活動や趣味のコミュニティに加わる"],
      en: ["considering a new base, or living in two places", "a trip to somewhere you've long wanted to go", "joining community activities or hobby circles"],
      vi: ["cân nhắc đổi nơi sống hay sống ở hai nơi", "một chuyến đi đến nơi từ lâu mong muốn", "tham gia hoạt động cộng đồng hay nhóm sở thích"],
    },
    elder: {
      ja: ["自分に合った方法で、新しい場所や経験に触れる", "家族や友人との行き来を楽しむ", "旅や出会いの思い出を、誰かに伝える"],
      en: ["meeting new places and experiences in a way that suits you", "enjoying visits with family and friends", "sharing memories of journeys and encounters"],
      vi: ["chạm đến nơi chốn, trải nghiệm mới theo cách hợp với mình", "vui với những lần thăm hỏi gia đình, bạn bè", "kể lại kỷ niệm về những chuyến đi và cuộc gặp gỡ"],
    },
  },
  tat_ach: {
    young: {
      ja: ["自分の体のリズムを知る", "ストレスとの付き合い方を見つける", "睡眠や食事の習慣を整える"],
      en: ["getting to know your body's rhythm", "finding your own way of dealing with stress", "settling habits of sleep and meals"],
      vi: ["hiểu nhịp sinh học của cơ thể mình", "tìm cách riêng để đối diện căng thẳng", "ổn định thói quen ngủ và ăn uống"],
    },
    prime: {
      ja: ["忙しい中でも、体と心を休める時間を確保する", "無理が続いていないか、ときどき立ち止まる", "自分に合う運動や気分転換を続ける"],
      en: ["keeping time to rest body and mind, even when busy", "pausing now and then to check you're not overdoing it", "sticking with exercise or breaks that suit you"],
      vi: ["giữ thời gian nghỉ ngơi cho thân và tâm dù bận", "thỉnh thoảng dừng lại xem mình có đang quá sức", "duy trì vận động hay thư giãn hợp với mình"],
    },
    transition: {
      ja: ["これからの体との付き合い方を考える", "健診や生活習慣を見直す", "心と体がゆるむ習慣をつくる"],
      en: ["thinking about how to care for your body in the years ahead", "reviewing check-ups and daily habits", "making habits that relax body and mind"],
      vi: ["nghĩ về cách chăm sóc cơ thể những năm tới", "xem lại việc khám định kỳ và thói quen sống", "tạo thói quen giúp thân tâm thư thái"],
    },
    elder: {
      ja: ["その日の自分の調子に合わせて、心地よく過ごす工夫をする", "自分をいたわる時間を大切にする", "まわりの人と、気持ちよく助け合う"],
      en: ["finding ways to feel comfortable that suit how you feel each day", "treasuring time to take care of yourself", "helping and being helped, comfortably, with those around you"],
      vi: ["tìm cách sống thoải mái hợp với cảm giác của mình mỗi ngày", "trân trọng thời gian chăm sóc bản thân", "vui vẻ giúp đỡ và nhận sự giúp đỡ từ người xung quanh"],
    },
  },
  tai_bach: {
    young: {
      ja: ["お金の使い方の、自分なりのルールをつくる", "どう稼ぐか、どんな技能を身につけるか考える", "小さく貯める習慣を始める"],
      en: ["making your own rules for spending", "thinking about how you'll earn and what skills to build", "starting a small habit of saving"],
      vi: ["đặt nguyên tắc chi tiêu cho riêng mình", "nghĩ về cách kiếm tiền và kỹ năng muốn rèn", "bắt đầu thói quen tiết kiệm nhỏ"],
    },
    prime: {
      ja: ["収入と支出の流れを見直す", "将来に向けた備えを考える", "お金を、大切にしたいことのために使う"],
      en: ["reviewing how money comes in and goes out", "thinking about putting something aside for the future", "spending on what you truly value"],
      vi: ["xem lại dòng thu chi", "nghĩ về việc dành dụm cho tương lai", "dùng tiền cho những điều mình thật sự trân trọng"],
    },
    transition: {
      ja: ["これからの暮らしに合うお金の使い方を考える", "蓄えを、楽しみや学びにどう使うか決める", "家族と、お金について話しておく"],
      en: ["thinking about spending that fits the life ahead", "deciding how to use savings for enjoyment or learning", "talking with your family about money"],
      vi: ["nghĩ về cách chi tiêu hợp với cuộc sống sắp tới", "quyết định dùng khoản tích lũy cho niềm vui hay việc học", "trò chuyện với gia đình về chuyện tiền bạc"],
    },
    elder: {
      ja: ["持っているものを、心地よい暮らしのために使う", "大切な物や思いを、誰にどう託すか考える", "お金にまつわる経験や知恵を伝える"],
      en: ["using what you have for a comfortable life", "thinking about how, and to whom, to entrust what matters", "passing on what you've learned about money"],
      vi: ["dùng những gì mình có cho cuộc sống dễ chịu", "nghĩ xem gửi gắm vật và tâm ý quý giá cho ai, thế nào", "truyền lại kinh nghiệm, hiểu biết về tiền bạc"],
    },
  },
  tu_tuc: {
    young: {
      ja: ["夢中になれる創作や遊びを持つ", "年下の人や子どもと関わってみる", "自分が何を生み出したいか考える"],
      en: ["having something creative or playful to lose yourself in", "spending time with younger people or children", "thinking about what you'd like to create"],
      vi: ["có một hoạt động sáng tạo hay trò vui để đắm mình", "dành thời gian với người nhỏ tuổi hay trẻ em", "nghĩ về điều mình muốn tạo ra"],
    },
    prime: {
      ja: ["身近な子どもや若い世代との関わりを大切にする", "仕事や趣味で、何かを生み出す", "後輩を育てる"],
      en: ["valuing your ties with children and young people around you", "creating something through work or hobbies", "helping younger people grow"],
      vi: ["trân trọng sự gắn bó với trẻ nhỏ và người trẻ quanh mình", "tạo ra điều gì đó qua công việc hay sở thích", "dìu dắt người trẻ"],
    },
    transition: {
      ja: ["子どもや若い世代との関係を、新しい形で育てる", "長く温めてきた創作に取り組む", "経験を次の世代に手渡す"],
      en: ["growing your bond with children or the young in a new form", "taking up a creative project you've long held", "handing your experience to the next generation"],
      vi: ["vun đắp quan hệ với con trẻ, người trẻ theo cách mới", "bắt tay vào dự định sáng tạo ấp ủ lâu nay", "trao lại kinh nghiệm cho thế hệ sau"],
    },
    elder: {
      ja: ["子や孫、若い人と、話や時間を分かち合う", "手づくりや創作を、自分のペースで楽しむ", "伝えたい言葉や思い出を残す"],
      en: ["sharing stories and time with children, grandchildren or the young", "enjoying making things at your own pace", "leaving words and memories you want to pass on"],
      vi: ["chia sẻ chuyện trò, thời gian với con cháu hay người trẻ", "tận hưởng việc làm, sáng tạo theo nhịp của mình", "để lại lời nhắn và kỷ niệm muốn trao"],
    },
  },
  phu_the: {
    young: {
      ja: ["どんな関係を大切にしたいか考える", "相手との違いを、話し合いで理解する", "深く心を通わせる人との時間を持つ"],
      en: ["thinking about what kind of relationship you want", "understanding differences with someone by talking", "spending time with someone you connect with deeply"],
      vi: ["nghĩ về kiểu quan hệ mình muốn trân trọng", "hiểu sự khác biệt bằng cách trò chuyện", "dành thời gian cho người mình gắn bó sâu sắc"],
    },
    prime: {
      ja: ["パートナーや身近な人との役割や時間の使い方を見直す", "感謝や気持ちを言葉にして伝える", "二人で新しいことを始めてみる"],
      en: ["revisiting roles and time with your partner or someone close", "putting thanks and feelings into words", "starting something new together"],
      vi: ["xem lại vai trò và thời gian với người bạn đời hay người thân thiết", "nói thành lời sự biết ơn và tình cảm", "cùng nhau bắt đầu điều gì đó mới"],
    },
    transition: {
      ja: ["これからの暮らし方を、そばにいる人と話し合う", "それぞれの時間と一緒の時間のバランスを考える", "そばにいる人との関係を、あらためて大切にする"],
      en: ["talking with the person beside you about how to live from now on", "balancing time apart and time together", "valuing anew the person beside you"],
      vi: ["bàn với người bên cạnh về cách sống từ nay", "cân bằng thời gian riêng và thời gian bên nhau", "trân trọng thêm người ở bên mình"],
    },
    elder: {
      ja: ["そばにいる人との日々の時間を味わう", "共に過ごした思い出を振り返り、残す", "気持ちを、言葉や手紙で伝える"],
      en: ["savouring everyday time with the person beside you", "looking back on and recording memories you share", "sharing your feelings in words or a letter"],
      vi: ["tận hưởng thời gian mỗi ngày bên người đồng hành", "nhìn lại và lưu giữ những kỷ niệm chung", "bày tỏ tình cảm bằng lời hay một lá thư"],
    },
  },
  huynh_de: {
    young: {
      ja: ["きょうだいや同世代の仲間と励まし合う", "同じ目標を持つ仲間を見つける", "競い合いを、成長のきっかけにする"],
      en: ["encouraging each other with siblings or peers", "finding companions who share a goal", "turning rivalry into a chance to grow"],
      vi: ["động viên nhau cùng anh chị em hay bạn đồng trang lứa", "tìm bạn đồng hành cùng mục tiêu", "biến cạnh tranh thành động lực trưởng thành"],
    },
    prime: {
      ja: ["きょうだいや同僚と、協力し合える関係を育てる", "同世代の仲間と、情報や経験を分かち合う", "家族の中での役割分担を話し合う"],
      en: ["growing cooperative ties with siblings or colleagues", "sharing information and experience with peers", "talking over how family roles are shared"],
      vi: ["vun đắp quan hệ hợp tác với anh chị em, đồng nghiệp", "chia sẻ thông tin, kinh nghiệm với bạn cùng lứa", "bàn bạc phân chia vai trò trong gia đình"],
    },
    transition: {
      ja: ["きょうだいや古い仲間との時間を取り戻す", "家族のこれからを、きょうだいと話しておく", "同世代の仲間と、新しい楽しみを見つける"],
      en: ["making time again for siblings and old friends", "talking with siblings about the family's future", "finding new pleasures with people your age"],
      vi: ["dành lại thời gian cho anh chị em, bạn cũ", "bàn với anh chị em về tương lai gia đình", "cùng bạn đồng trang lứa tìm niềm vui mới"],
    },
    elder: {
      ja: ["きょうだいや古くからの仲間と、思い出を語り合う", "自分に合った形で、連絡を取り合う", "共に過ごした時間を書き残す"],
      en: ["reminiscing with siblings and long-time companions", "keeping in touch in a way that suits you", "writing down the time you've shared"],
      vi: ["cùng anh chị em, bạn lâu năm ôn lại kỷ niệm", "giữ liên lạc theo cách hợp với mình", "ghi lại những tháng ngày bên nhau"],
    },
  },
};

/** The question each theme ends with, around the traits of its lead stars. */
export const SECTION_ASK: Record<"love" | "career" | "wealth" | "relationships" | "family", (kw: string[], locale: "en" | "vi" | "ja") => string> = {
  love: (kw, l) =>
    ({
      ja: `パートナーや大切な人との関係で、「${kw.join("」「")}」が表れたと感じた場面はありますか？`,
      en: `In your relationship with a partner or someone dear, were there moments when “${kw.join("”, “")}” showed?`,
      vi: `Trong mối quan hệ với người bạn đời hay người thương, có lúc nào bạn thấy “${kw.join("”, “")}” hiện ra không?`,
    })[l],
  career: (kw, l) =>
    ({
      ja: `仕事や、自分の役割の中で、「${kw.join("」「")}」が活きたと感じた場面はありますか？`,
      en: `In your work or the roles you play, when did “${kw.join("”, “")}” serve you well?`,
      vi: `Trong công việc hay vai trò của mình, khi nào “${kw.join("”, “")}” giúp ích cho bạn?`,
    })[l],
  wealth: (kw, l) =>
    ({
      ja: `お金の使い方や貯め方に、「${kw.join("」「")}」が表れていると思いますか？`,
      en: `Do you see “${kw.join("”, “")}” in the way you spend or save?`,
      vi: `Bạn có thấy “${kw.join("”, “")}” trong cách mình chi tiêu hay để dành không?`,
    })[l],
  relationships: (kw, l) =>
    ({
      ja: `友人や仲間との関わりの中で、「${kw.join("」「")}」を感じる人はいますか？ 自分自身のことでも、相手のことでも。`,
      en: `Among your friends and companions, is there someone in whom you feel “${kw.join("”, “")}” — yourself included?`,
      vi: `Giữa bạn bè và những người đồng hành, có ai khiến bạn cảm nhận “${kw.join("”, “")}” — kể cả chính bạn?`,
    })[l],
  family: (kw, l) =>
    ({
      ja: `家族や住まいのことで、「${kw.join("」「")}」が表れた場面はありますか？`,
      en: `In your family or your home, were there moments when “${kw.join("”, “")}” showed?`,
      vi: `Trong gia đình hay chuyện nhà cửa, có lúc nào “${kw.join("”, “")}” hiện ra không?`,
    })[l],
};
