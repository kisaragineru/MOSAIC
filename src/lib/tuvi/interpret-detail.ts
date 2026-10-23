/**
 * Content tables for interpretation v2: per-star family readings, strengths and cautions,
 * and what each palace stands for (used for palace details and for the theme of each
 * 10-year Đại Hạn period). Every text states a TRADITIONAL association in the register of
 * interpret.ts: no event predictions, no brightness-dependent claims.
 */
import type { MainStarId, PalaceId } from "./stars";

type T = { en: string; vi: string; ja: string };

export const MAIN_EXTRA: Record<MainStarId, { family: T; strength: T; caution: T }> = {
  tu_vi: {
    family: { en: "Tử Vi here is traditionally linked with taking on a protective, head-of-family role and a strong sense of duty to relatives.", vi: "Tử Vi ở đây theo truyền thống gắn với vai trò che chở, gánh vác gia đình và tinh thần trách nhiệm với người thân.", ja: "ここにあるTử Vi（紫微）は、伝統的に家族を守り支える役割や、身内への強い責任感と結びつけられます。" },
    strength: { en: "Lean on your steadiness: taking responsibility and setting direction tend to suit you.", vi: "Hãy dựa vào sự vững vàng: nhận trách nhiệm và định hướng thường hợp với bạn.", ja: "落ち着きを活かして。責任を引き受け、方向を示す役割が合いやすいタイプです。" },
    caution: { en: "Pride can make it hard to ask for help; sharing the load is not a loss of standing.", vi: "Lòng tự trọng cao có thể khiến bạn ngại nhờ giúp; chia sẻ gánh nặng không làm giảm vị thế.", ja: "プライドから人に頼りにくくなることも。荷を分け合っても、あなたの価値は下がりません。" },
  },
  thien_co: {
    family: { en: "Thiên Cơ here is traditionally linked with being the one who plans ahead and thinks through family matters.", vi: "Thiên Cơ ở đây theo truyền thống gắn với người hay lo xa, suy tính chu đáo cho việc nhà.", ja: "ここにあるThiên Cơ（天機）は、伝統的に先を読み、家族のことをよく考えて段取りする人と結びつけられます。" },
    strength: { en: "Your planning and quick understanding are assets; advising and organising suit you.", vi: "Khả năng tính toán và nắm bắt nhanh là thế mạnh; tư vấn và sắp xếp hợp với bạn.", ja: "計画力と理解の速さが武器。助言や段取りの役割で力を発揮しやすいです。" },
    caution: { en: "Overthinking can stall decisions; set a point where you stop weighing options.", vi: "Suy nghĩ quá nhiều có thể làm chậm quyết định; hãy đặt giới hạn cho việc cân nhắc.", ja: "考えすぎて決められなくなることも。「ここで決める」という区切りを持ちましょう。" },
  },
  thai_duong: {
    family: { en: "Thái Dương here is traditionally linked with warmth and generosity toward family, and with father figures.", vi: "Thái Dương ở đây theo truyền thống gắn với sự ấm áp, rộng rãi với gia đình và hình ảnh người cha.", ja: "ここにあるThái Dương（太陽）は、伝統的に家族への温かさや気前のよさ、父親像と結びつけられます。" },
    strength: { en: "Openness and generosity draw people to you; leading by example suits you.", vi: "Sự cởi mở và rộng lượng thu hút mọi người; làm gương là cách hợp với bạn.", ja: "開放的で気前のよい姿勢が人を惹きつけます。背中で見せるリーダーシップが合います。" },
    caution: { en: "Giving to everyone can wear you out; keep some energy for yourself.", vi: "Cho đi với tất cả mọi người có thể làm bạn kiệt sức; hãy giữ lại năng lượng cho mình.", ja: "誰にでも与えすぎて疲れてしまうことも。自分のための余力も残しておきましょう。" },
  },
  vu_khuc: {
    family: { en: "Vũ Khúc here is traditionally linked with being a practical provider who shows care through action.", vi: "Vũ Khúc ở đây theo truyền thống gắn với người lo toan thực tế, thể hiện quan tâm bằng hành động.", ja: "ここにあるVũ Khúc（武曲）は、伝統的に行動で愛情を示す、現実的な支え手と結びつけられます。" },
    strength: { en: "Decisiveness and a feel for money and execution are your strong suits.", vi: "Sự quyết đoán, nhạy bén tài chính và khả năng thực thi là thế mạnh của bạn.", ja: "決断力、お金の感覚、実行力が強み。結果を出す場面で頼られやすいです。" },
    caution: { en: "Bluntness can be read as coldness; say the caring part out loud too.", vi: "Sự thẳng thắn có thể bị xem là lạnh lùng; hãy nói ra cả sự quan tâm.", ja: "率直さが冷たく受け取られることも。気遣いの気持ちも言葉にして伝えましょう。" },
  },
  thien_dong: {
    family: { en: "Thiên Đồng here is traditionally linked with keeping harmony at home and enjoying family comfort.", vi: "Thiên Đồng ở đây theo truyền thống gắn với việc giữ hòa khí trong nhà và tận hưởng sự ấm cúng gia đình.", ja: "ここにあるThiên Đồng（天同）は、伝統的に家庭の和を保ち、家族と過ごす心地よさを大切にすることと結びつけられます。" },
    strength: { en: "An easy-going manner and a talent for smoothing things over are your gifts.", vi: "Sự dễ chịu và khả năng hòa giải là món quà của bạn.", ja: "おおらかさと場を和ませる力が持ち味。人の間に立つ役で光ります。" },
    caution: { en: "Avoiding friction can let problems grow; small honest talks help.", vi: "Né tránh va chạm có thể khiến vấn đề lớn dần; những cuộc trò chuyện thẳng thắn nhỏ sẽ giúp ích.", ja: "衝突を避けるうちに問題が大きくなることも。早めの小さな本音の会話が助けになります。" },
  },
  liem_trinh: {
    family: { en: "Liêm Trinh here is traditionally linked with firm principles and a strong sense of loyalty within the family.", vi: "Liêm Trinh ở đây theo truyền thống gắn với nguyên tắc vững vàng và lòng trung thành mạnh mẽ trong gia đình.", ja: "ここにあるLiêm Trinh（廉貞）は、伝統的に家族の中での確かな筋の通し方や、強い忠誠心と結びつけられます。" },
    strength: { en: "Integrity and focus give you weight; people trust you to keep your word.", vi: "Sự chính trực và tập trung tạo nên uy tín; mọi người tin bạn giữ lời.", ja: "誠実さと集中力が信頼につながります。約束を守る人として頼られやすいです。" },
    caution: { en: "Holding on too tightly to your own rules can create tension; leave room for others' ways.", vi: "Giữ quá chặt nguyên tắc riêng có thể gây căng thẳng; hãy chừa chỗ cho cách của người khác.", ja: "自分のルールにこだわりすぎると緊張を生むことも。相手のやり方にも余地を残しましょう。" },
  },
  thien_phu: {
    family: { en: "Thiên Phủ here is traditionally linked with building a stable, well-provided home.", vi: "Thiên Phủ ở đây theo truyền thống gắn với việc xây dựng một mái nhà ổn định, đầy đủ.", ja: "ここにあるThiên Phủ（天府）は、伝統的に安定し、満ち足りた家庭を築くことと結びつけられます。" },
    strength: { en: "Reliability and steady management make you someone others can count on.", vi: "Sự đáng tin cậy và quản lý vững vàng khiến bạn là chỗ dựa cho người khác.", ja: "安定感と堅実な管理力で、周りから頼られる存在になりやすいです。" },
    caution: { en: "Too much caution can make you miss good changes; try small experiments.", vi: "Quá thận trọng có thể làm bạn lỡ những thay đổi tốt; hãy thử những bước nhỏ.", ja: "慎重すぎて良い変化を逃すことも。小さな挑戦から試してみましょう。" },
  },
  thai_am: {
    family: { en: "Thái Âm here is traditionally linked with deep attachment to home and with mother figures.", vi: "Thái Âm ở đây theo truyền thống gắn với sự gắn bó sâu sắc với mái nhà và hình ảnh người mẹ.", ja: "ここにあるThái Âm（太陰）は、伝統的に家への深い愛着や、母親像と結びつけられます。" },
    strength: { en: "Sensitivity and quiet care are strengths; you notice what others miss.", vi: "Sự tinh tế và quan tâm lặng lẽ là thế mạnh; bạn nhận ra điều người khác bỏ lỡ.", ja: "繊細さと静かな思いやりが強み。人が見落とすことに気づけます。" },
    caution: { en: "Keeping feelings inside can turn into worry; let trusted people in.", vi: "Giữ cảm xúc trong lòng có thể thành lo âu; hãy mở lòng với người đáng tin.", ja: "気持ちを溜め込むと不安に変わりがち。信頼できる人には打ち明けましょう。" },
  },
  tham_lang: {
    family: { en: "Tham Lang here is traditionally linked with a lively, sociable family life full of gatherings.", vi: "Tham Lang ở đây theo truyền thống gắn với đời sống gia đình sôi nổi, nhiều dịp tụ họp.", ja: "ここにあるTham Lang（貪狼）は、伝統的ににぎやかで人の集まる家庭生活と結びつけられます。" },
    strength: { en: "Charm and many interests open doors; you connect people easily.", vi: "Sức hút và nhiều sở thích mở ra cơ hội; bạn dễ dàng kết nối mọi người.", ja: "魅力と多才さが扉を開きます。人と人をつなぐのが得意です。" },
    caution: { en: "Chasing many things at once can scatter your energy; choose what matters most.", vi: "Theo đuổi nhiều thứ cùng lúc có thể phân tán năng lượng; hãy chọn điều quan trọng nhất.", ja: "あれもこれもと手を広げすぎると力が分散しがち。本当に大事なものを選びましょう。" },
  },
  cu_mon: {
    family: { en: "Cự Môn here is traditionally linked with frank conversations at home, where clear words prevent misunderstandings.", vi: "Cự Môn ở đây theo truyền thống gắn với những cuộc trò chuyện thẳng thắn trong nhà; lời nói rõ ràng giúp tránh hiểu lầm.", ja: "ここにあるCự Môn（巨門）は、伝統的に家庭での率直な対話と結びつけられ、言葉を尽くすことが誤解を防ぐとされます。" },
    strength: { en: "Verbal skill and critical thinking suit research, teaching and negotiation.", vi: "Khả năng ăn nói và tư duy phản biện hợp với nghiên cứu, giảng dạy và đàm phán.", ja: "話す力と批判的思考が強み。研究・教育・交渉などで活きやすいです。" },
    caution: { en: "Sharp words can hurt more than intended; check the tone, not only the content.", vi: "Lời nói sắc bén có thể làm tổn thương hơn dự định; hãy để ý giọng điệu, không chỉ nội dung.", ja: "鋭い言葉が思った以上に人を傷つけることも。内容だけでなく伝え方にも気を配って。" },
  },
  thien_tuong: {
    family: { en: "Thiên Tướng here is traditionally linked with being the fair-minded peacekeeper among relatives.", vi: "Thiên Tướng ở đây theo truyền thống gắn với vai trò công bằng, giữ hòa khí giữa người thân.", ja: "ここにあるThiên Tướng（天相）は、伝統的に身内の間で公平に和を保つ役割と結びつけられます。" },
    strength: { en: "Fairness and support make you a trusted coordinator and partner.", vi: "Sự công bằng và tinh thần hỗ trợ khiến bạn là người điều phối, cộng sự đáng tin.", ja: "公平さと支える力で、信頼される調整役・相棒になれます。" },
    caution: { en: "Relying on others' approval can slow you down; trust your own judgement too.", vi: "Dựa vào sự đồng ý của người khác có thể làm bạn chậm lại; hãy tin cả phán đoán của mình.", ja: "人の評価を気にしすぎると動けなくなることも。自分の判断も信じましょう。" },
  },
  thien_luong: {
    family: { en: "Thiên Lương here is traditionally linked with a protective, elder-like role and giving advice to family.", vi: "Thiên Lương ở đây theo truyền thống gắn với vai trò che chở như bậc trưởng bối và hay khuyên bảo người nhà.", ja: "ここにあるThiên Lương（天梁）は、伝統的に年長者のように家族を守り、助言する役割と結びつけられます。" },
    strength: { en: "Mentoring and resilience are your strengths; people come to you in hard times.", vi: "Khả năng dìu dắt và sức bền là thế mạnh; mọi người tìm đến bạn lúc khó khăn.", ja: "人を導く力と粘り強さが強み。困ったときに頼られる存在です。" },
    caution: { en: "Advice can turn into lecturing; sometimes listening is the help.", vi: "Lời khuyên có thể thành giảng giải; đôi khi lắng nghe mới là sự giúp đỡ.", ja: "助言がお説教になりがち。ただ聴くことが一番の助けになる時もあります。" },
  },
  that_sat: {
    family: { en: "Thất Sát here is traditionally linked with independence and a strong will within the family.", vi: "Thất Sát ở đây theo truyền thống gắn với tính độc lập và ý chí mạnh mẽ trong gia đình.", ja: "ここにあるThất Sát（七殺）は、伝統的に家族の中での自立心と意志の強さと結びつけられます。" },
    strength: { en: "Courage and decisive action let you open new paths.", vi: "Sự dũng cảm và hành động quyết đoán giúp bạn mở ra con đường mới.", ja: "勇気と決断力で新しい道を切り開けるタイプです。" },
    caution: { en: "Impatience can push people away; explain your reasons before acting.", vi: "Sự nóng vội có thể đẩy người khác ra xa; hãy giải thích lý do trước khi hành động.", ja: "せっかちさが人を遠ざけることも。動く前に理由を伝えるとうまくいきます。" },
  },
  pha_quan: {
    family: { en: "Phá Quân here is traditionally linked with changes in family arrangements and with renewing old patterns.", vi: "Phá Quân ở đây theo truyền thống gắn với những thay đổi trong nếp nhà và việc làm mới thói quen cũ.", ja: "ここにあるPhá Quân（破軍）は、伝統的に家族のあり方の変化や、古い習慣を新しくすることと結びつけられます。" },
    strength: { en: "You are good at reform and fresh starts when things are stuck.", vi: "Bạn giỏi cải cách và bắt đầu lại khi mọi thứ bế tắc.", ja: "行き詰まったときの立て直しや、ゼロからの再出発が得意です。" },
    caution: { en: "Abrupt decisions can break what still works; keep what is worth keeping.", vi: "Quyết định đột ngột có thể phá vỡ cả điều còn tốt; hãy giữ lại điều đáng giữ.", ja: "急な決断で、まだ使えるものまで壊してしまうことも。残す価値のあるものは残して。" },
  },
};

