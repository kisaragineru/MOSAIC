/** Star catalog. Vietnamese names are canonical; English glosses are descriptive only. */

export const MAIN_STARS = [
  "tu_vi", "thien_co", "thai_duong", "vu_khuc", "thien_dong", "liem_trinh", "thien_phu",
  "thai_am", "tham_lang", "cu_mon", "thien_tuong", "thien_luong", "that_sat", "pha_quan",
] as const;

export const AUX_STARS = [
  "loc_ton", "kinh_duong", "da_la", "thien_khoi", "thien_viet", "van_xuong", "van_khuc",
  "ta_phu", "huu_bat", "thien_ma", "dia_khong", "dia_kiep", "hoa_tinh", "linh_tinh",
  "thien_khoc", "thien_hu", "long_tri", "phuong_cac", "giai_than", "hong_loan", "thien_hy",
  "thien_hinh", "thien_rieu", "thien_y", "co_than", "qua_tu", "dao_hoa", "hoa_cai", "kiep_sat",
  "tam_thai", "bat_toa", "an_quang", "thien_tai", "thien_tho", "thien_thuong",
  "thien_su", "thien_la", "dia_vong",
] as const;

export type MainStarId = (typeof MAIN_STARS)[number];
export type AuxStarId = (typeof AUX_STARS)[number];
export type StarId = MainStarId | AuxStarId;

export type StarGroup = "main" | "lucky" | "malefic" | "other";

export const STAR_INFO: Record<StarId, { vi: string; en: string; group: StarGroup }> = {
  tu_vi: { vi: "Tử Vi", en: "Tử Vi (Emperor)", group: "main" },
  thien_co: { vi: "Thiên Cơ", en: "Thiên Cơ (Strategist)", group: "main" },
  thai_duong: { vi: "Thái Dương", en: "Thái Dương (Sun)", group: "main" },
  vu_khuc: { vi: "Vũ Khúc", en: "Vũ Khúc (Finance)", group: "main" },
  thien_dong: { vi: "Thiên Đồng", en: "Thiên Đồng (Harmony)", group: "main" },
  liem_trinh: { vi: "Liêm Trinh", en: "Liêm Trinh (Integrity)", group: "main" },
  thien_phu: { vi: "Thiên Phủ", en: "Thiên Phủ (Treasury)", group: "main" },
  thai_am: { vi: "Thái Âm", en: "Thái Âm (Moon)", group: "main" },
  tham_lang: { vi: "Tham Lang", en: "Tham Lang (Desire)", group: "main" },
  cu_mon: { vi: "Cự Môn", en: "Cự Môn (Great Gate)", group: "main" },
  thien_tuong: { vi: "Thiên Tướng", en: "Thiên Tướng (Minister)", group: "main" },
  thien_luong: { vi: "Thiên Lương", en: "Thiên Lương (Protector)", group: "main" },
  that_sat: { vi: "Thất Sát", en: "Thất Sát (General)", group: "main" },
  pha_quan: { vi: "Phá Quân", en: "Phá Quân (Vanguard)", group: "main" },
  loc_ton: { vi: "Lộc Tồn", en: "Lộc Tồn (Stored Wealth)", group: "lucky" },
  kinh_duong: { vi: "Kình Dương", en: "Kình Dương", group: "malefic" },
  da_la: { vi: "Đà La", en: "Đà La", group: "malefic" },
  thien_khoi: { vi: "Thiên Khôi", en: "Thiên Khôi", group: "lucky" },
  thien_viet: { vi: "Thiên Việt", en: "Thiên Việt", group: "lucky" },
  van_xuong: { vi: "Văn Xương", en: "Văn Xương", group: "lucky" },
  van_khuc: { vi: "Văn Khúc", en: "Văn Khúc", group: "lucky" },
  ta_phu: { vi: "Tả Phù", en: "Tả Phù", group: "lucky" },
  huu_bat: { vi: "Hữu Bật", en: "Hữu Bật", group: "lucky" },
  thien_ma: { vi: "Thiên Mã", en: "Thiên Mã (Heavenly Horse)", group: "other" },
  dia_khong: { vi: "Địa Không", en: "Địa Không", group: "malefic" },
  dia_kiep: { vi: "Địa Kiếp", en: "Địa Kiếp", group: "malefic" },
  hoa_tinh: { vi: "Hỏa Tinh", en: "Hỏa Tinh", group: "malefic" },
  linh_tinh: { vi: "Linh Tinh", en: "Linh Tinh", group: "malefic" },
  thien_khoc: { vi: "Thiên Khốc", en: "Thiên Khốc", group: "other" },
  thien_hu: { vi: "Thiên Hư", en: "Thiên Hư", group: "other" },
  long_tri: { vi: "Long Trì", en: "Long Trì", group: "lucky" },
  phuong_cac: { vi: "Phượng Các", en: "Phượng Các", group: "lucky" },
  giai_than: { vi: "Giải Thần", en: "Giải Thần", group: "lucky" },
  hong_loan: { vi: "Hồng Loan", en: "Hồng Loan", group: "other" },
  thien_hy: { vi: "Thiên Hỷ", en: "Thiên Hỷ", group: "other" },
  thien_hinh: { vi: "Thiên Hình", en: "Thiên Hình", group: "malefic" },
  thien_rieu: { vi: "Thiên Riêu", en: "Thiên Riêu", group: "other" },
  thien_y: { vi: "Thiên Y", en: "Thiên Y", group: "other" },
  co_than: { vi: "Cô Thần", en: "Cô Thần", group: "other" },
  qua_tu: { vi: "Quả Tú", en: "Quả Tú", group: "other" },
  dao_hoa: { vi: "Đào Hoa", en: "Đào Hoa", group: "other" },
  hoa_cai: { vi: "Hoa Cái", en: "Hoa Cái", group: "other" },
  kiep_sat: { vi: "Kiếp Sát", en: "Kiếp Sát", group: "malefic" },
  tam_thai: { vi: "Tam Thai", en: "Tam Thai", group: "lucky" },
  bat_toa: { vi: "Bát Tọa", en: "Bát Tọa", group: "lucky" },
  an_quang: { vi: "Ân Quang", en: "Ân Quang", group: "lucky" },
  thien_tai: { vi: "Thiên Tài", en: "Thiên Tài", group: "other" },
  thien_tho: { vi: "Thiên Thọ", en: "Thiên Thọ", group: "other" },
  thien_thuong: { vi: "Thiên Thương", en: "Thiên Thương", group: "malefic" },
  thien_su: { vi: "Thiên Sứ", en: "Thiên Sứ", group: "malefic" },
  thien_la: { vi: "Thiên La", en: "Thiên La", group: "other" },
  dia_vong: { vi: "Địa Võng", en: "Địa Võng", group: "other" },
};

