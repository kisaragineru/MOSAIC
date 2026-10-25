/**
 * Everyday names for the chart: each main star as a short kind of person, the four
 * transformations as what they bring, and the year's stem and branch read aloud in Japanese.
 * The traditional names stay alongside (small) so nothing is lost; only the emphasis changes.
 */
import type { HoaId, MainStarId, PalaceId } from "./stars";

type T = { en: string; vi: string; ja: string };

export const STAR_SHORT: Record<MainStarId, T> = {
  tu_vi: { ja: "まとめ役", en: "The leader", vi: "Người dẫn dắt" },
  thien_co: { ja: "作戦参謀", en: "The strategist", vi: "Nhà chiến lược" },
  thai_duong: { ja: "照らす人", en: "The sun", vi: "Mặt trời" },
  vu_khuc: { ja: "実務家", en: "The doer", vi: "Người thực tế" },
  thien_dong: { ja: "のんびり屋", en: "The easygoing", vi: "Người thong dong" },
  liem_trinh: { ja: "こだわり派", en: "The principled", vi: "Người nguyên tắc" },
  thien_phu: { ja: "蓄える人", en: "The keeper", vi: "Người tích lũy" },
  thai_am: { ja: "やさしさ", en: "The gentle moon", vi: "Vầng trăng dịu" },
  tham_lang: { ja: "社交家", en: "The socialite", vi: "Người giao thiệp" },
  cu_mon: { ja: "言葉の人", en: "The voice", vi: "Người của lời nói" },
  thien_tuong: { ja: "調整役", en: "The mediator", vi: "Người dung hòa" },
  thien_luong: { ja: "見守り役", en: "The guardian", vi: "Người che chở" },
  that_sat: { ja: "突破力", en: "The trailblazer", vi: "Người tiên phong" },
  pha_quan: { ja: "改革者", en: "The reformer", vi: "Người đổi mới" },
};

/** The four transformations by what they bring (the traditional name follows in brackets). */
export const HOA_PLAIN: Record<HoaId, T> = {
  loc: { ja: "めぐみ", en: "Blessing", vi: "May mắn" },
  quyen: { ja: "チカラ", en: "Power", vi: "Quyền lực" },
  khoa: { ja: "評判", en: "Renown", vi: "Danh tiếng" },
  ky: { ja: "注意", en: "Caution", vi: "Cẩn trọng" },
};

/** One line on each, for the reader who meets the word for the first time. */
export const HOA_TIP: Record<HoaId, T> = {
  loc: { ja: "めぐみ（Lộc）＝お金や機会、人とのご縁を運んでくる印です。", en: "Blessing (Lộc): a mark that brings money, chances and good people.", vi: "May mắn (Lộc): dấu hiệu mang đến tiền bạc, cơ hội và quý nhân." },
  quyen: { ja: "チカラ（Quyền）＝主導権や実行力が強まる印です。", en: "Power (Quyền): a mark that strengthens drive and influence.", vi: "Quyền lực (Quyền): dấu hiệu tăng sức chủ động và ảnh hưởng." },
  khoa: { ja: "評判（Khoa）＝名声や信用を呼び込む印です。学びや資格、人からの推薦に縁があります。", en: "Renown (Khoa): a mark that draws reputation and trust — study, credentials, recommendations.", vi: "Danh tiếng (Khoa): dấu hiệu thu hút uy tín — học hành, bằng cấp, được tiến cử." },
  ky: { ja: "注意（Kỵ）＝こだわりや行き違いが出やすい印です。ていねいさが味方になります。", en: "Caution (Kỵ): a mark where fixations and misunderstandings show up — care helps.", vi: "Cẩn trọng (Kỵ): dấu hiệu dễ có vướng mắc, hiểu lầm — sự cẩn thận sẽ giúp bạn." },
};

const STEM_KANJI = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const BRANCH_KANJI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const STEM_KANA = ["きのえ", "きのと", "ひのえ", "ひのと", "つちのえ", "つちのと", "かのえ", "かのと", "みずのえ", "みずのと"];
const BRANCH_KANA = ["ね", "うし", "とら", "う", "たつ", "み", "うま", "ひつじ", "さる", "とり", "いぬ", "い"];

/** "丁巳（ひのと・み）" for the year pillar. */
export function pillarJa(stem: number, branch: number) {
  return `${STEM_KANJI[stem]}${BRANCH_KANJI[branch]}（${STEM_KANA[stem]}・${BRANCH_KANA[branch]}）`;
}

/** Area names short enough for a chart cell (the panel uses the fuller ones). */
export const PALACE_CELL: Record<PalaceId, T> = {
  menh: { ja: "自分", en: "Self", vi: "Bản thân" },
  phu_mau: { ja: "親", en: "Parents", vi: "Cha mẹ" },
  phuc_duc: { ja: "心", en: "Inner life", vi: "Phúc đức" },
  dien_trach: { ja: "住まい", en: "Home", vi: "Nhà cửa" },
  quan_loc: { ja: "仕事", en: "Work", vi: "Công việc" },
  no_boc: { ja: "仲間", en: "Friends", vi: "Bạn bè" },
  thien_di: { ja: "外の世界", en: "Outside", vi: "Bên ngoài" },
  tat_ach: { ja: "健康", en: "Health", vi: "Sức khỏe" },
  tai_bach: { ja: "お金", en: "Money", vi: "Tiền bạc" },
  tu_tuc: { ja: "子ども", en: "Children", vi: "Con cái" },
  phu_the: { ja: "パートナー", en: "Partner", vi: "Bạn đời" },
  huynh_de: { ja: "きょうだい", en: "Siblings", vi: "Anh em" },
};
