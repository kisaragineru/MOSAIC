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
import { PALACE_INFO, STAR_INFO, type AuxStarId, type HoaId, type MainStarId, type PalaceId } from "./stars";

export const INTERPRETATION_VERSION = "interp-1";

type T = { en: string; vi: string };
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
  personality: { en: "Personality", vi: "Tính cách" },
  relationships: { en: "Friends & siblings", vi: "Bạn bè & anh chị em" },
  love: { en: "Love & partnership", vi: "Tình cảm & hôn nhân" },
  career: { en: "Work & career", vi: "Công việc & sự nghiệp" },
  wealth: { en: "Money", vi: "Tài chính" },
  family: { en: "Family & home", vi: "Gia đình & nhà cửa" },
  cycles: { en: "Life cycles (Đại Hạn)", vi: "Các giai đoạn cuộc đời (Đại Hạn)" },
};

const MAIN: Record<MainStarId, { keywords: T } & Record<Domain, T>> = {
  tu_vi: {
    keywords: { en: "dignity, leadership and a sense of responsibility", vi: "uy nghi, khả năng lãnh đạo và tinh thần trách nhiệm" },
    personality: { en: "Tử Vi in Mệnh is traditionally read as dignified and self-respecting, with a wish to lead and to be taken seriously.", vi: "Tử Vi thủ Mệnh theo truyền thống được xem là người đĩnh đạc, tự trọng, có mong muốn dẫn dắt và được coi trọng." },
    love: { en: "In the partnership palace, Tử Vi is traditionally linked with valuing respect and a partner of strong character.", vi: "Ở cung Phu Thê, Tử Vi thường được gắn với việc coi trọng sự tôn trọng và người bạn đời có cá tính mạnh." },
    career: { en: "In the career palace, Tử Vi is traditionally associated with roles that carry responsibility and authority.", vi: "Ở cung Quan Lộc, Tử Vi thường gắn với những vai trò có trách nhiệm và quyền hạn." },
    wealth: { en: "In the wealth palace, Tử Vi is traditionally associated with stable handling of resources and status-related income.", vi: "Ở cung Tài Bạch, Tử Vi thường gắn với việc quản lý tài chính ổn định và nguồn thu gắn với địa vị." },
  },
  thien_co: {
    keywords: { en: "quick thinking, planning and adaptability", vi: "suy nghĩ nhanh, giỏi tính toán và linh hoạt" },
    personality: { en: "Thiên Cơ in Mệnh is traditionally read as thoughtful and quick-minded, fond of planning and of understanding how things work.", vi: "Thiên Cơ thủ Mệnh theo truyền thống là người chu đáo, nhanh trí, thích tính toán và tìm hiểu cách mọi thứ vận hành." },
    love: { en: "In the partnership palace, Thiên Cơ is traditionally linked with valuing conversation and mental connection.", vi: "Ở cung Phu Thê, Thiên Cơ thường gắn với việc coi trọng trò chuyện và sự đồng điệu trong suy nghĩ." },
    career: { en: "In the career palace, Thiên Cơ is traditionally associated with planning, analysis, advisory or technical work.", vi: "Ở cung Quan Lộc, Thiên Cơ thường gắn với công việc hoạch định, phân tích, tư vấn hoặc kỹ thuật." },
    wealth: { en: "In the wealth palace, Thiên Cơ is traditionally associated with income from skill and ideas, with some fluctuation.", vi: "Ở cung Tài Bạch, Thiên Cơ thường gắn với nguồn thu từ kỹ năng và ý tưởng, có lúc lên xuống." },
  },
  thai_duong: {
    keywords: { en: "warmth, generosity and an outward orientation", vi: "ấm áp, rộng rãi và hướng ra bên ngoài" },
    personality: { en: "Thái Dương in Mệnh is traditionally read as open and generous, wanting to be useful and visible to others.", vi: "Thái Dương thủ Mệnh theo truyền thống là người cởi mở, rộng lượng, muốn giúp ích và được nhìn nhận." },
    love: { en: "In the partnership palace, Thái Dương is traditionally linked with a warm, expressive partnership that needs openness.", vi: "Ở cung Phu Thê, Thái Dương thường gắn với mối quan hệ ấm áp, bộc lộ, cần sự cởi mở." },
    career: { en: "In the career palace, Thái Dương is traditionally associated with public-facing work, teaching or public service.", vi: "Ở cung Quan Lộc, Thái Dương thường gắn với công việc tiếp xúc công chúng, giảng dạy hoặc phục vụ cộng đồng." },
    wealth: { en: "In the wealth palace, Thái Dương is traditionally associated with earning through reputation and spending generously.", vi: "Ở cung Tài Bạch, Thái Dương thường gắn với kiếm tiền nhờ danh tiếng và chi tiêu rộng rãi." },
  },
  vu_khuc: {
    keywords: { en: "decisiveness, practicality and financial sense", vi: "quyết đoán, thực tế và nhạy bén tài chính" },
    personality: { en: "Vũ Khúc in Mệnh is traditionally read as decisive and practical, valuing results and self-reliance.", vi: "Vũ Khúc thủ Mệnh theo truyền thống là người quyết đoán, thực tế, coi trọng kết quả và sự tự lập." },
    love: { en: "In the partnership palace, Vũ Khúc is traditionally linked with a practical bond where feelings may be shown through actions more than words.", vi: "Ở cung Phu Thê, Vũ Khúc thường gắn với mối quan hệ thực tế, tình cảm thể hiện qua hành động hơn lời nói." },
    career: { en: "In the career palace, Vũ Khúc is traditionally associated with finance, management or technical execution.", vi: "Ở cung Quan Lộc, Vũ Khúc thường gắn với tài chính, quản lý hoặc thực thi kỹ thuật." },
    wealth: { en: "In the wealth palace, Vũ Khúc is traditionally considered a strong wealth star, linked with earning through effort.", vi: "Ở cung Tài Bạch, Vũ Khúc được xem là tài tinh, gắn với việc kiếm tiền bằng nỗ lực." },
  },
  thien_dong: {
    keywords: { en: "gentleness, enjoyment of life and a wish for harmony", vi: "hiền hòa, biết hưởng thụ và mong muốn hòa thuận" },
    personality: { en: "Thiên Đồng in Mệnh is traditionally read as easy-going and kind, enjoying comfort and avoiding unnecessary conflict.", vi: "Thiên Đồng thủ Mệnh theo truyền thống là người dễ chịu, tốt bụng, thích sự thoải mái và tránh xung đột không cần thiết." },
    love: { en: "In the partnership palace, Thiên Đồng is traditionally linked with a gentle, companionable relationship.", vi: "Ở cung Phu Thê, Thiên Đồng thường gắn với mối quan hệ hiền hòa, gắn bó như bạn đồng hành." },
    career: { en: "In the career palace, Thiên Đồng is traditionally associated with service, care or creative work in a pleasant environment.", vi: "Ở cung Quan Lộc, Thiên Đồng thường gắn với công việc phục vụ, chăm sóc hoặc sáng tạo trong môi trường dễ chịu." },
    wealth: { en: "In the wealth palace, Thiên Đồng is traditionally associated with money coming gradually, with spending on comfort.", vi: "Ở cung Tài Bạch, Thiên Đồng thường gắn với tiền đến từ từ và chi tiêu cho sự thoải mái." },
  },
  liem_trinh: {
    keywords: { en: "principles, intensity and strong will", vi: "nguyên tắc, mãnh liệt và ý chí mạnh" },
    personality: { en: "Liêm Trinh in Mệnh is traditionally read as principled and intense, with strong likes and dislikes.", vi: "Liêm Trinh thủ Mệnh theo truyền thống là người có nguyên tắc, mãnh liệt, yêu ghét rõ ràng." },
    love: { en: "In the partnership palace, Liêm Trinh is traditionally linked with passionate feelings that benefit from patience.", vi: "Ở cung Phu Thê, Liêm Trinh thường gắn với tình cảm nồng nhiệt, cần sự kiên nhẫn." },
    career: { en: "In the career palace, Liêm Trinh is traditionally associated with law, administration, discipline or competitive fields.", vi: "Ở cung Quan Lộc, Liêm Trinh thường gắn với luật pháp, hành chính, kỷ luật hoặc lĩnh vực cạnh tranh." },
    wealth: { en: "In the wealth palace, Liêm Trinh is traditionally associated with earning through persistence and organisation.", vi: "Ở cung Tài Bạch, Liêm Trinh thường gắn với kiếm tiền nhờ bền bỉ và tổ chức tốt." },
  },
  thien_phu: {
    keywords: { en: "stability, prudence and care for resources", vi: "ổn định, thận trọng và biết giữ gìn" },
    personality: { en: "Thiên Phủ in Mệnh is traditionally read as steady and prudent, someone who likes security and keeps things in order.", vi: "Thiên Phủ thủ Mệnh theo truyền thống là người vững vàng, thận trọng, thích sự an toàn và ngăn nắp." },
    love: { en: "In the partnership palace, Thiên Phủ is traditionally linked with a stable, supportive partnership.", vi: "Ở cung Phu Thê, Thiên Phủ thường gắn với mối quan hệ ổn định, nâng đỡ nhau." },
    career: { en: "In the career palace, Thiên Phủ is traditionally associated with management, administration and stewardship roles.", vi: "Ở cung Quan Lộc, Thiên Phủ thường gắn với vai trò quản lý, hành chính và gìn giữ." },
    wealth: { en: "In the wealth palace, Thiên Phủ is traditionally associated with saving and accumulating steadily.", vi: "Ở cung Tài Bạch, Thiên Phủ thường gắn với tiết kiệm và tích lũy đều đặn." },
  },
  thai_am: {
    keywords: { en: "sensitivity, inner life and quiet care", vi: "nhạy cảm, đời sống nội tâm và sự quan tâm thầm lặng" },
    personality: { en: "Thái Âm in Mệnh is traditionally read as gentle and sensitive, with a rich inner life and an eye for beauty.", vi: "Thái Âm thủ Mệnh theo truyền thống là người dịu dàng, nhạy cảm, nội tâm phong phú và có óc thẩm mỹ." },
    love: { en: "In the partnership palace, Thái Âm is traditionally linked with a tender, emotionally attentive relationship.", vi: "Ở cung Phu Thê, Thái Âm thường gắn với mối quan hệ dịu dàng, chú trọng cảm xúc." },
    career: { en: "In the career palace, Thái Âm is traditionally associated with planning behind the scenes, design, property or finance.", vi: "Ở cung Quan Lộc, Thái Âm thường gắn với công việc hậu trường, thiết kế, bất động sản hoặc tài chính." },
    wealth: { en: "In the wealth palace, Thái Âm is traditionally associated with gradual accumulation and careful saving.", vi: "Ở cung Tài Bạch, Thái Âm thường gắn với tích lũy từ từ và tiết kiệm cẩn thận." },
  },
  tham_lang: {
    keywords: { en: "desire, charm and many interests", vi: "ham muốn, sức hút và nhiều sở thích" },
    personality: { en: "Tham Lang in Mệnh is traditionally read as charming and curious, with many interests and a strong appetite for experience.", vi: "Tham Lang thủ Mệnh theo truyền thống là người có duyên, tò mò, nhiều sở thích và khao khát trải nghiệm." },
    love: { en: "In the partnership palace, Tham Lang is traditionally linked with attraction and romance that need mutual commitment.", vi: "Ở cung Phu Thê, Tham Lang thường gắn với sức hút và lãng mạn, cần sự cam kết từ hai phía." },
    career: { en: "In the career palace, Tham Lang is traditionally associated with sales, entertainment, hospitality or networking.", vi: "Ở cung Quan Lộc, Tham Lang thường gắn với kinh doanh, giải trí, dịch vụ hoặc giao tế." },
    wealth: { en: "In the wealth palace, Tham Lang is traditionally associated with opportunities through social connections.", vi: "Ở cung Tài Bạch, Tham Lang thường gắn với cơ hội tài chính qua các mối quan hệ." },
  },
  cu_mon: {
    keywords: { en: "speech, analysis and questioning", vi: "ăn nói, phân tích và hay chất vấn" },
    personality: { en: "Cự Môn in Mệnh is traditionally read as articulate and analytical, someone who questions and looks beneath the surface.", vi: "Cự Môn thủ Mệnh theo truyền thống là người ăn nói giỏi, hay phân tích, thích chất vấn và nhìn sâu vấn đề." },
    love: { en: "In the partnership palace, Cự Môn is traditionally linked with the importance of clear, kind communication.", vi: "Ở cung Phu Thê, Cự Môn thường gắn với tầm quan trọng của giao tiếp rõ ràng, nhẹ nhàng." },
    career: { en: "In the career palace, Cự Môn is traditionally associated with teaching, law, media, consulting or research.", vi: "Ở cung Quan Lộc, Cự Môn thường gắn với giảng dạy, luật, truyền thông, tư vấn hoặc nghiên cứu." },
    wealth: { en: "In the wealth palace, Cự Môn is traditionally associated with earning through expertise and speech.", vi: "Ở cung Tài Bạch, Cự Môn thường gắn với kiếm tiền nhờ chuyên môn và lời nói." },
  },
  thien_tuong: {
    keywords: { en: "fairness, helpfulness and sense of appearance", vi: "công bằng, hay giúp đỡ và chú trọng hình thức" },
    personality: { en: "Thiên Tướng in Mệnh is traditionally read as fair-minded and helpful, attentive to how things look and to doing things properly.", vi: "Thiên Tướng thủ Mệnh theo truyền thống là người công bằng, hay giúp đỡ, chú ý hình thức và làm việc đúng mực." },
    love: { en: "In the partnership palace, Thiên Tướng is traditionally linked with a considerate, mutually supportive partner.", vi: "Ở cung Phu Thê, Thiên Tướng thường gắn với người bạn đời chu đáo, hỗ trợ lẫn nhau." },
    career: { en: "In the career palace, Thiên Tướng is traditionally associated with coordination, support roles and services.", vi: "Ở cung Quan Lộc, Thiên Tướng thường gắn với điều phối, vai trò hỗ trợ và dịch vụ." },
    wealth: { en: "In the wealth palace, Thiên Tướng is traditionally associated with steady income through cooperation.", vi: "Ở cung Tài Bạch, Thiên Tướng thường gắn với thu nhập ổn định nhờ hợp tác." },
  },
  thien_luong: {
    keywords: { en: "protection, mentoring and maturity", vi: "che chở, dìu dắt và chín chắn" },
    personality: { en: "Thiên Lương in Mệnh is traditionally read as mature and protective, someone others turn to for advice.", vi: "Thiên Lương thủ Mệnh theo truyền thống là người chín chắn, hay che chở, được người khác tìm đến xin lời khuyên." },
    love: { en: "In the partnership palace, Thiên Lương is traditionally linked with a caring partnership, sometimes with an age or maturity difference.", vi: "Ở cung Phu Thê, Thiên Lương thường gắn với mối quan hệ quan tâm che chở, đôi khi có chênh lệch tuổi hoặc độ chín chắn." },
    career: { en: "In the career palace, Thiên Lương is traditionally associated with healthcare, education, counselling or public service.", vi: "Ở cung Quan Lộc, Thiên Lương thường gắn với y tế, giáo dục, tư vấn hoặc phục vụ cộng đồng." },
    wealth: { en: "In the wealth palace, Thiên Lương is traditionally associated with a modest, steady attitude to money.", vi: "Ở cung Tài Bạch, Thiên Lương thường gắn với thái độ chừng mực, ổn định với tiền bạc." },
  },
  that_sat: {
    keywords: { en: "courage, independence and directness", vi: "dũng cảm, độc lập và thẳng thắn" },
    personality: { en: "Thất Sát in Mệnh is traditionally read as bold and independent, preferring to act and to decide for oneself.", vi: "Thất Sát thủ Mệnh theo truyền thống là người dũng cảm, độc lập, thích hành động và tự quyết." },
    love: { en: "In the partnership palace, Thất Sát is traditionally linked with strong personalities that need room for each other.", vi: "Ở cung Phu Thê, Thất Sát thường gắn với hai cá tính mạnh cần tôn trọng không gian của nhau." },
    career: { en: "In the career palace, Thất Sát is traditionally associated with pioneering, competitive or field-based work.", vi: "Ở cung Quan Lộc, Thất Sát thường gắn với công việc tiên phong, cạnh tranh hoặc thực địa." },
    wealth: { en: "In the wealth palace, Thất Sát is traditionally associated with earning through bold effort, with ups and downs.", vi: "Ở cung Tài Bạch, Thất Sát thường gắn với kiếm tiền nhờ dám làm, có thăng có trầm." },
  },
  pha_quan: {
    keywords: { en: "change, renewal and breaking with the old", vi: "thay đổi, đổi mới và phá bỏ cái cũ" },
    personality: { en: "Phá Quân in Mệnh is traditionally read as restless and reforming, drawn to change and new beginnings.", vi: "Phá Quân thủ Mệnh theo truyền thống là người không ngừng nghỉ, thích cải cách, bị cuốn hút bởi thay đổi và khởi đầu mới." },
    love: { en: "In the partnership palace, Phá Quân is traditionally linked with relationships that grow through change and renewal.", vi: "Ở cung Phu Thê, Phá Quân thường gắn với mối quan hệ trưởng thành qua những thay đổi và làm mới." },
    career: { en: "In the career palace, Phá Quân is traditionally associated with entrepreneurship, restructuring or changing fields.", vi: "Ở cung Quan Lộc, Phá Quân thường gắn với khởi nghiệp, tái cấu trúc hoặc thay đổi lĩnh vực." },
    wealth: { en: "In the wealth palace, Phá Quân is traditionally associated with money that comes and goes in larger movements.", vi: "Ở cung Tài Bạch, Phá Quân thường gắn với tiền vào ra theo những đợt lớn." },
  },
};

