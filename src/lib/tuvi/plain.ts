/**
 * Tử Vi in everyday words, for readers who don't know the tradition: what each area of life
 * covers, what kind of person each main star describes, and the jargon the detailed reading uses.
 * The detailed reading (interpret.ts) stays as it is; this sits on top of it.
 */
import type { Locale } from "@/lib/i18n/locales";
import type { MainStarId, PalaceId } from "./stars";

type T = { en: string; vi: string; ja: string };

/** Each main star as a kind of person: a nickname and two plain sentences. */
export const STAR_PLAIN: Record<MainStarId, { persona: T; plain: T }> = {
  tu_vi: {
    persona: { ja: "みんなをまとめる王様タイプ", en: "the natural leader", vi: "người dẫn dắt bẩm sinh" },
    plain: {
      ja: "自然と周りから頼られ、場の真ん中に立つことが多い星です。プライドと責任感が強く、任されると力を発揮します。",
      en: "A star of people others naturally turn to. Pride and responsibility run strong, and being trusted with something brings out the best.",
      vi: "Ngôi sao của người được mọi người tự nhiên tìm đến. Lòng tự trọng và tinh thần trách nhiệm cao, càng được giao việc càng phát huy.",
    },
  },
  thien_co: {
    persona: { ja: "頭の回転が速い作戦参謀タイプ", en: "the quick-witted strategist", vi: "nhà chiến lược nhanh trí" },
    plain: {
      ja: "考えるのが得意で、段取りや工夫で物事を前に進める星です。アイデアが次々浮かぶぶん、考えすぎて迷うこともあります。",
      en: "A star of thinking things through and moving them forward with plans and clever fixes. Ideas come fast — and so can overthinking.",
      vi: "Ngôi sao của sự suy tính, đưa mọi việc tiến lên bằng kế hoạch và mẹo hay. Ý tưởng đến nhanh — và đôi khi cũng nghĩ quá nhiều.",
    },
  },
  thai_duong: {
    persona: { ja: "まわりを照らす太陽タイプ", en: "the warm sun", vi: "mặt trời ấm áp" },
    plain: {
      ja: "明るく面倒見がよく、人のために動くことで輝く星です。外に向かうエネルギーが強く、がんばりすぎて疲れることもあります。",
      en: "A bright, caring star that shines by doing things for others. Its energy points outward — sometimes to the point of wearing itself out.",
      vi: "Ngôi sao sáng sủa, chu đáo, tỏa sáng khi làm điều gì đó cho người khác. Năng lượng hướng ra ngoài — đôi khi đến mức tự làm mình mệt.",
    },
  },
  vu_khuc: {
    persona: { ja: "決断の早い実務家タイプ", en: "the decisive doer", vi: "người thực tế quyết đoán" },
    plain: {
      ja: "現実的で、決めたらすぐ動く星です。お金や数字の感覚に優れていますが、気持ちを言葉にするのは少し不器用かもしれません。",
      en: "A practical star that acts as soon as it decides. Strong with money and numbers, though putting feelings into words may not come easily.",
      vi: "Ngôi sao thực tế, quyết là làm ngay. Nhạy bén với tiền bạc và con số, nhưng có lẽ hơi vụng về khi nói ra cảm xúc.",
    },
  },
  thien_dong: {
    persona: { ja: "おだやかな平和主義者タイプ", en: "the easy-going peacemaker", vi: "người hiền hòa yêu hòa bình" },
    plain: {
      ja: "のんびりとやさしく、人生を楽しむのが上手な星です。争いを好まず、場をなごませますが、面倒なことを後回しにしがちな面も。",
      en: "A gentle, relaxed star that knows how to enjoy life. It avoids conflict and softens the room, but may put off the tiresome things.",
      vi: "Ngôi sao hiền lành, thong thả, biết tận hưởng cuộc sống. Tránh xung đột và làm dịu bầu không khí, nhưng có thể trì hoãn việc phiền phức.",
    },
  },
  liem_trinh: {
    persona: { ja: "筋を通す情熱家タイプ", en: "the principled idealist", vi: "người sống có nguyên tắc" },
    plain: {
      ja: "自分なりのルールと強い意志を持つ星です。一度決めたことはやり抜きますが、白黒をはっきりさせたくなるところもあります。",
      en: "A star with its own rules and a strong will. It sees things through once decided, and likes things to be clearly black or white.",
      vi: "Ngôi sao có nguyên tắc riêng và ý chí mạnh mẽ. Đã quyết là làm đến cùng, và thích mọi thứ rõ ràng trắng đen.",
    },
  },
  thien_phu: {
    persona: { ja: "どっしり構える金庫番タイプ", en: "the steady keeper", vi: "người giữ kho vững vàng" },
    plain: {
      ja: "安定感があり、守るべきものをしっかり守る星です。慎重で失敗が少ない反面、新しいことには少し腰が重いことも。",
      en: "A steady star that keeps what matters safe. Careful and rarely careless, though it can be slow to take up something new.",
      vi: "Ngôi sao vững vàng, giữ gìn chu đáo những gì quan trọng. Cẩn thận, ít sai sót, nhưng có thể chậm bắt đầu điều mới.",
    },
  },
  thai_am: {
    persona: { ja: "静かに見守る月タイプ", en: "the quiet moon", vi: "vầng trăng lặng lẽ" },
    plain: {
      ja: "感受性が豊かで、内面の世界を大切にする星です。表には出さなくても細やかに人を思いやり、美しいものに心が動きます。",
      en: "A sensitive star with a rich inner world. It cares for people in quiet, detailed ways and is moved by beautiful things.",
      vi: "Ngôi sao nhạy cảm, có thế giới nội tâm phong phú. Quan tâm người khác một cách lặng lẽ, tinh tế và rung động trước cái đẹp.",
    },
  },
  tham_lang: {
    persona: { ja: "好奇心いっぱいの人気者タイプ", en: "the curious charmer", vi: "người cuốn hút ham khám phá" },
    plain: {
      ja: "楽しいことが好きで、多才で人を惹きつける星です。興味の幅が広いぶん、気が散ったり欲張りすぎたりすることもあります。",
      en: "A fun-loving, many-talented star that draws people in. Wide interests can also mean scattered focus or wanting too much at once.",
      vi: "Ngôi sao yêu niềm vui, đa tài và thu hút người khác. Sở thích rộng đôi khi khiến bạn phân tán hoặc muốn quá nhiều cùng lúc.",
    },
  },
  cu_mon: {
    persona: { ja: "言葉で切り込む分析家タイプ", en: "the sharp-tongued analyst", vi: "nhà phân tích sắc sảo" },
    plain: {
      ja: "話す力と、物事を疑って掘り下げる力の星です。本質を突くのが得意ですが、言葉が鋭くなって誤解されることもあります。",
      en: "A star of speech and of questioning things deeply. Good at getting to the heart of it, though sharp words can be misunderstood.",
      vi: "Ngôi sao của lời nói và khả năng chất vấn, đào sâu. Giỏi nắm bản chất, nhưng lời lẽ sắc bén đôi khi bị hiểu lầm.",
    },
  },
  thien_tuong: {
    persona: { ja: "公平な世話役タイプ", en: "the fair-minded helper", vi: "người giúp đỡ công tâm" },
    plain: {
      ja: "正義感があり、困っている人を放っておけない星です。人とのバランスを取るのが上手で、見た目や礼儀も大切にします。",
      en: "A star with a sense of fairness that can't leave someone in trouble alone. Good at keeping balance between people, and mindful of appearances.",
      vi: "Ngôi sao có lòng công bằng, không thể làm ngơ trước người gặp khó. Giỏi giữ cân bằng giữa mọi người và chú trọng hình thức, lễ nghĩa.",
    },
  },
  thien_luong: {
    persona: { ja: "頼れる兄貴・姉御タイプ", en: "the protective mentor", vi: "người anh chị che chở" },
    plain: {
      ja: "人を守り、導くことに向いた星です。落ち着いていて年上のような頼もしさがありますが、つい口を出しすぎることも。",
      en: "A star suited to protecting and guiding others. Calm and dependable like an elder — though it may give a little too much advice.",
      vi: "Ngôi sao hợp với việc che chở và dìu dắt người khác. Điềm tĩnh, đáng tin như người đi trước — nhưng đôi khi khuyên hơi nhiều.",
    },
  },
  that_sat: {
    persona: { ja: "ひとりで切り開く勇者タイプ", en: "the lone trailblazer", vi: "người tiên phong độc lập" },
    plain: {
      ja: "勇気と独立心にあふれ、困難にまっすぐ向かっていく星です。行動が早く頼もしい反面、ひとりで抱え込みやすい面もあります。",
      en: "A star full of courage and independence that faces hardship head-on. Quick and dependable, but prone to carrying everything alone.",
      vi: "Ngôi sao tràn đầy dũng khí và tinh thần độc lập, đối mặt khó khăn trực diện. Nhanh nhẹn, đáng tin, nhưng dễ ôm hết mọi việc một mình.",
    },
  },
  pha_quan: {
    persona: { ja: "古い殻を破る改革者タイプ", en: "the changemaker", vi: "người phá cách đổi mới" },
    plain: {
      ja: "変化を恐れず、新しくつくり直すことにエネルギーを使う星です。行き詰まりを打ち破る力がある一方、落ち着くまでに時間がかかることも。",
      en: "A star unafraid of change that pours energy into rebuilding. It can break through deadlock, but may take a while to settle.",
      vi: "Ngôi sao không ngại thay đổi, dồn sức vào việc làm mới. Có thể phá vỡ bế tắc, nhưng cần thời gian để ổn định.",
    },
  },
};

