/**
 * Readings for pairs of tendencies: when two axes both say something, the pair can say more than
 * either alone. Each combo names a kind of person and adds two or three sentences. Voice as in
 * the manual: second person, warm, no verdicts.
 */
import type { I18nText, TendencyKey } from "./questions";

export interface Combo {
  a: [TendencyKey, 1 | -1];
  b: [TendencyKey, 1 | -1];
  title: I18nText;
  text: I18nText;
}

export const COMBOS: Combo[] = [
  {
    a: ["planning", 1], b: ["novelty", 1],
    title: { ja: "計画する冒険家", en: "The planning adventurer", vi: "Nhà thám hiểm có kế hoạch" },
    text: {
      ja: "新しいことに惹かれながら、飛び込む前には地図を広げるタイプ。準備があるからこそ思い切れる、というのがあなたの強みです。旅でも仕事でも、下調べの時間そのものを楽しめるはずです。",
      en: "Drawn to the new, but you spread out the map before you jump. Being prepared is exactly what lets you be bold — and you probably enjoy the research as much as the trip.",
      vi: "Bị cuốn hút bởi điều mới, nhưng bạn trải bản đồ ra trước khi nhảy vào. Chính sự chuẩn bị giúp bạn dám mạo hiểm — và có lẽ bạn tận hưởng cả lúc tìm hiểu lẫn chuyến đi.",
    },
  },
  {
    a: ["planning", -1], b: ["novelty", 1],
    title: { ja: "風まかせの旅人", en: "The free-wheeling traveller", vi: "Lữ khách theo gió" },
    text: {
      ja: "予定を決めずに出かけて、出会ったものを楽しむタイプ。偶然を味方にできる身軽さが魅力です。決まりごとが多い場では、少し窮屈さを感じるかもしれません。",
      en: "You head out without a fixed plan and enjoy what you find. Your lightness turns chance into an ally — though places full of rules may feel a little tight.",
      vi: "Bạn ra đi không cần lịch trình và tận hưởng những gì gặp được. Sự nhẹ nhàng giúp bạn biến tình cờ thành đồng minh — dù nơi nhiều quy tắc có thể khiến bạn hơi gò bó.",
    },
  },
  {
    a: ["planning", 1], b: ["novelty", -1],
    title: { ja: "安心をつくる段取り名人", en: "The keeper of good routines", vi: "Người giữ nhịp ổn định" },
    text: {
      ja: "慣れたやり方を丁寧に整えて、周りに安心をつくるタイプ。あなたがいると物事が予定どおりに進みます。たまに小さな「初めて」を混ぜると、毎日に新しい風が入ります。",
      en: "You tend familiar routines with care and make things feel safe for others. With you around, things run on time. A small ‘first’ now and then brings in fresh air.",
      vi: "Bạn chăm chút những nếp quen và tạo cảm giác yên tâm cho người xung quanh. Có bạn, mọi việc chạy đúng kế hoạch. Thỉnh thoảng thêm một “lần đầu” nhỏ sẽ mang lại làn gió mới.",
    },
  },
  {
    a: ["social_energy", 1], b: ["expressiveness", 1],
    title: { ja: "場を明るくする話し手", en: "The one who lights up the room", vi: "Người thắp sáng không khí" },
    text: {
      ja: "人と過ごすことで元気になり、気持ちも素直に言葉にするタイプ。あなたの明るさは、周りの人の口もほぐしていきます。静かな人の話を待つ時間も、ときどき意識してみてください。",
      en: "People recharge you, and you say what you feel. Your openness loosens others up too — just leave room, now and then, for the quieter ones to speak.",
      vi: "Bạn nạp năng lượng từ mọi người và nói ra điều mình cảm thấy. Sự cởi mở của bạn khiến người khác cũng dễ mở lòng — chỉ cần thỉnh thoảng chừa chỗ cho người trầm lặng lên tiếng.",
    },
  },
  {
    a: ["social_energy", -1], b: ["expressiveness", -1],
    title: { ja: "静かな観察者", en: "The quiet observer", vi: "Người quan sát lặng lẽ" },
    text: {
      ja: "ひとりの時間で整い、気持ちは内側でじっくり味わうタイプ。人をよく見ていて、言葉にしない優しさを持っています。信頼できる一人に話せる場所があると、もっと楽になれます。",
      en: "Time alone settles you, and feelings are savoured inside. You notice a lot about people and have a kindness that doesn't need words. One trusted listener makes things much lighter.",
      vi: "Thời gian một mình giúp bạn cân bằng, cảm xúc được nghiền ngẫm bên trong. Bạn để ý nhiều về người khác và có sự tử tế không cần lời. Một người đáng tin để tâm sự sẽ giúp bạn nhẹ nhõm hơn nhiều.",
    },
  },
  {
    a: ["social_energy", -1], b: ["closeness", 1],
    title: { ja: "少数精鋭の深い絆", en: "Few people, deep bonds", vi: "Ít người, gắn bó sâu" },
    text: {
      ja: "広く浅くより、限られた人との深い関係を大切にするタイプ。あなたの「親しい人」の枠に入ることは、相手にとっても特別なことです。その人たちとの時間を、予定に先に入れておきましょう。",
      en: "You choose a few deep connections over many light ones. Being among your close people is something special for them too. Put time with them in the calendar first.",
      vi: "Bạn chọn vài mối quan hệ sâu thay vì nhiều mối quan hệ nhạt. Được ở trong vòng thân thiết của bạn cũng là điều đặc biệt với họ. Hãy ưu tiên xếp lịch cho những người ấy trước.",
    },
  },
  {
    a: ["social_energy", 1], b: ["closeness", -1],
    title: { ja: "顔の広いつなぎ役", en: "The connector", vi: "Người kết nối" },
    text: {
      ja: "たくさんの人とすぐ打ち解け、人と人をつなぐのが得意なタイプ。あなたの周りには、自然と人の輪ができます。ときには一人の相手とじっくり話す時間も、良い充電になります。",
      en: "You warm up to people quickly and love linking them up. Circles form around you naturally. A long one-to-one talk now and then is good charging too.",
      vi: "Bạn nhanh chóng thân thiện với mọi người và giỏi kết nối họ với nhau. Quanh bạn tự nhiên hình thành những vòng tròn. Thỉnh thoảng một cuộc trò chuyện sâu với một người cũng là cách nạp năng lượng tốt.",
    },
  },
  {
    a: ["decision_style", 1], b: ["risk", -1],
    title: { ja: "慎重な分析家", en: "The careful analyst", vi: "Nhà phân tích thận trọng" },
    text: {
      ja: "情報を比べ、確かめてから動くタイプ。あなたの判断は周りから信頼されやすいでしょう。完璧な情報がそろうのを待ちすぎないよう、「ここまで調べたら決める」線を引いておくと安心です。",
      en: "You compare and check before you move, and people tend to trust your calls. To avoid waiting for perfect information, set a ‘once I know this much, I decide’ line.",
      vi: "Bạn so sánh và kiểm chứng rồi mới hành động, nên quyết định của bạn dễ được tin tưởng. Để không chờ thông tin hoàn hảo mãi, hãy đặt mốc “biết đến đây thì quyết”.",
    },
  },
  {
    a: ["decision_style", -1], b: ["risk", 1],
    title: { ja: "直感で跳ぶ人", en: "The intuitive leaper", vi: "Người nhảy theo trực giác" },
    text: {
      ja: "「これだ」と感じたら、思い切って跳べるタイプ。その勢いが、まだ誰も試していない扉を開けることがあります。大きな決断のときだけは、一晩おいてから数字を確かめると安心です。",
      en: "When something feels right, you leap. That momentum opens doors no one has tried. For the big ones, sleep on it and check the numbers once.",
      vi: "Khi cảm thấy “chính là nó”, bạn dám nhảy. Đà ấy mở ra những cánh cửa chưa ai thử. Với quyết định lớn, hãy để qua một đêm và kiểm tra con số một lần.",
    },
  },
  {
    a: ["conflict", 1], b: ["expressiveness", 1],
    title: { ja: "まっすぐな正直者", en: "The straight talker", vi: "Người thẳng thắn" },
    text: {
      ja: "思ったことも感じたことも、隠さず伝えるタイプ。あなたとの関係には裏表がなく、相手も安心できます。言葉を選ぶ時間を少しだけとると、まっすぐさがもっと優しく届きます。",
      en: "You say what you think and what you feel. There's no hidden side with you, which puts people at ease. Taking a breath to choose words lets your honesty land more gently.",
      vi: "Bạn nói ra cả suy nghĩ lẫn cảm xúc. Quan hệ với bạn không có mặt khuất, nên người khác thấy yên tâm. Dành chút thời gian chọn lời sẽ giúp sự thẳng thắn đến nhẹ nhàng hơn.",
    },
  },
  {
    a: ["conflict", -1], b: ["giving", 1],
    title: { ja: "調和を守るやさしい人", en: "The gentle peacekeeper", vi: "Người dịu dàng giữ hòa khí" },
    text: {
      ja: "ぶつかるより、場をおさめて相手を先に考えるタイプ。あなたのおかげで穏やかに過ごせている人は多いはずです。ただ、自分の気持ちを後回しにしすぎていないか、ときどき確かめてください。",
      en: "Rather than clash, you calm things and think of the other person first. Many people likely owe you their calm days. Just check now and then that your own feelings aren't always last.",
      vi: "Thay vì va chạm, bạn làm dịu mọi chuyện và nghĩ cho người khác trước. Có lẽ nhiều người có những ngày yên ả nhờ bạn. Chỉ cần thỉnh thoảng xem lại cảm xúc của mình có luôn bị xếp cuối không.",
    },
  },
  {
    a: ["calm", 1], b: ["pace", -1],
    title: { ja: "どっしり考える人", en: "The steady thinker", vi: "Người suy nghĩ vững vàng" },
    text: {
      ja: "何があっても落ち着いていて、考えてから動くタイプ。慌ただしい場面ほど、あなたの存在が支えになります。ゆっくりに見えても、それは確かさのための時間です。",
      en: "Calm whatever happens, you think before you act. The busier things get, the more others lean on you. What looks slow is time spent on getting it right.",
      vi: "Bình tĩnh dù có chuyện gì, bạn suy nghĩ rồi mới hành động. Càng bận rộn, người khác càng dựa vào bạn. Điều trông có vẻ chậm là thời gian dành cho sự chắc chắn.",
    },
  },
  {
    a: ["calm", -1], b: ["expressiveness", -1],
    title: { ja: "深く感じて内にしまう人", en: "Deep feelings, kept inside", vi: "Cảm nhận sâu, giữ trong lòng" },
    text: {
      ja: "心が動きやすいのに、それを表には出さないタイプ。豊かな内面は、あなたの創造性や思いやりの源です。ため込みすぎる前に、書くことや話すことで外に出してあげてください。",
      en: "You're moved easily but rarely show it. That rich inner life feeds your creativity and your care. Before it piles up, let it out — in writing or in a talk.",
      vi: "Bạn dễ xúc động nhưng hiếm khi để lộ ra. Đời sống nội tâm phong phú là nguồn sáng tạo và sự quan tâm của bạn. Trước khi dồn nén quá nhiều, hãy viết ra hoặc kể ra.",
    },
  },
  {
    a: ["saving", 1], b: ["ambition", 1],
    title: { ja: "未来に投資する努力家", en: "The one who invests in tomorrow", vi: "Người đầu tư cho ngày mai" },
    text: {
      ja: "目標に向かって、お金も時間もこつこつ積み上げるタイプ。少し先の自分を信じられるのがあなたの強さです。途中の小さな達成も、ちゃんとお祝いしてあげてください。",
      en: "You build steadily — money and time — toward a goal. Trusting your future self is your strength. Celebrate the small wins along the way too.",
      vi: "Bạn tích lũy đều đặn cả tiền bạc lẫn thời gian hướng tới mục tiêu. Tin vào bản thân ở tương lai là sức mạnh của bạn. Hãy ăn mừng cả những thành công nhỏ trên đường đi.",
    },
  },
  {
    a: ["saving", -1], b: ["ambition", -1],
    title: { ja: "いまを味わう人", en: "The one who savours now", vi: "Người tận hưởng hiện tại" },
    text: {
      ja: "比べることより、いまある暮らしを楽しむことを大切にするタイプ。あなたといると、周りも肩の力が抜けます。ときどき少し先の自分のことも、やさしく思い出してあげてください。",
      en: "You value enjoying the life you have over comparing. People relax around you. Spare a kind thought for your future self now and then.",
      vi: "Bạn coi trọng việc tận hưởng cuộc sống hiện có hơn là so sánh. Ở bên bạn, mọi người cũng thả lỏng. Thỉnh thoảng hãy nghĩ một chút về bản thân ở tương lai.",
    },
  },
  {
    a: ["independence", 1], b: ["detail", 1],
    title: { ja: "ひとりで仕上げる職人", en: "The craftsperson", vi: "Người thợ tỉ mỉ" },
    text: {
      ja: "任されたことを、自分のペースで細部まで仕上げるタイプ。あなたの仕事には、丁寧さという署名が残ります。抱え込みすぎないよう、途中で一度だけ誰かに見せるのがおすすめです。",
      en: "Trusted with something, you finish it your way, down to the details. Your work carries care like a signature. Show it to someone once along the way so you don't carry it all.",
      vi: "Được giao việc, bạn hoàn thiện theo cách của mình đến từng chi tiết. Công việc của bạn mang dấu ấn của sự chỉn chu. Hãy cho ai đó xem một lần giữa chừng để không ôm hết một mình.",
    },
  },
  {
    a: ["independence", -1], b: ["detail", -1],
    title: { ja: "みんなで描く構想家", en: "The big-picture team player", vi: "Người vẽ bức tranh lớn cùng mọi người" },
    text: {
      ja: "全体像を描きながら、人と一緒に形にしていくタイプ。あなたの周りでは、アイデアが会話の中で育っていきます。細かい詰めは、得意な人に任せる勇気も強みです。",
      en: "You sketch the whole picture and shape it together with others. Ideas grow in conversation around you. Handing the fine detail to someone who loves it is a strength too.",
      vi: "Bạn phác họa bức tranh tổng thể và cùng mọi người hiện thực hóa nó. Ý tưởng lớn lên qua những cuộc trò chuyện quanh bạn. Dám giao phần chi tiết cho người giỏi cũng là một điểm mạnh.",
    },
  },
  {
    a: ["care_style", -1], b: ["giving", 1],
    title: { ja: "黙って手を貸す人", en: "The quiet helper", vi: "Người lặng lẽ giúp đỡ" },
    text: {
      ja: "困っている人に、言葉より先に手を差し出すタイプ。あなたの優しさは、気づいた人の心に長く残ります。ときには「ありがとう」を受け取ることも、あなたの役目です。",
      en: "You reach out a hand before you say a word. Your kindness stays a long time with those who notice. Sometimes, letting yourself be thanked is part of the job.",
      vi: "Bạn chìa tay giúp trước khi nói lời nào. Sự tử tế của bạn ở lại lâu trong lòng người nhận ra nó. Đôi khi, đón nhận lời cảm ơn cũng là việc của bạn.",
    },
  },
  {
    a: ["tradition", 1], b: ["closeness", 1],
    title: { ja: "絆を大切に守る人", en: "The keeper of bonds", vi: "Người gìn giữ gắn kết" },
    text: {
      ja: "家族や古い友人との行事や約束を、大切に守り続けるタイプ。あなたがいることで、人と人のつながりが途切れずに続いていきます。",
      en: "You keep up the occasions and promises that hold family and old friends together. Because of you, those ties don't break.",
      vi: "Bạn giữ gìn những dịp lễ và lời hẹn gắn kết gia đình và bạn cũ. Nhờ có bạn, những sợi dây ấy không đứt.",
    },
  },
  {
    a: ["tradition", -1], b: ["novelty", 1],
    title: { ja: "自分の道を切り開く人", en: "The path-maker", vi: "Người tự mở đường" },
    text: {
      ja: "決まりごとより、自分で納得できる新しいやり方を選ぶタイプ。あなたの選択は、あとに続く人の道しるべになることがあります。古いものの意味を一度聞いてみると、さらに自由に選べます。",
      en: "You'd rather find a new way you believe in than follow a rule. Your choices can light the way for others. Asking what the old ways meant makes your choice freer still.",
      vi: "Bạn chọn một cách mới mà mình tin hơn là làm theo lệ. Lựa chọn của bạn có thể soi đường cho người đi sau. Hỏi xem lối cũ mang ý nghĩa gì sẽ giúp bạn chọn tự do hơn.",
    },
  },
];
