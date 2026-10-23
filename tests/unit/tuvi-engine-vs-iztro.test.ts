/**
 * Differential test: MOSAIC engine vs. the independent MIT-licensed `iztro` library.
 *
 * iztro implements the Chinese 紫微斗数 "通行" placement. Where the Vietnamese tradition
 * (our ruleset) agrees, positions must be identical. Where it documentedly differs we
 * configure iztro to the Vietnamese variant (Nhâm Hóa Khoa) or only compare the part that
 * agrees (Hỏa/Linh, Thiên Thương/Thiên Sứ, Tuần placement), and the differing part is
 * covered by hand-derived tests in tuvi-engine.test.ts.
 */
import { astro } from "iztro";
import { describe, expect, it } from "vitest";
import { BRANCHES, mod, STEMS } from "@/lib/tuvi/canchi";
import { computeChart, type Chart, type LeapMonthRule } from "@/lib/tuvi/engine";
import { BAC_SI, PALACES, THAI_TUE, TRANG_SINH, type StarId } from "@/lib/tuvi/stars";

const ZH_BRANCH = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const ZH_STEM = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const ZH_STAR: Record<string, StarId> = {
  紫微: "tu_vi", 天机: "thien_co", 太阳: "thai_duong", 武曲: "vu_khuc", 天同: "thien_dong", 廉贞: "liem_trinh",
  天府: "thien_phu", 太阴: "thai_am", 贪狼: "tham_lang", 巨门: "cu_mon", 天相: "thien_tuong", 天梁: "thien_luong",
  七杀: "that_sat", 破军: "pha_quan",
  左辅: "ta_phu", 右弼: "huu_bat", 文昌: "van_xuong", 文曲: "van_khuc", 禄存: "loc_ton", 擎羊: "kinh_duong",
  陀罗: "da_la", 天魁: "thien_khoi", 天钺: "thien_viet", 天马: "thien_ma", 地空: "dia_khong", 地劫: "dia_kiep",
  天哭: "thien_khoc", 天虚: "thien_hu", 龙池: "long_tri", 凤阁: "phuong_cac", 红鸾: "hong_loan", 天喜: "thien_hy",
  天刑: "thien_hinh", 天姚: "thien_rieu", 孤辰: "co_than", 寡宿: "qua_tu", 咸池: "dao_hoa", 华盖: "hoa_cai",
  三台: "tam_thai", 八座: "bat_toa", 恩光: "an_quang", 天才: "thien_tai", 天寿: "thien_tho",
};
const ZH_PALACE = ["命宫", "父母", "福德", "田宅", "官禄", "仆役", "迁移", "疾厄", "财帛", "子女", "夫妻", "兄弟"];
const ZH_CHANGSHENG = ["长生", "沐浴", "冠带", "临官", "帝旺", "衰", "病", "死", "墓", "绝", "胎", "养"];
const ZH_BOSHI = ["博士", "力士", "青龙", "小耗", "将军", "奏书", "飞廉", "喜神", "病符", "大耗", "伏兵", "官府"];
const ZH_SUIQIAN = ["岁建", "晦气", "丧门", "贯索", "官符", "小耗", "大耗", "龙德", "白虎", "天德", "吊客", "病符"];
const ZH_HOA: Record<string, string> = { 禄: "loc", 权: "quyen", 科: "khoa", 忌: "ky" };
const CUC: Record<string, number> = { 水二局: 2, 木三局: 3, 金四局: 4, 土五局: 5, 火六局: 6 };

// Vietnamese Tứ Hóa: identical to iztro's default except Nhâm (壬) Hóa Khoa = Thiên Phủ.
const VN_MUTAGENS = { 壬: ["天梁", "紫微", "天府", "武曲"] } as never;

