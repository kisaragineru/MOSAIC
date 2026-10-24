/** "How to read Tử Vi": a beginner's guide, in plain words. */
import type { I18nText } from "./questions";

export interface GuideStep {
  title: I18nText;
  body: I18nText;
}

export const GUIDE = {
  title: { ja: "Tử Vi の読み方ガイド", en: "How to read Tử Vi", vi: "Cách đọc lá số Tử Vi" } as I18nText,
  lead: {
    ja: "Tử Vi（トゥーヴィー／紫微斗数）は、ベトナムで長く親しまれてきた伝統的な命術です。生まれた日と時刻から「命盤」という図をつくり、星の並びから性格や人生の流れを読みます。このページでは、はじめての人でも自分の命盤を読めるように、しくみと読み方の順番をやさしく説明します。",
    en: "Tử Vi (Purple Star astrology) is a traditional system long loved in Vietnam. From the date and hour of your birth it draws a chart, and reads character and the flow of life from how the stars fall. This page explains how it works and the order to read it in, so you can read your own chart even if you've never seen one.",
    vi: "Tử Vi là một môn mệnh lý truyền thống được yêu thích lâu đời ở Việt Nam. Từ ngày giờ sinh, người ta lập một “lá số” và đọc tính cách cũng như dòng chảy cuộc đời từ cách các sao an vị. Trang này giải thích cách hoạt động và thứ tự đọc, để bạn tự đọc được lá số của mình dù chưa từng xem bao giờ.",
  } as I18nText,
  toc: { ja: "目次", en: "Contents", vi: "Mục lục" } as I18nText,

  whatTitle: { ja: "1. そもそも Tử Vi とは？", en: "1. What is Tử Vi?", vi: "1. Tử Vi là gì?" } as I18nText,
  what: [
    {
      ja: "Tử Vi は、中国で生まれベトナムで独自に発展した「命盤占い」です。名前は、いちばん大事な星「紫微星（Tử Vi）」から来ています。",
      en: "Tử Vi is a chart-based tradition born in China and developed in its own way in Vietnam. It's named after its most important star, Tử Vi (the Purple Star).",
      vi: "Tử Vi là môn lập lá số ra đời ở Trung Hoa và phát triển theo cách riêng tại Việt Nam. Tên gọi lấy từ ngôi sao quan trọng nhất — sao Tử Vi.",
    },
    {
      ja: "星座占いが「生まれた月」だけで分けるのに対して、Tử Vi は生まれた年・月・日・時刻のすべてを使います。そのため同じ誕生日でも、生まれた時刻が2時間ちがうと命盤が変わります。",
      en: "Where sun-sign astrology sorts people by birth month alone, Tử Vi uses the year, month, day and hour. Two people born on the same day but two hours apart can have different charts.",
      vi: "Nếu chiêm tinh cung hoàng đạo chỉ dựa vào tháng sinh, thì Tử Vi dùng cả năm, tháng, ngày và giờ sinh. Cùng ngày sinh nhưng cách nhau hai tiếng có thể cho ra lá số khác nhau.",
    },
    {
      ja: "MOSAIC では Tử Vi を「未来を言い当てるもの」ではなく、昔の人が考えた「人を見るための地図」として扱っています。当たっているかどうかより、自分を振り返るきっかけとして楽しんでください。",
      en: "MOSAIC treats Tử Vi not as a way to predict the future but as a map for looking at people, drawn up by those who came before. Enjoy it as a prompt to reflect, rather than a test of whether it's right.",
      vi: "MOSAIC không xem Tử Vi là công cụ đoán tương lai, mà là một tấm bản đồ để nhìn con người do người xưa vẽ ra. Hãy xem nó như một gợi ý để tự soi chiếu, hơn là thước đo đúng sai.",
    },
  ] as I18nText[],

  chartTitle: { ja: "2. 命盤のしくみ ― 12の部屋と星", en: "2. The chart: twelve rooms and their stars", vi: "2. Lá số: mười hai căn phòng và các sao" } as I18nText,
  chart: [
    {
      ja: "命盤は、まわりに並んだ12のマス（宮）でできています。それぞれのマスは「部屋」のようなもので、部屋ごとに担当する人生の分野が決まっています。たとえば「命宮」はあなた自身、「夫妻宮」は恋愛やパートナー、「官禄宮」は仕事です。",
      en: "The chart is made of twelve boxes (palaces) around the edge. Think of each as a room, and each room looks after one area of life: Mệnh is you, Phu Thê is love and partnership, Quan Lộc is work, and so on.",
      vi: "Lá số gồm mười hai ô (cung) xếp quanh viền. Hãy hình dung mỗi ô là một căn phòng, và mỗi phòng phụ trách một lĩnh vực của cuộc đời: Mệnh là bạn, Phu Thê là tình cảm, Quan Lộc là công việc, v.v.",
    },
    {
      ja: "それぞれの部屋に、生まれた日時で決まる星が入ります。部屋の「テーマ」と、そこに入った星の「性格」を組み合わせて読むのが、Tử Vi の基本です。",
      en: "Stars fixed by your birth date and hour move into the rooms. Reading Tử Vi is, at heart, combining a room's theme with the character of the stars in it.",
      vi: "Các sao, được xác định theo ngày giờ sinh, an vào từng phòng. Đọc Tử Vi về cơ bản là kết hợp chủ đề của căn phòng với tính cách của các sao trong đó.",
    },
    {
      ja: "まん中の4マスには、生まれ年の干支、納音（五行）、局など、命盤全体の情報が書かれています。",
      en: "The four boxes in the middle hold information about the whole chart: the birth year's stem and branch, its element (Nạp Âm), the Cục, and so on.",
      vi: "Bốn ô ở giữa ghi thông tin chung của lá số: can chi năm sinh, nạp âm (ngũ hành), cục, v.v.",
    },
  ] as I18nText[],
  diagramCaption: {
    ja: "例：命宮が「寅」にある命盤。紫の部屋が命宮、ピンクの部屋が一緒に読む三方四正です。",
    en: "Example: a chart with Mệnh in Dần. The purple room is Mệnh; the pink rooms are read with it (tam phương tứ chính).",
    vi: "Ví dụ: lá số có cung Mệnh ở Dần. Ô tím là cung Mệnh; các ô hồng là tam phương tứ chính được đọc cùng.",
  } as I18nText,
  diagramCenter: { ja: "命盤の中心\n生まれ年・五行・局", en: "Centre of the chart\nbirth year · element · Cục", vi: "Trung tâm lá số\nnăm sinh · ngũ hành · cục" } as I18nText,

  palacesTitle: { ja: "3. 12の宮（部屋）が表すもの", en: "3. What the twelve palaces cover", vi: "3. Mười hai cung nói về điều gì" } as I18nText,
  palacesLead: {
    ja: "命宮から時計まわりに、次の順番で並びます。どの部屋が命盤のどこに来るかは、人によって違います。",
    en: "Starting from Mệnh, they run around the chart in this order. Where each room lands differs from person to person.",
    vi: "Bắt đầu từ cung Mệnh, các cung xếp theo thứ tự này quanh lá số. Mỗi cung rơi vào vị trí nào thì tùy từng người.",
  } as I18nText,

  starsTitle: { ja: "4. 14の主星 ― 主役たちの性格", en: "4. The fourteen main stars", vi: "4. Mười bốn chính tinh" } as I18nText,
  starsLead: {
    ja: "主星は、部屋の性格を決める「主役」です。ここでは、それぞれをひとことで言うとどんな人かを紹介します。どの星にも良い面と気をつけたい面があり、「良い星・悪い星」はありません。",
    en: "Main stars are the leads that set a room's character. Here's each one as a kind of person. Every star has strengths and things to watch — none is simply good or bad.",
    vi: "Chính tinh là “vai chính” quyết định tính chất của căn phòng. Dưới đây là mỗi sao dưới hình dạng một kiểu người. Sao nào cũng có điểm mạnh và điều cần lưu ý — không có sao chỉ tốt hay chỉ xấu.",
  } as I18nText,
  auxTitle: { ja: "副星と四化 ― 味つけ役", en: "Supporting stars and the four Hóa", vi: "Phụ tinh và Tứ Hóa" } as I18nText,
  aux: {
    ja: "主星のほかに、たくさんの副星（脇役）があります。助けになる星（吉星）もあれば、注意をうながす星（煞星）もあります。また、生まれ年によって4つの星に「化禄・化権・化科・化忌」というしるしがつき、その部屋の色合いを強めます。どれも主星の読みに「味つけ」をするもの、と考えるとわかりやすいでしょう。",
    en: "Besides the main stars there are many supporting stars — some helpful, some that ask for care. The birth year also marks four stars with Hóa Lộc, Quyền, Khoa or Kỵ, which deepen the colour of the room they're in. Think of all of them as seasoning on top of the main stars.",
    vi: "Ngoài chính tinh còn có nhiều phụ tinh — có sao hỗ trợ (cát tinh), có sao nhắc nhở cẩn trọng (sát tinh). Năm sinh cũng gắn bốn dấu Hóa Lộc, Quyền, Khoa, Kỵ lên bốn sao, tô đậm màu sắc của cung nơi chúng đóng. Hãy xem tất cả như “gia vị” thêm vào phần đọc chính tinh.",
  } as I18nText,

  stepsTitle: { ja: "5. 読み方の手順", en: "5. Reading it, step by step", vi: "5. Các bước đọc lá số" } as I18nText,
  steps: [
    {
      title: { ja: "命宮を見つける", en: "Find Mệnh", vi: "Tìm cung Mệnh" },
      body: {
        ja: "まず「命宮（Mệnh）」の部屋を探します。ここがあなた自身を表す、いちばん大事な部屋です。MOSAIC の命盤では、命宮に印がついています。",
        en: "First find the Mệnh room — the most important one, standing for you. In MOSAIC's chart it's marked.",
        vi: "Trước tiên hãy tìm cung Mệnh — căn phòng quan trọng nhất, đại diện cho chính bạn. Trên lá số của MOSAIC, cung này được đánh dấu.",
      },
    },
    {
      title: { ja: "主星の性格を読む", en: "Read the main stars", vi: "Đọc chính tinh" },
      body: {
        ja: "命宮に入っている主星を見て、上の「14の主星」で性格を確かめます。主星が2つあれば、二つの顔をあわせ持つと読みます。主星がない（無主星）ときは、向かいの部屋の主星を借りて読みます。",
        en: "Look at the main stars in Mệnh and check their characters in the list above. Two stars mean two faces at once. With no main star, borrow the ones from the room opposite.",
        vi: "Xem các chính tinh trong cung Mệnh và tra tính cách ở danh sách trên. Có hai sao nghĩa là có hai gương mặt. Nếu không có chính tinh, hãy mượn sao của cung đối diện.",
      },
    },
    {
      title: { ja: "まわりの部屋も合わせて見る", en: "Look at the related rooms", vi: "Xem các cung liên quan" },
      body: {
        ja: "命宮と三角形の位置にある2つの部屋（官禄宮・財帛宮）と、向かいの部屋（遷移宮）を合わせて「三方四正」と呼びます。ここの星も、あなたを支える力として一緒に読みます。",
        en: "The two rooms at the points of a triangle with Mệnh (Quan Lộc and Tài Bạch) and the one opposite (Thiên Di) are its related rooms. Their stars are read too, as support.",
        vi: "Hai cung tạo thành tam giác với Mệnh (Quan Lộc, Tài Bạch) và cung đối diện (Thiên Di) gọi là tam phương tứ chính. Sao ở đó cũng được đọc như lực hỗ trợ.",
      },
    },
    {
      title: { ja: "副星と四化で味つけする", en: "Add the seasoning", vi: "Thêm gia vị" },
      body: {
        ja: "部屋にある副星や四化のしるしを見て、読みを少し調整します。化禄があれば恵みが入りやすい、化忌があればていねいに扱う、といった具合です。",
        en: "Adjust the reading with the supporting stars and Hóa marks: Hóa Lộc suggests good things flow in; Hóa Kỵ suggests handling with care.",
        vi: "Điều chỉnh phần đọc bằng phụ tinh và dấu Hóa: Hóa Lộc gợi ý điều tốt dễ đến; Hóa Kỵ gợi ý nên đối xử cẩn thận.",
      },
    },
    {
      title: { ja: "ほかの分野も同じように", en: "Do the same for other areas", vi: "Làm tương tự với lĩnh vực khác" },
      body: {
        ja: "恋愛なら夫妻宮、仕事なら官禄宮、お金なら財帛宮…と、知りたい分野の部屋で同じ手順をくり返します。",
        en: "For love, use Phu Thê; for work, Quan Lộc; for money, Tài Bạch — and repeat the same steps.",
        vi: "Muốn xem tình cảm thì dùng cung Phu Thê, công việc là Quan Lộc, tiền bạc là Tài Bạch — rồi lặp lại các bước trên.",
      },
    },
    {
      title: { ja: "大限で「いまの時期」を見る", en: "Use Đại Hạn for “now”", vi: "Dùng Đại Hạn để xem “hiện tại”" },
      body: {
        ja: "人生は10年ずつの「大限」に区切られ、それぞれの10年でどれかの部屋が主役になります。いまの大限がどの部屋かを見ると、この時期のテーマが見えてきます。",
        en: "Life is split into ten-year Đại Hạn, each led by one room. Seeing which room leads your current decade shows the theme of this period.",
        vi: "Cuộc đời chia thành các Đại Hạn mười năm, mỗi chặng do một cung dẫn dắt. Xem cung nào dẫn dắt chặng hiện tại sẽ thấy chủ đề của giai đoạn này.",
      },
    },
  ] as GuideStep[],

  mosaicTitle: { ja: "6. MOSAIC の画面での見方", en: "6. Where to find it in MOSAIC", vi: "6. Xem ở đâu trong MOSAIC" } as I18nText,
  mosaic: [
    { ja: "いちばん上のカード：命宮の主星と、ひとことで言うとどんな人か。", en: "Top card: the main stars of Mệnh, and what kind of person that is.", vi: "Thẻ trên cùng: chính tinh của cung Mệnh và kiểu người đó." },
    { ja: "「テーマ別の診断」：性格・恋愛・仕事などのタブごとに、まず「かんたんに言うと」、その下にくわしい伝統の読み。", en: "“Readings by theme”: tabs for personality, love, work and more — first in plain words, then the detailed traditional reading.", vi: "“Luận giải theo chủ đề”: các tab tính cách, tình cảm, công việc… — trước là phần nói đơn giản, sau là luận giải truyền thống chi tiết." },
    { ja: "「10年ごとの人生ステージ」：10年ごとの大限と、いまの時期。記録とつなげて振り返れます。", en: "“Your life in 10-year stages”: each ten-year cycle and where you are now, linked to your records.", vi: "“Các giai đoạn 10 năm của cuộc đời”: từng Đại Hạn mười năm và giai đoạn hiện tại, liên kết với ghi chép của bạn." },
    { ja: "「あなたの命盤」：12の部屋の全体図。部屋をタップすると、その部屋の星と意味が見られます。", en: "“Your chart”: the whole twelve-room map. Tap a room to see its stars and what they mean.", vi: "“Lá số của bạn”: toàn bộ mười hai cung. Chạm vào một cung để xem các sao và ý nghĩa." },
  ] as I18nText[],

  careTitle: { ja: "7. 付き合い方のヒント", en: "7. A few words of care", vi: "7. Vài lời lưu ý" } as I18nText,
  care: [
    { ja: "生まれた時刻が分からないと、命宮や主星が決められません。分かる範囲で入れ、分からない場合は「考えられる12の時刻を見る」で見比べられます。", en: "Without a birth hour, Mệnh and the main stars can't be set. Enter what you know; if you don't know the hour, compare all twelve with “Explore the 12 possible hours”.", vi: "Không có giờ sinh thì không xác định được cung Mệnh và chính tinh. Hãy nhập những gì bạn biết; nếu không rõ giờ, có thể so sánh cả mười hai khả năng." },
    { ja: "流派によって細かいルールが違うことがあります。MOSAIC は一つの流派の決まりに沿って計算し、そのルールの版を命盤の下に記しています。", en: "Schools differ in the details. MOSAIC follows one school's rules and notes which version under the chart.", vi: "Các trường phái có thể khác nhau ở chi tiết. MOSAIC tính theo quy tắc của một trường phái và ghi phiên bản ở dưới lá số." },
    { ja: "命盤は「こうなる」という決定ではありません。あなたの答えや記録から見えるあなたと、くらべて楽しむ読み物です。", en: "A chart isn't a verdict on what will happen. It's something to read alongside the you that your answers and records show.", vi: "Lá số không phải là phán quyết về tương lai. Đó là bài đọc để đặt cạnh con người bạn hiện ra qua câu trả lời và ghi chép." },
  ] as I18nText[],

  glossaryTitle: { ja: "8. 用語集", en: "8. Glossary", vi: "8. Thuật ngữ" } as I18nText,
  back: { ja: "自分の命盤を見る", en: "See your chart", vi: "Xem lá số của bạn" } as I18nText,
};
