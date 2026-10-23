export const PREFERENCE_CATEGORIES = [
  { id: "food", label: { en: "Food & drink", vi: "Ăn uống", ja: "食べもの・飲みもの" } },
  { id: "music", label: { en: "Music", vi: "Âm nhạc", ja: "音楽" } },
  { id: "hobby", label: { en: "Hobbies", vi: "Sở thích", ja: "趣味" } },
  { id: "travel", label: { en: "Places & travel", vi: "Địa điểm & du lịch", ja: "場所・旅行" } },
  { id: "brand", label: { en: "Brands", vi: "Thương hiệu", ja: "ブランド" } },
  { id: "color", label: { en: "Colors", vi: "Màu sắc", ja: "色" } },
  { id: "scent", label: { en: "Scents", vi: "Mùi hương", ja: "香り" } },
  { id: "book_film", label: { en: "Books & films", vi: "Sách & phim", ja: "本・映画" } },
  { id: "item", label: { en: "Things & gifts", vi: "Đồ vật & quà", ja: "もの・贈り物" } },
  { id: "experience", label: { en: "Experiences", vi: "Trải nghiệm", ja: "体験" } },
  { id: "other", label: { en: "Other", vi: "Khác", ja: "その他" } },
] as const;

export type PreferenceCategoryId = (typeof PREFERENCE_CATEGORIES)[number]["id"];
