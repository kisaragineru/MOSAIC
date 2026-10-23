/**
 * Rule-based Tử Vi interpretation (INTERPRETATION_VERSION).
 *
 * Input: a computed Chart. Output: sections of short paragraphs, each traceable to the
 * rule ids that produced it. Text describes TRADITIONAL associations only; it never
 * predicts specific events and never claims scientific validity. Because star brightness
 * is not computed by the engine, no text depends on miếu/vượng/đắc/hãm.
 */
import type { Locale } from "@/lib/i18n/locales";
import { BRANCHES } from "./canchi";
import type { Chart, Palace } from "./engine";
import { MAIN_EXTRA, PALACE_JA, PALACE_ROLE } from "./interpret-detail";
import { HOA_INFO, PALACE_INFO, STAR_INFO, type AuxStarId, type HoaId, type MainStarId, type PalaceId } from "./stars";

export const INTERPRETATION_VERSION = "interp-2";

type T = { en: string; vi: string; ja: string };
type Domain = "personality" | "love" | "career" | "wealth";

export const SECTIONS = ["personality", "relationships", "love", "career", "wealth", "family", "cycles"] as const;
export type Section = (typeof SECTIONS)[number];

const SECTION_PALACES: Record<Exclude<Section, "cycles">, PalaceId[]> = {
  personality: ["menh"],
  relationships: ["no_boc", "huynh_de"],
  love: ["phu_the"],
  career: ["quan_loc"],
  wealth: ["tai_bach"],
  family: ["phu_mau", "dien_trach", "tu_tuc"],
};

export const SECTION_TITLES: Record<Section, T> = {
  personality: { en: "Personality", vi: "Tính cách", ja: "性格" },
  relationships: { en: "Friends & siblings", vi: "Bạn bè & anh chị em", ja: "友人・兄弟姉妹" },
  love: { en: "Love & partnership", vi: "Tình cảm & hôn nhân", ja: "恋愛・パートナー" },
  career: { en: "Work & career", vi: "Công việc & sự nghiệp", ja: "仕事・キャリア" },
  wealth: { en: "Money", vi: "Tài chính", ja: "お金" },
  family: { en: "Family & home", vi: "Gia đình & nhà cửa", ja: "家族・住まい" },
  cycles: { en: "Life cycles (Đại Hạn)", vi: "Các giai đoạn cuộc đời (Đại Hạn)", ja: "人生の周期（Đại Hạn・大限）" },
};

