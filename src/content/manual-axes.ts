/**
 * Long-form text for the self manual, per axis and pole (self chapter: temperament).
 *
 * Voice: second person, warm, never a verdict ("often", "tends to"). Neither pole is better; each
 * has its own strengths and its own things to watch. "ask" is written for the people around the
 * reader — it is what the reader would like others to know.
 *
 *  portrait — how it tends to show in everyday life (2–3 sentences)
 *  thrive   — the setting where it works best
 *  ask      — a request to the people around you
 *  watch    — something to keep an eye on
 *  mixed    — when answers point both ways
 */
import type { I18nText, TendencyKey } from "./questions";

export interface ManualPart {
  portrait: I18nText;
  thrive: I18nText;
  ask: I18nText;
  watch: I18nText;
}
export interface ManualAxis {
  pos: ManualPart;
  neg: ManualPart;
  mixed: I18nText;
}

export const MANUAL_SELF: Partial<Record<TendencyKey, ManualAxis>> = {
  social_energy: {
    pos: {
      portrait: {
        ja: "人と一緒にいると、気持ちがふくらんで元気が戻ってくるタイプです。にぎやかな場や、誰かと話しながら考える時間が、あなたにとっての充電になっています。ひとりの時間が続くと、少し物足りなさを感じることがあるかもしれません。",
        en: "Being with people fills you back up. Lively places and thinking out loud with someone are how you recharge, and long stretches alone can leave you feeling a little flat.",
        vi: "Ở bên mọi người giúp bạn nạp lại năng lượng. Những nơi sôi động và việc vừa trò chuyện vừa suy nghĩ cùng ai đó chính là cách bạn hồi phục; ở một mình quá lâu có thể khiến bạn thấy thiếu thiếu.",
      },
      thrive: {
        ja: "人の気配がある場所、気軽に声をかけ合えるチーム、終わったあとに「どうだった？」と話せる関係のなかで力が出やすいでしょう。",
        en: "You tend to do your best where people are around, in teams where it's easy to talk, and with people you can debrief with afterwards.",
        vi: "Bạn thường làm tốt nhất ở nơi có người xung quanh, trong nhóm dễ trò chuyện, và với những người có thể cùng nhìn lại sau mỗi việc.",
      },
      ask: {
        ja: "疲れていそうなときほど、誘ってもらえるとうれしいタイプです。短い電話や「ちょっとお茶でも」が、いちばんの回復になります。",
        en: "When I seem tired, an invitation helps more than space. A short call or a quick coffee is often the best way to bring me back.",
        vi: "Khi tôi có vẻ mệt, một lời rủ rê giúp ích hơn là để tôi yên. Một cuộc gọi ngắn hay một ly cà phê thường là cách tốt nhất giúp tôi hồi phục.",
      },
      watch: {
        ja: "予定を詰めすぎて、体のほうが先に疲れてしまうことがあります。楽しい予定のあいだにも、何もしない日をひとつ挟んでおくと安心です。",
        en: "It's easy to fill the calendar until your body tires before your mood does. Leaving one empty day between good plans keeps you steady.",
        vi: "Bạn dễ lấp kín lịch đến mức cơ thể mệt trước khi tinh thần kịp mệt. Chừa một ngày trống giữa những kế hoạch vui sẽ giúp bạn cân bằng.",
      },
    },
    neg: {
      portrait: {
        ja: "ひとりの静かな時間で、心と体のエネルギーが戻ってくるタイプです。人と会うのが嫌いなのではなく、会ったあとに自分の中で整える時間を必要としています。少人数での深い会話のほうが、大勢の場より心地よく感じることが多いでしょう。",
        en: "Quiet time alone is how you recharge. It's not that you dislike people — you simply need time afterwards to settle back into yourself, and small, deep conversations usually feel better than crowds.",
        vi: "Thời gian yên tĩnh một mình là cách bạn nạp lại năng lượng. Không phải bạn không thích gặp người khác — chỉ là sau đó bạn cần thời gian để trở về với chính mình, và những cuộc trò chuyện sâu, ít người thường dễ chịu hơn đám đông.",
      },
      thrive: {
        ja: "集中できる静かな場所、ひとりで考える時間が確保された予定、気心の知れた数人との関係のなかで、いちばん自然体でいられます。",
        en: "You are most yourself in quiet places where you can focus, with schedules that leave room to think alone, and with a few people who know you well.",
        vi: "Bạn tự nhiên nhất ở nơi yên tĩnh có thể tập trung, với lịch trình có khoảng trống để suy nghĩ một mình, và bên vài người hiểu mình.",
      },
      ask: {
        ja: "返事が少し遅くても、気持ちが離れたわけではありません。ひとりの時間をとったあとは、またちゃんと戻ってきます。",
        en: "If I'm slow to reply, it doesn't mean I've drifted away. After some time on my own, I come back — fully.",
        vi: "Nếu tôi trả lời chậm, không có nghĩa là tôi xa cách. Sau một chút thời gian riêng, tôi sẽ quay lại — trọn vẹn.",
      },
      watch: {
        ja: "ひとりで抱えこむうちに、助けを求めるタイミングを逃しがちです。「少し話を聞いてほしい」と短く伝えるだけでも、ずいぶん楽になります。",
        en: "Keeping things to yourself can mean missing the moment to ask for help. Even a short “could you just listen for a bit?” can make things much lighter.",
        vi: "Giữ mọi thứ trong lòng có thể khiến bạn lỡ lúc cần nhờ giúp đỡ. Chỉ một câu ngắn “nghe mình nói một chút nhé” cũng có thể khiến mọi thứ nhẹ hơn nhiều.",
      },
    },
    mixed: {
      ja: "人と過ごして元気になる日もあれば、ひとりの時間が必要な日もあるようです。相手や疲れ具合によって、充電のしかたを自然に切り替えているのかもしれません。",
      en: "Some days people recharge you, other days you need to be alone. You may be switching naturally depending on who it is and how tired you are.",
      vi: "Có hôm ở bên mọi người giúp bạn hồi phục, có hôm bạn cần ở một mình. Có lẽ bạn tự nhiên chuyển đổi tùy người và tùy mức độ mệt mỏi.",
    },
  },
  planning: {
    pos: {
      portrait: {
        ja: "先の見通しを立ててから動くと、安心して力を出せるタイプです。予定やリスト、段取りを考えること自体が、頭の整理になっています。準備がきちんとできていると、本番では落ち着いて楽しむ余裕が生まれます。",
        en: "You do your best once you can see the way ahead. Plans, lists and working out the steps help you think, and when you're well prepared you can relax and enjoy the moment itself.",
        vi: "Bạn làm tốt nhất khi đã nhìn thấy con đường phía trước. Kế hoạch, danh sách và việc sắp xếp từng bước giúp bạn suy nghĩ mạch lạc, và khi đã chuẩn bị kỹ, bạn có thể thư thả tận hưởng khoảnh khắc.",
      },
      thrive: {
        ja: "予定が早めに共有される環境、締め切りや役割がはっきりしたプロジェクトで、あなたの段取り力はいちばん生きます。",
        en: "Your planning shines when plans are shared early and deadlines and roles are clear.",
        vi: "Khả năng sắp xếp của bạn tỏa sáng khi kế hoạch được chia sẻ sớm, hạn chót và vai trò rõ ràng.",
      },
      ask: {
        ja: "予定の変更は、分かった時点で早めに教えてもらえると助かります。急な変更でも、理由が分かれば落ち着いて組み直せます。",
        en: "Please tell me about changes as soon as you know. Even a sudden change is fine if I understand why — I can re-plan calmly.",
        vi: "Hãy báo cho tôi ngay khi có thay đổi. Kể cả thay đổi đột ngột cũng không sao nếu tôi hiểu lý do — tôi có thể bình tĩnh sắp xếp lại.",
      },
      watch: {
        ja: "計画どおりに進まないと、必要以上に自分を責めてしまうことがあります。計画は地図であって約束ではない、くらいに考えると気持ちが軽くなります。",
        en: "When things don't go to plan you may be harder on yourself than you need to be. Treating a plan as a map rather than a promise can take the pressure off.",
        vi: "Khi mọi thứ không theo kế hoạch, bạn có thể tự trách mình nhiều hơn mức cần thiết. Coi kế hoạch là tấm bản đồ chứ không phải lời hứa sẽ giúp bạn nhẹ nhõm hơn.",
      },
    },
    neg: {
      portrait: {
        ja: "その場の空気や流れに合わせて動くのが得意なタイプです。予定を決めすぎないぶん、思いがけない出会いや寄り道を楽しむ余白があります。決まりきった段取りより、状況を見ながらの判断で力を発揮します。",
        en: "You're at your best going with the flow. Not over-planning leaves room for chance meetings and detours, and you tend to shine when you read the situation and decide as you go.",
        vi: "Bạn giỏi nhất khi thuận theo dòng chảy. Không lên kế hoạch quá chi tiết giúp bạn có chỗ cho những cuộc gặp tình cờ và những ngã rẽ bất ngờ, và bạn thường tỏa sáng khi quan sát tình huống rồi quyết định ngay.",
      },
      thrive: {
        ja: "変化の多い現場、即興で動ける自由がある役割、ゴールだけ決まっていて道筋は任せてもらえる仕事で、いちばんいきいきできます。",
        en: "You come alive in changing situations, roles with room to improvise, and work where the goal is set but the route is up to you.",
        vi: "Bạn tràn đầy sức sống ở những nơi nhiều thay đổi, những vai trò có chỗ để ứng biến, và công việc chỉ đặt mục tiêu còn cách đi do bạn quyết định.",
      },
      ask: {
        ja: "細かい予定より、大事なポイントだけ先に教えてもらえるとうれしいです。あとは、その場でいちばん良い形を一緒に探させてください。",
        en: "Rather than every detail, tell me the few things that really matter. Then let's find the best way together, on the spot.",
        vi: "Thay vì mọi chi tiết, hãy cho tôi biết vài điều thật sự quan trọng. Rồi mình cùng tìm cách tốt nhất ngay tại chỗ nhé.",
      },
      watch: {
        ja: "締め切りや準備が必要なことが、気づけばぎりぎりになっていることがあります。大事なことだけでも、カレンダーに一度書いておくと安心です。",
        en: "Deadlines and things that need preparing can sneak up on you. Writing down just the important ones once can save a last-minute rush.",
        vi: "Hạn chót và những việc cần chuẩn bị có thể đến bất ngờ. Chỉ cần ghi lại những việc quan trọng một lần là tránh được cảnh nước đến chân mới nhảy.",
      },
    },
    mixed: {
      ja: "きっちり計画を立てるときもあれば、流れにまかせるときもあるようです。大事なことは準備し、遊びは気分で、と使い分けているのかもしれません。",
      en: "Sometimes you plan carefully, sometimes you go with the flow — perhaps preparing for what matters and keeping play spontaneous.",
      vi: "Có lúc bạn lên kế hoạch kỹ, có lúc thuận theo tự nhiên — có lẽ bạn chuẩn bị cho điều quan trọng và để chuyện vui chơi tùy hứng.",
    },
  },
  novelty: {
    pos: {
      portrait: {
        ja: "新しい場所、新しい味、新しいやり方に心がひかれるタイプです。「やったことがない」は、あなたにとって不安より好奇心の種になりやすいようです。経験の幅が、そのままあなたの話題の豊かさになっています。",
        en: "New places, new tastes and new ways of doing things draw you in. “I've never done that” tends to spark curiosity more than worry, and your range of experiences becomes the richness of your stories.",
        vi: "Những nơi mới, hương vị mới và cách làm mới luôn cuốn hút bạn. “Mình chưa từng làm” thường khơi gợi tò mò hơn là lo lắng, và trải nghiệm phong phú trở thành kho chuyện thú vị của bạn.",
      },
      thrive: {
        ja: "変化や挑戦が歓迎される場所、いろいろな人や文化に触れられる環境で、あなたの好奇心はいちばん生きます。",
        en: "Your curiosity thrives where change and trying things are welcome, and where you meet many kinds of people and cultures.",
        vi: "Sự tò mò của bạn phát huy tốt nhất ở nơi chào đón thay đổi và thử nghiệm, nơi bạn gặp gỡ nhiều kiểu người và nền văn hóa.",
      },
      ask: {
        ja: "「こんなのがあるよ」と新しいものを教えてもらえると、とても喜びます。一緒に初めてのことを試せる相手は、特別な存在です。",
        en: "Tell me about new things you've found — I love that. Someone to try first-times with is someone special to me.",
        vi: "Hãy kể cho tôi những điều mới bạn tìm thấy — tôi rất thích. Người cùng tôi thử những lần đầu tiên là người đặc biệt với tôi.",
      },
      watch: {
        ja: "次々と新しいことに目が移って、始めたことが途中になることがあります。ひとつだけ「続けること」を決めておくと、新しさと深さの両方が手に入ります。",
        en: "With so much new to try, things you started can be left half-done. Choosing just one thing to keep going with gives you both novelty and depth.",
        vi: "Vì có quá nhiều điều mới để thử, những việc đã bắt đầu đôi khi bị bỏ dở. Chọn một việc để kiên trì sẽ mang lại cho bạn cả cái mới lẫn chiều sâu.",
      },
    },
    neg: {
      portrait: {
        ja: "慣れ親しんだ場所や、お気に入りのものに安心を感じるタイプです。「いつもの」を大切にすることで、日々の暮らしに落ち着いたリズムが生まれています。一度好きになったものを長く愛せるのは、あなたの大きな魅力です。",
        en: "You find comfort in familiar places and favourite things. Holding on to “the usual” gives your days a calm rhythm, and being able to love something for a long time is one of your real charms.",
        vi: "Bạn thấy yên lòng với những nơi quen thuộc và món đồ yêu thích. Giữ gìn “như mọi khi” mang lại nhịp sống bình yên, và khả năng yêu một điều lâu dài là sức hút lớn của bạn.",
      },
      thrive: {
        ja: "落ち着いて続けられる習慣、長くつきあえる人間関係、使い慣れた道具に囲まれた環境で、安心して力を出せます。",
        en: "You do well with steady habits, long friendships and tools you know well around you.",
        vi: "Bạn làm tốt với những thói quen ổn định, những mối quan hệ lâu dài và những công cụ quen tay.",
      },
      ask: {
        ja: "新しいことを始めるときは、少し前もって教えてもらえると心の準備ができます。慣れてしまえば、誰よりも長く続けます。",
        en: "When something new is coming, a little advance notice helps me get ready. Once I'm used to it, I'll stick with it longer than anyone.",
        vi: "Khi sắp có điều gì mới, báo trước một chút giúp tôi chuẩn bị tinh thần. Một khi đã quen, tôi sẽ gắn bó lâu hơn bất kỳ ai.",
      },
      watch: {
        ja: "「いつもの」に安心するあまり、気になっていたことを試す機会を見送ることがあります。小さな新しさなら、ひとつずつ足してみるのもいいかもしれません。",
        en: "Comfort in the usual can mean passing up things you were curious about. Adding small new things one at a time might be a gentle way in.",
        vi: "Sự yên tâm với điều quen thuộc có thể khiến bạn bỏ lỡ những điều từng tò mò. Thêm từng điều mới nhỏ một có thể là cách nhẹ nhàng để bắt đầu.",
      },
    },
    mixed: {
      ja: "新しいものに惹かれる面と、いつものものに安心する面の両方があるようです。分野によって、冒険と定番を使い分けているのかもしれません。",
      en: "You're drawn to the new and comforted by the familiar — perhaps adventurous in some areas and loyal to favourites in others.",
      vi: "Bạn vừa bị cuốn hút bởi cái mới vừa yên tâm với điều quen — có lẽ bạn phiêu lưu ở lĩnh vực này và trung thành với món quen ở lĩnh vực khác.",
    },
  },
  calm: {
    pos: {
      portrait: {
        ja: "思いがけないことが起きても、気持ちが大きく揺れにくいタイプです。切り替えが早く、周りが慌てているときほど落ち着いて状況を見られます。その安定感は、そばにいる人の安心にもつながっています。",
        en: "When the unexpected happens, your feelings don't swing much. You bounce back quickly and can look at things calmly when others are flustered — a steadiness that reassures the people around you.",
        vi: "Khi điều bất ngờ xảy ra, cảm xúc của bạn ít dao động. Bạn lấy lại tinh thần nhanh và có thể bình tĩnh nhìn nhận khi người khác đang rối — sự vững vàng ấy khiến người xung quanh yên tâm.",
      },
      thrive: {
        ja: "トラブルへの対応や、変化の多い状況、冷静さが求められる場面で、あなたの落ち着きは大きな力になります。",
        en: "Your calm is a real strength when handling problems, in fast-changing situations and wherever a cool head is needed.",
        vi: "Sự điềm tĩnh của bạn là sức mạnh thật sự khi xử lý sự cố, trong tình huống thay đổi nhanh và bất cứ nơi nào cần cái đầu lạnh.",
      },
      ask: {
        ja: "落ち着いて見えても、何も感じていないわけではありません。ときどき「大丈夫？」と聞いてもらえると、素直に話せることがあります。",
        en: "Looking calm doesn't mean I feel nothing. Now and then, “are you okay?” lets me say what's really there.",
        vi: "Trông bình tĩnh không có nghĩa là tôi không cảm thấy gì. Thỉnh thoảng một câu “bạn ổn không?” sẽ giúp tôi nói ra điều thật lòng.",
      },
      watch: {
        ja: "平気なつもりで、疲れや小さな傷を見すごしてしまうことがあります。気持ちを言葉にする時間を、ときどき意識してとってみてください。",
        en: "Feeling fine, you may overlook tiredness or small hurts. Now and then, take a moment to put your feelings into words.",
        vi: "Vì nghĩ mình ổn, bạn có thể bỏ qua sự mệt mỏi hay những tổn thương nhỏ. Thỉnh thoảng hãy dành chút thời gian gọi tên cảm xúc của mình.",
      },
    },
    neg: {
      portrait: {
        ja: "出来事や人の言葉を、深く受けとめるタイプです。うれしいことも、つらいことも、心の中に長く響きます。その感受性があるからこそ、人の気持ちの小さな変化にも気づくことができます。",
        en: "You take events and words to heart. Joys and hurts both echo in you for a long time — and that same sensitivity lets you notice small changes in how others feel.",
        vi: "Bạn đón nhận sự việc và lời nói rất sâu sắc. Niềm vui lẫn nỗi buồn đều vang vọng lâu trong lòng — và chính sự nhạy cảm ấy giúp bạn nhận ra những thay đổi nhỏ trong cảm xúc của người khác.",
      },
      thrive: {
        ja: "安心して本音を話せる関係、気持ちを整える時間がとれるペース、思いやりが大切にされる場で、あなたの繊細さは強みになります。",
        en: "Your sensitivity becomes a strength where you can speak honestly, where the pace leaves time to settle your feelings, and where kindness is valued.",
        vi: "Sự tinh tế của bạn trở thành điểm mạnh ở nơi bạn có thể nói thật lòng, nhịp độ cho phép bạn lắng lại cảm xúc, và lòng tử tế được trân trọng.",
      },
      ask: {
        ja: "落ちこんでいるときは、解決策より先に「そうだったんだね」と聞いてもらえると救われます。少し時間がたてば、ちゃんと立ち直れます。",
        en: "When I'm down, “that sounds hard” helps more than a solution at first. Give me a little time and I'll find my feet again.",
        vi: "Khi tôi buồn, một câu “chắc là khó khăn lắm” giúp tôi hơn là giải pháp. Cho tôi chút thời gian, tôi sẽ đứng dậy được.",
      },
      watch: {
        ja: "ひとつの出来事を何度も思い返して、疲れてしまうことがあります。書き出したり、体を動かしたりして、気持ちの出口をつくっておくと楽になります。",
        en: "Going over one event again and again can wear you out. Writing it down or moving your body gives those feelings somewhere to go.",
        vi: "Nghĩ đi nghĩ lại về một chuyện có thể khiến bạn kiệt sức. Viết ra hoặc vận động cơ thể sẽ cho cảm xúc một lối thoát.",
      },
    },
    mixed: {
      ja: "すぐに切り替えられることもあれば、心に長く残ることもあるようです。自分にとって大切なことほど、深く受けとめているのかもしれません。",
      en: "Some things you shake off quickly, others stay with you — perhaps the more something matters to you, the deeper it goes.",
      vi: "Có chuyện bạn gạt đi nhanh, có chuyện đọng lại lâu — có lẽ điều gì càng quan trọng thì bạn càng đón nhận sâu.",
    },
  },
  pace: {
    pos: {
      portrait: {
        ja: "考えるより先に、まず動いてみるタイプです。手を動かしながら答えを見つけていくので、物事がどんどん前に進みます。迷っている時間より、試してみる時間を大切にしているようです。",
        en: "You tend to act first and think as you go. Finding answers by doing keeps things moving, and you'd rather spend time trying than deliberating.",
        vi: "Bạn có xu hướng hành động trước và suy nghĩ trong lúc làm. Tìm câu trả lời bằng cách bắt tay vào giúp mọi việc tiến triển, và bạn thích dành thời gian để thử hơn là đắn đo.",
      },
      thrive: {
        ja: "スピードが求められる場面、試作と修正をくり返せる仕事、決めたらすぐ動ける自由がある環境で力を発揮します。",
        en: "You shine where speed matters, in work that allows quick drafts and revisions, and where you're free to act once something is decided.",
        vi: "Bạn tỏa sáng ở nơi cần tốc độ, trong công việc cho phép làm nhanh rồi chỉnh sửa, và khi được tự do hành động ngay sau khi quyết định.",
      },
      ask: {
        ja: "動きが早くて驚かせてしまうことがあるかもしれません。気になる点があれば、遠慮なく途中で声をかけてください。すぐに方向を直せます。",
        en: "I may move faster than you expect. If something worries you, say so along the way — I can change course quickly.",
        vi: "Tôi có thể hành động nhanh hơn bạn nghĩ. Nếu có điều gì lo lắng, cứ nói giữa chừng — tôi có thể đổi hướng ngay.",
      },
      watch: {
        ja: "勢いで決めたあとに、確認不足に気づくことがあります。大きな決断のときだけは、ひと晩おいてみるのもひとつの方法です。",
        en: "Deciding on momentum can mean noticing too late what you didn't check. For the big decisions, sleeping on it once can help.",
        vi: "Quyết định theo đà đôi khi khiến bạn nhận ra quá muộn điều mình chưa kiểm tra. Với những quyết định lớn, ngủ một đêm rồi tính có thể giúp ích.",
      },
    },
    neg: {
      portrait: {
        ja: "動く前に、じっくり考えて納得したいタイプです。全体を見渡してから一歩を踏み出すので、いったん動き出すと迷いがありません。あなたのペースは、慎重さと確かさの表れです。",
        en: "You like to think things through until they make sense before moving. Because you look at the whole first, once you start you move without doubt — your pace is a sign of care and reliability.",
        vi: "Bạn muốn suy nghĩ thấu đáo cho đến khi thật sự hiểu rồi mới hành động. Vì nhìn tổng thể trước, nên khi bắt đầu bạn đi không do dự — nhịp độ của bạn là biểu hiện của sự cẩn trọng và chắc chắn.",
      },
      thrive: {
        ja: "考える時間が確保された予定、品質や正確さが大切にされる仕事、急かされずに自分のペースで進められる環境で力を出せます。",
        en: "You do your best with time to think built in, in work where quality and accuracy matter, and where you're not rushed.",
        vi: "Bạn làm tốt nhất khi có thời gian suy nghĩ, trong công việc coi trọng chất lượng và độ chính xác, và khi không bị hối thúc.",
      },
      ask: {
        ja: "返事に時間がかかるのは、ちゃんと考えたいからです。急ぎのときは「いつまでに」を教えてもらえると、それに合わせて考えます。",
        en: "If I take time to answer, it's because I want to think it through. If it's urgent, tell me by when — I'll work to that.",
        vi: "Nếu tôi trả lời chậm, đó là vì tôi muốn suy nghĩ kỹ. Nếu gấp, hãy cho tôi biết hạn — tôi sẽ theo đó mà nghĩ.",
      },
      watch: {
        ja: "考えているうちに、動くタイミングを逃すことがあります。「まず小さく試す」を一度はさむと、慎重さを保ったまま前に進めます。",
        en: "While you're thinking, the moment to act can pass. Slipping in a small trial first lets you move forward without losing your care.",
        vi: "Trong lúc suy nghĩ, thời điểm hành động có thể trôi qua. Thử một bước nhỏ trước sẽ giúp bạn tiến lên mà vẫn giữ được sự cẩn trọng.",
      },
    },
    mixed: {
      ja: "すぐ動くときと、じっくり考えるときの両方があるようです。慣れていることは速く、初めてのことは慎重に、と使い分けているのかもしれません。",
      en: "Sometimes you act at once, sometimes you take your time — perhaps fast with the familiar and careful with the new.",
      vi: "Có lúc bạn hành động ngay, có lúc từ tốn — có lẽ nhanh với việc quen và cẩn thận với việc mới.",
    },
  },
};

import { MANUAL_LIFE } from "./manual-life";
import { MANUAL_MIND } from "./manual-mind";
import { MANUAL_PEOPLE } from "./manual-people";

/** Every axis, all chapters. */
export const MANUAL: Partial<Record<TendencyKey, ManualAxis>> = { ...MANUAL_SELF, ...MANUAL_MIND, ...MANUAL_PEOPLE, ...MANUAL_LIFE };