/** What each palace is about, in a few everyday words. */
export const PALACE_PLAIN: Record<PalaceId, T> = {
  menh: { ja: "あなた自身・性格の土台", en: "yourself and your basic character", vi: "bản thân và tính cách gốc" },
  phu_mau: { ja: "親や目上の人との関係", en: "parents and people above you", vi: "cha mẹ và người bề trên" },
  phuc_duc: { ja: "心の満足・価値観・家のルーツ", en: "inner contentment, values and family roots", vi: "sự mãn nguyện, giá trị sống và cội nguồn gia đình" },
  dien_trach: { ja: "住まい・家・財産", en: "home and property", vi: "nhà cửa và tài sản" },
  quan_loc: { ja: "仕事・キャリア", en: "work and career", vi: "công việc và sự nghiệp" },
  no_boc: { ja: "友人・仲間・部下", en: "friends, colleagues and the people you work with", vi: "bạn bè, đồng nghiệp và người cộng sự" },
  thien_di: { ja: "外の世界・移動・人からの評判", en: "the outside world, travel and how you come across", vi: "thế giới bên ngoài, đi lại và cách bạn được nhìn nhận" },
  tat_ach: { ja: "体調・心身のケア", en: "health and looking after yourself", vi: "sức khỏe và việc chăm sóc bản thân" },
  tai_bach: { ja: "お金の稼ぎ方・使い方", en: "earning and spending money", vi: "cách kiếm và tiêu tiền" },
  tu_tuc: { ja: "子ども・後輩・育てるもの", en: "children, juniors and what you nurture", vi: "con cái, người đi sau và những gì bạn nuôi dưỡng" },
  phu_the: { ja: "恋愛・パートナー", en: "love and partnership", vi: "tình cảm và hôn nhân" },
  huynh_de: { ja: "きょうだい・身近な仲間", en: "siblings and close companions", vi: "anh chị em và người thân cận" },
};