const MAIN: Record<MainStarId, { keywords: T } & Record<Domain, T>> = {
  tu_vi: {
    keywords: { en: "dignity, leadership and a sense of responsibility", vi: "uy nghi, khả năng lãnh đạo và tinh thần trách nhiệm", ja: "品格、統率力、責任感" },
    personality: { en: "Tử Vi in Mệnh is traditionally read as dignified and self-respecting, with a wish to lead and to be taken seriously.", vi: "Tử Vi thủ Mệnh theo truyền thống được xem là người đĩnh đạc, tự trọng, có mong muốn dẫn dắt và được coi trọng.", ja: "命宮のTử Vi（紫微）は、伝統的に品格があり自尊心が高く、人を導き重んじられたいと願う人とされます。" },
    love: { en: "In the partnership palace, Tử Vi is traditionally linked with valuing respect and a partner of strong character.", vi: "Ở cung Phu Thê, Tử Vi thường được gắn với việc coi trọng sự tôn trọng và người bạn đời có cá tính mạnh.", ja: "夫妻宮のTử Viは、伝統的に敬意を大切にし、個性の強い相手との縁を示すとされます。" },
    career: { en: "In the career palace, Tử Vi is traditionally associated with roles that carry responsibility and authority.", vi: "Ở cung Quan Lộc, Tử Vi thường gắn với những vai trò có trách nhiệm và quyền hạn.", ja: "官禄宮のTử Viは、伝統的に責任と権限を伴う役割と結びつけられます。" },
    wealth: { en: "In the wealth palace, Tử Vi is traditionally associated with stable handling of resources and status-related income.", vi: "Ở cung Tài Bạch, Tử Vi thường gắn với việc quản lý tài chính ổn định và nguồn thu gắn với địa vị.", ja: "財帛宮のTử Viは、伝統的に安定した資金管理や、地位に伴う収入と結びつけられます。" },
  },
  thien_co: {
    keywords: { en: "quick thinking, planning and adaptability", vi: "suy nghĩ nhanh, giỏi tính toán và linh hoạt", ja: "頭の回転の速さ、計画性、柔軟さ" },
    personality: { en: "Thiên Cơ in Mệnh is traditionally read as thoughtful and quick-minded, fond of planning and of understanding how things work.", vi: "Thiên Cơ thủ Mệnh theo truyền thống là người chu đáo, nhanh trí, thích tính toán và tìm hiểu cách mọi thứ vận hành.", ja: "命宮のThiên Cơ（天機）は、伝統的に思慮深く機転が利き、計画を立てることや物事の仕組みを理解することを好む人とされます。" },
    love: { en: "In the partnership palace, Thiên Cơ is traditionally linked with valuing conversation and mental connection.", vi: "Ở cung Phu Thê, Thiên Cơ thường gắn với việc coi trọng trò chuyện và sự đồng điệu trong suy nghĩ.", ja: "夫妻宮のThiên Cơは、伝統的に会話や考えの通じ合いを大切にする関係と結びつけられます。" },
    career: { en: "In the career palace, Thiên Cơ is traditionally associated with planning, analysis, advisory or technical work.", vi: "Ở cung Quan Lộc, Thiên Cơ thường gắn với công việc hoạch định, phân tích, tư vấn hoặc kỹ thuật.", ja: "官禄宮のThiên Cơは、伝統的に企画、分析、助言、技術の仕事と結びつけられます。" },
    wealth: { en: "In the wealth palace, Thiên Cơ is traditionally associated with income from skill and ideas, with some fluctuation.", vi: "Ở cung Tài Bạch, Thiên Cơ thường gắn với nguồn thu từ kỹ năng và ý tưởng, có lúc lên xuống.", ja: "財帛宮のThiên Cơは、伝統的に技能やアイデアによる収入と結びつけられ、増減もあるとされます。" },
  },
  thai_duong: {
    keywords: { en: "warmth, generosity and an outward orientation", vi: "ấm áp, rộng rãi và hướng ra bên ngoài", ja: "温かさ、気前のよさ、外向きの姿勢" },
    personality: { en: "Thái Dương in Mệnh is traditionally read as open and generous, wanting to be useful and visible to others.", vi: "Thái Dương thủ Mệnh theo truyền thống là người cởi mở, rộng lượng, muốn giúp ích và được nhìn nhận.", ja: "命宮のThái Dương（太陽）は、伝統的に開放的で気前がよく、人の役に立ち認められたいと願う人とされます。" },
    love: { en: "In the partnership palace, Thái Dương is traditionally linked with a warm, expressive partnership that needs openness.", vi: "Ở cung Phu Thê, Thái Dương thường gắn với mối quan hệ ấm áp, bộc lộ, cần sự cởi mở.", ja: "夫妻宮のThái Dươngは、伝統的に温かく表現豊かで、開かれた関係を必要とすると読まれます。" },
    career: { en: "In the career palace, Thái Dương is traditionally associated with public-facing work, teaching or public service.", vi: "Ở cung Quan Lộc, Thái Dương thường gắn với công việc tiếp xúc công chúng, giảng dạy hoặc phục vụ cộng đồng.", ja: "官禄宮のThái Dươngは、伝統的に人前に立つ仕事、教育、公共の仕事と結びつけられます。" },
    wealth: { en: "In the wealth palace, Thái Dương is traditionally associated with earning through reputation and spending generously.", vi: "Ở cung Tài Bạch, Thái Dương thường gắn với kiếm tiền nhờ danh tiếng và chi tiêu rộng rãi.", ja: "財帛宮のThái Dươngは、伝統的に評判による収入と、気前のよい使い方と結びつけられます。" },
  },
  vu_khuc: {
    keywords: { en: "decisiveness, practicality and financial sense", vi: "quyết đoán, thực tế và nhạy bén tài chính", ja: "決断力、実際性、金銭感覚" },
    personality: { en: "Vũ Khúc in Mệnh is traditionally read as decisive and practical, valuing results and self-reliance.", vi: "Vũ Khúc thủ Mệnh theo truyền thống là người quyết đoán, thực tế, coi trọng kết quả và sự tự lập.", ja: "命宮のVũ Khúc（武曲）は、伝統的に決断力があり実際的で、結果と自立を重んじる人とされます。" },
    love: { en: "In the partnership palace, Vũ Khúc is traditionally linked with a practical bond where feelings may be shown through actions more than words.", vi: "Ở cung Phu Thê, Vũ Khúc thường gắn với mối quan hệ thực tế, tình cảm thể hiện qua hành động hơn lời nói.", ja: "夫妻宮のVũ Khúcは、伝統的に実際的な結びつきで、気持ちを言葉より行動で示しがちとされます。" },
    career: { en: "In the career palace, Vũ Khúc is traditionally associated with finance, management or technical execution.", vi: "Ở cung Quan Lộc, Vũ Khúc thường gắn với tài chính, quản lý hoặc thực thi kỹ thuật.", ja: "官禄宮のVũ Khúcは、伝統的に金融、管理、技術的な実務と結びつけられます。" },
    wealth: { en: "In the wealth palace, Vũ Khúc is traditionally considered a strong wealth star, linked with earning through effort.", vi: "Ở cung Tài Bạch, Vũ Khúc được xem là tài tinh, gắn với việc kiếm tiền bằng nỗ lực.", ja: "財帛宮のVũ Khúcは、伝統的に強い財の星とされ、努力によって稼ぐことと結びつけられます。" },
  },
  thien_dong: {
    keywords: { en: "gentleness, enjoyment of life and a wish for harmony", vi: "hiền hòa, biết hưởng thụ và mong muốn hòa thuận", ja: "穏やかさ、人生を楽しむ心、調和への願い" },
    personality: { en: "Thiên Đồng in Mệnh is traditionally read as easy-going and kind, enjoying comfort and avoiding unnecessary conflict.", vi: "Thiên Đồng thủ Mệnh theo truyền thống là người dễ chịu, tốt bụng, thích sự thoải mái và tránh xung đột không cần thiết.", ja: "命宮のThiên Đồng（天同）は、伝統的に穏やかでやさしく、心地よさを楽しみ、不要な争いを避ける人とされます。" },
    love: { en: "In the partnership palace, Thiên Đồng is traditionally linked with a gentle, companionable relationship.", vi: "Ở cung Phu Thê, Thiên Đồng thường gắn với mối quan hệ hiền hòa, gắn bó như bạn đồng hành.", ja: "夫妻宮のThiên Đồngは、伝統的に穏やかで、仲間のように寄り添う関係と結びつけられます。" },
    career: { en: "In the career palace, Thiên Đồng is traditionally associated with service, care or creative work in a pleasant environment.", vi: "Ở cung Quan Lộc, Thiên Đồng thường gắn với công việc phục vụ, chăm sóc hoặc sáng tạo trong môi trường dễ chịu.", ja: "官禄宮のThiên Đồngは、伝統的に心地よい環境でのサービス、ケア、創作の仕事と結びつけられます。" },
    wealth: { en: "In the wealth palace, Thiên Đồng is traditionally associated with money coming gradually, with spending on comfort.", vi: "Ở cung Tài Bạch, Thiên Đồng thường gắn với tiền đến từ từ và chi tiêu cho sự thoải mái.", ja: "財帛宮のThiên Đồngは、伝統的に少しずつ入るお金と、快適さへの出費と結びつけられます。" },
  },
  liem_trinh: {
    keywords: { en: "principles, intensity and strong will", vi: "nguyên tắc, mãnh liệt và ý chí mạnh", ja: "原則、情熱、強い意志" },
    personality: { en: "Liêm Trinh in Mệnh is traditionally read as principled and intense, with strong likes and dislikes.", vi: "Liêm Trinh thủ Mệnh theo truyền thống là người có nguyên tắc, mãnh liệt, yêu ghét rõ ràng.", ja: "命宮のLiêm Trinh（廉貞）は、伝統的に原則を重んじ情熱的で、好き嫌いがはっきりした人とされます。" },
    love: { en: "In the partnership palace, Liêm Trinh is traditionally linked with passionate feelings that benefit from patience.", vi: "Ở cung Phu Thê, Liêm Trinh thường gắn với tình cảm nồng nhiệt, cần sự kiên nhẫn.", ja: "夫妻宮のLiêm Trinhは、伝統的に情熱的な感情と結びつけられ、忍耐が実を結ぶとされます。" },
    career: { en: "In the career palace, Liêm Trinh is traditionally associated with law, administration, discipline or competitive fields.", vi: "Ở cung Quan Lộc, Liêm Trinh thường gắn với luật pháp, hành chính, kỷ luật hoặc lĩnh vực cạnh tranh.", ja: "官禄宮のLiêm Trinhは、伝統的に法律、行政、規律のある分野、競争のある分野と結びつけられます。" },
    wealth: { en: "In the wealth palace, Liêm Trinh is traditionally associated with earning through persistence and organisation.", vi: "Ở cung Tài Bạch, Liêm Trinh thường gắn với kiếm tiền nhờ bền bỉ và tổ chức tốt.", ja: "財帛宮のLiêm Trinhは、伝統的に粘り強さと段取りによって稼ぐことと結びつけられます。" },
  },
  thien_phu: {
    keywords: { en: "stability, prudence and care for resources", vi: "ổn định, thận trọng và biết giữ gìn", ja: "安定、慎重さ、蓄えを守る姿勢" },
    personality: { en: "Thiên Phủ in Mệnh is traditionally read as steady and prudent, someone who likes security and keeps things in order.", vi: "Thiên Phủ thủ Mệnh theo truyền thống là người vững vàng, thận trọng, thích sự an toàn và ngăn nắp.", ja: "命宮のThiên Phủ（天府）は、伝統的に落ち着いて慎重で、安心を好み物事を整えておく人とされます。" },
    love: { en: "In the partnership palace, Thiên Phủ is traditionally linked with a stable, supportive partnership.", vi: "Ở cung Phu Thê, Thiên Phủ thường gắn với mối quan hệ ổn định, nâng đỡ nhau.", ja: "夫妻宮のThiên Phủは、伝統的に安定し、支え合う関係と結びつけられます。" },
    career: { en: "In the career palace, Thiên Phủ is traditionally associated with management, administration and stewardship roles.", vi: "Ở cung Quan Lộc, Thiên Phủ thường gắn với vai trò quản lý, hành chính và gìn giữ.", ja: "官禄宮のThiên Phủは、伝統的に管理、事務、運営を担う役割と結びつけられます。" },
    wealth: { en: "In the wealth palace, Thiên Phủ is traditionally associated with saving and accumulating steadily.", vi: "Ở cung Tài Bạch, Thiên Phủ thường gắn với tiết kiệm và tích lũy đều đặn.", ja: "財帛宮のThiên Phủは、伝統的に着実に貯め、蓄えることと結びつけられます。" },
  },
  thai_am: {
    keywords: { en: "sensitivity, inner life and quiet care", vi: "nhạy cảm, đời sống nội tâm và sự quan tâm thầm lặng", ja: "感受性、内面の豊かさ、静かな思いやり" },
    personality: { en: "Thái Âm in Mệnh is traditionally read as gentle and sensitive, with a rich inner life and an eye for beauty.", vi: "Thái Âm thủ Mệnh theo truyền thống là người dịu dàng, nhạy cảm, nội tâm phong phú và có óc thẩm mỹ.", ja: "命宮のThái Âm（太陰）は、伝統的にやさしく繊細で、豊かな内面と美への感性を持つ人とされます。" },
    love: { en: "In the partnership palace, Thái Âm is traditionally linked with a tender, emotionally attentive relationship.", vi: "Ở cung Phu Thê, Thái Âm thường gắn với mối quan hệ dịu dàng, chú trọng cảm xúc.", ja: "夫妻宮のThái Âmは、伝統的にやさしく、気持ちに細やかに寄り添う関係と結びつけられます。" },
    career: { en: "In the career palace, Thái Âm is traditionally associated with planning behind the scenes, design, property or finance.", vi: "Ở cung Quan Lộc, Thái Âm thường gắn với công việc hậu trường, thiết kế, bất động sản hoặc tài chính.", ja: "官禄宮のThái Âmは、伝統的に裏方での企画、デザイン、不動産、金融と結びつけられます。" },
    wealth: { en: "In the wealth palace, Thái Âm is traditionally associated with gradual accumulation and careful saving.", vi: "Ở cung Tài Bạch, Thái Âm thường gắn với tích lũy từ từ và tiết kiệm cẩn thận.", ja: "財帛宮のThái Âmは、伝統的に少しずつの蓄積と、堅実な貯蓄と結びつけられます。" },
  },
  tham_lang: {
    keywords: { en: "desire, charm and many interests", vi: "ham muốn, sức hút và nhiều sở thích", ja: "欲求、魅力、多彩な関心" },
    personality: { en: "Tham Lang in Mệnh is traditionally read as charming and curious, with many interests and a strong appetite for experience.", vi: "Tham Lang thủ Mệnh theo truyền thống là người có duyên, tò mò, nhiều sở thích và khao khát trải nghiệm.", ja: "命宮のTham Lang（貪狼）は、伝統的に魅力的で好奇心が強く、多くの関心と経験への意欲を持つ人とされます。" },
    love: { en: "In the partnership palace, Tham Lang is traditionally linked with attraction and romance that need mutual commitment.", vi: "Ở cung Phu Thê, Tham Lang thường gắn với sức hút và lãng mạn, cần sự cam kết từ hai phía.", ja: "夫妻宮のTham Langは、伝統的に惹かれ合いやロマンスと結びつけられ、互いの約束が大切とされます。" },
    career: { en: "In the career palace, Tham Lang is traditionally associated with sales, entertainment, hospitality or networking.", vi: "Ở cung Quan Lộc, Tham Lang thường gắn với kinh doanh, giải trí, dịch vụ hoặc giao tế.", ja: "官禄宮のTham Langは、伝統的に営業、エンターテインメント、接客、人脈づくりと結びつけられます。" },
    wealth: { en: "In the wealth palace, Tham Lang is traditionally associated with opportunities through social connections.", vi: "Ở cung Tài Bạch, Tham Lang thường gắn với cơ hội tài chính qua các mối quan hệ.", ja: "財帛宮のTham Langは、伝統的に人とのつながりから生まれる機会と結びつけられます。" },
  },
  cu_mon: {
    keywords: { en: "speech, analysis and questioning", vi: "ăn nói, phân tích và hay chất vấn", ja: "言葉、分析、問いかけ" },
    personality: { en: "Cự Môn in Mệnh is traditionally read as articulate and analytical, someone who questions and looks beneath the surface.", vi: "Cự Môn thủ Mệnh theo truyền thống là người ăn nói giỏi, hay phân tích, thích chất vấn và nhìn sâu vấn đề.", ja: "命宮のCự Môn（巨門）は、伝統的に弁が立ち分析的で、問いを立て物事の奥を見ようとする人とされます。" },
    love: { en: "In the partnership palace, Cự Môn is traditionally linked with the importance of clear, kind communication.", vi: "Ở cung Phu Thê, Cự Môn thường gắn với tầm quan trọng của giao tiếp rõ ràng, nhẹ nhàng.", ja: "夫妻宮のCự Mônは、伝統的に明確でやさしいコミュニケーションの大切さと結びつけられます。" },
    career: { en: "In the career palace, Cự Môn is traditionally associated with teaching, law, media, consulting or research.", vi: "Ở cung Quan Lộc, Cự Môn thường gắn với giảng dạy, luật, truyền thông, tư vấn hoặc nghiên cứu.", ja: "官禄宮のCự Mônは、伝統的に教育、法律、メディア、コンサルティング、研究と結びつけられます。" },
    wealth: { en: "In the wealth palace, Cự Môn is traditionally associated with earning through expertise and speech.", vi: "Ở cung Tài Bạch, Cự Môn thường gắn với kiếm tiền nhờ chuyên môn và lời nói.", ja: "財帛宮のCự Mônは、伝統的に専門性や話す力で稼ぐことと結びつけられます。" },
  },
  thien_tuong: {
    keywords: { en: "fairness, helpfulness and sense of appearance", vi: "công bằng, hay giúp đỡ và chú trọng hình thức", ja: "公平さ、面倒見のよさ、体裁への配慮" },
    personality: { en: "Thiên Tướng in Mệnh is traditionally read as fair-minded and helpful, attentive to how things look and to doing things properly.", vi: "Thiên Tướng thủ Mệnh theo truyền thống là người công bằng, hay giúp đỡ, chú ý hình thức và làm việc đúng mực.", ja: "命宮のThiên Tướng（天相）は、伝統的に公平で面倒見がよく、見た目や物事をきちんと行うことに気を配る人とされます。" },
    love: { en: "In the partnership palace, Thiên Tướng is traditionally linked with a considerate, mutually supportive partner.", vi: "Ở cung Phu Thê, Thiên Tướng thường gắn với người bạn đời chu đáo, hỗ trợ lẫn nhau.", ja: "夫妻宮のThiên Tướngは、伝統的に思いやりがあり、互いに支え合う相手と結びつけられます。" },
    career: { en: "In the career palace, Thiên Tướng is traditionally associated with coordination, support roles and services.", vi: "Ở cung Quan Lộc, Thiên Tướng thường gắn với điều phối, vai trò hỗ trợ và dịch vụ.", ja: "官禄宮のThiên Tướngは、伝統的に調整役、支援の役割、サービスと結びつけられます。" },
    wealth: { en: "In the wealth palace, Thiên Tướng is traditionally associated with steady income through cooperation.", vi: "Ở cung Tài Bạch, Thiên Tướng thường gắn với thu nhập ổn định nhờ hợp tác.", ja: "財帛宮のThiên Tướngは、伝統的に協力による安定した収入と結びつけられます。" },
  },
  thien_luong: {
    keywords: { en: "protection, mentoring and maturity", vi: "che chở, dìu dắt và chín chắn", ja: "守り、導き、成熟" },
    personality: { en: "Thiên Lương in Mệnh is traditionally read as mature and protective, someone others turn to for advice.", vi: "Thiên Lương thủ Mệnh theo truyền thống là người chín chắn, hay che chở, được người khác tìm đến xin lời khuyên.", ja: "命宮のThiên Lương（天梁）は、伝統的に成熟して面倒見がよく、人から助言を求められる人とされます。" },
    love: { en: "In the partnership palace, Thiên Lương is traditionally linked with a caring partnership, sometimes with an age or maturity difference.", vi: "Ở cung Phu Thê, Thiên Lương thường gắn với mối quan hệ quan tâm che chở, đôi khi có chênh lệch tuổi hoặc độ chín chắn.", ja: "夫妻宮のThiên Lươngは、伝統的に守り合う関係と結びつけられ、年齢や成熟度に差がある場合もあるとされます。" },
    career: { en: "In the career palace, Thiên Lương is traditionally associated with healthcare, education, counselling or public service.", vi: "Ở cung Quan Lộc, Thiên Lương thường gắn với y tế, giáo dục, tư vấn hoặc phục vụ cộng đồng.", ja: "官禄宮のThiên Lươngは、伝統的に医療、教育、カウンセリング、公共の仕事と結びつけられます。" },
    wealth: { en: "In the wealth palace, Thiên Lương is traditionally associated with a modest, steady attitude to money.", vi: "Ở cung Tài Bạch, Thiên Lương thường gắn với thái độ chừng mực, ổn định với tiền bạc.", ja: "財帛宮のThiên Lươngは、伝統的にお金に対する節度ある安定した姿勢と結びつけられます。" },
  },
  that_sat: {
    keywords: { en: "courage, independence and directness", vi: "dũng cảm, độc lập và thẳng thắn", ja: "勇気、独立心、率直さ" },
    personality: { en: "Thất Sát in Mệnh is traditionally read as bold and independent, preferring to act and to decide for oneself.", vi: "Thất Sát thủ Mệnh theo truyền thống là người dũng cảm, độc lập, thích hành động và tự quyết.", ja: "命宮のThất Sát（七殺）は、伝統的に大胆で独立心が強く、自ら動き自ら決めることを好む人とされます。" },
    love: { en: "In the partnership palace, Thất Sát is traditionally linked with strong personalities that need room for each other.", vi: "Ở cung Phu Thê, Thất Sát thường gắn với hai cá tính mạnh cần tôn trọng không gian của nhau.", ja: "夫妻宮のThất Sátは、伝統的に互いの領域を尊重する必要がある、個性の強い二人と結びつけられます。" },
    career: { en: "In the career palace, Thất Sát is traditionally associated with pioneering, competitive or field-based work.", vi: "Ở cung Quan Lộc, Thất Sát thường gắn với công việc tiên phong, cạnh tranh hoặc thực địa.", ja: "官禄宮のThất Sátは、伝統的に開拓的な仕事、競争のある仕事、現場の仕事と結びつけられます。" },
    wealth: { en: "In the wealth palace, Thất Sát is traditionally associated with earning through bold effort, with ups and downs.", vi: "Ở cung Tài Bạch, Thất Sát thường gắn với kiếm tiền nhờ dám làm, có thăng có trầm.", ja: "財帛宮のThất Sátは、伝統的に思い切った行動で稼ぐことと結びつけられ、浮き沈みもあるとされます。" },
  },
  pha_quan: {
    keywords: { en: "change, renewal and breaking with the old", vi: "thay đổi, đổi mới và phá bỏ cái cũ", ja: "変化、刷新、古いものを打ち破ること" },
    personality: { en: "Phá Quân in Mệnh is traditionally read as restless and reforming, drawn to change and new beginnings.", vi: "Phá Quân thủ Mệnh theo truyền thống là người không ngừng nghỉ, thích cải cách, bị cuốn hút bởi thay đổi và khởi đầu mới.", ja: "命宮のPhá Quân（破軍）は、伝統的に落ち着かず改革を好み、変化や新しい始まりに惹かれる人とされます。" },
    love: { en: "In the partnership palace, Phá Quân is traditionally linked with relationships that grow through change and renewal.", vi: "Ở cung Phu Thê, Phá Quân thường gắn với mối quan hệ trưởng thành qua những thay đổi và làm mới.", ja: "夫妻宮のPhá Quânは、伝統的に変化と刷新を通じて育つ関係と結びつけられます。" },
    career: { en: "In the career palace, Phá Quân is traditionally associated with entrepreneurship, restructuring or changing fields.", vi: "Ở cung Quan Lộc, Phá Quân thường gắn với khởi nghiệp, tái cấu trúc hoặc thay đổi lĩnh vực.", ja: "官禄宮のPhá Quânは、伝統的に起業、組織の立て直し、分野の転換と結びつけられます。" },
    wealth: { en: "In the wealth palace, Phá Quân is traditionally associated with money that comes and goes in larger movements.", vi: "Ở cung Tài Bạch, Phá Quân thường gắn với tiền vào ra theo những đợt lớn.", ja: "財帛宮のPhá Quânは、伝統的にお金が大きな波で出入りすることと結びつけられます。" },
  },
};