const AUX_NOTES: Partial<Record<AuxStarId, T>> = {
  loc_ton: { en: "Lộc Tồn here traditionally adds steadiness and preservation of resources.", vi: "Lộc Tồn ở đây theo truyền thống thêm sự vững vàng và giữ gìn tài lộc." },
  ta_phu: { en: "Tả Phù here traditionally suggests support from others.", vi: "Tả Phù ở đây theo truyền thống cho thấy được người khác hỗ trợ." },
  huu_bat: { en: "Hữu Bật here traditionally suggests help and cooperation.", vi: "Hữu Bật ở đây theo truyền thống cho thấy được giúp đỡ và hợp tác." },
  van_xuong: { en: "Văn Xương here traditionally adds a love of learning and writing.", vi: "Văn Xương ở đây theo truyền thống thêm sự ham học, giỏi văn chương." },
  van_khuc: { en: "Văn Khúc here traditionally adds eloquence and artistic sense.", vi: "Văn Khúc ở đây theo truyền thống thêm tài ăn nói và năng khiếu nghệ thuật." },
  thien_khoi: { en: "Thiên Khôi here traditionally suggests help from senior or respected people.", vi: "Thiên Khôi ở đây theo truyền thống cho thấy được quý nhân, bề trên giúp đỡ." },
  thien_viet: { en: "Thiên Việt here traditionally suggests timely help from others.", vi: "Thiên Việt ở đây theo truyền thống cho thấy được giúp đỡ kịp thời." },
  thien_ma: { en: "Thiên Mã here traditionally adds movement, travel and change of place.", vi: "Thiên Mã ở đây theo truyền thống thêm sự di chuyển, đi xa, thay đổi chỗ ở." },
  kinh_duong: { en: "Kình Dương here is traditionally read as sharp energy and competition that can be channelled well.", vi: "Kình Dương ở đây theo truyền thống là năng lượng sắc bén, tính cạnh tranh, có thể phát huy nếu biết điều tiết." },
  da_la: { en: "Đà La here is traditionally read as delays that reward persistence.", vi: "Đà La ở đây theo truyền thống là sự chậm trễ, đòi hỏi kiên trì." },
  dia_khong: { en: "Địa Không here is traditionally read as unconventional ideas and unexpected turns.", vi: "Địa Không ở đây theo truyền thống là ý tưởng khác thường và những biến chuyển bất ngờ." },
  dia_kiep: { en: "Địa Kiếp here is traditionally read as volatility that calls for caution.", vi: "Địa Kiếp ở đây theo truyền thống là sự biến động, cần thận trọng." },
  hoa_tinh: { en: "Hỏa Tinh here is traditionally read as quick, fiery energy.", vi: "Hỏa Tinh ở đây theo truyền thống là năng lượng nhanh, nóng." },
  linh_tinh: { en: "Linh Tinh here is traditionally read as inner tension that benefits from patience.", vi: "Linh Tinh ở đây theo truyền thống là căng thẳng nội tâm, cần kiên nhẫn." },
  dao_hoa: { en: "Đào Hoa here traditionally adds charm and attractiveness.", vi: "Đào Hoa ở đây theo truyền thống thêm duyên dáng, thu hút." },
  hong_loan: { en: "Hồng Loan here traditionally adds warmth in affection.", vi: "Hồng Loan ở đây theo truyền thống thêm sự ấm áp trong tình cảm." },
  thien_hy: { en: "Thiên Hỷ here traditionally adds joyful occasions.", vi: "Thiên Hỷ ở đây theo truyền thống thêm những dịp vui." },
  hoa_cai: { en: "Hoa Cái here traditionally adds refinement and a taste for the arts or spirituality.", vi: "Hoa Cái ở đây theo truyền thống thêm sự thanh cao, yêu nghệ thuật hoặc tâm linh." },
  co_than: { en: "Cô Thần here traditionally suggests a need for time alone.", vi: "Cô Thần ở đây theo truyền thống cho thấy nhu cầu có thời gian riêng." },
  qua_tu: { en: "Quả Tú here traditionally suggests a reserved side.", vi: "Quả Tú ở đây theo truyền thống cho thấy một mặt kín đáo." },
};

