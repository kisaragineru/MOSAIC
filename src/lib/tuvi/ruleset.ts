/**
 * Tử Vi Đẩu Số ruleset used by the MOSAIC engine.
 *
 * Every table here is DATA, versioned by `id`. The engine code (engine.ts) is versioned
 * separately by ENGINE_VERSION. A stored chart records both, so a chart can always be
 * reproduced exactly and never silently changes when rules are revised.
 *
 * Branch indices: Tý=0, Sửu=1, Dần=2, Mão=3, Thìn=4, Tỵ=5, Ngọ=6, Mùi=7, Thân=8, Dậu=9, Tuất=10, Hợi=11.
 * Stem indices:   Giáp=0, Ất=1, Bính=2, Đinh=3, Mậu=4, Kỷ=5, Canh=6, Tân=7, Nhâm=8, Quý=9.
 *
 * Verification status of each rule group is documented in docs/TUVI_RULESET.md and enforced
 * by tests/unit/tuvi-*.test.ts (differential tests against the MIT-licensed `iztro` library
 * where both traditions agree, and hand-derived traditional tables where they do not).
 */
import type { StarId } from "./stars";

export const ENGINE_VERSION = "1.1.0";

export interface Ruleset {
  id: string;
  name: string;
  description: string;
  /** UTC offset (hours) of the meridian used for lunar calendar conversion. */
  calendarTimeZone: number;
  /** Lộc Tồn position by year stem. */
  locTon: number[];
  /** [Thiên Khôi, Thiên Việt] by year stem. */
  khoiViet: [number, number][];
  /** Tứ Hóa by year stem: [Hóa Lộc, Hóa Quyền, Hóa Khoa, Hóa Kỵ]. */
  tuHoa: [StarId, StarId, StarId, StarId][];
  /** Triệt Lộ Không Vong by year stem (pair of branches). */
  triet: [number, number][];
  /** Hỏa Tinh / Linh Tinh start by year-branch triad, plus direction mode. */
  hoaLinh: {
    start: Record<"dan_ngo_tuat" | "than_ty_thin" | "ty_dau_suu" | "hoi_mao_mui", [number, number]>;
    /** 'vn_yin_yang': Dương Nam/Âm Nữ → Hỏa forward, Linh backward; reverse otherwise. */
    direction: "vn_yin_yang";
  };
  /** Fixed palace for Thiên Thương / Thiên Sứ. */
  thuongSu: "vn_fixed_no_boc_tat_ach";
}

const B = { ty: 0, suu: 1, dan: 2, mao: 3, thin: 4, ti: 5, ngo: 6, mui: 7, than: 8, dau: 9, tuat: 10, hoi: 11 } as const;

export const RULESET_VN_2026_1: Ruleset = {
  id: "vn-ttl-2026.1",
  name: "Vietnamese Tử Vi Đẩu Số (Thái Thứ Lang tradition) — MOSAIC 2026.1",
  description:
    "Vietnamese lunar calendar (UTC+7, Hồ Ngọc Đức algorithm). 12 palaces, Mệnh/Thân, Ngũ Hành Cục, 14 main stars, " +
    "selected auxiliary stars, Tứ Hóa (Vietnamese table: Nhâm year Hóa Khoa = Thiên Phủ), Tuần/Triệt, " +
    "Tràng Sinh / Bác Sĩ / Thái Tuế rings, Đại Hạn. Star brightness (miếu/vượng/đắc/hãm) is NOT computed in this version.",
  calendarTimeZone: 7,
  // Giáp Dần, Ất Mão, Bính Tỵ, Đinh Ngọ, Mậu Tỵ, Kỷ Ngọ, Canh Thân, Tân Dậu, Nhâm Hợi, Quý Tý
  locTon: [B.dan, B.mao, B.ti, B.ngo, B.ti, B.ngo, B.than, B.dau, B.hoi, B.ty],
  // "Giáp Mậu Canh ngưu dương, Ất Kỷ thử hầu hương, Bính Đinh trư kê vị, Nhâm Quý thố xà tàng, Lục Tân phùng mã hổ"
  khoiViet: [
    [B.suu, B.mui], // Giáp
    [B.ty, B.than], // Ất
    [B.hoi, B.dau], // Bính
    [B.hoi, B.dau], // Đinh
    [B.suu, B.mui], // Mậu
    [B.ty, B.than], // Kỷ
    [B.suu, B.mui], // Canh
    [B.ngo, B.dan], // Tân
    [B.mao, B.ti], // Nhâm
    [B.mao, B.ti], // Quý
  ],
  // Giáp Liêm Phá Vũ Dương · Ất Cơ Lương Tử Nguyệt · Bính Đồng Cơ Xương Liêm · Đinh Nguyệt Đồng Cơ Cự ·
  // Mậu Tham Nguyệt Bật Cơ · Kỷ Vũ Tham Lương Khúc · Canh Nhật Vũ Âm Đồng · Tân Cự Nhật Khúc Xương ·
  // Nhâm Lương Tử Phủ Vũ · Quý Phá Cự Âm Tham
  tuHoa: [
    ["liem_trinh", "pha_quan", "vu_khuc", "thai_duong"],
    ["thien_co", "thien_luong", "tu_vi", "thai_am"],
    ["thien_dong", "thien_co", "van_xuong", "liem_trinh"],
    ["thai_am", "thien_dong", "thien_co", "cu_mon"],
    ["tham_lang", "thai_am", "huu_bat", "thien_co"],
    ["vu_khuc", "tham_lang", "thien_luong", "van_khuc"],
    ["thai_duong", "vu_khuc", "thai_am", "thien_dong"],
    ["cu_mon", "thai_duong", "van_khuc", "van_xuong"],
    ["thien_luong", "tu_vi", "thien_phu", "vu_khuc"],
    ["pha_quan", "cu_mon", "thai_am", "tham_lang"],
  ],
  // Giáp/Kỷ Thân-Dậu, Ất/Canh Ngọ-Mùi, Bính/Tân Thìn-Tỵ, Đinh/Nhâm Dần-Mão, Mậu/Quý Tý-Sửu
  triet: [
    [B.than, B.dau], [B.ngo, B.mui], [B.thin, B.ti], [B.dan, B.mao], [B.ty, B.suu],
    [B.than, B.dau], [B.ngo, B.mui], [B.thin, B.ti], [B.dan, B.mao], [B.ty, B.suu],
  ],
  hoaLinh: {
    // "Dần Ngọ Tuất nhân Sửu Mão phương, Thân Tý Thìn nhân Dần Tuất dương,
    //  Tỵ Dậu Sửu nhân Mão Tuất vị, Hợi Mão Mùi nhân Dậu Tuất phòng"
    start: {
      dan_ngo_tuat: [B.suu, B.mao],
      than_ty_thin: [B.dan, B.tuat],
      ty_dau_suu: [B.mao, B.tuat],
      hoi_mao_mui: [B.dau, B.tuat],
    },
    direction: "vn_yin_yang",
  },
  thuongSu: "vn_fixed_no_boc_tat_ach",
};

export const RULESETS = [RULESET_VN_2026_1].map((r) => ({
  id: r.id,
  name: r.name,
  description: r.description,
  rules: { engineVersion: ENGINE_VERSION, ...r } as Record<string, unknown>,
}));

export const DEFAULT_RULESET = RULESET_VN_2026_1;

export function getRuleset(id: string): Ruleset {
  if (id === RULESET_VN_2026_1.id) return RULESET_VN_2026_1;
  throw new Error(`unknown ruleset ${id}`);
}