/** What each palace stands for; also the theme of a Đại Hạn period that falls in it. */
export const PALACE_ROLE: Record<PalaceId, T> = {
  menh: { en: "yourself: character, direction and how you meet the world", vi: "bản thân: tính cách, hướng đi và cách bạn đối diện cuộc đời", ja: "自分自身：性格、進む方向、世界との向き合い方" },
  phu_mau: { en: "parents, elders and mentors, and learning from them", vi: "cha mẹ, bậc trên, người dìu dắt và những điều học được từ họ", ja: "親・目上の人・師、そこから学ぶこと" },
  phuc_duc: { en: "inner well-being, values and family roots", vi: "sự an yên trong lòng, giá trị sống và cội nguồn gia đình", ja: "心の充足、価値観、家のルーツ" },
  dien_trach: { en: "home, property and your living environment", vi: "nhà cửa, tài sản và môi trường sống", ja: "住まい・不動産・暮らしの環境" },
  quan_loc: { en: "work, career and your role in society", vi: "công việc, sự nghiệp và vai trò trong xã hội", ja: "仕事・キャリア・社会での役割" },
  no_boc: { en: "friends, colleagues and networks", vi: "bạn bè, đồng nghiệp và các mối quan hệ", ja: "友人・同僚・人脈" },
  thien_di: { en: "the outside world: travel, moving and how others see you", vi: "thế giới bên ngoài: đi xa, di chuyển và cách người khác nhìn bạn", ja: "外の世界：移動・旅・周りからの見られ方" },
  tat_ach: { en: "health and pressure, and taking care of yourself", vi: "sức khỏe, áp lực và việc chăm sóc bản thân", ja: "健康・ストレス・自分をいたわること" },
  tai_bach: { en: "money, income and resources", vi: "tiền bạc, thu nhập và nguồn lực", ja: "お金・収入・資源" },
  tu_tuc: { en: "children, creativity and the next generation", vi: "con cái, sự sáng tạo và thế hệ sau", ja: "子ども・創造性・次の世代" },
  phu_the: { en: "your partner and close partnerships", vi: "người bạn đời và những mối quan hệ gắn bó", ja: "パートナー・深いつながり" },
  huynh_de: { en: "siblings, peers and close collaborators", vi: "anh chị em, bạn đồng trang lứa và cộng sự thân thiết", ja: "きょうだい・同世代の仲間・身近な協力者" },
};

