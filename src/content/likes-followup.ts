/**
 * After a "likes" question: an invitation to name the specific thing in your own words, saved as
 * one of your favourites (a preference item). The question gives the shape; this keeps the detail.
 */
import type { I18nText } from "./questions";

export interface LikesFollowUpSpec {
  category: string;
  hint: I18nText;
  example: I18nText;
  /** Offer "one more" until this many have been added in a row (brands, artists…). */
  upTo?: number;
  /** The feeling preselected (food you avoid starts at "dislike"). */
  sentiment?: "love" | "like" | "dislike";
}

const f = (category: string, hint: [string, string, string], example: [string, string, string], extra: Partial<LikesFollowUpSpec> = {}): LikesFollowUpSpec => ({
  category,
  hint: { ja: hint[0], en: hint[1], vi: hint[2] },
  example: { ja: example[0], en: example[1], vi: example[2] },
  ...extra,
});

export const LIKES_FOLLOW_UP: Record<string, LikesFollowUpSpec> = {
  "l.season": { category: "experience", hint: { ja: "その季節の、何が好き？", en: "What do you love about that season?", vi: "Bạn thích điều gì ở mùa đó?" }, example: { ja: "例：金木犀の香り、栗のお菓子", en: "e.g. the smell of osmanthus, chestnut sweets", vi: "ví dụ: hương hoa mộc, bánh hạt dẻ" } },
  "l.films": { category: "book_film", hint: { ja: "好きな作品をひとつ挙げるなら？", en: "One title you love?", vi: "Một tác phẩm bạn yêu thích?" }, example: { ja: "例：千と千尋の神隠し", en: "e.g. Spirited Away", vi: "ví dụ: Vùng đất linh hồn" } },
  "l.reading": { category: "book_film", hint: { ja: "好きな本や作家は？", en: "A book or author you love?", vi: "Cuốn sách hay tác giả bạn yêu thích?" }, example: { ja: "例：村上春樹", en: "e.g. Haruki Murakami", vi: "ví dụ: Nguyễn Nhật Ánh" } },
  "l.move": { category: "hobby", hint: { ja: "いちばんよくやることは？", en: "What do you do most?", vi: "Bạn hay làm gì nhất?" }, example: { ja: "例：朝のランニング", en: "e.g. morning runs", vi: "ví dụ: chạy bộ buổi sáng" } },
  "l.place_relax": { category: "travel", hint: { ja: "具体的に好きな場所は？", en: "A place you love?", vi: "Một nơi bạn yêu thích?" }, example: { ja: "例：鎌倉の海、近所の喫茶店", en: "e.g. the sea at Kamakura, the café round the corner", vi: "ví dụ: biển Đà Nẵng, quán cà phê đầu ngõ" } },
  "l.meals": { category: "food", hint: { ja: "好きな料理やお店は？", en: "A dish or place to eat you love?", vi: "Món ăn hay quán bạn thích?" }, example: { ja: "例：母の肉じゃが", en: "e.g. my mum's stew", vi: "ví dụ: phở bò quán quen" } },
  "l.gift_receive": { category: "item", hint: { ja: "もらってうれしかったものは？", en: "A gift that made you happy?", vi: "Món quà khiến bạn vui?" }, example: { ja: "例：手書きの手紙", en: "e.g. a handwritten letter", vi: "ví dụ: một lá thư viết tay" } },
  "l.weekend_morning": { category: "experience", hint: { ja: "休日の朝の定番は？", en: "Your go-to weekend morning?", vi: "Buổi sáng cuối tuần quen thuộc của bạn?" }, example: { ja: "例：パン屋で朝ごはん", en: "e.g. breakfast at the bakery", vi: "ví dụ: ăn sáng ở tiệm bánh" } },
  "l.fashion_style": f("brand", ["好きなブランドは？", "Brands you love?", "Thương hiệu bạn yêu thích?"], ["例：無印良品、COS", "e.g. Uniqlo, COS", "ví dụ: Uniqlo, COS"], { upTo: 3 }),
  "l.fashion_priority": f("item", ["長く愛用している服や靴は？", "Clothes or shoes you've worn for years?", "Món đồ, đôi giày bạn dùng lâu năm?"], ["例：10年着ているトレンチコート", "e.g. a trench coat I've had for ten years", "ví dụ: chiếc áo khoác mặc đã mười năm"]),
  "l.fashion_colors": f("color", ["いちばん好きな色は？", "Your favourite colour?", "Màu bạn thích nhất?"], ["例：深い緑", "e.g. deep green", "ví dụ: xanh lá đậm"]),
  "l.fashion_shopping": f("brand", ["よく行くお店は？", "A shop you go back to?", "Cửa hàng bạn hay ghé?"], ["例：近所のセレクトショップ", "e.g. the little shop round the corner", "ví dụ: shop quen gần nhà"], { upTo: 3 }),
  "l.accessories": f("item", ["お気に入りのアクセサリーは？", "A favourite piece you wear?", "Món phụ kiện bạn yêu thích?"], ["例：祖母にもらった指輪", "e.g. my grandmother's ring", "ví dụ: chiếc nhẫn của bà"]),
  "l.music_genres": f("music", ["好きなアーティストは？", "Artists you love?", "Nghệ sĩ bạn yêu thích?"], ["例：宇多田ヒカル", "e.g. Hikaru Utada", "ví dụ: Sơn Tùng M-TP"], { upTo: 3 }),
  "l.music_listen": f("experience", ["忘れられないライブや曲は？", "A concert or song you'll never forget?", "Buổi diễn hay bài hát bạn không quên?"], ["例：初めて行った野外フェス", "e.g. my first outdoor festival", "ví dụ: lần đầu đi lễ hội âm nhạc"]),
  "l.music_now": f("music", ["その曲のアーティストも好き？", "Do you like the artist too?", "Bạn cũng thích nghệ sĩ đó chứ?"], ["例：アーティスト名", "e.g. the artist's name", "ví dụ: tên nghệ sĩ"]),
  "l.oshi": f("other", ["推しは誰（何）？", "Who are you a fan of?", "Thần tượng của bạn là ai?"], ["例：好きなアイドル、選手、キャラクター", "e.g. an idol, a player, a character", "ví dụ: idol, cầu thủ, nhân vật"], { upTo: 3 }),
  "l.works": f("book_film", ["いちばん好きな作品は？", "A title you love most?", "Tác phẩm bạn thích nhất?"], ["例：スラムダンク", "e.g. Slam Dunk", "ví dụ: Doraemon"], { upTo: 3 }),
  "l.coffee_tea": f("food", ["お気に入りの一杯は？", "Your favourite cup?", "Thức uống yêu thích của bạn?"], ["例：浅煎りのエチオピア", "e.g. a light Ethiopian roast", "ví dụ: cà phê sữa đá"]),
  "l.alcohol": f("food", ["好きなお酒は？", "A drink you enjoy?", "Đồ uống có cồn bạn thích?"], ["例：日本酒、クラフトビール", "e.g. sake, craft beer", "ví dụ: bia thủ công, rượu vang"]),
  "l.cuisine": f("food", ["好きな料理やお店は？", "A dish or restaurant you love?", "Món ăn hay quán bạn yêu thích?"], ["例：近所のフォー屋さん", "e.g. the pho place nearby", "ví dụ: quán phở đầu hẻm"], { upTo: 3 }),
  "l.sweets": f("food", ["好きなお菓子は？", "A sweet you love?", "Món ngọt bạn thích?"], ["例：チーズケーキ", "e.g. cheesecake", "ví dụ: bánh flan"]),
  "l.food_avoid": f("food", ["苦手なもの・食べられないものは？", "What can't you, or won't you, eat?", "Món bạn không ăn được hoặc không thích?"], ["例：パクチー、えび（アレルギー）", "e.g. coriander, prawns (allergy)", "ví dụ: rau mùi, tôm (dị ứng)"], { upTo: 3, sentiment: "dislike" }),
  "l.scent": f("scent", ["好きな香りのものは？", "A scent you love?", "Mùi hương bạn yêu thích?"], ["例：金木犀のハンドクリーム", "e.g. an osmanthus hand cream", "ví dụ: nến thơm hương sả"]),
  "l.interior": f("item", ["部屋でいちばんのお気に入りは？", "Your favourite thing at home?", "Món đồ bạn thích nhất trong nhà?"], ["例：古い木の椅子", "e.g. an old wooden chair", "ví dụ: chiếc ghế gỗ cũ"]),
  "l.things": f("item", ["長く使っている愛用品は？", "Something you've used and loved for years?", "Món đồ bạn dùng và yêu thích lâu năm?"], ["例：大学時代からの万年筆", "e.g. the fountain pen I've had since university", "ví dụ: cây bút máy từ thời đại học"]),
  "l.travel_style": f("travel", ["いつか行きたい場所は？", "Somewhere you want to go one day?", "Nơi bạn muốn đến một ngày nào đó?"], ["例：アイスランド", "e.g. Iceland", "ví dụ: Iceland"], { upTo: 3 }),
};

/** By question category, for likes questions without their own entry. */
export const LIKES_BY_CATEGORY: Record<string, string> = { food: "food", travel: "travel", music: "music", hobbies: "hobby" };
export const LIKES_GENERIC = {
  hint: { ja: "具体的には？", en: "Anything specific?", vi: "Cụ thể là gì?" } as I18nText,
  example: { ja: "好きなもの・苦手なものを、自分の言葉で", en: "Name it in your own words", vi: "Gọi tên bằng lời của bạn" } as I18nText,
};
