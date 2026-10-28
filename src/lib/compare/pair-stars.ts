/**
 * What each main star says about a person with the people close to them, worded concretely for
 * the pair readings (pair-1): what one looks for (in a relationship palace), what one brings (in
 * Mệnh), how that tends to show, and one thing to be careful of. Soft wording ("tends to"), no
 * verdicts; the traditional star meanings are the same as in interpret.ts, only said plainly.
 */
import type { MainStarId } from "@/lib/tuvi/stars";

type T = { en: string; vi: string; ja: string };

export const PAIR_STAR: Record<MainStarId, { want: T; give: T; scene: T; care: T }> = {
  tu_vi: {
    want: { ja: "頼りがいがあって、互いに敬意を払える関係", en: "someone dependable, with mutual respect", vi: "một người đáng tin cậy và sự tôn trọng lẫn nhau" },
    give: { ja: "どっしりした頼りがいと責任感", en: "a steady dependability and sense of responsibility", vi: "sự vững vàng đáng tin và tinh thần trách nhiệm" },
    scene: { ja: "近しい人のことは、自分が守る側に立とうとするタイプです。", en: "With people close to them, they tend to take the role of the one who protects.", vi: "Với người thân thiết, họ thường đứng ra làm người che chở." },
    care: { ja: "プライドから弱音を吐きにくいので、「頼っていいよ」と伝えると関係がやわらぎます。", en: "Pride can make it hard for them to show weakness; saying “you can lean on me” softens things.", vi: "Lòng tự trọng khiến họ khó tỏ ra yếu lòng; một câu “cứ dựa vào mình” sẽ làm mọi thứ nhẹ nhàng hơn." },
  },
  thien_co: {
    want: { ja: "考えや話が通じ合う、知的なやりとり", en: "a meeting of minds and good conversation", vi: "sự đồng điệu trong suy nghĩ và những cuộc trò chuyện hay" },
    give: { ja: "よく気がつく頭の回転と、先回りする段取り力", en: "a quick, observant mind and a knack for planning ahead", vi: "đầu óc nhanh nhạy, tinh ý và tài lo liệu trước" },
    scene: { ja: "相手が困っていると、すぐに「こうしたら？」と案を出してくれるタイプです。", en: "When the other is stuck, they are quick to suggest “what if you tried this?”", vi: "Khi người kia gặp khó, họ nhanh chóng gợi ý “hay thử thế này xem?”." },
    care: { ja: "考えすぎて、気持ちより理屈が先に立つことも。答えより「どう感じた？」を聞く時間を持つと安心です。", en: "Thinking can run ahead of feelings; making time to ask “how did that feel?” rather than solving helps.", vi: "Lý trí đôi khi đi trước cảm xúc; dành thời gian hỏi “bạn thấy thế nào?” thay vì chỉ tìm cách giải quyết sẽ giúp ích." },
  },
  thai_duong: {
    want: { ja: "明るく、気持ちをまっすぐ表してくれる温かさ", en: "warmth and feelings shown openly", vi: "sự ấm áp và tình cảm được bày tỏ thẳng thắn" },
    give: { ja: "人を照らす明るさと面倒見のよさ", en: "a brightness that lights others up, and generous care", vi: "sự rạng rỡ soi sáng người khác và lòng quan tâm rộng rãi" },
    scene: { ja: "まわりのために自分から動き、その場を明るくするタイプです。", en: "They tend to act for those around them and brighten the room.", vi: "Họ thường chủ động vì người xung quanh và làm không khí sáng bừng." },
    care: { ja: "人のためにがんばりすぎて、疲れをため込みがち。二人の時間には、ゆっくり休ませてあげると良さそうです。", en: "They can wear themselves out for others; letting them rest when you are together does them good.", vi: "Họ dễ kiệt sức vì người khác; để họ được nghỉ ngơi khi ở bên nhau sẽ tốt cho họ." },
  },
  vu_khuc: {
    want: { ja: "言葉より行動で支え合える、確かな信頼", en: "solid trust, shown in deeds more than words", vi: "niềm tin vững chắc, thể hiện bằng hành động hơn lời nói" },
    give: { ja: "決めたことをやり抜く実行力と現実感覚", en: "the drive to see things through and a practical sense", vi: "sức thực thi đến cùng và óc thực tế" },
    scene: { ja: "気持ちを言葉にするより、具体的に手を貸すことで思いを示すタイプです。", en: "They tend to show care by lending a hand rather than by saying it.", vi: "Họ thường thể hiện tình cảm bằng việc giúp đỡ cụ thể hơn là lời nói." },
    care: { ja: "言葉が少なく、そっけなく見えることも。行動の裏にある気持ちを汲むと、すれ違いが減ります。", en: "Few words can look curt; reading the feeling behind the action avoids misunderstandings.", vi: "Ít lời có thể trông lạnh lùng; hiểu tình cảm đằng sau hành động sẽ tránh được hiểu lầm." },
  },
  thien_dong: {
    want: { ja: "一緒にいて気楽で、のんびり笑い合える穏やかさ", en: "an easy, gentle closeness where you can laugh together", vi: "sự gần gũi dễ chịu, hiền hòa, có thể cùng nhau cười" },
    give: { ja: "場をなごませる穏やかさと、楽しむ心", en: "a calm that puts people at ease, and a love of enjoying life", vi: "sự hiền hòa khiến người khác thoải mái và lòng yêu tận hưởng cuộc sống" },
    scene: { ja: "予定を詰め込むより、ゆっくりした時間を一緒に楽しもうとするタイプです。", en: "They would rather enjoy unhurried time together than a packed schedule.", vi: "Họ thích cùng tận hưởng thời gian thong thả hơn là lịch kín mít." },
    care: { ja: "面倒な話を先延ばしにしがちなので、大事なことは早めに言葉にすると安心です。", en: "Awkward topics tend to get put off, so saying important things early helps.", vi: "Chuyện khó nói dễ bị gác lại, nên nói sớm những điều quan trọng sẽ giúp yên tâm." },
  },
  liem_trinh: {
    want: { ja: "情熱があって、筋の通った誠実な関係", en: "passion together with honesty and clear lines", vi: "sự nồng nhiệt cùng sự chân thành, rõ ràng" },
    give: { ja: "一途な情熱と、けじめを大切にする誠実さ", en: "wholehearted passion and a sincerity that keeps its word", vi: "sự nồng nhiệt một lòng và sự chân thành giữ chữ tín" },
    scene: { ja: "大切な人には深く入れ込み、約束やルールをきちんと守ろうとするタイプです。", en: "They throw themselves into the people they care about and keep promises carefully.", vi: "Họ dốc lòng vì người mình quý và giữ lời hứa cẩn thận." },
    care: { ja: "こだわりが強く、白黒をつけたくなることも。正しさより気持ちを優先する場面を作ると和らぎます。", en: "They can want things black and white; sometimes putting feelings before being right eases things.", vi: "Họ có thể muốn mọi thứ rạch ròi; đôi khi đặt cảm xúc trước đúng sai sẽ dịu đi." },
  },
  thien_phu: {
    want: { ja: "安心して身をあずけられる、落ち着いた包容力", en: "a calm, embracing steadiness you can rest in", vi: "sự bao dung điềm tĩnh mà mình có thể an tâm dựa vào" },
    give: { ja: "物事を受けとめる包容力と、暮らしを整える安定感", en: "a capacity to take things in, and a steadiness that keeps life in order", vi: "sự bao dung đón nhận mọi việc và sự ổn định giữ nếp sống" },
    scene: { ja: "あわてず構えて、相手の暮らしや居場所をしっかり整えてくれるタイプです。", en: "Unhurried, they tend to make a secure place and a settled life for the other.", vi: "Không vội vàng, họ thường tạo cho người kia một chốn an ổn và nếp sống vững vàng." },
    care: { ja: "変化を好まず、慎重になりすぎることも。新しいことは小さく試すと動きやすくなります。", en: "They may resist change and be over-careful; trying new things in small steps helps.", vi: "Họ có thể ngại thay đổi và quá thận trọng; thử điều mới từng bước nhỏ sẽ dễ hơn." },
  },
  thai_am: {
    want: { ja: "こまやかな気づかいと、静かに寄り添う優しさ", en: "attentive care and a quiet, gentle closeness", vi: "sự quan tâm tinh tế và dịu dàng lặng lẽ bên nhau" },
    give: { ja: "感受性の豊かさと、静かな思いやり", en: "a rich sensitivity and quiet consideration", vi: "sự nhạy cảm phong phú và lòng quan tâm lặng lẽ" },
    scene: { ja: "言葉にしない相手の気持ちを察して、そっと気づかうタイプです。", en: "They sense what the other leaves unsaid and look after it quietly.", vi: "Họ cảm nhận được điều người kia không nói ra và lặng lẽ quan tâm." },
    care: { ja: "気持ちを内にしまいがちなので、ときどき「今どう？」と聞くと本音が出やすくなります。", en: "They tend to keep feelings in; an occasional “how are you, really?” helps them open up.", vi: "Họ hay giữ cảm xúc trong lòng; thỉnh thoảng hỏi “dạo này thế nào?” sẽ giúp họ mở lòng." },
  },
  tham_lang: {
    want: { ja: "一緒に新しいことを楽しめる、刺激と魅力", en: "spark and charm, and new things to enjoy together", vi: "sự cuốn hút, mới mẻ và những niềm vui cùng nhau" },
    give: { ja: "人を惹きつける魅力と、好奇心の強さ", en: "a magnetic charm and strong curiosity", vi: "sức hút tự nhiên và trí tò mò mạnh mẽ" },
    scene: { ja: "おいしいもの、遊び、趣味など、楽しいことに相手を誘い出すタイプです。", en: "They tend to draw the other out to good food, play and hobbies.", vi: "Họ thường rủ người kia đi ăn ngon, vui chơi, theo đuổi sở thích." },
    care: { ja: "興味が移りやすい面も。二人の「いつもの」を一つ持つと、関係が落ち着きます。", en: "Interests can shift quickly; having one “usual thing” of your own steadies the bond.", vi: "Hứng thú dễ thay đổi; có một “thói quen chung” của hai người sẽ giúp gắn bó." },
  },
  cu_mon: {
    want: { ja: "本音で話し合える、言葉のやりとり", en: "honest talk where both say what they think", vi: "những cuộc nói chuyện thật lòng" },
    give: { ja: "物事を見抜く分析力と、言葉の力", en: "a sharp eye for what is really going on, and a way with words", vi: "con mắt phân tích sắc sảo và sức mạnh của lời nói" },
    scene: { ja: "気になることははっきり言葉にし、話し合いで解決しようとするタイプです。", en: "They say clearly what bothers them and try to talk things through.", vi: "Họ nói rõ điều băn khoăn và muốn giải quyết bằng trò chuyện." },
    care: { ja: "言い方が鋭くなり、言い合いになりやすいことも。伝える前にひと呼吸おくと、伝わり方が変わります。", en: "Words can come out sharp and turn into arguments; a breath before speaking changes how it lands.", vi: "Lời nói có thể sắc và dễ thành tranh cãi; hít một hơi trước khi nói sẽ khác đi nhiều." },
  },
  thien_tuong: {
    want: { ja: "公平で、困ったときに力を貸し合える関係", en: "fairness, and helping each other when it counts", vi: "sự công bằng và giúp nhau khi cần" },
    give: { ja: "面倒見のよさと、公平さを大切にする誠実さ", en: "a caring nature and a sincere sense of fairness", vi: "sự chu đáo và lòng chân thành coi trọng công bằng" },
    scene: { ja: "困っている人を放っておけず、間に入って調整役を買って出るタイプです。", en: "They can't leave someone struggling and often step in to smooth things over.", vi: "Họ không bỏ mặc người gặp khó và thường đứng ra dàn xếp." },
    care: { ja: "人に合わせすぎて、自分の希望を後回しにしがち。「あなたはどうしたい？」と聞くと安心します。", en: "They may put their own wishes last; asking “what would you like?” reassures them.", vi: "Họ hay gác mong muốn của mình lại; hỏi “bạn muốn thế nào?” sẽ giúp họ yên lòng." },
  },
  thien_luong: {
    want: { ja: "見守り支えてくれる、年上のような頼もしさ", en: "someone who watches over and supports you, like an elder", vi: "một người che chở, nâng đỡ như bậc anh chị" },
    give: { ja: "人を見守り導く面倒見と、筋の通った考え", en: "a protective, guiding care and principled thinking", vi: "sự che chở, dẫn dắt và lối nghĩ có nguyên tắc" },
    scene: { ja: "相談に乗ったり助言したりと、相手を守り育てる側に立つタイプです。", en: "They tend to listen, advise, and look after the other's growth.", vi: "Họ thường lắng nghe, khuyên nhủ và vun đắp cho người kia." },
    care: { ja: "良かれと思って口うるさくなることも。助言より「聞くだけ」の時間を持つと関係がやわらぎます。", en: "Good intentions can turn into lecturing; sometimes just listening softens things.", vi: "Ý tốt có thể thành lời dạy bảo; đôi khi chỉ lắng nghe sẽ làm mọi thứ nhẹ nhàng hơn." },
  },
  that_sat: {
    want: { ja: "互いに自立して尊重し合える、さっぱりした関係", en: "two independent people who respect each other, without fuss", vi: "hai người độc lập, tôn trọng nhau, không rườm rà" },
    give: { ja: "迷わず切り開く行動力と、独立心", en: "the drive to forge ahead and a strong independence", vi: "sức hành động mở đường và tinh thần độc lập" },
    scene: { ja: "決めたら一直線に動き、相手の前に立って道を切り開くタイプです。", en: "Once decided, they move straight ahead and clear the way for the other.", vi: "Đã quyết là họ tiến thẳng và mở đường cho người kia." },
    care: { ja: "相手のペースを待たずに走り出すことも。大事な決めごとは、一度二人で確かめると安心です。", en: "They may set off without waiting; checking big decisions together first helps.", vi: "Họ có thể lao đi mà không chờ; cùng xác nhận những quyết định lớn trước sẽ yên tâm hơn." },
  },
  pha_quan: {
    want: { ja: "変化を一緒に楽しめる、自由で率直な関係", en: "a free, frank bond that enjoys change together", vi: "mối quan hệ tự do, thẳng thắn, cùng đón nhận đổi thay" },
    give: { ja: "古いものを壊して新しく始める勇気と、変化を恐れない心", en: "the courage to break with the old and start afresh", vi: "dũng khí phá bỏ cái cũ để bắt đầu lại" },
    scene: { ja: "停滞を嫌い、引っ越しや転職など、新しい展開を一緒に始めようとするタイプです。", en: "Disliking standstill, they tend to start new chapters, like a move or a new job, together.", vi: "Không thích trì trệ, họ thường cùng bắt đầu những chương mới như chuyển nhà, đổi việc." },
    care: { ja: "変化を急ぎすぎて、相手が置いていかれることも。決める前に気持ちを聞く時間をとると安心です。", en: "Rushing change can leave the other behind; asking how they feel before deciding helps.", vi: "Thay đổi quá vội có thể bỏ người kia lại phía sau; hỏi cảm nhận trước khi quyết sẽ yên tâm hơn." },
  },
};
