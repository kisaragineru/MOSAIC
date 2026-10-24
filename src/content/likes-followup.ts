/**
 * After a "likes" question: an invitation to name the specific thing in your own words, saved as
 * one of your favourites (a preference item). The question gives the shape; this keeps the detail.
 */
import type { I18nText } from "./questions";

export const LIKES_FOLLOW_UP: Record<string, { category: string; hint: I18nText; example: I18nText }> = {
  "l.season": { category: "experience", hint: { ja: "その季節の、何が好き？", en: "What do you love about that season?", vi: "Bạn thích điều gì ở mùa đó?" }, example: { ja: "例：金木犀の香り、栗のお菓子", en: "e.g. the smell of osmanthus, chestnut sweets", vi: "ví dụ: hương hoa mộc, bánh hạt dẻ" } },
  "l.films": { category: "book_film", hint: { ja: "好きな作品をひとつ挙げるなら？", en: "One title you love?", vi: "Một tác phẩm bạn yêu thích?" }, example: { ja: "例：千と千尋の神隠し", en: "e.g. Spirited Away", vi: "ví dụ: Vùng đất linh hồn" } },
  "l.reading": { category: "book_film", hint: { ja: "好きな本や作家は？", en: "A book or author you love?", vi: "Cuốn sách hay tác giả bạn yêu thích?" }, example: { ja: "例：村上春樹", en: "e.g. Haruki Murakami", vi: "ví dụ: Nguyễn Nhật Ánh" } },
  "l.move": { category: "hobby", hint: { ja: "いちばんよくやることは？", en: "What do you do most?", vi: "Bạn hay làm gì nhất?" }, example: { ja: "例：朝のランニング", en: "e.g. morning runs", vi: "ví dụ: chạy bộ buổi sáng" } },
  "l.place_relax": { category: "travel", hint: { ja: "具体的に好きな場所は？", en: "A place you love?", vi: "Một nơi bạn yêu thích?" }, example: { ja: "例：鎌倉の海、近所の喫茶店", en: "e.g. the sea at Kamakura, the café round the corner", vi: "ví dụ: biển Đà Nẵng, quán cà phê đầu ngõ" } },
  "l.meals": { category: "food", hint: { ja: "好きな料理やお店は？", en: "A dish or place to eat you love?", vi: "Món ăn hay quán bạn thích?" }, example: { ja: "例：母の肉じゃが", en: "e.g. my mum's stew", vi: "ví dụ: phở bò quán quen" } },
  "l.gift_receive": { category: "item", hint: { ja: "もらってうれしかったものは？", en: "A gift that made you happy?", vi: "Món quà khiến bạn vui?" }, example: { ja: "例：手書きの手紙", en: "e.g. a handwritten letter", vi: "ví dụ: một lá thư viết tay" } },
  "l.weekend_morning": { category: "experience", hint: { ja: "休日の朝の定番は？", en: "Your go-to weekend morning?", vi: "Buổi sáng cuối tuần quen thuộc của bạn?" }, example: { ja: "例：パン屋で朝ごはん", en: "e.g. breakfast at the bakery", vi: "ví dụ: ăn sáng ở tiệm bánh" } },
};

/** By question category, for likes questions without their own entry. */
export const LIKES_BY_CATEGORY: Record<string, string> = { food: "food", travel: "travel", music: "music", hobbies: "hobby" };
export const LIKES_GENERIC = {
  hint: { ja: "具体的には？", en: "Anything specific?", vi: "Cụ thể là gì?" } as I18nText,
  example: { ja: "好きなもの・苦手なものを、自分の言葉で", en: "Name it in your own words", vi: "Gọi tên bằng lời của bạn" } as I18nText,
};