const AUX_NOTES: Partial<Record<AuxStarId, T>> = {
  loc_ton: { en: "Lộc Tồn here traditionally adds steadiness and preservation of resources.", vi: "Lộc Tồn ở đây theo truyền thống thêm sự vững vàng và giữ gìn tài lộc.", ja: "ここにあるLộc Tồn（禄存）は、伝統的に安定と財の保持をもたらすとされます。" },
  ta_phu: { en: "Tả Phù here traditionally suggests support from others.", vi: "Tả Phù ở đây theo truyền thống cho thấy được người khác hỗ trợ.", ja: "ここにあるTả Phù（左輔）は、伝統的に周囲からの支えを示すとされます。" },
  huu_bat: { en: "Hữu Bật here traditionally suggests help and cooperation.", vi: "Hữu Bật ở đây theo truyền thống cho thấy được giúp đỡ và hợp tác.", ja: "ここにあるHữu Bật（右弼）は、伝統的に助けと協力を示すとされます。" },
  van_xuong: { en: "Văn Xương here traditionally adds a love of learning and writing.", vi: "Văn Xương ở đây theo truyền thống thêm sự ham học, giỏi văn chương.", ja: "ここにあるVăn Xương（文昌）は、伝統的に学ぶことや書くことへの愛着をもたらすとされます。" },
  van_khuc: { en: "Văn Khúc here traditionally adds eloquence and artistic sense.", vi: "Văn Khúc ở đây theo truyền thống thêm tài ăn nói và năng khiếu nghệ thuật.", ja: "ここにあるVăn Khúc（文曲）は、伝統的に話術と芸術的な感性をもたらすとされます。" },
  thien_khoi: { en: "Thiên Khôi here traditionally suggests help from senior or respected people.", vi: "Thiên Khôi ở đây theo truyền thống cho thấy được quý nhân, bề trên giúp đỡ.", ja: "ここにあるThiên Khôi（天魁）は、伝統的に目上や尊敬される人からの助けを示すとされます。" },
  thien_viet: { en: "Thiên Việt here traditionally suggests timely help from others.", vi: "Thiên Việt ở đây theo truyền thống cho thấy được giúp đỡ kịp thời.", ja: "ここにあるThiên Việt（天鉞）は、伝統的にタイミングのよい助けを示すとされます。" },
  thien_ma: { en: "Thiên Mã here traditionally adds movement, travel and change of place.", vi: "Thiên Mã ở đây theo truyền thống thêm sự di chuyển, đi xa, thay đổi chỗ ở.", ja: "ここにあるThiên Mã（天馬）は、伝統的に移動、旅、住まいの変化をもたらすとされます。" },
  kinh_duong: { en: "Kình Dương here is traditionally read as sharp energy and competition that can be channelled well.", vi: "Kình Dương ở đây theo truyền thống là năng lượng sắc bén, tính cạnh tranh, có thể phát huy nếu biết điều tiết.", ja: "ここにあるKình Dương（擎羊）は、伝統的に鋭いエネルギーや競争心と読まれ、うまく向ければ力になるとされます。" },
  da_la: { en: "Đà La here is traditionally read as delays that reward persistence.", vi: "Đà La ở đây theo truyền thống là sự chậm trễ, đòi hỏi kiên trì.", ja: "ここにあるĐà La（陀羅）は、伝統的に遅れと読まれ、粘り強さが報われるとされます。" },
  dia_khong: { en: "Địa Không here is traditionally read as unconventional ideas and unexpected turns.", vi: "Địa Không ở đây theo truyền thống là ý tưởng khác thường và những biến chuyển bất ngờ.", ja: "ここにあるĐịa Không（地空）は、伝統的に型にはまらない発想や思いがけない展開と読まれます。" },
  dia_kiep: { en: "Địa Kiếp here is traditionally read as volatility that calls for caution.", vi: "Địa Kiếp ở đây theo truyền thống là sự biến động, cần thận trọng.", ja: "ここにあるĐịa Kiếp（地劫）は、伝統的に変動と読まれ、慎重さが求められるとされます。" },
  hoa_tinh: { en: "Hỏa Tinh here is traditionally read as quick, fiery energy.", vi: "Hỏa Tinh ở đây theo truyền thống là năng lượng nhanh, nóng.", ja: "ここにあるHỏa Tinh（火星）は、伝統的にすばやく熱いエネルギーと読まれます。" },
  linh_tinh: { en: "Linh Tinh here is traditionally read as inner tension that benefits from patience.", vi: "Linh Tinh ở đây theo truyền thống là căng thẳng nội tâm, cần kiên nhẫn.", ja: "ここにあるLinh Tinh（鈴星）は、伝統的に内面の緊張と読まれ、忍耐が助けになるとされます。" },
  dao_hoa: { en: "Đào Hoa here traditionally adds charm and attractiveness.", vi: "Đào Hoa ở đây theo truyền thống thêm duyên dáng, thu hút.", ja: "ここにあるĐào Hoa（桃花）は、伝統的に魅力と人を惹きつける力をもたらすとされます。" },
  hong_loan: { en: "Hồng Loan here traditionally adds warmth in affection.", vi: "Hồng Loan ở đây theo truyền thống thêm sự ấm áp trong tình cảm.", ja: "ここにあるHồng Loan（紅鸞）は、伝統的に愛情面の温かさをもたらすとされます。" },
  thien_hy: { en: "Thiên Hỷ here traditionally adds joyful occasions.", vi: "Thiên Hỷ ở đây theo truyền thống thêm những dịp vui.", ja: "ここにあるThiên Hỷ（天喜）は、伝統的に喜ばしい出来事をもたらすとされます。" },
  hoa_cai: { en: "Hoa Cái here traditionally adds refinement and a taste for the arts or spirituality.", vi: "Hoa Cái ở đây theo truyền thống thêm sự thanh cao, yêu nghệ thuật hoặc tâm linh.", ja: "ここにあるHoa Cái（華蓋）は、伝統的に洗練と、芸術や精神性への関心をもたらすとされます。" },
  co_than: { en: "Cô Thần here traditionally suggests a need for time alone.", vi: "Cô Thần ở đây theo truyền thống cho thấy nhu cầu có thời gian riêng.", ja: "ここにあるCô Thần（孤辰）は、伝統的に一人の時間の必要を示すとされます。" },
  qua_tu: { en: "Quả Tú here traditionally suggests a reserved side.", vi: "Quả Tú ở đây theo truyền thống cho thấy một mặt kín đáo.", ja: "ここにあるQuả Tú（寡宿）は、伝統的に控えめな一面を示すとされます。" },
};

