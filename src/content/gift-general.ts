/**
 * General gift ideas for when little is recorded about someone: chosen from the relationship,
 * an age group and (only if the user set it) gender. These are common tendencies, never
 * claims about the person — the UI labels them as such, ranks them below anything recorded,
 * and asks for likes/wishes to do better. Tags let their own answers and dislikes rule ideas out.
 */
import type { I18nText } from "./questions";

export const AGE_BANDS = ["baby", "child", "teens", "20s", "30s", "40s", "50s", "60s", "70plus"] as const;
export type AgeBand = (typeof AGE_BANDS)[number];
export const GENDERS = ["female", "male", "other"] as const;
export type Gender = (typeof GENDERS)[number];

/** Coarser groups the ideas are written for. */
export type AgeGroup = "baby" | "child" | "teen" | "young" | "middle" | "senior";
export type Rel = "partner" | "family" | "friend" | "colleague";
export type GiftTag = "sweets" | "food" | "alcohol" | "scent" | "accessory" | "bulky";

export function ageGroupOfBand(b: AgeBand): AgeGroup {
  return ({ baby: "baby", child: "child", teens: "teen", "20s": "young", "30s": "young", "40s": "middle", "50s": "middle", "60s": "senior", "70plus": "senior" } as const)[b];
}

export function ageBandOf(age: number): AgeBand {
  if (age < 3) return "baby";
  if (age < 13) return "child";
  if (age < 20) return "teens";
  if (age >= 70) return "70plus";
  return `${Math.floor(age / 10) * 10}s` as AgeBand;
}

export interface GeneralIdea {
  rels: Rel[] | "*";
  ages: AgeGroup[] | "*";
  /** Only offered when the user set this gender for the person. */
  gender?: "female" | "male";
  tags?: GiftTag[];
  idea: I18nText;
  why: I18nText;
}

const t = (en: string, vi: string, ja: string): I18nText => ({ en, vi, ja });
const ADULT: AgeGroup[] = ["young", "middle", "senior"];