/** What each reading section looks at, before any stars. */
export const SECTION_PLAIN: Record<"personality" | "relationships" | "love" | "career" | "wealth" | "family", T> = {
  personality: { ja: "ここは「どんな人か」を見るところです。命盤のいちばん大事な宮（命宮）にある星で読みます。", en: "This part asks “what kind of person is this?” It is read from the stars in the most important palace of the chart, Mệnh.", vi: "Phần này trả lời câu hỏi “đây là người thế nào?”, đọc từ các sao ở cung quan trọng nhất của lá số — cung Mệnh." },
  relationships: { ja: "ここは友だちや仲間、きょうだいとの付き合い方を見るところです。", en: "This part looks at how you get along with friends, colleagues and siblings.", vi: "Phần này xem cách bạn đối đãi với bạn bè, đồng nghiệp và anh chị em." },
  love: { ja: "ここは恋愛やパートナーとの関係を見るところです。どんな相手と、どんな関係になりやすいかを表します。", en: "This part looks at love and partnership — the kind of partner and relationship you tend toward.", vi: "Phần này xem chuyện tình cảm và hôn nhân — kiểu người và kiểu quan hệ bạn dễ hướng tới." },
  career: { ja: "ここは仕事の向き・不向き、どんな働き方で力が出るかを見るところです。", en: "This part looks at work: what suits you and how you work best.", vi: "Phần này xem công việc: điều gì hợp với bạn và cách làm việc giúp bạn phát huy." },
  wealth: { ja: "ここはお金との付き合い方、稼ぎ方や使い方のくせを見るところです。", en: "This part looks at your relationship with money — how you tend to earn and spend.", vi: "Phần này xem mối quan hệ của bạn với tiền bạc — thói quen kiếm và tiêu tiền." },
  family: { ja: "ここは親、住まい、子どもなど、家族と家庭まわりを見るところです。", en: "This part looks at family and home: parents, where you live, and children.", vi: "Phần này xem gia đình và nhà cửa: cha mẹ, nơi ở và con cái." },
};