export const PALACE_JA: Record<PalaceId, string> = {
  menh: "命宮", phu_mau: "父母宮", phuc_duc: "福徳宮", dien_trach: "田宅宮", quan_loc: "官禄宮", no_boc: "奴僕宮",
  thien_di: "遷移宮", tat_ach: "疾厄宮", tai_bach: "財帛宮", tu_tuc: "子女宮", phu_the: "夫妻宮", huynh_de: "兄弟宮",
};

/** Short English palace names for chart cells. */
export const PALACE_SHORT_EN: Record<PalaceId, string> = {
  menh: "Self", phu_mau: "Parents", phuc_duc: "Fortune", dien_trach: "Home", quan_loc: "Career", no_boc: "Friends",
  thien_di: "Travel", tat_ach: "Health", tai_bach: "Wealth", tu_tuc: "Children", phu_the: "Partner", huynh_de: "Siblings",
};

/** Short name of each palace's theme, for the life map and stage chips. */
export const PALACE_SHORT: Record<PalaceId, T> = {
  menh: { en: "Self", vi: "Bản thân", ja: "自分" },
  phu_mau: { en: "Elders", vi: "Cha mẹ", ja: "親・師" },
  phuc_duc: { en: "Inner life", vi: "Phúc đức", ja: "心・ルーツ" },
  dien_trach: { en: "Home", vi: "Nhà cửa", ja: "住まい" },
  quan_loc: { en: "Work", vi: "Công việc", ja: "仕事" },
  no_boc: { en: "Friends", vi: "Bạn bè", ja: "仲間" },
  thien_di: { en: "Outside world", vi: "Bên ngoài", ja: "外の世界" },
  tat_ach: { en: "Health", vi: "Sức khỏe", ja: "健康" },
  tai_bach: { en: "Money", vi: "Tiền bạc", ja: "お金" },
  tu_tuc: { en: "Children", vi: "Con cái", ja: "子ども・創造" },
  phu_the: { en: "Partner", vi: "Bạn đời", ja: "パートナー" },
  huynh_de: { en: "Siblings", vi: "Anh em", ja: "きょうだい" },
};

