/**
 * Gift ideas from a connected person's own answers (shared with you under the "preferences"
 * consent). Each entry turns one answer into an idea or into something to avoid; `{x}` is the
 * chosen option's label. Only the likes chapter: what they said they enjoy, never guesses about
 * who they are.
 */
import type { GiftTag } from "./gift-general";
import type { I18nText } from "./questions";

export interface GiftHint {
  /** An idea; omitted when the answer only says what to avoid. */
  idea?: I18nText;
  /** Something to leave out because of this answer. */
  avoid?: I18nText;
  /** How directly the answer speaks about gifts. */
  strength: "strong" | "moderate";
  /** General ideas carrying this tag are left out because of this answer. */
  tag?: GiftTag;
}

const t = (en: string, vi: string, ja: string): I18nText => ({ en, vi, ja });

/** Keyed by question id, then option value ("*" = any option, with {x} = its label). */
export const GIFT_HINTS: Record<string, Record<string, GiftHint>> = {
  "l.gift_receive": {
    experience: { strength: "strong", idea: t("Time together: a meal, a day trip or a concert", "Thời gian bên nhau: một bữa ăn, chuyến đi ngắn hay buổi hòa nhạc", "一緒に過ごす時間（食事・日帰り旅・ライブなど）") },
    handmade: { strength: "strong", idea: t("Something you make yourself: baking, a small craft, a photo album", "Món tự tay làm: bánh, đồ thủ công nhỏ, album ảnh", "手づくりのもの（お菓子・小物・写真アルバムなど）") },
    practical: { strength: "strong", idea: t("A better version of something they use every day", "Phiên bản tốt hơn của món họ dùng hằng ngày", "毎日使うものの、ちょっといいもの") },
    letter: { strength: "strong", idea: t("A heartfelt letter (even with a small gift)", "Một lá thư chân thành (kèm món quà nhỏ cũng được)", "心のこもった手紙（小さな贈り物に添えても）") },
  },
  "l.scent": {
    none: { strength: "moderate", tag: "scent", avoid: t("Scented things", "Đồ có mùi hương", "香りのあるもの") },
    "*": { strength: "moderate", idea: t("A hand cream or candle with a {x} scent", "Kem tay hoặc nến thơm hương {x}", "{x}の香りのハンドクリームやキャンドル") },
  },
  "l.coffee_tea": {
    coffee: { strength: "moderate", idea: t("Good coffee beans or drip bags", "Cà phê hạt ngon hoặc cà phê túi lọc", "こだわりのコーヒー豆やドリップバッグ") },
    tea: { strength: "moderate", idea: t("A selection of good tea", "Hộp trà ngon", "おいしい紅茶・日本茶の詰め合わせ") },
    both: { strength: "moderate", idea: t("Good coffee or tea", "Cà phê hoặc trà ngon", "おいしいコーヒーやお茶") },
  },
  "l.sweets": {
    love: { strength: "moderate", idea: t("Well-loved sweets from a good shop", "Bánh kẹo ngon từ tiệm nổi tiếng", "評判のお店のお菓子") },
    not: { strength: "moderate", tag: "sweets", avoid: t("Sweets", "Đồ ngọt", "甘いお菓子") },
  },
  "l.alcohol": {
    love: { strength: "moderate", idea: t("A drink they'd enjoy", "Một chai đồ uống họ thích", "好みに合いそうなお酒") },
    no: { strength: "moderate", tag: "alcohol", avoid: t("Alcohol", "Rượu bia", "お酒") },
  },
  "l.fashion_colors": {
    "*": { strength: "moderate", idea: t("A small item in {x} (handkerchief, scarf, pouch)", "Món nhỏ màu {x} (khăn tay, khăn quàng, túi nhỏ)", "{x}の小物（ハンカチ・ストール・ポーチなど）") },
  },
  "l.fashion_priority": {
    comfort: { strength: "moderate", idea: t("Something soft to wear at home (loungewear, good socks)", "Đồ mặc nhà thoải mái (đồ ngủ, tất êm)", "着心地のいいルームウェアや靴下") },
    lasting: { strength: "moderate", idea: t("A well-made classic that lasts for years", "Món kinh điển bền đẹp dùng nhiều năm", "長く使える上質な定番品") },
  },
  "l.accessories": {
    daily: { strength: "moderate", idea: t("An everyday accessory", "Phụ kiện dùng hằng ngày", "普段使いのアクセサリー") },
    never: { strength: "moderate", tag: "accessory", avoid: t("Accessories", "Phụ kiện", "アクセサリー") },
  },
  "l.music_listen": {
    live: { strength: "moderate", idea: t("Tickets to a concert", "Vé xem biểu diễn", "ライブ・コンサートのチケット") },
  },
  "l.music_genres": {
    "*": { strength: "moderate", idea: t("Something from the {x} world (a record, a show)", "Món liên quan đến nhạc {x} (đĩa, vé show)", "{x}にまつわるもの（CD・レコード、ライブなど）") },
  },
  "l.works": {
    manga: { strength: "moderate", idea: t("New volumes or a set of a manga they follow", "Tập mới hoặc trọn bộ truyện tranh họ theo dõi", "読んでいる漫画の新刊やセット") },
    novels: { strength: "moderate", idea: t("A novel you loved, or a book voucher", "Một cuốn tiểu thuyết bạn thích, hoặc phiếu mua sách", "あなたが好きな小説や図書カード") },
    games: { strength: "moderate", idea: t("Something for their games", "Món liên quan đến game họ chơi", "遊んでいるゲームにまつわるもの") },
    anime: { strength: "moderate", idea: t("Merchandise from an anime they like", "Đồ lưu niệm từ anime họ thích", "好きなアニメのグッズ") },
  },
  "l.interior": {
    natural: { strength: "moderate", idea: t("A plant or something made of wood", "Một chậu cây hoặc đồ gỗ", "観葉植物や木の小物") },
    minimal: { strength: "moderate", idea: t("A simple, well-made daily item (nothing that adds clutter)", "Đồ dùng hằng ngày đơn giản, chất lượng (không làm bừa phòng)", "シンプルで質のいい日用品（物を増やさないもの）") },
    retro: { strength: "moderate", idea: t("A retro piece for their room", "Món đồ hoài cổ cho căn phòng", "部屋に合うレトロな雑貨") },
  },
  "l.things": {
    few: { strength: "moderate", tag: "bulky", avoid: t("Things that take up space (consumables or experiences suit them better)", "Đồ chiếm chỗ (đồ dùng hết hoặc trải nghiệm hợp hơn)", "かさばる物（消えものや体験のほうが合います）") },
  },
  "l.travel_style": {
    food: { strength: "moderate", idea: t("A meal at a place known for its food", "Một bữa ở quán nổi tiếng", "評判のお店での食事") },
    nature: { strength: "moderate", idea: t("A day out in nature", "Một ngày giữa thiên nhiên", "自然の中で過ごす一日") },
    culture: { strength: "moderate", idea: t("Tickets to a museum or exhibition", "Vé bảo tàng hoặc triển lãm", "美術館や展覧会のチケット") },
    rest: { strength: "moderate", idea: t("A quiet stay or a spa day", "Một kỳ nghỉ yên tĩnh hoặc ngày spa", "のんびりできる宿やスパ") },
  },
  "l.place_relax": {
    cafe: { strength: "moderate", idea: t("A gift card for a café", "Thẻ quà tặng quán cà phê", "カフェのギフトカード") },
    home: { strength: "moderate", idea: t("Something cosy for staying in", "Món giúp thư giãn ở nhà", "家でくつろげるもの") },
  },
  "l.reading": {
    often: { strength: "moderate", idea: t("A book or a book voucher", "Một cuốn sách hoặc phiếu mua sách", "本や図書カード") },
  },
  "l.food_avoid": {
    some: { strength: "moderate", tag: "food", avoid: t("Food they can't eat — ask first", "Món họ không ăn được — hỏi trước", "食べられないもの（食べ物は先に確認を）") },
    many: { strength: "moderate", tag: "food", avoid: t("Food they can't eat — ask first", "Món họ không ăn được — hỏi trước", "食べられないもの（食べ物は先に確認を）") },
    allergy: { strength: "moderate", tag: "food", avoid: t("Food with allergens — ask first", "Món có chất gây dị ứng — hỏi trước", "アレルギーのある食べ物（必ず先に確認を）") },
  },
};