const HOA_NOTES: Record<HoaId, T> = {
  loc: { en: "With Hóa Lộc here, this area is traditionally seen as a source of ease and opportunity.", vi: "Có Hóa Lộc ở đây, lĩnh vực này theo truyền thống là nguồn thuận lợi và cơ hội.", ja: "Hóa Lộc（化禄）があるため、この領域は伝統的にゆとりと機会の源とされます。" },
  quyen: { en: "With Hóa Quyền here, this area is traditionally seen as one where you take charge.", vi: "Có Hóa Quyền ở đây, lĩnh vực này theo truyền thống là nơi bạn nắm quyền chủ động.", ja: "Hóa Quyền（化権）があるため、この領域は伝統的にあなたが主導権を握る場とされます。" },
  khoa: { en: "With Hóa Khoa here, this area is traditionally linked with reputation and recognition.", vi: "Có Hóa Khoa ở đây, lĩnh vực này theo truyền thống gắn với danh tiếng và sự công nhận.", ja: "Hóa Khoa（化科）があるため、この領域は伝統的に評判や評価と結びつけられます。" },
  ky: { en: "With Hóa Kỵ here, this area is traditionally seen as one needing extra care and patience.", vi: "Có Hóa Kỵ ở đây, lĩnh vực này theo truyền thống cần thêm sự cẩn trọng và kiên nhẫn.", ja: "Hóa Kỵ（化忌）があるため、この領域は伝統的に特に注意と忍耐が必要とされます。" },
};

