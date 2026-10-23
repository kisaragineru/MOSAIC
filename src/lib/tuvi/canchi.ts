/** Heavenly stems (Thiên Can), earthly branches (Địa Chi), five elements and Nạp Âm. */

export const STEMS = ["Giáp", "Ất", "Bính", "Đinh", "Mậu", "Kỷ", "Canh", "Tân", "Nhâm", "Quý"] as const;
export const BRANCHES = ["Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi"] as const;
export const BRANCH_ANIMALS_EN = [
  "Rat", "Ox", "Tiger", "Cat", "Dragon", "Snake", "Horse", "Goat", "Monkey", "Rooster", "Dog", "Pig",
] as const;

export type Element = "kim" | "thuy" | "moc" | "hoa" | "tho";
export const ELEMENT_NAMES: Record<Element, { vi: string; en: string; ja: string }> = {
  kim: { ja: "金", vi: "Kim", en: "Metal" },
  thuy: { ja: "水", vi: "Thủy", en: "Water" },
  moc: { ja: "木", vi: "Mộc", en: "Wood" },
  hoa: { ja: "火", vi: "Hỏa", en: "Fire" },
  tho: { ja: "土", vi: "Thổ", en: "Earth" },
};

export const mod = (n: number, m: number) => ((n % m) + m) % m;

export function yearStem(lunarYear: number): number {
  return mod(lunarYear + 6, 10);
}
export function yearBranch(lunarYear: number): number {
  return mod(lunarYear + 8, 12);
}
/** Day pillar from Julian day number. */
export function dayStem(jd: number): number {
  return mod(jd + 9, 10);
}
export function dayBranch(jd: number): number {
  return mod(jd + 1, 12);
}
/** Yang stems: Giáp, Bính, Mậu, Canh, Nhâm. */
export function isYangStem(stem: number): boolean {
  return stem % 2 === 0;
}

/**
 * Hour branch from local clock time. Tý = 23:00–00:59, Sửu = 01:00–02:59, ...
 * (The 23:00–23:59 "late Tý" day-assignment question is handled by the engine.)
 */
export function hourBranch(hour: number): number {
  return mod(Math.floor((hour + 1) / 2), 12);
}

const NAP_AM_ELEMENT_CYCLE: Element[] = ["kim", "thuy", "hoa", "tho", "moc"];

/** Nạp Âm element of a stem-branch pair (closed-form; verified against the 30-name table in tests). */
export function napAmElement(stem: number, branch: number): Element {
  const s = Math.floor(stem / 2);
  const b = Math.floor((branch % 6) / 2);
  return NAP_AM_ELEMENT_CYCLE[(s + b) % 5]!;
}

/** The 30 Nạp Âm names in sexagenary order (each covers two consecutive pairs). */
export const NAP_AM_NAMES = [
  "Hải Trung Kim", "Lư Trung Hỏa", "Đại Lâm Mộc", "Lộ Bàng Thổ", "Kiếm Phong Kim",
  "Sơn Đầu Hỏa", "Giản Hạ Thủy", "Thành Đầu Thổ", "Bạch Lạp Kim", "Dương Liễu Mộc",
  "Tuyền Trung Thủy", "Ốc Thượng Thổ", "Tích Lịch Hỏa", "Tùng Bách Mộc", "Trường Lưu Thủy",
  "Sa Trung Kim", "Sơn Hạ Hỏa", "Bình Địa Mộc", "Bích Thượng Thổ", "Kim Bạch Kim",
  "Phú Đăng Hỏa", "Thiên Hà Thủy", "Đại Trạch Thổ", "Thoa Xuyến Kim", "Tang Đố Mộc",
  "Đại Khê Thủy", "Sa Trung Thổ", "Thiên Thượng Hỏa", "Thạch Lựu Mộc", "Đại Hải Thủy",
] as const;

/** Index 0..59 in the sexagenary cycle (Giáp Tý = 0). Requires same parity of stem and branch. */
export function sexagenaryIndex(stem: number, branch: number): number {
  if (stem % 2 !== branch % 2) throw new Error("invalid stem-branch pair");
  for (let i = 0; i < 60; i++) if (i % 10 === stem && i % 12 === branch) return i;
  throw new Error("unreachable");
}

export function napAmName(stem: number, branch: number): string {
  return NAP_AM_NAMES[Math.floor(sexagenaryIndex(stem, branch) / 2)]!;
}

/** Element generation (tương sinh): Mộc→Hỏa→Thổ→Kim→Thủy→Mộc. */
const GENERATES: Record<Element, Element> = { moc: "hoa", hoa: "tho", tho: "kim", kim: "thuy", thuy: "moc" };
/** Element control (tương khắc): Mộc→Thổ→Thủy→Hỏa→Kim→Mộc. */
const CONTROLS: Record<Element, Element> = { moc: "tho", tho: "thuy", thuy: "hoa", hoa: "kim", kim: "moc" };

export type ElementRelation = "same" | "a_generates_b" | "b_generates_a" | "a_controls_b" | "b_controls_a";

export function elementRelation(a: Element, b: Element): ElementRelation {
  if (a === b) return "same";
  if (GENERATES[a] === b) return "a_generates_b";
  if (GENERATES[b] === a) return "b_generates_a";
  if (CONTROLS[a] === b) return "a_controls_b";
  return "b_controls_a";
}

export function stemBranchName(stem: number, branch: number): string {
  return `${STEMS[stem]} ${BRANCHES[branch]}`;
}