/**
 * What each palace's domain looks like at different ages, used to word the decade questions.
 * A child's "career" palace is school and what they were absorbed in, not a job.
 */
export const PALACE_BY_AGE: Record<PalaceId, { child: T; adult: T; later: T }> = {
  menh: {
    child: { en: "who you were and what you were good at", vi: "tính cách và những điều mình giỏi", ja: "自分の性格や得意なこと" },
    adult: { en: "your own direction in life", vi: "hướng đi của chính mình", ja: "自分の生き方や進む方向" },
    later: { en: "living in your own way", vi: "sống theo cách của riêng mình", ja: "自分らしい生き方" },
  },
  phu_mau: {
    child: { en: "your parents and teachers", vi: "cha mẹ và thầy cô", ja: "親や先生との関係" },
    adult: { en: "your parents, elders and mentors", vi: "cha mẹ, bậc trên và người dìu dắt", ja: "親や目上の人・師との関係" },
    later: { en: "what you received from parents and mentors", vi: "những gì nhận được từ cha mẹ và người dìu dắt", ja: "親や恩師から受け継いだもの" },
  },
  phuc_duc: {
    child: { en: "the mood at home and the places where you felt at ease", vi: "không khí gia đình và nơi mình thấy bình yên", ja: "家の雰囲気や、心が落ち着く場所" },
    adult: { en: "inner contentment and the values you hold", vi: "sự an yên trong lòng và giá trị sống", ja: "心の充足や大切にしている価値観" },
    later: { en: "peace of mind and family roots", vi: "sự thanh thản và cội nguồn gia đình", ja: "心の穏やかさや家のルーツ" },
  },
  dien_trach: {
    child: { en: "the home and neighbourhood you grew up in", vi: "ngôi nhà và khu phố nơi mình lớn lên", ja: "住んでいた家や地域" },
    adult: { en: "your home and living environment", vi: "nhà cửa và môi trường sống", ja: "住まいや暮らしの環境" },
    later: { en: "your home and daily surroundings", vi: "nhà cửa và nếp sống hằng ngày", ja: "住まいや日々の暮らし" },
  },
  quan_loc: {
    child: { en: "school, study and the things you threw yourself into", vi: "trường lớp, việc học và những điều mình say mê", ja: "学校や勉強、打ち込んだこと" },
    adult: { en: "work and your role in society", vi: "công việc và vai trò trong xã hội", ja: "仕事や社会での役割" },
    later: { en: "the roles you have built up over the years", vi: "những vai trò đã vun đắp qua năm tháng", ja: "積み重ねてきた役割" },
  },
  no_boc: {
    child: { en: "friends and playmates", vi: "bạn bè và bạn chơi", ja: "友だちや遊び仲間" },
    adult: { en: "friends, colleagues and the people around you", vi: "bạn bè, đồng nghiệp và những người xung quanh", ja: "友人・同僚・人のつながり" },
    later: { en: "friends and the connections you keep", vi: "bạn bè và những mối quan hệ còn gắn bó", ja: "友人や人とのつながり" },
  },
  thien_di: {
    child: { en: "meeting the wider world: moves, trips and new places", vi: "gặp gỡ thế giới bên ngoài: chuyển nhà, đi xa, nơi mới", ja: "引っ越しや旅行など、外の世界との出会い" },
    adult: { en: "moving, travel and how others see you", vi: "di chuyển, đi xa và cách người khác nhìn bạn", ja: "移動や外の世界、周りからの見られ方" },
    later: { en: "your ties with the world outside", vi: "sự gắn kết với thế giới bên ngoài", ja: "外の世界との関わり" },
  },
  tat_ach: {
    child: { en: "your health and how you were looked after", vi: "sức khỏe và cách mình được chăm sóc", ja: "体調や、からだを大切にしてもらったこと" },
    adult: { en: "health and how you handle pressure", vi: "sức khỏe và cách đối diện áp lực", ja: "健康やストレスとの付き合い方" },
    later: { en: "health and taking care of yourself", vi: "sức khỏe và việc chăm sóc bản thân", ja: "健康や自分をいたわること" },
  },
  tai_bach: {
    child: { en: "pocket money and looking after your things", vi: "tiền tiêu vặt và việc giữ gìn đồ đạc", ja: "お小遣いや物を大切にすること" },
    adult: { en: "money, income and how you use resources", vi: "tiền bạc, thu nhập và cách dùng nguồn lực", ja: "お金や収入、資源の使い方" },
    later: { en: "savings and how you use what you have", vi: "tích lũy và cách dùng những gì mình có", ja: "蓄えや、持っているものの使い方" },
  },
  tu_tuc: {
    child: { en: "younger children and the play or making you loved", vi: "các em nhỏ và những trò chơi, sáng tạo mình yêu thích", ja: "年下の子や、夢中になった遊び・ものづくり" },
    adult: { en: "children, creative work and the next generation", vi: "con cái, sáng tạo và thế hệ sau", ja: "子どもや創造的な取り組み、次の世代" },
    later: { en: "children, grandchildren and the next generation", vi: "con cháu và thế hệ sau", ja: "子や孫、次の世代" },
  },
  phu_the: {
    child: { en: "a special close friend or someone you felt deeply connected to", vi: "một người bạn thân đặc biệt hay người mình thấy gắn bó", ja: "特に仲の良かった友だちや、深く心を通わせた人" },
    adult: { en: "your partner and close bonds", vi: "người bạn đời và những gắn bó sâu sắc", ja: "パートナーや深いつながり" },
    later: { en: "your partner and the person beside you", vi: "người bạn đời và người đồng hành", ja: "パートナーや、そばにいる人" },
  },
  huynh_de: {
    child: { en: "siblings and children your own age", vi: "anh chị em và bạn cùng lứa", ja: "きょうだいや同じ年頃の仲間" },
    adult: { en: "siblings and peers", vi: "anh chị em và bạn đồng trang lứa", ja: "きょうだいや同世代の仲間" },
    later: { en: "siblings and long-time companions", vi: "anh chị em và những người bạn lâu năm", ja: "きょうだいや古くからの仲間" },
  },
};