export const PLAIN_PHRASE = {
  starIs: (persona: string): T => ({
    ja: `この分野にある星をひとことで言うと「${persona}」。`,
    en: `In a word, the star here is ${persona}.`,
    vi: `Nói ngắn gọn, ngôi sao ở đây là ${persona}.`,
  }),
  starsAre: (personas: string[]): T => ({
    ja: `この分野には「${personas.join("」と「")}」の二つの顔があります。`,
    en: `This area has two faces: ${personas.join(" and ")}.`,
    vi: `Lĩnh vực này có hai gương mặt: ${personas.join(" và ")}.`,
  }),
  borrowed: {
    ja: "この分野の宮には、直接配置された主役の星（主星）がありません。Tử Vi では「無主星（Vô Chính Diệu）」と呼ばれ、何かが欠けているという意味ではなく、向かい側の宮の星を手がかりに読み解きます。まわりの人や環境とのかかわりの中で形づくられやすい分野、と考えるとわかりやすいでしょう。",
    en: "This area's palace has no main star placed in it directly. Tử Vi calls this Vô Chính Diệu; it doesn't mean anything is missing — the area is read through the stars of the opposite palace. Think of it as an area that tends to take shape through the people and setting around you.",
    vi: "Cung của lĩnh vực này không có chính tinh tọa thủ. Tử Vi gọi là Vô Chính Diệu; điều này không có nghĩa là thiếu sót gì — lĩnh vực được đọc qua các sao của cung đối diện. Hãy hiểu đây là lĩnh vực dễ thành hình qua những người và hoàn cảnh xung quanh.",
  } as T,
  hoa: {
    loc: { ja: "さらに「化禄」がついています。この分野は、チャンスや楽しみが入ってきやすいところです。", en: "It also carries Hóa Lộc: this is an area where chances and good things tend to come in.", vi: "Ngoài ra có Hóa Lộc: đây là lĩnh vực cơ hội và niềm vui dễ đến." },
    quyen: { ja: "さらに「化権」がついています。この分野では、主導権を持ちやすいでしょう。", en: "It also carries Hóa Quyền: this is where one tends to take charge.", vi: "Ngoài ra có Hóa Quyền: ở đây dễ nắm quyền chủ động." },
    khoa: { ja: "さらに「化科」がついています。この分野は、評価されたり名前が知られたりしやすいところです。", en: "It also carries Hóa Khoa: this is where recognition tends to come.", vi: "Ngoài ra có Hóa Khoa: đây là nơi dễ được công nhận." },
    ky: { ja: "さらに「化忌」がついています。この分野は、少していねいに扱うとよいところ。悪いことが起きるという意味ではありません。", en: "It also carries Hóa Kỵ: an area worth handling with a little extra care. It does not mean something bad will happen.", vi: "Ngoài ra có Hóa Kỵ: lĩnh vực nên đối xử cẩn thận hơn một chút. Điều này không có nghĩa là sẽ có chuyện xấu." },
  } as Record<"loc" | "quyen" | "khoa" | "ky", T>,
  cycleNow: (from: number, to: number, topic: string): T => ({
    ja: `いま（数え年${from}〜${to}歳）の10年は、「${topic}」がテーマになりやすい時期です。この分野で起きることが、人生の中で大きな意味を持ちやすいと読まれます。`,
    en: `This decade of your life (ages ${from}–${to}) tends to centre on ${topic}. What happens in that area is read as carrying special weight for now.`,
    vi: `Mười năm hiện tại (tuổi ${from}–${to}) thường xoay quanh ${topic}. Những gì xảy ra ở lĩnh vực này được xem là có ý nghĩa đặc biệt trong giai đoạn này.`,
  }),
  cycleIntro: {
    ja: "Tử Vi では人生を10年ずつに区切り、それぞれの時期にどの分野が主役になりやすいかを見ます。占いの「当たり外れ」より、今の自分を振り返るきっかけとして使ってみてください。",
    en: "Tử Vi divides life into ten-year stretches and looks at which area takes centre stage in each. Use it less as a prediction and more as a prompt to look at where you are now.",
    vi: "Tử Vi chia cuộc đời thành từng chặng mười năm và xem lĩnh vực nào nổi bật trong mỗi chặng. Hãy dùng nó như một gợi ý để nhìn lại hiện tại, hơn là một lời tiên đoán.",
  } as T,
};