/** Deterministic PRNG so the sample is reproducible. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function ours(y: number, m: number, d: number, h: number, sex: "male" | "female", leap = false, rule: LeapMonthRule | null = null): Chart {
  const r = computeChart({
    calendar: "lunar",
    lunar: { year: y, month: m, day: d, leap },
    time: { hour: h === 0 ? 0 : h * 2, minute: 30 },
    timeZone: "Asia/Ho_Chi_Minh",
    sex,
    lateRatHour: null,
    leapMonthRule: rule,
  });
  if (!r.ok) throw new Error(`engine refused: ${JSON.stringify(r)}`);
  return r.chart;
}

function theirs(y: number, m: number, d: number, h: number, sex: "male" | "female", leap = false, fixLeap = false) {
  return astro.withOptions({
    type: "lunar",
    dateStr: `${y}-${m}-${d}`,
    timeIndex: h,
    gender: sex === "male" ? "男" : "女",
    isLeapMonth: leap,
    fixLeap,
    language: "zh-CN",
    config: { mutagens: VN_MUTAGENS },
  });
}

function compare(c: Chart, a: ReturnType<typeof theirs>) {
  expect(BRANCHES[c.menh!]).toBe(BRANCHES[ZH_BRANCH.indexOf(a.earthlyBranchOfSoulPalace)]);
  expect(BRANCHES[c.than!]).toBe(BRANCHES[ZH_BRANCH.indexOf(a.earthlyBranchOfBodyPalace)]);
  expect(c.cuc!.number).toBe(CUC[a.fiveElementsClass]);
  for (const p of a.palaces) {
    const b = ZH_BRANCH.indexOf(p.earthlyBranch);
    const mine = c.palaces[b]!;
    const where = `${BRANCHES[b]}`;
    expect(STEMS[mine.stem!], where).toBe(STEMS[ZH_STEM.indexOf(p.heavenlyStem)]);
    expect(mine.palace, where).toBe(PALACES[ZH_PALACE.indexOf(p.name)]);
    const expectStars = [...p.majorStars, ...p.minorStars, ...p.adjectiveStars]
      .filter((s) => ZH_STAR[s.name])
      .map((s) => `${ZH_STAR[s.name]}${s.mutagen ? `:${ZH_HOA[s.mutagen]}` : ""}`)
      .sort();
    const comparable = new Set(Object.values(ZH_STAR));
    const myStars = [...mine.mainStars, ...mine.auxStars]
      .filter((s) => comparable.has(s.id))
      .map((s) => `${s.id}${s.hoa ? `:${s.hoa}` : ""}`)
      .sort();
    expect(myStars, where).toEqual(expectStars);
    expect(mine.trangSinh, where).toBe(TRANG_SINH[ZH_CHANGSHENG.indexOf(p.changsheng12)]);
    expect(mine.bacSi, where).toBe(BAC_SI[ZH_BOSHI.indexOf(p.boshi12)]);
    expect(mine.thaiTue, where).toBe(THAI_TUE[ZH_SUIQIAN.indexOf(p.suiqian12)]);
    expect(mine.daiHan, where).toEqual({ from: p.decadal.range[0], to: p.decadal.range[1] });
  }
}

describe("engine vs iztro (independent implementation)", () => {
  it("agrees on palaces, Cục, 14 main stars, 30 auxiliary stars, Tứ Hóa, rings and Đại Hạn for 600 random births", () => {
    const rand = rng(20261023);
    for (let i = 0; i < 600; i++) {
      const y = 1920 + Math.floor(rand() * 180);
      const m = 1 + Math.floor(rand() * 12);
      const d = 1 + Math.floor(rand() * 29);
      const h = Math.floor(rand() * 12);
      const sex = rand() < 0.5 ? "male" : "female";
      compare(ours(y, m, d, h, sex), theirs(y, m, d, h, sex));
    }
  }, 120_000);

  it("covers every Cục × every lunar day 1–30 × every hour (Tử Vi placement table)", () => {
    // Fix a year/month and walk all days and hours; Cục varies with hour (Mệnh stem-branch).
    const seen = new Set<number>();
    for (const [y, m] of [[1990, 5], [2001, 8]] as const) {
      for (let d = 1; d <= 29; d++) {
        for (let h = 0; h < 12; h++) {
          const c = ours(y, m, d, h, "female");
          seen.add(c.cuc!.number);
          compare(c, theirs(y, m, d, h, "female"));
        }
      }
    }
    expect([...seen].sort()).toEqual([2, 3, 4, 5, 6]);
  }, 180_000);

  it("leap-month 'split_15' rule matches iztro fixLeap, 'same_month' matches fixLeap=false", () => {
    // 2023 has leap month 2 in both the Vietnamese and Chinese calendars.
    for (const d of [3, 15, 16, 28]) {
      for (const h of [0, 5, 11]) {
        compare(ours(2023, 2, d, h, "male", true, "split_15"), theirs(2023, 2, d, h, "male", true, true));
        compare(ours(2023, 2, d, h, "male", true, "same_month"), theirs(2023, 2, d, h, "male", true, false));
      }
    }
  });

  it("Hỏa Tinh agrees for Dương Nam / Âm Nữ (forward); Triệt agrees for every stem", () => {
    const rand = rng(7);
    for (let i = 0; i < 200; i++) {
      const y = 1930 + Math.floor(rand() * 150);
      const m = 1 + Math.floor(rand() * 12);
      const d = 1 + Math.floor(rand() * 29);
      const h = Math.floor(rand() * 12);
      const sex = rand() < 0.5 ? "male" : "female";
      const c = ours(y, m, d, h, sex);
      const a = theirs(y, m, d, h, sex);
      const find = (name: string) =>
        a.palaces.filter((p) => [...p.minorStars, ...p.adjectiveStars].some((s) => s.name === name)).map((p) => ZH_BRANCH.indexOf(p.earthlyBranch));
      if (c.direction === 1) {
        const hoa = c.palaces.find((p) => p.auxStars.some((s) => s.id === "hoa_tinh"))!.branch;
        expect(hoa).toBe(find("火星")[0]);
      }
      const trietRef = [...find("截路"), ...find("空亡")].sort((x, z) => x - z);
      expect(trietRef).toEqual([...c.triet].sort((x, z) => x - z));
      // iztro marks one branch of the void pair as 旬空; it must be one of ours.
      expect(c.tuan).toContain(find("旬空")[0]);
      expect(mod(c.tuan[1] - c.tuan[0], 12)).toBe(1);
    }
  }, 120_000);
});