const HOA_NOTES: Record<HoaId, T> = {
  loc: { en: "With Hóa Lộc here, this area is traditionally seen as a source of ease and opportunity.", vi: "Có Hóa Lộc ở đây, lĩnh vực này theo truyền thống là nguồn thuận lợi và cơ hội." },
  quyen: { en: "With Hóa Quyền here, this area is traditionally seen as one where you take charge.", vi: "Có Hóa Quyền ở đây, lĩnh vực này theo truyền thống là nơi bạn nắm quyền chủ động." },
  khoa: { en: "With Hóa Khoa here, this area is traditionally linked with reputation and recognition.", vi: "Có Hóa Khoa ở đây, lĩnh vực này theo truyền thống gắn với danh tiếng và sự công nhận." },
  ky: { en: "With Hóa Kỵ here, this area is traditionally seen as one needing extra care and patience.", vi: "Có Hóa Kỵ ở đây, lĩnh vực này theo truyền thống cần thêm sự cẩn trọng và kiên nhẫn." },
};

const DOMAIN_OF: Record<Exclude<Section, "cycles">, Domain | null> = {
  personality: "personality",
  love: "love",
  career: "career",
  wealth: "wealth",
  relationships: null,
  family: null,
};

export interface InterpretationParagraph {
  ruleIds: string[];
  text: string;
}
export interface InterpretationSection {
  section: Section;
  title: string;
  paragraphs: InterpretationParagraph[];
}