export type GlossaryKey = "menh" | "than" | "chinh_tinh" | "phu_tinh" | "vo_chinh_dieu" | "tam_phuong" | "hoa" | "tuan_triet" | "dai_han" | "cuc" | "nap_am" | "am_lich";

/** Terms the detailed reading uses, explained in one or two sentences. */
export const GLOSSARY: Record<GlossaryKey, { term: T; meaning: T }> = {
  menh: {
    term: { ja: "命宮（Mệnh）", en: "Mệnh palace", vi: "Cung Mệnh" },
    meaning: { ja: "命盤の12の部屋のうち、「あなた自身」を表すいちばん大事な部屋。性格の土台を読むところです。", en: "The most important of the chart's twelve rooms: “you”. Your basic character is read here.", vi: "Căn phòng quan trọng nhất trong mười hai cung: “chính bạn”. Tính cách gốc được đọc ở đây." },
  },
  than: {
    term: { ja: "身宮（Thân）", en: "Thân palace", vi: "Cung Thân" },
    meaning: { ja: "年齢を重ねてから強く出てくる自分を表す部屋。命宮が「生まれ持った自分」なら、身宮は「育っていく自分」です。", en: "The room of the self that grows stronger with age. If Mệnh is who you were born as, Thân is who you grow into.", vi: "Cung của con người bạn trở nên rõ nét theo tuổi tác. Nếu Mệnh là bạn khi sinh ra, thì Thân là bạn khi trưởng thành." },
  },
  chinh_tinh: {
    term: { ja: "主星（chính tinh）", en: "Main stars (chính tinh)", vi: "Chính tinh" },
    meaning: { ja: "14ある「主役の星」。どの部屋にどの主星が入るかで、その分野の性格が決まります。", en: "The fourteen lead stars. Which one sits in which room sets the character of that area.", vi: "Mười bốn ngôi sao chủ đạo. Sao nào nằm ở cung nào quyết định tính chất của lĩnh vực đó." },
  },
  phu_tinh: {
    term: { ja: "副星（phụ tinh）", en: "Supporting stars (phụ tinh)", vi: "Phụ tinh" },
    meaning: { ja: "主星のまわりで味つけをする「脇役の星」。助けになる星も、注意をうながす星もあります。", en: "Supporting cast that flavours the main stars — some helpful, some that ask for care.", vi: "Các sao phụ tô điểm thêm cho chính tinh — có sao hỗ trợ, có sao nhắc nhở cẩn trọng." },
  },
  vo_chinh_dieu: {
    term: { ja: "無主星（vô chính diệu）", en: "No main star (vô chính diệu)", vi: "Vô chính diệu" },
    meaning: { ja: "部屋に主役の星がいない状態。向かいの部屋の星を借りて読みます。悪い意味ではなく、まわりに合わせて形が変わりやすいということです。", en: "A room without a lead star; it borrows the stars across from it. Not bad — just more shaped by what's around it.", vi: "Cung không có sao chủ đạo, nên mượn sao cung đối diện. Không xấu — chỉ là dễ được định hình bởi môi trường xung quanh." },
  },
  tam_phuong: {
    term: { ja: "三方四正（tam phương tứ chính）", en: "Related palaces (tam phương tứ chính)", vi: "Tam phương tứ chính" },
    meaning: { ja: "ある部屋を読むとき、一緒に見る3つの部屋（三角形の位置の2つと、向かいの1つ）。まわりから支える影響と考えます。", en: "The three rooms read together with any room: two at the points of a triangle and one opposite. They count as supporting influences.", vi: "Ba cung được xem cùng với một cung: hai cung tạo thành tam giác và một cung đối diện. Chúng được xem là ảnh hưởng hỗ trợ." },
  },
  hoa: {
    term: { ja: "四化（Hóa Lộc・Quyền・Khoa・Kỵ）", en: "The four transformations (Hóa)", vi: "Tứ Hóa" },
    meaning: { ja: "生まれ年によって4つの星に付く「しるし」。禄＝恵み、権＝主導権、科＝評価、忌＝注意。その分野の色合いを強めます。", en: "Marks that the birth year puts on four stars: Lộc = good fortune, Quyền = authority, Khoa = recognition, Kỵ = care needed. They colour the area they sit in.", vi: "Dấu hiệu năm sinh gắn lên bốn sao: Lộc = may mắn, Quyền = quyền lực, Khoa = danh tiếng, Kỵ = cần cẩn trọng. Chúng tô đậm lĩnh vực nơi chúng đóng." },
  },
  tuan_triet: {
    term: { ja: "旬・截（Tuần・Triệt）", en: "Tuần and Triệt", vi: "Tuần và Triệt" },
    meaning: { ja: "星の力を弱める「ふた」のようなもの。良い意味も悪い意味も、少しおだやかになると読まれます。", en: "Something like a lid over a room: the stars' effects, good or bad, are read as softened.", vi: "Giống như chiếc nắp đậy lên cung: tác động của các sao, tốt hay xấu, đều được xem là dịu đi." },
  },
  dai_han: {
    term: { ja: "大限（Đại Hạn）", en: "Ten-year cycle (Đại Hạn)", vi: "Đại Hạn" },
    meaning: { ja: "人生を10年ずつに区切った時期。それぞれの10年で、どの部屋（分野）が主役になるかを見ます。", en: "Life in ten-year stretches; each stretch puts one room (area of life) in the lead.", vi: "Cuộc đời chia thành từng chặng mười năm; mỗi chặng có một cung (lĩnh vực) nổi bật." },
  },
  cuc: {
    term: { ja: "局（Cục）", en: "Cục", vi: "Cục" },
    meaning: { ja: "命盤の組み立て方を決める数（2〜6）。大限が何歳から始まるかもここで決まります。", en: "A number (2–6) that shapes how the chart is built, including the age at which the ten-year cycles start.", vi: "Một con số (2–6) quyết định cách lập lá số, kể cả tuổi bắt đầu các Đại Hạn." },
  },
  nap_am: {
    term: { ja: "納音（Nạp Âm）", en: "Nạp Âm element", vi: "Nạp Âm" },
    meaning: { ja: "生まれ年に割り当てられる五行（木・火・土・金・水）。その年の「素材」のようなイメージです。", en: "The element (wood, fire, earth, metal, water) given to your birth year — something like its raw material.", vi: "Ngũ hành (Mộc, Hỏa, Thổ, Kim, Thủy) gắn với năm sinh — giống như “chất liệu” của năm đó." },
  },
  am_lich: {
    term: { ja: "旧暦（âm lịch）", en: "Lunar calendar (âm lịch)", vi: "Âm lịch" },
    meaning: { ja: "月の満ち欠けによる暦。Tử Vi は旧暦の生年月日と、2時間ごとの「時辰」で命盤をつくります。", en: "The moon-based calendar. Tử Vi builds the chart from your lunar birth date and the two-hour block you were born in.", vi: "Lịch theo chu kỳ mặt trăng. Tử Vi lập lá số từ ngày sinh âm lịch và giờ sinh theo canh hai tiếng." },
  },
};

export const pickPlain = (t: T, locale: Locale) => t[locale];
