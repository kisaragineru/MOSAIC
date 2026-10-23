export const PREFERENCE_CATEGORIES = [
  { id: "food", label: { en: "Food & drink", vi: "Ăn uống" } },
  { id: "music", label: { en: "Music", vi: "Âm nhạc" } },
  { id: "hobby", label: { en: "Hobbies", vi: "Sở thích" } },
  { id: "travel", label: { en: "Places & travel", vi: "Địa điểm & du lịch" } },
  { id: "brand", label: { en: "Brands", vi: "Thương hiệu" } },
  { id: "color", label: { en: "Colors", vi: "Màu sắc" } },
  { id: "scent", label: { en: "Scents", vi: "Mùi hương" } },
  { id: "book_film", label: { en: "Books & films", vi: "Sách & phim" } },
  { id: "item", label: { en: "Things & gifts", vi: "Đồ vật & quà" } },
  { id: "experience", label: { en: "Experiences", vi: "Trải nghiệm" } },
  { id: "other", label: { en: "Other", vi: "Khác" } },
] as const;

export type PreferenceCategoryId = (typeof PREFERENCE_CATEGORIES)[number]["id"];
