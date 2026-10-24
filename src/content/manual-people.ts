/** Long-form manual text, people chapter: how you relate to others. Same voice as manual-axes.ts. */
import type { TendencyKey } from "./questions";
import type { ManualAxis } from "./manual-axes";

export const MANUAL_PEOPLE: Partial<Record<TendencyKey, ManualAxis>> = {
  expressiveness: {
    pos: {
      portrait: {
        ja: "うれしいことも困ったことも、わりと素直に表に出すタイプです。気持ちを言葉や表情にすることで、自分の中でも整理がついていきます。周りからは「何を考えているか分かりやすい人」と思われているでしょう。",
        en: "Joy and trouble alike tend to show on you. Putting feelings into words and expressions is also how you sort them out inside, and people likely see you as someone whose thoughts are easy to read.",
        vi: "Niềm vui hay khó khăn đều dễ hiện ra nơi bạn. Nói cảm xúc thành lời và biểu lộ ra ngoài cũng là cách bạn tự sắp xếp lại bên trong, và mọi người có lẽ thấy bạn là người dễ hiểu.",
      },
      thrive: {
        ja: "気持ちを話しても受け止めてもらえる関係や、率直な感想が歓迎される場で、いちばん自然体でいられます。",
        en: "You're most at ease in relationships where feelings are welcome and in places where honest reactions are valued.",
        vi: "Bạn thoải mái nhất trong những mối quan hệ đón nhận cảm xúc và ở nơi phản hồi chân thật được trân trọng.",
      },
      ask: {
        ja: "話しているときは、解決策より先に「そうなんだ」と受け止めてもらえると、それだけで気持ちが落ち着きます。",
        en: "When I'm telling you something, a simple 'I see' before any advice is often all I need to settle.",
        vi: "Khi tôi đang kể chuyện, một câu 'mình hiểu' trước khi đưa lời khuyên thường là đủ để tôi bình tâm.",
      },
      watch: {
        ja: "その場の感情をそのまま言葉にして、あとで少し後悔することがあるかもしれません。大事な話の前に、ひと呼吸おくと伝わり方が変わります。",
        en: "Saying feelings exactly as they come can occasionally leave you wishing you'd phrased it differently. One breath before an important talk changes how it lands.",
        vi: "Nói ra cảm xúc ngay khi nó đến đôi khi khiến bạn tiếc vì không diễn đạt khác đi. Hít một hơi trước cuộc trò chuyện quan trọng sẽ thay đổi cách nó được đón nhận.",
      },
    },
    neg: {
      portrait: {
        ja: "気持ちは内側で静かに味わい、すぐには表に出さないタイプです。感じていないのではなく、言葉にする前に自分の中で確かめる時間を大切にしています。信頼した相手にだけ見せる顔があるのも、あなたらしさのひとつでしょう。",
        en: "You let feelings settle quietly inside before they show. It's not that you don't feel — you take time to understand them before putting them into words. Having a side you only show to people you trust is part of who you are.",
        vi: "Bạn để cảm xúc lắng lại bên trong trước khi bộc lộ. Không phải bạn không cảm nhận — bạn cần thời gian để hiểu chúng trước khi nói thành lời. Có một mặt chỉ dành cho người mình tin tưởng cũng là một phần con người bạn.",
      },
      thrive: {
        ja: "急かされずに話せる関係、文章やメッセージで気持ちを伝えられる場、沈黙が気まずくならない相手と一緒にいると楽になれます。",
        en: "You feel easiest with people who don't rush you, where you can say things in writing, and with those who are comfortable in silence.",
        vi: "Bạn thấy dễ chịu nhất với người không hối thúc, ở nơi có thể bày tỏ bằng tin nhắn hay chữ viết, và với người thoải mái trong im lặng.",
      },
      ask: {
        ja: "表情に出ていなくても、気にしていないわけではありません。「どう思った？」と、少し時間をおいて聞いてもらえるとうれしいです。",
        en: "If it doesn't show on my face, it doesn't mean I don't care. Asking 'what did you think?' a little later really helps.",
        vi: "Dù không hiện trên nét mặt, không có nghĩa là tôi không bận tâm. Hỏi tôi 'bạn thấy sao?' sau một lúc sẽ giúp tôi rất nhiều.",
      },
      watch: {
        ja: "ため込みすぎると、ある日まとめてあふれてしまうことがあります。小さなうちに、信頼できる人にひとことだけでも話しておくと安心です。",
        en: "Holding too much can mean it all spills out at once one day. Telling someone you trust even a sentence while it's still small helps.",
        vi: "Giữ quá nhiều trong lòng có thể khiến mọi thứ trào ra cùng lúc vào một ngày nào đó. Kể cho người tin cậy dù chỉ một câu khi chuyện còn nhỏ sẽ giúp bạn nhẹ hơn.",
      },
    },
    mixed: {
      ja: "気持ちを出すかどうかは、相手や場面によるようです。親しい人の前では素直に、初対面では控えめに、という違いがあるのかもしれません。",
      en: "Whether you show your feelings seems to depend on who's there — open with people close to you, perhaps reserved with new faces.",
      vi: "Việc bạn có bộc lộ cảm xúc hay không dường như tùy người đối diện — cởi mở với người thân, có lẽ dè dặt với người mới gặp.",
    },
  },
  conflict: {
    pos: {
      portrait: {
        ja: "意見が食い違ったとき、早めに言葉にして話し合おうとするタイプです。もやもやを抱えたままより、はっきりさせてすっきりしたいと感じています。その率直さが、関係を前に進める力になっていることも多いでしょう。",
        en: "When opinions clash, you prefer to say so early and talk it through. You'd rather clear things up than carry a vague discomfort, and that directness often moves relationships forward.",
        vi: "Khi có bất đồng, bạn muốn nói ra sớm và cùng bàn bạc. Bạn thích làm rõ mọi chuyện hơn là ôm nỗi khó chịu mơ hồ, và sự thẳng thắn ấy thường giúp mối quan hệ tiến lên.",
      },
      thrive: {
        ja: "本音を言い合える関係、意見の違いを歓迎するチーム、議論のあとに引きずらない相手と、いちばんよい関係が築けます。",
        en: "You build the best bonds where people speak honestly, in teams that welcome disagreement, and with people who don't hold grudges after a debate.",
        vi: "Bạn xây dựng mối quan hệ tốt nhất ở nơi mọi người nói thật lòng, trong nhóm chào đón ý kiến khác biệt, và với người không để bụng sau tranh luận.",
      },
      ask: {
        ja: "はっきり言うのは、あなたとの関係を大事にしたいからです。気になることがあれば、あなたも遠慮なく言ってください。",
        en: "I speak plainly because the relationship matters to me. If something bothers you, please tell me just as plainly.",
        vi: "Tôi nói thẳng vì mối quan hệ này quan trọng với tôi. Nếu có điều gì khiến bạn bận lòng, hãy cứ nói thẳng với tôi.",
      },
      watch: {
        ja: "相手がまだ気持ちを整理できていないうちに、話し合いを急いでしまうことがあります。「今話せる？」とひとこと確認すると、伝わりやすくなります。",
        en: "You may push for the talk before the other person is ready. A quick 'is now a good time?' helps your words land.",
        vi: "Bạn có thể vội bàn chuyện khi người kia chưa sẵn sàng. Một câu 'giờ nói chuyện được không?' sẽ giúp lời bạn dễ được đón nhận.",
      },
    },
    neg: {
      portrait: {
        ja: "ぶつかりそうなときは、まず気持ちを落ち着けてから向き合うタイプです。勢いで話すより、時間をおいて言葉を選んだほうが、よい結果になると知っているのでしょう。場の空気を和らげる役になることも多いはずです。",
        en: "When a clash is coming, you calm yourself first and then face it. You know that choosing words after some time works better than speaking in the heat of the moment, and you're often the one who softens the mood.",
        vi: "Khi sắp có va chạm, bạn bình tĩnh lại trước rồi mới đối diện. Bạn biết rằng chọn lời sau khi để thời gian trôi qua sẽ tốt hơn là nói trong lúc nóng giận, và bạn thường là người làm dịu bầu không khí.",
      },
      thrive: {
        ja: "落ち着いて話せる場所、返事に時間をかけてもよい関係、感情的にならずに話し合える相手と一緒だと安心です。",
        en: "You feel safe in calm settings, in relationships where replies can take time, and with people who discuss without getting heated.",
        vi: "Bạn thấy an tâm ở nơi bình lặng, trong mối quan hệ cho phép phản hồi chậm, và với người trao đổi mà không nóng nảy.",
      },
      ask: {
        ja: "すぐに返事をしないときは、考えをまとめている途中です。少し時間をもらえれば、ちゃんと話しに戻ってきます。",
        en: "If I don't answer right away, I'm gathering my thoughts. Give me a little time and I'll come back to talk properly.",
        vi: "Nếu tôi không trả lời ngay, tôi đang sắp xếp suy nghĩ. Cho tôi chút thời gian, tôi sẽ quay lại nói chuyện đàng hoàng.",
      },
      watch: {
        ja: "波風を立てないことを優先して、言いたいことを飲み込みすぎることがあります。落ち着いたあとで、ひとつだけでも伝えてみてください。",
        en: "Keeping the peace can mean swallowing too much. Once things are calm, try saying at least one of the things you held back.",
        vi: "Giữ hòa khí đôi khi khiến bạn nuốt vào quá nhiều. Khi mọi thứ đã lắng xuống, hãy thử nói ra ít nhất một điều bạn đã giữ lại.",
      },
    },
    mixed: {
      ja: "意見の違いへの向き合い方は、相手や内容によって変わるようです。大事なことははっきり、小さなことは流す、という線引きがあるのかもしれません。",
      en: "How you handle disagreement seems to vary — perhaps plain speaking for what matters, and letting small things go.",
      vi: "Cách bạn xử lý bất đồng dường như thay đổi — có lẽ thẳng thắn với chuyện quan trọng, và bỏ qua chuyện nhỏ.",
    },
  },
  closeness: {
    pos: {
      portrait: {
        ja: "広く浅くより、少ない人と深くつながることを大切にするタイプです。長く付き合ってきた相手との、説明のいらない関係に安心を感じています。一度信頼した人のことは、とても大事にするでしょう。",
        en: "You'd rather have a few deep connections than many light ones. Long friendships where nothing needs explaining give you a sense of safety, and once you trust someone, you look after them with real care.",
        vi: "Bạn thích có vài mối quan hệ sâu sắc hơn là nhiều mối quan hệ hời hợt. Những tình bạn lâu năm không cần giải thích khiến bạn thấy an toàn, và một khi đã tin ai, bạn trân trọng họ thật lòng.",
      },
      thrive: {
        ja: "気心の知れた少人数、ゆっくり話せる時間、長く続く関係のなかで、あなたのよさがいちばん伝わります。",
        en: "Your best shows in small familiar groups, unhurried conversations, and relationships that last.",
        vi: "Điều tốt đẹp nhất ở bạn hiện ra trong nhóm nhỏ thân quen, những cuộc trò chuyện thong thả, và các mối quan hệ lâu dài.",
      },
      ask: {
        ja: "大人数の集まりより、ふたりで話せる時間のほうがうれしいです。仲良くなるまでに少し時間がかかっても、気長に待ってもらえると助かります。",
        en: "Time with just the two of us means more to me than big gatherings. I can take a while to open up — thank you for being patient.",
        vi: "Thời gian chỉ hai người có ý nghĩa với tôi hơn những buổi tụ tập đông người. Tôi cần chút thời gian để mở lòng — cảm ơn bạn đã kiên nhẫn.",
      },
      watch: {
        ja: "頼れる人が限られていると、その人が忙しいときに孤立しやすくなります。ゆるくつながれる場所をひとつ持っておくと安心です。",
        en: "With only a few people to lean on, you can feel isolated when they're busy. One loose, low-pressure circle is a good safety net.",
        vi: "Khi chỉ có vài người để dựa vào, bạn dễ thấy cô đơn lúc họ bận. Có thêm một nhóm quen biết nhẹ nhàng sẽ là chỗ dựa tốt.",
      },
    },
    neg: {
      portrait: {
        ja: "いろいろな人と気軽につながれるタイプです。初めての人ともすぐ打ち解け、違う世界の人どうしを紹介するのも得意でしょう。広いつながりが、あなたに新しい情報や機会を運んできてくれます。",
        en: "You connect easily with all kinds of people. You warm up quickly with newcomers and enjoy introducing people from different worlds to one another. Your wide circle keeps bringing you new ideas and chances.",
        vi: "Bạn dễ dàng kết nối với đủ kiểu người. Bạn nhanh chóng thân thiện với người mới và thích giới thiệu những người từ các thế giới khác nhau cho nhau. Mạng lưới rộng mang đến cho bạn ý tưởng và cơ hội mới.",
      },
      thrive: {
        ja: "人の出入りがある場所、コミュニティづくり、つなぎ役が求められる仕事で、あなたの力が生きます。",
        en: "You shine where people come and go, in building communities, and in roles that connect others.",
        vi: "Bạn tỏa sáng ở nơi có nhiều người qua lại, trong việc xây dựng cộng đồng, và ở vai trò kết nối người khác.",
      },
      ask: {
        ja: "友だちが多くても、あなたとの関係が軽いわけではありません。ときどき「最近どう？」と声をかけ合えるとうれしいです。",
        en: "Having many friends doesn't make you any less important to me. An occasional 'how are you lately?' both ways means a lot.",
        vi: "Có nhiều bạn không có nghĩa bạn kém quan trọng với tôi. Thỉnh thoảng hỏi nhau 'dạo này thế nào?' có ý nghĩa rất lớn.",
      },
      watch: {
        ja: "たくさんの人に気を配るうちに、本当に弱ったとき頼れる相手が分からなくなることがあります。深く話せる人を一人か二人、意識しておくと安心です。",
        en: "Caring for many people can leave you unsure who to call when you're truly low. Keeping one or two deep confidants in mind helps.",
        vi: "Quan tâm đến nhiều người có thể khiến bạn không biết gọi ai khi thật sự yếu lòng. Ghi nhớ một hai người có thể tâm sự sâu sẽ giúp bạn.",
      },
    },
    mixed: {
      ja: "つながり方は、時期や場面によって違うようです。広く交流する時期と、限られた人とだけ過ごしたい時期を行き来しているのかもしれません。",
      en: "Your way of connecting seems to change with time and place — perhaps moving between social seasons and quieter, closer ones.",
      vi: "Cách bạn kết nối dường như thay đổi theo thời điểm — có lẽ chuyển qua lại giữa những giai đoạn giao lưu rộng và những giai đoạn chỉ muốn ở bên vài người.",
    },
  },
  care_style: {
    pos: {
      portrait: {
        ja: "気持ちは、言葉にして伝えるのがいちばんだと感じているタイプです。「ありがとう」「うれしかった」を口にすることをためらわず、相手からの言葉にも心が動きます。メッセージや手紙が、あなたにとって大事な贈り物になっているでしょう。",
        en: "You feel care is best said out loud. You don't hesitate to say 'thank you' or 'that made me happy', and words from others move you too. Messages and letters are real gifts to you.",
        vi: "Bạn cảm thấy sự quan tâm nên được nói thành lời. Bạn không ngần ngại nói 'cảm ơn' hay 'mình vui lắm', và lời nói của người khác cũng chạm đến bạn. Tin nhắn và thư từ là món quà thật sự với bạn.",
      },
      thrive: {
        ja: "気持ちを言葉で伝え合う関係、感謝が自然に交わされる場所で、あなたはいちばん安心できます。",
        en: "You feel most secure where people say what they feel and thanks flow naturally.",
        vi: "Bạn thấy an tâm nhất ở nơi mọi người nói ra cảm xúc và lời cảm ơn được trao nhau tự nhiên.",
      },
      ask: {
        ja: "ひとことでいいので、言葉にしてもらえるとうれしいです。「助かった」「見てたよ」が、何よりの励みになります。",
        en: "Even a few words mean a lot. 'That helped' or 'I noticed' encourages me more than anything.",
        vi: "Chỉ vài lời thôi cũng rất ý nghĩa. 'Bạn giúp mình nhiều lắm' hay 'mình thấy rồi' khích lệ tôi hơn bất cứ điều gì.",
      },
      watch: {
        ja: "言葉の少ない人の思いやりを、見落としてしまうことがあります。行動で示されている気持ちにも、目を向けてみてください。",
        en: "You might miss care from people who don't use many words. Look for what they show through actions too.",
        vi: "Bạn có thể bỏ lỡ sự quan tâm của người ít nói. Hãy chú ý cả những gì họ thể hiện qua hành động.",
      },
    },
    neg: {
      portrait: {
        ja: "思いやりは、言葉より行動で示すタイプです。困っている人がいれば、何も言わずに手を貸したり、必要なものをそっと用意したりします。「言わなくても伝わる」形のやさしさを大切にしているのでしょう。",
        en: "You show care through actions more than words. When someone's struggling, you quietly lend a hand or set out what they need without a speech. You value kindness that doesn't need to be said.",
        vi: "Bạn thể hiện sự quan tâm qua hành động hơn lời nói. Khi ai đó gặp khó, bạn lặng lẽ giúp một tay hay chuẩn bị sẵn thứ họ cần mà không cần nói nhiều. Bạn trân trọng kiểu tử tế không cần nói ra.",
      },
      thrive: {
        ja: "役に立てる場面がある関係、手を動かして支え合えるチーム、さりげない気づかいに気づいてくれる相手と一緒だと力が出ます。",
        en: "You're at your best where you can be useful, in teams that support each other hands-on, and with people who notice quiet gestures.",
        vi: "Bạn làm tốt nhất ở nơi có thể giúp ích, trong nhóm hỗ trợ nhau bằng việc làm, và với người nhận ra những cử chỉ lặng lẽ.",
      },
      ask: {
        ja: "言葉が少なくても、気にかけていないわけではありません。してきたことのほうに、気持ちがこもっていると思ってもらえるとうれしいです。",
        en: "Few words doesn't mean I don't care. Please read my feelings in what I do.",
        vi: "Ít nói không có nghĩa là tôi không quan tâm. Hãy đọc cảm xúc của tôi qua những gì tôi làm.",
      },
      watch: {
        ja: "言葉で伝えてほしい人には、気持ちが届いていないことがあります。ときどき「ありがとう」を声にすると、行動の意味もより伝わります。",
        en: "People who need words may not feel what you're giving. Saying 'thank you' aloud now and then helps your actions land.",
        vi: "Người cần lời nói có thể không cảm nhận được điều bạn trao. Thỉnh thoảng nói 'cảm ơn' thành tiếng sẽ giúp hành động của bạn được hiểu rõ hơn.",
      },
    },
    mixed: {
      ja: "思いやりの示し方は、言葉と行動の両方を使い分けているようです。相手に合わせて自然に切り替えられるのかもしれません。",
      en: "You seem to show care in both words and actions, perhaps switching naturally to suit the person.",
      vi: "Bạn dường như thể hiện sự quan tâm bằng cả lời nói lẫn hành động, có lẽ tự nhiên thay đổi tùy theo người đối diện.",
    },
  },
  giving: {
    pos: {
      portrait: {
        ja: "相手の都合や気持ちを、自分より先に考えるタイプです。頼まれると断りにくく、誰かの役に立てたときに深い満足を感じます。周りからは、とても頼りになる存在に見えているでしょう。",
        en: "You think of other people's needs and feelings before your own. Saying no to a request is hard, and being useful to someone brings you deep satisfaction. To others you're someone they can truly count on.",
        vi: "Bạn nghĩ đến nhu cầu và cảm xúc của người khác trước bản thân. Từ chối lời nhờ vả không dễ với bạn, và giúp ích được cho ai đó mang lại cho bạn niềm vui sâu sắc. Với mọi người, bạn là chỗ dựa thật sự.",
      },
      thrive: {
        ja: "支え合いが当たり前の関係、あなたの気づかいにお返しがある相手、感謝が言葉になる場所で、気持ちよく力を出せます。",
        en: "You give freely where support goes both ways, with people who return your care, and where thanks is spoken.",
        vi: "Bạn cho đi thoải mái ở nơi sự hỗ trợ là hai chiều, với người đáp lại sự quan tâm của bạn, và nơi lời cảm ơn được nói ra.",
      },
      ask: {
        ja: "「無理してない？」と聞いてもらえると、本音を言いやすくなります。私が断ったときは、それも大事にしてもらえるとうれしいです。",
        en: "Asking 'are you overdoing it?' makes it easier for me to be honest. And when I do say no, please treat that as important too.",
        vi: "Hỏi tôi 'bạn có đang quá sức không?' giúp tôi dễ nói thật. Và khi tôi từ chối, xin hãy tôn trọng điều đó.",
      },
      watch: {
        ja: "人を優先するうちに、自分の疲れに気づくのが遅れることがあります。「自分を後回しにしていないか」を、ときどき確かめてみてください。",
        en: "Putting others first can mean noticing your own tiredness late. Check now and then whether you've been putting yourself last.",
        vi: "Đặt người khác lên trước có thể khiến bạn nhận ra mệt mỏi của mình quá muộn. Thỉnh thoảng hãy tự hỏi mình có đang đặt bản thân xuống cuối không.",
      },
    },
    neg: {
      portrait: {
        ja: "人を大切にしながらも、自分の限界もきちんと守れるタイプです。できることとできないことを分けて伝えられるので、無理のない形で長く人を支えられます。自分を大事にすることが、結果的に周りのためにもなると知っているのでしょう。",
        en: "You care for people while keeping your own limits in place. Because you can say clearly what you can and can't do, you're able to support others for the long run without burning out. You know that looking after yourself ends up helping them too.",
        vi: "Bạn quan tâm người khác nhưng vẫn giữ được giới hạn của mình. Vì có thể nói rõ điều mình làm được và không làm được, bạn có thể hỗ trợ người khác lâu dài mà không kiệt sức. Bạn biết rằng chăm sóc bản thân rốt cuộc cũng giúp ích cho mọi người.",
      },
      thrive: {
        ja: "役割と責任がはっきりしている関係、お互いの境界を尊重できる相手と、いちばん健やかな関係が築けます。",
        en: "You build the healthiest bonds where roles are clear and both sides respect each other's boundaries.",
        vi: "Bạn xây dựng mối quan hệ lành mạnh nhất ở nơi vai trò rõ ràng và hai bên tôn trọng giới hạn của nhau.",
      },
      ask: {
        ja: "断ることがあっても、あなたを大切に思っていないわけではありません。できる範囲で、ちゃんと力になりたいと思っています。",
        en: "If I say no sometimes, it doesn't mean I don't value you. I want to help properly, within what I can really give.",
        vi: "Nếu đôi khi tôi từ chối, không có nghĩa là tôi không trân trọng bạn. Tôi muốn giúp thật lòng, trong khả năng thật của mình.",
      },
      watch: {
        ja: "線を引くのが上手なぶん、相手からは少しドライに見えることがあります。断るときにひとこと理由や代わりの案を添えると、温かさが伝わります。",
        en: "Being good at boundaries can read as a little cool. Adding a reason or an alternative when you decline lets the warmth come through.",
        vi: "Giỏi giữ giới hạn đôi khi khiến bạn trông hơi lạnh lùng. Thêm một lý do hay một phương án khác khi từ chối sẽ giúp sự ấm áp được truyền tải.",
      },
    },
    mixed: {
      ja: "相手を優先するか自分を守るかは、相手との距離によって変わるようです。身近な人にはつい尽くしすぎる、ということもあるかもしれません。",
      en: "Whether you put others first or guard your limits seems to depend on how close they are — perhaps you give too much to those nearest.",
      vi: "Việc bạn ưu tiên người khác hay giữ giới hạn dường như tùy mức độ thân thiết — có lẽ bạn cho đi quá nhiều với những người gần gũi nhất.",
    },
  },
};
