/** Long-form manual text, life chapter: values and how you live. Same voice as manual-axes.ts. */
import type { TendencyKey } from "./questions";
import type { ManualAxis } from "./manual-axes";

export const MANUAL_LIFE: Partial<Record<TendencyKey, ManualAxis>> = {
  saving: {
    pos: {
      portrait: {
        ja: "お金は、使う前に「これから」のことを考えるタイプです。少しずつ積み上げていくことに安心を感じ、必要なときに困らない備えを大切にしています。衝動買いより、じっくり選んだものを長く使うほうが満足できるでしょう。",
        en: "Before you spend, you think about what's ahead. Building up little by little gives you a sense of safety, and you value being prepared for when it counts. Something chosen slowly and used for years satisfies you more than an impulse buy.",
        vi: "Trước khi chi tiêu, bạn nghĩ đến tương lai. Tích lũy từng chút một mang lại cảm giác an toàn, và bạn coi trọng việc chuẩn bị sẵn cho lúc cần. Một món đồ được chọn kỹ và dùng lâu năm làm bạn hài lòng hơn một lần mua bốc đồng.",
      },
      thrive: {
        ja: "見通しの立つ暮らし、目標に向けて少しずつ進める計画、お金の話を落ち着いてできる相手と一緒だと安心です。",
        en: "You feel at ease with a predictable life, plans that move step by step toward a goal, and people you can talk about money with calmly.",
        vi: "Bạn thấy an tâm với cuộc sống ổn định, kế hoạch tiến từng bước tới mục tiêu, và người có thể bình tĩnh nói chuyện tiền bạc cùng bạn.",
      },
      ask: {
        ja: "大きな出費は、できれば前もって相談してもらえるとうれしいです。反対したいのではなく、一緒に準備したいだけです。",
        en: "For big expenses, I'd love to talk it over beforehand. It's not to say no — I just want to prepare together.",
        vi: "Với những khoản chi lớn, tôi mong được bàn trước. Không phải để phản đối — tôi chỉ muốn cùng nhau chuẩn bị.",
      },
      watch: {
        ja: "備えを優先するあまり、今しかできない楽しみを見送ってしまうことがあります。「楽しむためのお金」も予算に入れておくと気持ちよく使えます。",
        en: "Putting the future first can mean passing on joys that only exist now. A budget line just for enjoyment lets you spend without guilt.",
        vi: "Ưu tiên tương lai đôi khi khiến bạn bỏ lỡ niềm vui chỉ có ở hiện tại. Dành riêng một khoản cho việc tận hưởng sẽ giúp bạn chi tiêu mà không áy náy.",
      },
    },
    neg: {
      portrait: {
        ja: "お金は、今の暮らしや経験を豊かにするために使いたいタイプです。旅や食事、人との時間など、記憶に残るものに価値を感じています。気前のよさが、周りの人を楽しませていることも多いでしょう。",
        en: "You'd rather use money to make life rich now. Travel, food, time with people — things that become memories — are what feel worth it, and your generosity often brightens the people around you.",
        vi: "Bạn muốn dùng tiền để làm cuộc sống hiện tại phong phú hơn. Du lịch, ăn uống, thời gian bên mọi người — những thứ trở thành kỷ niệm — mới là điều đáng giá, và sự hào phóng của bạn thường làm người xung quanh vui vẻ.",
      },
      thrive: {
        ja: "新しい体験に出会える暮らし、楽しみを分かち合える仲間、今を大切にする価値観の相手と一緒だと生き生きします。",
        en: "You come alive with new experiences, friends to share the fun with, and people who also value the present.",
        vi: "Bạn tràn đầy sức sống với những trải nghiệm mới, bạn bè cùng chia sẻ niềm vui, và người cũng trân trọng hiện tại.",
      },
      ask: {
        ja: "出かけようと誘うのは、あなたとの時間を楽しみたいからです。予算が合わないときは、気軽にそう言ってください。",
        en: "When I suggest going out, it's because I want to enjoy time with you. If it doesn't fit your budget, just say so.",
        vi: "Khi tôi rủ đi chơi, đó là vì tôi muốn tận hưởng thời gian bên bạn. Nếu không hợp ngân sách, cứ nói thẳng với tôi.",
      },
      watch: {
        ja: "その場の楽しさを優先して、あとで少し慌てることがあるかもしれません。先に「残す分」を分けておくと、安心して使えます。",
        en: "Enjoying the moment can leave you scrambling later. Setting aside what you'll keep first lets you spend the rest freely.",
        vi: "Tận hưởng khoảnh khắc đôi khi khiến bạn chật vật về sau. Để riêng phần cần giữ trước tiên sẽ giúp bạn thoải mái tiêu phần còn lại.",
      },
    },
    mixed: {
      ja: "お金の使い方にはメリハリがあるようです。こだわるところには使い、そうでないところは節約する、というバランスかもしれません。",
      en: "You seem to spend selectively — generous where it matters to you, careful elsewhere.",
      vi: "Bạn dường như chi tiêu có chọn lọc — rộng rãi với điều mình coi trọng, tiết kiệm ở những chỗ khác.",
    },
  },
  ambition: {
    pos: {
      portrait: {
        ja: "今より一歩先を目指すことに、やりがいを感じるタイプです。目標があると集中力が増し、成長している実感がなによりの原動力になっています。昨日の自分を超えることを、楽しめる人でしょう。",
        en: "Reaching one step beyond where you are gives you purpose. A goal sharpens your focus, and the sense of growing is your strongest fuel. You enjoy outdoing yesterday's self.",
        vi: "Vươn xa hơn một bước so với hiện tại mang lại ý nghĩa cho bạn. Mục tiêu giúp bạn tập trung, và cảm giác đang trưởng thành là động lực mạnh nhất. Bạn thích vượt qua chính mình của ngày hôm qua.",
      },
      thrive: {
        ja: "成長の機会がある場所、目標が見えやすい仕事、互いに刺激し合える仲間のなかで、いちばん力を発揮します。",
        en: "You do your best where there's room to grow, goals are visible, and peers push each other forward.",
        vi: "Bạn làm tốt nhất ở nơi có cơ hội phát triển, mục tiêu rõ ràng, và bạn bè cùng thúc đẩy nhau tiến lên.",
      },
      ask: {
        ja: "結果だけでなく、がんばっている途中も見てもらえるとうれしいです。忙しそうなときは、遠慮なく休憩に誘ってください。",
        en: "It means a lot when you notice the effort, not just the result. And when I look busy, feel free to pull me into a break.",
        vi: "Tôi rất vui khi bạn nhận ra nỗ lực, không chỉ kết quả. Và khi tôi trông bận rộn, cứ rủ tôi nghỉ ngơi nhé.",
      },
      watch: {
        ja: "次の目標ばかり見ていると、達成したことを味わう前に走り出してしまいます。区切りごとに、自分をねぎらう時間をとってみてください。",
        en: "Keeping your eyes on the next goal can mean running on before you've enjoyed what you reached. Take time at each milestone to thank yourself.",
        vi: "Luôn nhìn vào mục tiêu tiếp theo có thể khiến bạn chạy tiếp trước khi kịp tận hưởng thành quả. Hãy dành thời gian tự khen mình ở mỗi cột mốc.",
      },
    },
    neg: {
      portrait: {
        ja: "上を目指すより、今あるものを味わうことに幸せを感じるタイプです。比べることに振り回されず、自分にとっての「ちょうどいい」を知っています。その落ち着きが、周りの人をほっとさせていることも多いでしょう。",
        en: "You find happiness in savouring what you have more than in climbing higher. You aren't pulled around by comparison and know what 'just right' means for you. That steadiness often puts the people around you at ease.",
        vi: "Bạn tìm thấy hạnh phúc trong việc tận hưởng những gì đang có hơn là leo cao hơn. Bạn không bị cuốn theo sự so sánh và biết thế nào là 'vừa đủ' với mình. Sự điềm tĩnh ấy thường khiến người xung quanh thấy nhẹ nhõm.",
      },
      thrive: {
        ja: "競争より協力が重んじられる場所、暮らしとのバランスがとれる働き方、日々の小さな楽しみを分かち合える相手と一緒だと心地よいでしょう。",
        en: "You feel good where cooperation counts more than competition, where work leaves room for life, and with people who share small daily joys.",
        vi: "Bạn thấy dễ chịu ở nơi hợp tác được coi trọng hơn cạnh tranh, công việc chừa chỗ cho cuộc sống, và với người cùng chia sẻ niềm vui nhỏ mỗi ngày.",
      },
      ask: {
        ja: "「もっと上を」と言われるより、今の暮らしを一緒に楽しんでもらえるほうがうれしいです。やる気がないわけではありません。",
        en: "I'd rather you enjoy life as it is with me than tell me to aim higher. It's not that I lack drive.",
        vi: "Tôi mong bạn cùng tận hưởng cuộc sống hiện tại hơn là bảo tôi phải vươn cao hơn. Không phải tôi thiếu động lực.",
      },
      watch: {
        ja: "居心地のよさを大事にするあまり、本当はやってみたいことを先送りにしていないか、ときどき確かめてみてください。",
        en: "Valuing comfort can quietly postpone something you'd actually love to try. Check in with yourself about that now and then.",
        vi: "Coi trọng sự thoải mái đôi khi khiến bạn lặng lẽ trì hoãn điều mình thật sự muốn thử. Thỉnh thoảng hãy tự hỏi lại mình.",
      },
    },
    mixed: {
      ja: "上を目指す気持ちと、今に満足する気持ちの両方があるようです。打ち込む分野ではとことん、ほかはほどほどに、という使い分けかもしれません。",
      en: "You seem to hold both drive and contentment — all-in on what you care about, easy-going about the rest.",
      vi: "Bạn dường như vừa có động lực vừa biết đủ — dốc hết sức cho điều mình quan tâm, thong thả với phần còn lại.",
    },
  },
  tradition: {
    pos: {
      portrait: {
        ja: "受け継がれてきた習慣や行事、家族のならわしを大切にするタイプです。季節の行事や昔からの決まりごとに、つながりや安心を感じています。人と人とを結ぶ「形」の意味を、よく分かっている人でしょう。",
        en: "You hold on to customs, festivals and family ways that have been handed down. Seasonal traditions and old routines give you a sense of belonging and safety. You understand how shared forms bind people together.",
        vi: "Bạn trân trọng phong tục, lễ hội và nếp nhà được truyền lại. Những dịp lễ theo mùa và thói quen lâu đời mang lại cho bạn cảm giác gắn kết và an toàn. Bạn hiểu rõ những 'nghi thức' chung gắn kết con người với nhau như thế nào.",
      },
      thrive: {
        ja: "家族や地域とのつながりがある暮らし、行事を一緒に楽しめる相手、礼儀が大切にされる場所で、安心して過ごせます。",
        en: "You feel at home with family and community ties, people to share celebrations with, and places where courtesy matters.",
        vi: "Bạn thấy như ở nhà khi có gắn kết với gia đình và cộng đồng, người cùng đón lễ, và nơi lễ nghĩa được coi trọng.",
      },
      ask: {
        ja: "行事やあいさつを大事にするのは、形式のためではなく、人を大切にしたいからです。一緒に参加してもらえるとうれしいです。",
        en: "I care about occasions and greetings not for form's sake, but because they're how I care for people. I'd love you to join in.",
        vi: "Tôi coi trọng các dịp lễ và lời chào hỏi không vì hình thức, mà vì đó là cách tôi quan tâm mọi người. Tôi rất vui nếu bạn cùng tham gia.",
      },
      watch: {
        ja: "「こうあるべき」が強くなると、違うやり方の人と距離ができることがあります。理由を話し合えると、お互いの大切なものが見えてきます。",
        en: "When 'this is how it should be' gets strong, it can distance you from people who do things differently. Talking about the reasons helps you both see what matters.",
        vi: "Khi 'phải như thế này' trở nên mạnh mẽ, bạn có thể xa cách người làm khác mình. Cùng nói về lý do sẽ giúp cả hai thấy điều quan trọng với nhau.",
      },
    },
    neg: {
      portrait: {
        ja: "決まりや慣習より、自分で納得したやり方を選びたいタイプです。「昔からそうだから」だけでは動きにくく、自分らしい形を探すことに意味を感じています。新しい暮らし方や価値観を、柔軟に受け入れられる人でしょう。",
        en: "You'd rather follow a way you've chosen for yourself than a rule or custom. 'It's always been done this way' isn't enough to move you, and finding your own form feels meaningful. You're open to new ways of living and new values.",
        vi: "Bạn muốn theo cách mình tự lựa chọn hơn là quy tắc hay tập tục. 'Xưa nay vẫn vậy' không đủ để thuyết phục bạn, và tìm ra cách riêng mang lại ý nghĩa cho bạn. Bạn cởi mở với lối sống và giá trị mới.",
      },
      thrive: {
        ja: "自由に選べる暮らし、多様なやり方が認められる場所、「なぜ」を一緒に考えてくれる相手と一緒だと、のびのびできます。",
        en: "You feel free with a life you can shape, where many ways are accepted, and with people who'll think through the 'why' with you.",
        vi: "Bạn thấy tự do với cuộc sống mình có thể định hình, nơi nhiều cách làm được chấp nhận, và với người cùng bạn suy nghĩ về câu hỏi 'tại sao'.",
      },
      ask: {
        ja: "慣習どおりにしないことがあっても、相手を軽んじているわけではありません。大切にしたい気持ちは同じだと知ってもらえるとうれしいです。",
        en: "If I don't follow a custom, it isn't disrespect. My wish to honour people is the same — I'd love that to be understood.",
        vi: "Nếu tôi không theo tập tục, đó không phải là thiếu tôn trọng. Mong muốn trân trọng mọi người của tôi vẫn vậy — mong bạn hiểu điều đó.",
      },
      watch: {
        ja: "自分流を貫くうちに、伝統を大事にする人の気持ちを置き去りにしてしまうことがあります。相手にとっての意味を聞いてみると、歩み寄れる点が見つかります。",
        en: "Going your own way can leave behind people for whom tradition matters. Asking what it means to them often reveals common ground.",
        vi: "Đi theo cách riêng đôi khi bỏ lại những người coi trọng truyền thống. Hỏi xem điều đó có ý nghĩa gì với họ thường giúp tìm ra điểm chung.",
      },
    },
    mixed: {
      ja: "伝統との付き合い方は、内容によって違うようです。家族の行事は大切にしつつ、暮らし方は自分流、といったバランスかもしれません。",
      en: "Your relationship with tradition seems selective — perhaps keeping family occasions while living your own way.",
      vi: "Mối quan hệ của bạn với truyền thống dường như có chọn lọc — có lẽ giữ các dịp lễ gia đình nhưng sống theo cách riêng.",
    },
  },
};