export const PALACES = [
  "menh", "phu_mau", "phuc_duc", "dien_trach", "quan_loc", "no_boc",
  "thien_di", "tat_ach", "tai_bach", "tu_tuc", "phu_the", "huynh_de",
] as const;
export type PalaceId = (typeof PALACES)[number];

export const PALACE_INFO: Record<PalaceId, { vi: string; en: string }> = {
  menh: { vi: "Mệnh", en: "Self (Mệnh)" },
  phu_mau: { vi: "Phụ Mẫu", en: "Parents" },
  phuc_duc: { vi: "Phúc Đức", en: "Fortune & Ancestry" },
  dien_trach: { vi: "Điền Trạch", en: "Home & Property" },
  quan_loc: { vi: "Quan Lộc", en: "Career" },
  no_boc: { vi: "Nô Bộc", en: "Friends & Associates" },
  thien_di: { vi: "Thiên Di", en: "Travel & Outside World" },
  tat_ach: { vi: "Tật Ách", en: "Health & Adversity" },
  tai_bach: { vi: "Tài Bạch", en: "Wealth" },
  tu_tuc: { vi: "Tử Tức", en: "Children" },
  phu_the: { vi: "Phu Thê", en: "Spouse & Partnership" },
  huynh_de: { vi: "Huynh Đệ", en: "Siblings" },
};

export const HOA = ["loc", "quyen", "khoa", "ky"] as const;
export type HoaId = (typeof HOA)[number];
export const HOA_INFO: Record<HoaId, { vi: string; en: string }> = {
  loc: { vi: "Hóa Lộc", en: "Hóa Lộc (Prosperity)" },
  quyen: { vi: "Hóa Quyền", en: "Hóa Quyền (Authority)" },
  khoa: { vi: "Hóa Khoa", en: "Hóa Khoa (Reputation)" },
  ky: { vi: "Hóa Kỵ", en: "Hóa Kỵ (Obstruction)" },
};

export const TRANG_SINH = [
  "Tràng Sinh", "Mộc Dục", "Quan Đới", "Lâm Quan", "Đế Vượng", "Suy",
  "Bệnh", "Tử", "Mộ", "Tuyệt", "Thai", "Dưỡng",
] as const;
export const BAC_SI = [
  "Bác Sĩ", "Lực Sĩ", "Thanh Long", "Tiểu Hao", "Tướng Quân", "Tấu Thư",
  "Phi Liêm", "Hỷ Thần", "Bệnh Phù", "Đại Hao", "Phục Binh", "Quan Phủ",
] as const;
export const THAI_TUE = [
  "Thái Tuế", "Thiếu Dương", "Tang Môn", "Thiếu Âm", "Quan Phù", "Tử Phù",
  "Tuế Phá", "Long Đức", "Bạch Hổ", "Phúc Đức", "Điếu Khách", "Trực Phù",
] as const;