const pick = (t: T, locale: Locale) => t[locale];

function palaceOf(chart: Chart, id: PalaceId): Palace | undefined {
  return chart.palaces.find((p) => p.palace === id);
}

function starsText(stars: MainStarId[], locale: Locale) {
  return stars.map((s) => STAR_INFO[s][locale === "vi" ? "vi" : "en"]).join(", ");
}

function palaceParagraphs(chart: Chart, palaceId: PalaceId, domain: Domain | null, locale: Locale): InterpretationParagraph[] {
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
      text:
        locale === "vi"
          ? `Cung ${palaceName} (${BRANCHES[p.branch]}) vô chính diệu; theo truyền thống, xem các chính tinh xung chiếu từ cung đối diện: ${starsText(mains, locale) || "—"}.`
          : `The ${palaceName} palace (${BRANCHES[p.branch]}) has no main star; traditionally it is read through the main stars of the opposite palace: ${starsText(mains, locale) || "—"}.`,
    });
  }
  for (const s of mains) {
    const text = domain
      ? pick(MAIN[s][domain], locale)
      : locale === "vi"
        ? `${STAR_INFO[s].vi} ${borrowed ? "chiếu" : "ở"} cung ${palaceName} theo truyền thống gắn với ${MAIN[s].keywords.vi}.`
        : `${STAR_INFO[s].vi} ${borrowed ? "facing" : "in"} the ${palaceName} palace is traditionally associated with ${MAIN[s].keywords.en}.`;
    out.push({ ruleIds: [`${palaceId}.main.${s}${borrowed ? ".borrowed" : ""}`], text });
  }
  for (const s of [...p.mainStars, ...p.auxStars]) {
    if (s.hoa) out.push({ ruleIds: [`${palaceId}.hoa.${s.hoa}`], text: pick(HOA_NOTES[s.hoa], locale) });
  }
  for (const s of p.auxStars) {
    const note = AUX_NOTES[s.id as AuxStarId];
    if (note) out.push({ ruleIds: [`${palaceId}.aux.${s.id}`], text: pick(note, locale) });
  }
  if (chart.tuan.includes(p.branch) || chart.triet.includes(p.branch)) {
    const which = [chart.tuan.includes(p.branch) ? "Tuần" : null, chart.triet.includes(p.branch) ? "Triệt" : null].filter(Boolean).join(", ");
    out.push({
      ruleIds: [`${palaceId}.tuan_triet`],
      text:
        locale === "vi"
          ? `Cung này có ${which}; theo truyền thống, ảnh hưởng của các sao trong cung được xem là giảm bớt.`
          : `This palace holds ${which}; traditionally, the influence of its stars is considered softened.`,
    });
  }
  return out;
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
          text:
            locale === "vi"
              ? `Không có giờ sinh nên không thể xác định cung Mệnh và các chính tinh. Năm sinh ${chart.yearPillar.name}, nạp âm ${chart.napAm.name}.`
              : `Without a birth time the Mệnh palace and main stars cannot be determined. Birth year ${chart.yearPillar.name}, Nạp Âm ${chart.napAm.name}.`,
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
        text:
          locale === "vi"
            ? `Thân cư cung ${tp.palace ? PALACE_INFO[tp.palace].vi : BRANCHES[tp.branch]}: theo truyền thống, nửa sau cuộc đời chú trọng nhiều hơn đến lĩnh vực này.`
            : `Thân sits in the ${tp.palace ? PALACE_INFO[tp.palace].vi : BRANCHES[tp.branch]} palace: traditionally, this area grows in importance in the second half of life.`,
      });
    } else if (section === "personality" && chart.than === chart.menh) {
      paragraphs.push({
        ruleIds: ["than.menh_same"],
        text:
          locale === "vi"
            ? "Mệnh Thân đồng cung: theo truyền thống, tính cách được xem là nhất quán suốt đời."
            : "Mệnh and Thân share a palace: traditionally read as a character that stays consistent through life.",
      });
    }
    sections.push({ section, title: pick(SECTION_TITLES[section], locale), paragraphs });
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
        text:
          locale === "vi"
            ? "Chiều Đại Hạn phụ thuộc vào âm dương năm sinh và giới tính theo phép truyền thống; vì thông tin này chưa được cung cấp nên các Đại Hạn không được tính."
            : "The direction of Đại Hạn depends on the yin/yang of the birth year and on sex in the traditional method; since that was not provided, the periods are not computed.",
      },
    ];
  }
  return periods.map((p) => {
    const current = currentAge !== undefined && currentAge >= p.daiHan!.from && currentAge <= p.daiHan!.to;
    const mains = p.mainStars.map((s) => s.id as MainStarId);
    const kw = mains.map((s) => MAIN[s].keywords[locale]).join("; ");
    const palaceName = p.palace ? PALACE_INFO[p.palace].vi : BRANCHES[p.branch];
    const text =
      locale === "vi"
        ? `${current ? "▶ Hiện tại · " : ""}Tuổi ${p.daiHan!.from}–${p.daiHan!.to}: Đại Hạn tại cung ${palaceName} (${BRANCHES[p.branch]})${mains.length ? `, chính tinh ${starsText(mains, locale)} — theo truyền thống gắn với ${kw}` : ", vô chính diệu"}.`
        : `${current ? "▶ Now · " : ""}Ages ${p.daiHan!.from}–${p.daiHan!.to}: Đại Hạn in the ${palaceName} palace (${BRANCHES[p.branch]})${mains.length ? `, main stars ${starsText(mains, locale)} — traditionally associated with ${kw}` : ", no main star"}.`;
    return { ruleIds: [`cycles.dai_han.${p.branch}`], text };
  });
}