export const GENERAL_IDEAS: GeneralIdea[] = [
  // Babies and small children (often a gift to the family as much as the child).
  { rels: "*", ages: ["baby"], idea: t("A towel or bib with their name on it", "Khăn hoặc yếm thêu tên bé", "名前入りのタオルやスタイ"), why: t("Named items become keepsakes; a common choice for a birth or first birthday.", "Đồ có tên trở thành kỷ niệm; hay được chọn khi bé chào đời hoặc thôi nôi.", "名前入りは記念に残り、出産祝いや1歳の誕生日によく選ばれます。") },
  { rels: "*", ages: ["baby"], idea: t("Picture books for ages 0–2", "Sách tranh cho bé 0–2 tuổi", "0〜2歳向けの絵本"), why: t("Read together for years, and never too many.", "Đọc cùng nhau nhiều năm, không bao giờ thừa.", "長く読み聞かせに使え、何冊あっても困りません。") },
  { rels: "*", ages: ["baby"], idea: t("A soft toy or teether that meets safety standards", "Đồ chơi vải hoặc gặm nướu đạt chuẩn an toàn", "安全基準を満たした布のおもちゃや歯固め"), why: t("Safe for the age matters most at this stage.", "Ở tuổi này, an toàn là quan trọng nhất.", "この時期は年齢に合った安全性がいちばん大切です。") },
  { rels: ["family", "friend"], ages: ["baby"], idea: t("A photo album or frame for their first years", "Album hoặc khung ảnh cho những năm đầu đời", "成長記録のアルバムやフォトフレーム"), why: t("Parents often welcome a place for these photos.", "Bố mẹ thường rất cần chỗ lưu giữ những bức ảnh này.", "写真の置き場所として、ご家族に喜ばれやすいです。") },
  { rels: "*", ages: ["child"], idea: t("Building blocks or a learning toy for their age", "Đồ chơi lắp ghép hoặc đồ chơi giáo dục hợp tuổi", "年齢に合ったブロックや知育玩具"), why: t("Play that grows with them; check the age on the box.", "Chơi mà vẫn học; nhớ xem độ tuổi trên hộp.", "遊びながら育つものです。対象年齢を確認しましょう。") },
  { rels: "*", ages: ["child"], idea: t("An illustrated encyclopaedia or picture books", "Sách bách khoa có hình hoặc sách tranh", "図鑑や絵本"), why: t("Children this age love asking \"why?\".", "Trẻ tuổi này rất thích hỏi \"tại sao?\".", "「なんで？」が多い年頃に長く使えます。") },
  { rels: "*", ages: ["child"], idea: t("Stationery with a character they like", "Đồ dùng học tập có nhân vật bé thích", "好きなキャラクターの文房具"), why: t("Useful every day — ask which character first.", "Dùng hằng ngày — hỏi trước bé thích nhân vật nào.", "毎日使えます。好きなキャラクターは先に確認を。") },
  { rels: ["family", "friend", "partner"], ages: ["child"], idea: t("A day out together: zoo, aquarium or a craft class", "Một ngày đi chơi cùng: sở thú, thủy cung hay lớp thủ công", "一緒に行く体験（動物園・水族館・工作教室）"), why: t("Time together is remembered longer than things.", "Thời gian bên nhau được nhớ lâu hơn đồ vật.", "物よりも、一緒に過ごした時間が長く記憶に残ります。") },
  { rels: "*", ages: ["child"], tags: ["bulky"], idea: t("Outdoor toys: a ball, skipping rope, bubbles", "Đồ chơi ngoài trời: bóng, dây nhảy, bong bóng xà phòng", "外遊びの道具（ボール・縄跳び・シャボン玉）"), why: t("Easy to enjoy right away.", "Có thể chơi ngay.", "すぐに遊べて喜ばれやすいです。") },
  // Teenagers.
  { rels: "*", ages: ["teen"], idea: t("A book or gift card so they can choose", "Phiếu mua sách hoặc thẻ quà tặng để tự chọn", "図書カードやギフトカード（自分で選べるもの）"), why: t("Tastes change fast at this age; choosing for themselves is part of the fun.", "Sở thích tuổi này thay đổi nhanh; tự chọn cũng là niềm vui.", "好みが変わりやすい年頃なので、自分で選べるものが無難です。") },
  { rels: "*", ages: ["teen"], idea: t("A small gadget: wireless earphones, a phone accessory", "Đồ công nghệ nhỏ: tai nghe không dây, phụ kiện điện thoại", "ワイヤレスイヤホンやスマホまわりの小物"), why: t("Used every day by many teenagers.", "Nhiều bạn trẻ dùng hằng ngày.", "毎日使う人が多い年代です。") },
  { rels: "*", ages: ["teen"], idea: t("Merchandise from an artist or series they like (ask which)", "Đồ lưu niệm của nghệ sĩ hoặc bộ truyện họ thích (hỏi trước)", "好きなアーティストや作品のグッズ（何が好きかは先に確認）"), why: t("Fan items are prized — but only the right ones.", "Đồ của fan rất quý — nhưng phải đúng thứ họ thích.", "推しのものはうれしい反面、違うと困るので確認が大切です。") },
  { rels: "*", ages: ["teen"], idea: t("Good stationery for school", "Đồ dùng học tập chất lượng", "学校で使えるちょっといい文房具"), why: t("Useful and easy to receive.", "Hữu ích và dễ nhận.", "実用的で、受け取りやすい贈り物です。") },
  // Partners.
  { rels: ["partner"], ages: "*", idea: t("A meal or short trip, just the two of you", "Một bữa ăn hoặc chuyến đi ngắn chỉ hai người", "二人で行く食事や小旅行"), why: t("Between partners, shared time is often the gift remembered most.", "Với người yêu, thời gian bên nhau thường là món quà đáng nhớ nhất.", "パートナーには、一緒に過ごす時間がいちばん記憶に残りやすい贈り物です。") },
  { rels: ["partner", "family"], ages: "*", idea: t("A photo book of your memories together", "Sách ảnh về những kỷ niệm chung", "思い出の写真をまとめたフォトブック"), why: t("Personal and impossible to duplicate.", "Mang dấu ấn riêng, không ai trùng được.", "二人だけのもので、ほかと重なりません。") },
  { rels: ["partner"], ages: "*", idea: t("Flowers with a handwritten letter", "Hoa kèm lá thư viết tay", "手紙を添えた花束"), why: t("The letter is often what they keep.", "Lá thư thường là thứ được giữ lại.", "手紙のほうが長く大切にされることも多いです。") },
  { rels: ["partner"], ages: ["young", "middle"], idea: t("A small item with their initials", "Món đồ nhỏ khắc chữ cái tên", "イニシャル入りの小物"), why: t("A personal touch on something they use.", "Dấu ấn riêng trên món đồ họ dùng.", "普段使うものに、特別感を添えられます。") },
  { rels: ["partner"], ages: ["young", "middle"], gender: "female", tags: ["accessory"], idea: t("An everyday accessory (necklace, earrings)", "Phụ kiện dùng hằng ngày (dây chuyền, bông tai)", "普段使いのアクセサリー（ネックレス・ピアスなど）"), why: t("Often chosen for partners — check their style and metal allergies.", "Hay được chọn cho người yêu — hãy để ý phong cách và dị ứng kim loại.", "パートナーへの定番です。好みのテイストと金属アレルギーは確認を。") },
  { rels: ["partner"], ages: ["young", "middle"], gender: "male", idea: t("Leather goods: a wallet, key case or card holder", "Đồ da: ví, móc khóa hoặc ví đựng thẻ", "革小物（財布・キーケース・名刺入れ）"), why: t("Often chosen for partners; used daily for years.", "Hay được chọn cho người yêu; dùng hằng ngày nhiều năm.", "パートナーへの定番で、毎日長く使えます。") },
  // Friends (and anyone else).
  { rels: ["friend", "colleague"], ages: ["teen", ...ADULT], tags: ["sweets", "food"], idea: t("Well-loved sweets from a good shop", "Bánh kẹo ngon từ tiệm nổi tiếng", "評判のお店のお菓子"), why: t("A consumable doesn't leave them with clutter or a debt to repay.", "Đồ dùng hết không làm bừa nhà hay khiến họ ngại.", "消えものは場所を取らず、相手に気を遣わせにくいです。") },
  { rels: ["friend", "colleague", "family"], ages: ADULT, tags: ["food"], idea: t("Good coffee or tea", "Cà phê hoặc trà ngon", "こだわりのコーヒーやお茶"), why: t("Enjoyed by many adults and easy to share.", "Nhiều người lớn thích và dễ chia sẻ.", "大人に好まれやすく、気軽に贈れます。") },
  { rels: ["friend"], ages: ["teen", ...ADULT], idea: t("A café gift card or e-gift", "Thẻ quà tặng quán cà phê hoặc e-gift", "カフェのギフトカードやeギフト"), why: t("Light to give and easy to use.", "Nhẹ nhàng, dễ dùng.", "気軽に贈れて、使いやすいです。") },
  { rels: ["friend"], ages: ["young", "middle"], idea: t("A meal out together, your treat", "Mời một bữa ăn cùng nhau", "一緒に行く食事（ごちそう）"), why: t("Between friends, time together counts too.", "Giữa bạn bè, thời gian bên nhau cũng là quà.", "友達同士なら、一緒に過ごす時間も贈り物になります。") },
  { rels: ["friend", "family"], ages: ["young", "middle", "senior"], tags: ["alcohol"], idea: t("A drink they might enjoy (check they drink)", "Một chai đồ uống họ có thể thích (hỏi xem họ có uống không)", "好みに合いそうなお酒（飲むかは先に確認）"), why: t("A common adult gift — only if they drink.", "Món quà phổ biến cho người lớn — chỉ khi họ uống.", "大人への定番ですが、飲まない人も多いので確認を。") },
  { rels: ["friend"], ages: ["young", "middle"], gender: "female", tags: ["scent"], idea: t("A nice hand cream or bath set", "Kem tay hoặc bộ đồ tắm xịn", "ちょっといいハンドクリームやバスグッズ"), why: t("Often chosen between friends — mind scent preferences.", "Hay được tặng giữa bạn bè — chú ý mùi hương họ thích.", "友達同士でよく選ばれます。香りの好みには注意を。") },
  { rels: ["friend"], ages: ["young", "middle"], gender: "male", idea: t("Good everyday basics: a handkerchief or socks", "Đồ dùng hằng ngày chất lượng: khăn tay, tất", "上質なハンカチや靴下などの身の回り品"), why: t("Practical and easy to receive.", "Thiết thực và dễ nhận.", "実用的で受け取りやすいです。") },
  // Colleagues.
  { rels: ["colleague"], ages: "*", tags: ["sweets", "food"], idea: t("Individually wrapped sweets to share at work", "Bánh kẹo gói riêng để chia ở chỗ làm", "職場で分けやすい個包装のお菓子"), why: t("Easy to share and doesn't put them under obligation.", "Dễ chia và không khiến họ ngại.", "分けやすく、相手に負担をかけません。") },
  { rels: ["colleague"], ages: ADULT, idea: t("Something for their desk: a mug or good pen", "Món cho bàn làm việc: cốc hoặc bút tốt", "デスクで使えるマグや書きやすいペン"), why: t("Useful at work and modest in price.", "Hữu ích ở chỗ làm, giá vừa phải.", "仕事で使えて、価格も控えめです。") },
  // Family, especially parents and grandparents.
  { rels: ["family"], ages: "*", idea: t("A meal together as a family", "Một bữa ăn cùng cả nhà", "家族そろっての食事"), why: t("Families often value the time more than the thing.", "Gia đình thường quý thời gian hơn đồ vật.", "家族には、物よりも一緒の時間が喜ばれることが多いです。") },
  { rels: ["family", "friend"], ages: ["middle", "senior"], tags: ["food"], idea: t("Seasonal fruit or a regional speciality, delivered", "Trái cây theo mùa hoặc đặc sản gửi tận nơi", "季節の果物や名産品のお取り寄せ"), why: t("A consumable that's easy to enjoy at any age.", "Đồ dùng hết, ai cũng dễ thưởng thức.", "消えもので、年齢を問わず楽しめます。") },
  { rels: ["family"], ages: ["senior"], idea: t("A photo frame or album with family pictures", "Khung ảnh hoặc album ảnh gia đình", "家族や孫の写真入りフォトフレーム・アルバム"), why: t("Often treasured by parents and grandparents.", "Bố mẹ, ông bà thường rất trân trọng.", "親や祖父母に特に喜ばれやすい贈り物です。") },
  { rels: ["family", "partner"], ages: ["middle", "senior"], idea: t("Something comforting: good pyjamas or a lap blanket", "Món giúp thư thái: đồ ngủ tốt hoặc chăn đắp chân", "上質なパジャマやひざ掛けなど、体をいたわるもの"), why: t("Comfort is welcome at this age.", "Sự thoải mái luôn được trân trọng ở tuổi này.", "この年代には、くつろぎや体をいたわるものが喜ばれます。") },
  { rels: ["family"], ages: ["middle", "senior"], idea: t("A relaxing trip or hot-spring stay", "Một chuyến nghỉ dưỡng hoặc suối nước nóng", "温泉やのんびりできる旅行"), why: t("A chance to rest — even better if you go together.", "Cơ hội nghỉ ngơi — càng tốt nếu đi cùng nhau.", "ゆっくり休める機会に。一緒に行くとなお喜ばれます。") },
  { rels: ["family", "friend"], ages: ["middle", "senior"], idea: t("Flowers or a potted plant", "Hoa hoặc chậu cây", "花や鉢植え"), why: t("Brightens a room without being a burden.", "Làm căn phòng tươi sáng mà không thành gánh nặng.", "部屋が明るくなり、負担になりにくいです。") },
  { rels: ["family", "partner"], ages: ["young", "middle"], idea: t("A better version of something they use every day", "Phiên bản tốt hơn của món họ dùng hằng ngày", "毎日使う日用品の、ちょっといいもの"), why: t("People rarely buy the nicer version for themselves.", "Người ta ít khi tự mua bản tốt hơn cho mình.", "自分ではなかなか買わない「ちょっといいもの」は喜ばれやすいです。") },
  { rels: ["family"], ages: ["senior"], gender: "female", idea: t("A soft scarf or stole", "Khăn choàng mềm", "やわらかいストールやスカーフ"), why: t("Often chosen for mothers and grandmothers.", "Hay được tặng cho mẹ và bà.", "母や祖母への贈り物としてよく選ばれます。") },
  { rels: ["family"], ages: ["senior"], gender: "male", tags: ["alcohol"], idea: t("A good drink and snacks to go with it", "Một chai rượu ngon kèm đồ nhắm", "晩酌用のお酒とおつまみ"), why: t("Often chosen for fathers and grandfathers — only if they drink.", "Hay được tặng cho bố và ông — chỉ khi họ uống.", "父や祖父への定番です。飲むかどうかは確認を。") },
];