const DOMAIN_OF: Record<Exclude<Section, "cycles">, Domain | "family" | null> = {
  personality: "personality",
  love: "love",
  career: "career",
  wealth: "wealth",
  relationships: null,
  family: "family",
};

export type ParagraphKind = "core" | "related" | "strength" | "caution" | "note";
export interface InterpretationParagraph {
  ruleIds: string[];
  text: string;
  /** How the UI groups the paragraph; absent on paragraphs stored before interp-2. */
  kind?: ParagraphKind;
}
export interface InterpretationSection {
  section: Section;
  title: string;
  /** One-line headline: the primary palace and its main stars. */
  summary?: string;
  /** Short traditional keywords of the primary palace's main stars. */
  keywords?: string[];
  paragraphs: InterpretationParagraph[];
}

const pick = (t: T, locale: Locale) => t[locale];

function palaceOf(chart: Chart, id: PalaceId): Palace | undefined {
  return chart.palaces.find((p) => p.palace === id);
}

/** Star names stay in Vietnamese (the tradition's own terms) in every UI language. */
function starsText(stars: MainStarId[], locale: Locale) {
  return stars.map((s) => STAR_INFO[s].vi).join(locale === "ja" ? "、" : ", ");
}

/** "Phu Thê（夫妻宮）" for Japanese, the Vietnamese name otherwise. */
function palaceLabel(id: PalaceId | null, branch: number, locale: Locale) {
  if (!id) return BRANCHES[branch]!;
  return locale === "ja" ? `${PALACE_INFO[id].vi}（${PALACE_JA[id]}）` : PALACE_INFO[id].vi;
}

