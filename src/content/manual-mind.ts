/** Long-form manual text, mind chapter: how you think and decide. Same voice as manual-axes.ts. */
import type { TendencyKey } from "./questions";
import type { ManualAxis } from "./manual-axes";

export const MANUAL_MIND: Partial<Record<TendencyKey, ManualAxis>> = {
  decision_style: {
    pos: {
      portrait: {
        ja: "何かを決めるとき、まず情報を集めて並べ、比べてから選ぶタイプです。理由を言葉にできると安心でき、あとから「なぜそうしたのか」を説明できることを大切にしています。急かされると、本来の力が出しにくくなるかもしれません。",
        en: "When you decide, you gather the facts, lay them side by side and compare before you choose. Being able to put your reasons into words settles you, and you value being able to explain later why you went the way you did. Being rushed can keep you from your best thinking.",
        vi: "Khi quyết định, bạn thu thập thông tin, đặt chúng cạnh nhau và so sánh rồi mới chọn. Nói được lý do thành lời giúp bạn yên tâm, và bạn coi trọng việc có thể giải thích về sau vì sao mình chọn như vậy. Bị hối thúc có thể khiến bạn khó suy nghĩ tốt nhất.",
      },
      thrive: {
        ja: "比較できる材料がそろっていて、考える時間が少しでも確保されている場面で、納得のいく決断ができます。",
        en: "You decide well when there's material to compare and at least a little time to think it through.",
        vi: "Bạn quyết định tốt khi có đủ dữ liệu để so sánh và có chút thời gian để suy nghĩ thấu đáo.",
      },
      ask: {
        ja: "大事な相談は、できれば少し前に教えてもらえると助かります。その場で即答できなくても、考えていないわけではありません。",
        en: "For big questions, a little notice helps. If I don't answer on the spot, it doesn't mean I'm not thinking about it.",
        vi: "Với những chuyện lớn, hãy báo trước cho tôi một chút. Nếu tôi không trả lời ngay, không có nghĩa là tôi không suy nghĩ.",
      },
      watch: {
        ja: "情報が多すぎると、比べるうちに決めるタイミングを逃すことがあります。「ここまで調べたら決める」と先に区切りを決めておくと楽になります。",
        en: "With too much information you can compare past the moment to decide. Setting a 'once I've checked this much, I choose' line in advance makes it easier.",
        vi: "Khi quá nhiều thông tin, bạn có thể so sánh mãi đến lỡ thời điểm quyết định. Đặt trước một mốc 'tìm hiểu đến đây thì chọn' sẽ giúp bạn nhẹ nhàng hơn.",
      },
    },
    neg: {
      portrait: {
        ja: "決めるときは、頭で考えるより先に「こっちだ」という感覚が来るタイプです。言葉にする前の小さな違和感や手ごたえを、あなたはよく拾っています。理由をうまく説明できなくても、その感覚が当たっていることは少なくないでしょう。",
        en: "When you decide, a sense of 'this one' often arrives before the reasoning does. You pick up small signals — a faint unease, a feeling of fit — before they turn into words, and that sense is right more often than you can explain.",
        vi: "Khi quyết định, cảm giác 'chính là cái này' thường đến trước cả lý lẽ. Bạn nhận ra những tín hiệu nhỏ — một chút gợn, một cảm giác vừa vặn — trước khi chúng thành lời, và cảm giác ấy thường đúng hơn bạn có thể giải thích.",
      },
      thrive: {
        ja: "状況が動いていて、素早い判断が求められる場面や、人の気持ちを読む必要がある場面で力が出やすいでしょう。",
        en: "You tend to shine where things move fast and a quick call is needed, or where reading people matters.",
        vi: "Bạn thường tỏa sáng ở nơi mọi thứ thay đổi nhanh và cần quyết định kịp thời, hoặc nơi cần thấu hiểu cảm xúc người khác.",
      },
      ask: {
        ja: "「なんとなく違う気がする」と言ったときは、頭ごなしに否定せず、一度いっしょに立ち止まってもらえるとうれしいです。",
        en: "When I say 'something feels off', please don't brush it aside — pause with me for a moment.",
        vi: "Khi tôi nói 'có gì đó không ổn', xin đừng gạt đi — hãy cùng tôi dừng lại một chút.",
      },
      watch: {
        ja: "大きなお金や長い約束がからむときは、直感で決めたあとに一晩おいて、数字だけ確かめておくと後悔が減ります。",
        en: "When big money or long commitments are involved, sleep on your gut call and check the numbers once — it saves regrets.",
        vi: "Khi liên quan đến số tiền lớn hay cam kết dài hạn, hãy để quyết định theo trực giác qua một đêm và kiểm tra lại con số — sẽ đỡ hối tiếc hơn.",
      },
    },
    mixed: {
      ja: "決め方は場面によって変わるようです。慣れた分野では直感で、初めてのことはじっくり比べて、という使い分けをしているのかもしれません。",
      en: "How you decide seems to depend on the situation — perhaps gut feeling where you know the ground, and careful comparison where it's new.",
      vi: "Cách bạn quyết định dường như tùy tình huống — có lẽ theo trực giác ở lĩnh vực quen thuộc, và so sánh kỹ khi gặp điều mới.",
    },
  },
  risk: {
    pos: {
      portrait: {
        ja: "結果が読めないことにも、まずは手を伸ばしてみるタイプです。失敗の可能性より「やらなかった後悔」のほうが気になり、挑戦そのものに面白さを感じています。新しい扉の前で足が止まる人を、自然と後押ししていることもあるでしょう。",
        en: "You reach for things even when the outcome is unclear. The regret of not trying weighs on you more than the chance of failing, and you find the attempt itself interesting. You often end up nudging others through doors they were hesitating at.",
        vi: "Bạn sẵn sàng thử ngay cả khi chưa rõ kết quả. Nỗi tiếc vì không thử nặng hơn nguy cơ thất bại, và bạn thấy chính việc thử đã thú vị. Bạn thường vô tình tiếp sức cho người khác bước qua cánh cửa họ còn ngập ngừng.",
      },
      thrive: {
        ja: "立ち上げ期のプロジェクトや、正解がまだない分野、試してみることが歓迎される環境で生き生きとします。",
        en: "You come alive in early-stage projects, in fields without settled answers, and wherever trying things is welcome.",
        vi: "Bạn tràn đầy sức sống trong dự án mới khởi đầu, ở lĩnh vực chưa có đáp án sẵn, và nơi việc thử nghiệm được hoan nghênh.",
      },
      ask: {
        ja: "反対するときは「やめたほうがいい」より「ここだけ確認しよう」と言ってもらえると、ちゃんと耳に入ります。",
        en: "If you have doubts, 'let's just check this part' reaches me much better than 'don't do it'.",
        vi: "Nếu bạn còn lo, câu 'mình kiểm tra phần này đã' sẽ đến với tôi dễ hơn nhiều so với 'đừng làm'.",
      },
      watch: {
        ja: "勢いで始めたことが重なると、手が回らなくなることがあります。「失ってもいい範囲」を先に決めておくと、思い切りよく挑戦できます。",
        en: "Things started on momentum can pile up beyond what you can carry. Deciding first what you can afford to lose lets you leap more freely.",
        vi: "Những việc bắt đầu theo đà có thể chồng chất quá sức bạn. Xác định trước phần mình chấp nhận mất sẽ giúp bạn mạnh dạn hơn.",
      },
    },
    neg: {
      portrait: {
        ja: "確かめてから一歩を出す、慎重なタイプです。うまくいかなかった場合のことまで先に考えておけるので、周りからは安心して任せられる人に見えているでしょう。慎重さは臆病さではなく、大切なものを守るための力です。",
        en: "You look before you step. You think through what happens if things go wrong, so people see you as someone safe to rely on. Your care isn't timidity — it's how you protect what matters.",
        vi: "Bạn cẩn thận quan sát trước khi bước. Bạn nghĩ sẵn chuyện gì xảy ra nếu không suôn sẻ, nên mọi người thấy bạn là người đáng tin cậy. Sự thận trọng của bạn không phải nhút nhát — đó là cách bạn bảo vệ điều quan trọng.",
      },
      thrive: {
        ja: "見通しが立ちやすい計画、品質や安全が大切にされる仕事、少しずつ積み上げていける環境で力を発揮します。",
        en: "You do your best with plans you can see ahead, in work where quality and safety matter, and where you can build step by step.",
        vi: "Bạn làm tốt nhất với kế hoạch có thể nhìn trước, trong công việc coi trọng chất lượng và an toàn, và nơi có thể xây dựng từng bước.",
      },
      ask: {
        ja: "新しいことに誘うときは、いきなり決めずに、どんな流れになるかを先に教えてもらえると乗りやすくなります。",
        en: "If you invite me into something new, tell me how it's likely to go first — it makes it much easier for me to say yes.",
        vi: "Nếu rủ tôi làm điều mới, hãy kể trước cho tôi nó sẽ diễn ra thế nào — tôi sẽ dễ gật đầu hơn nhiều.",
      },
      watch: {
        ja: "準備が整うのを待つうちに、機会が過ぎてしまうこともあります。小さく試せる形にすると、慎重さを保ったまま前に進めます。",
        en: "Waiting until everything is ready can let a chance slip by. Trying a small version keeps your caution and still moves you forward.",
        vi: "Chờ mọi thứ sẵn sàng đôi khi khiến cơ hội trôi qua. Thử ở quy mô nhỏ giúp bạn vừa giữ được sự cẩn trọng vừa tiến lên.",
      },
    },
    mixed: {
      ja: "挑戦するかどうかは、分野によって違うようです。たとえば仕事では慎重でも、趣味や旅では大胆、といった顔を持っているのかもしれません。",
      en: "Whether you take chances seems to depend on the area — careful at work, perhaps, but bold in hobbies or travel.",
      vi: "Việc bạn có dám thử hay không dường như tùy lĩnh vực — có thể cẩn trọng trong công việc nhưng táo bạo khi đi chơi hay theo đuổi sở thích.",
    },
  },
  independence: {
    pos: {
      portrait: {
        ja: "自分のペースと判断で物事を進めるのが心地よいタイプです。任されると集中力が増し、細かく指示されるより、ゴールだけ共有されるほうが力を出せます。助けを求めるのが少し苦手なところもあるかもしれません。",
        en: "You're comfortable moving things forward at your own pace and on your own judgement. Being trusted with something sharpens your focus, and a shared goal works better for you than step-by-step instructions. Asking for help may not come easily.",
        vi: "Bạn thấy thoải mái khi tự mình đẩy mọi việc theo nhịp độ và phán đoán riêng. Được giao trọn việc giúp bạn tập trung hơn, và chỉ cần chia sẻ mục tiêu là đủ, hơn là hướng dẫn từng bước. Có lẽ việc nhờ giúp đỡ không dễ với bạn.",
      },
      thrive: {
        ja: "裁量のある役割、ひとりで深く取り組める時間、結果で評価される環境で、いちばん伸び伸びと働けます。",
        en: "You flourish with room to decide, time to work deeply on your own, and being judged by results.",
        vi: "Bạn phát triển tốt khi có quyền tự quyết, có thời gian làm việc sâu một mình, và được đánh giá qua kết quả.",
      },
      ask: {
        ja: "任せてもらえると、いちばん力が出ます。途中経過が気になるときは、時間を決めて聞いてもらえると助かります。",
        en: "Trust me with it and I'll give it my best. If you want progress updates, let's agree on when.",
        vi: "Hãy tin giao việc cho tôi, tôi sẽ làm hết sức. Nếu muốn cập nhật tiến độ, mình hẹn thời điểm nhé.",
      },
      watch: {
        ja: "抱え込みすぎて、困っていることに周りが気づけないことがあります。早めに「ここだけ手伝って」と言えると、もっと遠くまで行けます。",
        en: "You can carry so much alone that nobody notices you're stuck. Saying 'just help me with this part' early takes you further.",
        vi: "Bạn có thể tự gánh nhiều đến mức không ai nhận ra bạn đang gặp khó. Sớm nói 'giúp mình phần này nhé' sẽ đưa bạn đi xa hơn.",
      },
    },
    neg: {
      portrait: {
        ja: "人と一緒に考え、一緒に進めることで力が湧いてくるタイプです。ひとりで悩むより、誰かと話すうちに答えが見えてくることが多いでしょう。チームの空気をよくする役回りを、自然と引き受けているかもしれません。",
        en: "Working things out with others is what energises you. Answers often appear while you're talking rather than while you're alone with a problem, and you may naturally be the one who keeps the team's mood good.",
        vi: "Cùng người khác suy nghĩ và làm việc là điều tiếp thêm sức cho bạn. Câu trả lời thường xuất hiện khi bạn trò chuyện hơn là khi một mình đối mặt vấn đề, và có lẽ bạn tự nhiên là người giữ bầu không khí nhóm vui vẻ.",
      },
      thrive: {
        ja: "相談しやすいチーム、役割を分け合える仕事、声をかければすぐ返事が来る関係のなかで力を発揮します。",
        en: "You do your best in teams where it's easy to ask, with shared roles, and with people who answer when you reach out.",
        vi: "Bạn làm tốt nhất trong nhóm dễ trao đổi, công việc có phân vai rõ, và với những người phản hồi khi bạn liên lạc.",
      },
      ask: {
        ja: "迷ったときに少しだけ話を聞いてもらえると、それだけで前に進めます。答えを出してくれなくても大丈夫です。",
        en: "When I'm stuck, just listening for a moment is often enough to get me moving. You don't need to have the answer.",
        vi: "Khi tôi bế tắc, chỉ cần lắng nghe một chút là tôi đã có thể đi tiếp. Bạn không cần phải có câu trả lời.",
      },
      watch: {
        ja: "人に合わせるうちに、自分の意見がどこにあるか見えにくくなることがあります。話す前に一度、自分の考えをメモしておくと安心です。",
        en: "Going along with the group can blur where your own view is. Jotting down your thought before the conversation helps keep it.",
        vi: "Hòa theo nhóm đôi khi làm mờ đi ý kiến của riêng bạn. Ghi lại suy nghĩ của mình trước khi bàn bạc sẽ giúp bạn giữ được nó.",
      },
    },
    mixed: {
      ja: "ひとりで進めたいときと、誰かと進めたいときの両方があるようです。考える段階はひとり、動く段階はみんなで、といった使い分けかもしれません。",
      en: "You seem to want both — working alone at times, together at others. Perhaps thinking alone and doing together.",
      vi: "Dường như bạn cần cả hai — lúc muốn tự làm, lúc muốn làm cùng ai đó. Có thể là suy nghĩ một mình và hành động cùng nhau.",
    },
  },
  detail: {
    pos: {
      portrait: {
        ja: "小さな違いや抜けに気づきやすいタイプです。言葉の選び方、数字のずれ、段取りのすき間など、ほかの人が見過ごす部分を自然と拾っています。丁寧に仕上げたものには、あなたらしさがよく表れているでしょう。",
        en: "You notice small differences and gaps — a word choice, a number that doesn't add up, a missing step — the things others pass over. The care in your finished work says a lot about who you are.",
        vi: "Bạn dễ nhận ra những khác biệt nhỏ và chỗ thiếu sót — cách dùng từ, con số lệch, một bước bị bỏ qua — những điều người khác hay lướt qua. Sự chỉn chu trong sản phẩm của bạn nói lên nhiều điều về con người bạn.",
      },
      thrive: {
        ja: "正確さが価値になる仕事、品質を磨く工程、丁寧さが評価される場で、いちばん力が出ます。",
        en: "You do best where accuracy is valued, in the stages that polish quality, and where care is noticed.",
        vi: "Bạn làm tốt nhất ở nơi độ chính xác được coi trọng, ở khâu trau chuốt chất lượng, và nơi sự tỉ mỉ được ghi nhận.",
      },
      ask: {
        ja: "細かいことを指摘するのは、相手を責めたいからではなく、よくしたいからです。そう受け取ってもらえるとうれしいです。",
        en: "When I point out small things, it's to make the work better, not to criticise you. It means a lot when that's how it's heard.",
        vi: "Khi tôi chỉ ra chi tiết nhỏ, đó là để công việc tốt hơn, không phải để chê bạn. Tôi rất vui nếu được hiểu như vậy.",
      },
      watch: {
        ja: "完璧に仕上げようとして、時間がかかりすぎることがあります。「どこまでやれば十分か」を最初に決めておくと、気持ちも楽になります。",
        en: "Aiming for perfect can take more time than the task deserves. Agreeing up front on what 'good enough' means takes the pressure off.",
        vi: "Nhắm tới sự hoàn hảo đôi khi tốn nhiều thời gian hơn mức cần. Thống nhất trước thế nào là 'đủ tốt' sẽ giúp bạn nhẹ lòng.",
      },
    },
    neg: {
      portrait: {
        ja: "細部よりも、全体の流れや「そもそも何のためか」に目が向くタイプです。バラバラの話をつなげて大きな絵にするのが得意で、方向を見失いかけた場で道筋を示せる人でしょう。細かい作業は、少し退屈に感じることもあるかもしれません。",
        en: "You look at the whole flow and the 'why' before the details. You're good at linking scattered pieces into a bigger picture and can show the way when a group starts to lose direction. Fine-grained work may feel a little tedious.",
        vi: "Bạn nhìn tổng thể và câu hỏi 'để làm gì' trước khi nhìn chi tiết. Bạn giỏi nối những mảnh rời rạc thành bức tranh lớn và có thể chỉ hướng khi cả nhóm sắp lạc lối. Việc tỉ mỉ có lẽ hơi nhàm chán với bạn.",
      },
      thrive: {
        ja: "方向性を決める場面、新しい企画の構想、異なる分野をつなぐ役割で、あなたの視点が生きます。",
        en: "Your view shines in setting direction, sketching new plans, and connecting different fields.",
        vi: "Góc nhìn của bạn tỏa sáng khi định hướng, phác thảo kế hoạch mới, và kết nối các lĩnh vực khác nhau.",
      },
      ask: {
        ja: "細かい確認が抜けていたら、遠慮なく教えてください。全体を見るのは得意でも、細部は誰かに支えてもらえると心強いです。",
        en: "If I've missed a detail, please just tell me. I'm good with the big picture, and it helps to have someone covering the fine print.",
        vi: "Nếu tôi bỏ sót chi tiết, cứ nói thẳng với tôi. Tôi giỏi nhìn tổng thể, và thật yên tâm khi có người lo phần chi tiết.",
      },
      watch: {
        ja: "大枠が見えた時点で満足して、細かい詰めを後回しにしがちです。最後にチェックリストを一枚用意しておくと安心です。",
        en: "Once the outline is clear it's tempting to leave the fine work for later. A short checklist for the finish keeps things safe.",
        vi: "Khi đã thấy rõ khung lớn, bạn dễ để phần chi tiết lại sau. Một danh sách kiểm tra ngắn ở bước cuối sẽ giúp bạn yên tâm.",
      },
    },
    mixed: {
      ja: "細部と全体、どちらにも目が向くようです。好きなことには細かく、そうでないことは大づかみに、という違いがあるのかもしれません。",
      en: "You seem to look at both details and the whole — perhaps close attention for what you love, a broad view for the rest.",
      vi: "Bạn dường như để ý cả chi tiết lẫn tổng thể — có lẽ tỉ mỉ với điều mình yêu thích, và nhìn khái quát với phần còn lại.",
    },
  },
};