/** A line about gifts for this kind of relationship, shown with the general ideas. */
export const RELATION_NOTE: Record<Rel, I18nText> = {
  partner: t("For a partner, adding time together or a letter to the gift tends to mean the most.", "Với người yêu, kèm theo thời gian bên nhau hoặc một lá thư thường ý nghĩa nhất.", "パートナーには、物に「一緒に過ごす時間」や手紙を添えると喜ばれやすいです。"),
  family: t("For family, time together and things that care for their health or comfort are welcome.", "Với gia đình, thời gian bên nhau và những món chăm sóc sức khỏe, sự thoải mái luôn được trân trọng.", "家族には、一緒に過ごす時間や、体・暮らしをいたわるものが喜ばれやすいです。"),
  friend: t("For friends, consumables or experiences at a price that doesn't put them under obligation are safest.", "Với bạn bè, đồ dùng hết hoặc trải nghiệm với giá vừa phải là an toàn nhất.", "友達には、相手が気を遣わない価格帯の消えものや体験が無難です。"),
  colleague: t("For colleagues, modest consumables that are easy to share are safest.", "Với đồng nghiệp, đồ dùng hết giá vừa phải, dễ chia là an toàn nhất.", "職場の相手には、控えめな価格で分けやすい消えものが無難です。"),
};