function palaceParagraphs(chart: Chart, palaceId: PalaceId, domain: Domain | "family" | null, locale: Locale): InterpretationParagraph[] {
  const p = palaceOf(chart, palaceId);
  if (!p) return [];
  const out: InterpretationParagraph[] = [];
  const palaceName = PALACE_INFO[palaceId].vi;
  let mains = p.mainStars.map((s) => s.id as MainStarId);
  let borrowed = false;
  if (mains.length === 0) {
    const opposite = chart.palaces[(p.branch + 6) % 12]!;
    mains = opposite.mainStars.map((s) => s.id as MainStarId);
    borrowed = true;
    out.push({
      ruleIds: [`${palaceId}.vo_chinh_dieu`],
      kind: "core",
      text: pick(
        {
          vi: `Cung ${palaceName} (${BRANCHES[p.branch]}) vô chính diệu; theo truyền thống, xem các chính tinh xung chiếu từ cung đối diện: ${starsText(mains, locale) || "—"}.`,
          en: `The ${palaceName} palace (${BRANCHES[p.branch]}) has no main star; traditionally it is read through the main stars of the opposite palace: ${starsText(mains, locale) || "—"}.`,
          ja: `${palaceLabel(palaceId, p.branch, "ja")}（${BRANCHES[p.branch]}）には主星がありません（vô chính diệu）。伝統的に、向かいの宮の主星で読みます：${starsText(mains, locale) || "—"}。`,
        },
        locale,
      ),
    });
  }
  for (const s of mains) {
    const text = domain === "family"
      ? pick(MAIN_EXTRA[s].family, locale)
      : domain
      ? pick(MAIN[s][domain], locale)
      : pick(
          {
            vi: `${STAR_INFO[s].vi} ${borrowed ? "chiếu" : "ở"} cung ${palaceName} theo truyền thống gắn với ${MAIN[s].keywords.vi}.`,
            en: `${STAR_INFO[s].vi} ${borrowed ? "facing" : "in"} the ${palaceName} palace is traditionally associated with ${MAIN[s].keywords.en}.`,
            ja: `${palaceLabel(palaceId, p.branch, "ja")}${borrowed ? "を照らす" : "にある"}${STAR_INFO[s].vi}は、伝統的に${MAIN[s].keywords.ja}と結びつけられます。`,
          },
          locale,
        );
    out.push({ ruleIds: [`${palaceId}.main.${s}${borrowed ? ".borrowed" : ""}`], text, kind: "core" });
  }
  for (const s of [...p.mainStars, ...p.auxStars]) {
    if (s.hoa) out.push({ ruleIds: [`${palaceId}.hoa.${s.hoa}`], text: pick(HOA_NOTES[s.hoa], locale), kind: "note" });
  }
  for (const s of p.auxStars) {
    const note = AUX_NOTES[s.id as AuxStarId];
    if (note) out.push({ ruleIds: [`${palaceId}.aux.${s.id}`], text: pick(note, locale), kind: "note" });
  }
  if (chart.tuan.includes(p.branch) || chart.triet.includes(p.branch)) {
    const which = [chart.tuan.includes(p.branch) ? "Tuần" : null, chart.triet.includes(p.branch) ? "Triệt" : null].filter(Boolean).join(", ");
    out.push({
      ruleIds: [`${palaceId}.tuan_triet`],
      kind: "note",
      text: pick(
        {
          vi: `Cung này có ${which}; theo truyền thống, ảnh hưởng của các sao trong cung được xem là giảm bớt.`,
          en: `This palace holds ${which}; traditionally, the influence of its stars is considered softened.`,
          ja: `この宮には${which}があります。伝統的に、宮内の星の影響は弱まるとされます。`,
        },
        locale,
      ),
    });
  }
  return out;
}

/** Main stars that speak for a palace: its own, or (vô chính diệu) those of the opposite palace. */
function mainsOf(chart: Chart, palaceId: PalaceId): { palace: Palace; mains: MainStarId[]; borrowed: boolean } | null {
  const p = palaceOf(chart, palaceId);
  if (!p) return null;
  const own = p.mainStars.map((s) => s.id as MainStarId);
  if (own.length) return { palace: p, mains: own, borrowed: false };
  return { palace: p, mains: chart.palaces[(p.branch + 6) % 12]!.mainStars.map((s) => s.id as MainStarId), borrowed: true };
}

/** Tam phương tứ chính: a palace is traditionally read together with its two trine palaces and the opposite one. */
export function relatedBranches(branch: number): { trine: [number, number]; opposite: number } {
  return { trine: [(branch + 4) % 12, (branch + 8) % 12], opposite: (branch + 6) % 12 };
}

function relatedParagraphs(chart: Chart, palaceId: PalaceId, locale: Locale): InterpretationParagraph[] {
  const p = palaceOf(chart, palaceId);
  if (!p) return [];
  const { trine, opposite } = relatedBranches(p.branch);
  const parts = [...trine, opposite].map((b) => {
    const q = chart.palaces[b]!;
    const mains = q.mainStars.map((s) => s.id as MainStarId);
    return `${palaceLabel(q.palace, q.branch, locale)} ${mains.length ? starsText(mains, locale) : "—"}`;
  });
  const sep = locale === "ja" ? "／" : " · ";
  return [
    {
      ruleIds: [`${palaceId}.tam_phuong_tu_chinh`],
      kind: "related",
      text: pick(
        {
          vi: `Tam phương tứ chính của cung ${PALACE_INFO[palaceId].vi}: ${parts.join(sep)}. Theo truyền thống, các cung này được xem cùng nhau như những ảnh hưởng hỗ trợ.`,
          en: `The related palaces (tam phương tứ chính) of ${PALACE_INFO[palaceId].vi}: ${parts.join(sep)}. Traditionally they are read together as supporting influences.`,
          ja: `${palaceLabel(palaceId, p.branch, "ja")}の三方四正（tam phương tứ chính）：${parts.join(sep)}。伝統的に、これらの宮も合わせて読み、支える影響とみなします。`,
        },
        locale,
      ),
    },
  ];
}

function adviceParagraphs(chart: Chart, palaceId: PalaceId, locale: Locale): InterpretationParagraph[] {
  const head = mainsOf(chart, palaceId);
  if (!head) return [];
  return head.mains.flatMap((m) => [
    { ruleIds: [`${palaceId}.strength.${m}`], kind: "strength" as const, text: pick(MAIN_EXTRA[m].strength, locale) },
    { ruleIds: [`${palaceId}.caution.${m}`], kind: "caution" as const, text: pick(MAIN_EXTRA[m].caution, locale) },
  ]);
}

/** Build all sections for a chart. Partial charts (unknown hour) only get what is computable. */
export function interpret(chart: Chart, locale: Locale, currentAge?: number): InterpretationSection[] {
  const sections: InterpretationSection[] = [];
  if (chart.menh === null) {
    sections.push({
      section: "personality",
      title: pick(SECTION_TITLES.personality, locale),
      paragraphs: [
        {
          ruleIds: ["partial.hour_unknown"],
          text: pick(
            {
              vi: `Không có giờ sinh nên không thể xác định cung Mệnh và các chính tinh. Năm sinh ${chart.yearPillar.name}, nạp âm ${chart.napAm.name}.`,
              en: `Without a birth time the Mệnh palace and main stars cannot be determined. Birth year ${chart.yearPillar.name}, Nạp Âm ${chart.napAm.name}.`,
              ja: `出生時刻がないため、命宮（Mệnh）と主星は決められません。生まれ年は${chart.yearPillar.name}、納音は${chart.napAm.name}です。`,
            },
            locale,
          ),
        },
      ],
    });
    return sections;
  }
  for (const section of SECTIONS) {
    if (section === "cycles") continue;
    const paragraphs = SECTION_PALACES[section].flatMap((pid) => palaceParagraphs(chart, pid, DOMAIN_OF[section], locale));
    if (section === "personality" && chart.than !== null && chart.than !== chart.menh) {
      const tp = chart.palaces[chart.than]!;
      paragraphs.push({
        ruleIds: ["than.location"],
        kind: "note",
        text: pick(
          {
            vi: `Thân cư cung ${tp.palace ? PALACE_INFO[tp.palace].vi : BRANCHES[tp.branch]}: theo truyền thống, nửa sau cuộc đời chú trọng nhiều hơn đến lĩnh vực này.`,
            en: `Thân sits in the ${tp.palace ? PALACE_INFO[tp.palace].vi : BRANCHES[tp.branch]} palace: traditionally, this area grows in importance in the second half of life.`,
            ja: `身宮（Thân）は${palaceLabel(tp.palace, tp.branch, "ja")}にあります。伝統的に、人生の後半でこの領域の重みが増すとされます。`,
          },
          locale,
        ),
      });
    } else if (section === "personality" && chart.than === chart.menh) {
      paragraphs.push({
        ruleIds: ["than.menh_same"],
        kind: "note",
        text: pick(
          {
            vi: "Mệnh Thân đồng cung: theo truyền thống, tính cách được xem là nhất quán suốt đời.",
            en: "Mệnh and Thân share a palace: traditionally read as a character that stays consistent through life.",
            ja: "命宮と身宮が同じ宮にあります（Mệnh Thân đồng cung）。伝統的に、生涯を通じて一貫した性格と読まれます。",
          },
          locale,
        ),
      });
    }
    const primary = SECTION_PALACES[section][0]!;
    paragraphs.push(...relatedParagraphs(chart, primary, locale), ...adviceParagraphs(chart, primary, locale));
    const head = mainsOf(chart, primary);
    sections.push({
      section,
      title: pick(SECTION_TITLES[section], locale),
      summary: head ? `${palaceLabel(primary, head.palace.branch, locale)}: ${starsText(head.mains, locale) || "—"}` : undefined,
      keywords: head ? head.mains.map((m) => MAIN[m].keywords[locale]) : undefined,
      paragraphs,
    });
  }
  sections.push({ section: "cycles", title: pick(SECTION_TITLES.cycles, locale), paragraphs: cycleParagraphs(chart, locale, currentAge) });
  return sections;
}

function cycleParagraphs(chart: Chart, locale: Locale, currentAge?: number): InterpretationParagraph[] {
  const periods = chart.palaces.filter((p) => p.daiHan).sort((a, b) => a.daiHan!.from - b.daiHan!.from);
  if (periods.length === 0) {
    return [
      {
        ruleIds: ["cycles.unavailable"],
        text: pick(
          {
            vi: "Chiều Đại Hạn phụ thuộc vào âm dương năm sinh và giới tính theo phép truyền thống; vì thông tin này chưa được cung cấp nên các Đại Hạn không được tính.",
            en: "The direction of Đại Hạn depends on the yin/yang of the birth year and on sex in the traditional method; since that was not provided, the periods are not computed.",
            ja: "伝統的な方法では、大限（Đại Hạn）の進む向きは生まれ年の陰陽と性別で決まります。その情報がないため、大限は計算していません。",
          },
          locale,
        ),
      },
    ];
  }
  return periods.map((p) => {
    const current = currentAge !== undefined && currentAge >= p.daiHan!.from && currentAge <= p.daiHan!.to;
    const mains = p.mainStars.map((s) => s.id as MainStarId);
    const kw = mains.map((s) => MAIN[s].keywords[locale]).join(locale === "ja" ? "／" : "; ");
    const palaceName = p.palace ? PALACE_INFO[p.palace].vi : BRANCHES[p.branch];
    const text = pick(
      {
        vi: `${current ? "▶ Hiện tại · " : ""}Tuổi ${p.daiHan!.from}–${p.daiHan!.to}: Đại Hạn tại cung ${palaceName} (${BRANCHES[p.branch]})${mains.length ? `, chính tinh ${starsText(mains, locale)} — theo truyền thống gắn với ${kw}` : ", vô chính diệu"}.`,
        en: `${current ? "▶ Now · " : ""}Ages ${p.daiHan!.from}–${p.daiHan!.to}: Đại Hạn in the ${palaceName} palace (${BRANCHES[p.branch]})${mains.length ? `, main stars ${starsText(mains, locale)} — traditionally associated with ${kw}` : ", no main star"}.`,
        ja: `${current ? "▶ 現在 · " : ""}数え年 ${p.daiHan!.from}〜${p.daiHan!.to}歳：大限は${palaceLabel(p.palace, p.branch, "ja")}（${BRANCHES[p.branch]}）${mains.length ? `、主星 ${starsText(mains, locale)} — 伝統的に${kw}と結びつけられます` : "、主星なし"}。`,
      },
      locale,
    );
    return { ruleIds: [`cycles.dai_han.${p.branch}`], text: p.palace ? `${text} ${decadeTheme(p.palace, locale)}` : text, kind: "core" as const };
  });
}

function decadeTheme(palace: PalaceId, locale: Locale) {
  const role = PALACE_ROLE[palace];
  return pick(
    {
      vi: `Theo truyền thống, chủ đề của giai đoạn này là ${role.vi}.`,
      en: `Traditionally, the theme of this period is ${role.en}.`,
      ja: `伝統的に、この10年は「${role.ja}」が主題になりやすい時期と読まれます。`,
    },
    locale,
  );
}

export interface LifeStage {
  from: number;
  to: number;
  branch: number;
  label: string;
  /** What the palace of this period stands for. */
  role: string;
  theme: string;
  stars: string[];
  keywords: string[];
  hoa: string[];
  state: "past" | "current" | "future" | "unknown";
}

/** The 10-year Đại Hạn periods in order, for the timeline view. Empty when they are not computable. */
export function lifeStages(chart: Chart, locale: Locale, currentAge?: number | null): LifeStage[] {
  return chart.palaces
    .filter((p) => p.daiHan)
    .sort((a, b) => a.daiHan!.from - b.daiHan!.from)
    .map((p) => {
      const { from, to } = p.daiHan!;
      const mains = p.mainStars.map((s) => s.id as MainStarId);
      const state = currentAge == null ? "unknown" : currentAge > to ? "past" : currentAge >= from ? "current" : "future";
      return {
        from,
        to,
        branch: p.branch,
        label: palaceLabel(p.palace, p.branch, locale),
        role: p.palace ? pick(PALACE_ROLE[p.palace], locale) : "",
        theme: p.palace ? decadeTheme(p.palace, locale) : "",
        stars: mains.map((m) => STAR_INFO[m].vi),
        keywords: mains.map((m) => MAIN[m].keywords[locale]),
        hoa: [...p.mainStars, ...p.auxStars].filter((s) => s.hoa).map((s) => `${HOA_INFO[s.hoa!].vi} · ${STAR_INFO[s.id].vi}`),
        state,
      };
    });
}

export interface PalaceDetail {
  branch: number;
  label: string;
  role: string;
  mains: { name: string; keywords: string; hoa: string | null }[];
  borrowedFrom: string | null;
  aux: string[];
  notes: string[];
  daiHan: { from: number; to: number } | null;
  related: number[];
}

/** Everything the interactive chart shows when a palace is tapped. */
export function palaceDetails(chart: Chart, locale: Locale): PalaceDetail[] {
  return chart.palaces.map((p) => {
    const own = p.mainStars;
    const opposite = chart.palaces[(p.branch + 6) % 12]!;
    const shown = own.length ? own : opposite.mainStars;
    const { trine, opposite: opp } = relatedBranches(p.branch);
    const notes = [
      ...[...p.mainStars, ...p.auxStars].filter((s) => s.hoa).map((s) => pick(HOA_NOTES[s.hoa!], locale)),
      ...p.auxStars.map((s) => AUX_NOTES[s.id as AuxStarId]).filter((n): n is T => !!n).map((n) => pick(n, locale)),
    ];
    return {
      branch: p.branch,
      label: palaceLabel(p.palace, p.branch, locale),
      role: p.palace ? pick(PALACE_ROLE[p.palace], locale) : "",
      mains: shown.map((s) => ({
        name: STAR_INFO[s.id].vi,
        keywords: MAIN[s.id as MainStarId].keywords[locale],
        hoa: s.hoa ? HOA_INFO[s.hoa].vi : null,
      })),
      borrowedFrom: own.length || chart.menh === null ? null : palaceLabel(opposite.palace, opposite.branch, locale),
      aux: p.auxStars.map((s) => STAR_INFO[s.id].vi),
      notes,
      daiHan: p.daiHan,
      related: chart.menh === null ? [] : [...trine, opp],
    };
  });
}

