import { describe, expect, it } from "vitest";
import {
  BRANCHES,
  elementRelation,
  hourBranch,
  NAP_AM_NAMES,
  napAmElement,
  napAmName,
  yearBranch,
  yearStem,
} from "@/lib/tuvi/canchi";
import { canonicalJson, computeChart, currentDaiHan, palaceStem, tuViPosition, type BirthInput } from "@/lib/tuvi/engine";

const base: BirthInput = {
  calendar: "solar",
  solar: { year: 1990, month: 6, day: 7 },
  time: { hour: 6, minute: 30 },
  timeZone: "Asia/Ho_Chi_Minh",
  sex: "male",
  lateRatHour: null,
  leapMonthRule: null,
};

function chart(over: Partial<BirthInput> = {}) {
  const r = computeChart({ ...base, ...over });
  if (!r.ok) throw new Error(JSON.stringify(r));
  return r.chart;
}
const where = (c: ReturnType<typeof chart>, id: string) =>
  c.palaces.find((p) => [...p.mainStars, ...p.auxStars].some((s) => s.id === id))?.branch;

describe("can chi & nạp âm", () => {
  it("year pillars", () => {
    expect([yearStem(1984), yearBranch(1984)]).toEqual([0, 0]); // Giáp Tý
    expect([yearStem(1990), yearBranch(1990)]).toEqual([6, 6]); // Canh Ngọ
    expect([yearStem(2026), yearBranch(2026)]).toEqual([2, 6]); // Bính Ngọ
  });

  it("closed-form nạp âm element agrees with all 30 traditional names", () => {
    const suffix: Record<string, string> = { Kim: "kim", Thủy: "thuy", Mộc: "moc", Hỏa: "hoa", Thổ: "tho" };
    for (let i = 0; i < 60; i++) {
      const name = napAmName(i % 10, i % 12);
      expect(name).toBe(NAP_AM_NAMES[Math.floor(i / 2)]);
      expect(napAmElement(i % 10, i % 12)).toBe(suffix[name.split(" ").at(-1)!]);
    }
  });

  it("hour branches incl. boundaries", () => {
    expect(hourBranch(23)).toBe(0);
    expect(hourBranch(0)).toBe(0);
    expect(hourBranch(1)).toBe(1);
    expect(hourBranch(2)).toBe(1);
    expect(hourBranch(3)).toBe(2);
    expect(hourBranch(22)).toBe(11);
  });

  it("element relations", () => {
    expect(elementRelation("moc", "hoa")).toBe("a_generates_b");
    expect(elementRelation("kim", "moc")).toBe("a_controls_b");
    expect(elementRelation("thuy", "kim")).toBe("b_generates_a");
    expect(elementRelation("tho", "tho")).toBe("same");
  });

  it("Ngũ Hổ Độn palace stems", () => {
    expect(palaceStem(0, 2)).toBe(2); // Giáp year → Bính Dần
    expect(palaceStem(4, 2)).toBe(0); // Mậu year → Giáp Dần
    expect(palaceStem(0, 11)).toBe(1); // ... Ất Hợi
    expect(palaceStem(0, 0)).toBe(2); // Tý/Sửu continue after Hợi: Bính Tý, Đinh Sửu
    expect(palaceStem(0, 1)).toBe(3);
  });

  it("Tử Vi placement samples from the traditional table", () => {
    expect(BRANCHES[tuViPosition(2, 1)]).toBe("Sửu");
    expect(BRANCHES[tuViPosition(2, 2)]).toBe("Dần");
    expect(BRANCHES[tuViPosition(3, 1)]).toBe("Thìn");
    expect(BRANCHES[tuViPosition(6, 1)]).toBe("Dậu");
    expect(BRANCHES[tuViPosition(5, 1)]).toBe("Ngọ");
    expect(BRANCHES[tuViPosition(4, 1)]).toBe("Hợi");
  });
});

describe("hand-derived reference chart: solar 1990-06-07 06:30, male, Ho Chi Minh City", () => {
  /*
   * Derivation by the traditional rules (independent of the engine code):
   *  - 1990-06-07 → lunar 15/5 Canh Ngọ (Vietnamese calendar). 06:30 → giờ Mão (h=3).
   *  - Mệnh: Dần + (5-1) − 3 = Mão. Thân: Dần + 4 + 3 = Dậu.
   *  - Canh year → Mậu Dần, so Mão palace = Kỷ Mão → nạp âm Thành Đầu Thổ → Thổ ngũ cục (5).
   *  - Tử Vi: day 15, cục 5 → q=3, r=0 → Dần + 2 = Thìn.  Thiên Phủ = (4 − 4) = Tý.
   *  - Canh: Lộc Tồn Thân, Kình Dương Dậu, Đà La Mùi; Khôi Sửu, Việt Mùi.
   *  - Tứ Hóa Canh: Thái Dương Lộc, Vũ Khúc Quyền, Thái Âm Khoa, Thiên Đồng Kỵ.
   *  - Canh Ngọ is Dương Nam → forward. Hỏa/Linh (Dần Ngọ Tuất): Hỏa Sửu+3 = Thìn, Linh Mão−3 = Tý.
   *  - Đại Hạn: Mệnh (Mão) 5–14, Thìn 15–24, ...
   */
  const c = chart();

  it("calendar and pillars", () => {
    expect(c.lunar).toEqual({ year: 1990, month: 5, day: 15, leap: false });
    expect(c.yearPillar.name).toBe("Canh Ngọ");
    expect(c.hourBranch).toBe(3);
    expect(c.napAm).toEqual({ name: "Lộ Bàng Thổ", element: "tho" });
  });

  it("Mệnh, Thân, Cục", () => {
    expect(BRANCHES[c.menh!]).toBe("Mão");
    expect(BRANCHES[c.than!]).toBe("Dậu");
    expect(c.cuc).toEqual({ element: "tho", number: 5 });
    expect(c.palaces[3]!.palace).toBe("menh");
    expect(c.palaces[9]!.isThan).toBe(true);
    expect(c.palaces[9]!.palace).toBe("thien_di");
  });

  it("main stars", () => {
    expect(BRANCHES[where(c, "tu_vi")!]).toBe("Thìn");
    expect(BRANCHES[where(c, "thien_phu")!]).toBe("Tý");
    expect(BRANCHES[where(c, "that_sat")!]).toBe("Ngọ");
    expect(BRANCHES[where(c, "pha_quan")!]).toBe("Tuất");
  });

  it("Vietnamese-specific: Hỏa forward / Linh backward for Dương Nam", () => {
    expect(BRANCHES[where(c, "hoa_tinh")!]).toBe("Thìn");
    expect(BRANCHES[where(c, "linh_tinh")!]).toBe("Tý");
  });

  it("Vietnamese-specific: Hỏa backward / Linh forward for Âm Nam (Tân Mùi 1991)", () => {
    // 1991-07-01 → Tân Mùi (Âm), triad Hợi Mão Mùi: Hỏa start Dậu, Linh start Tuất. 06:30 → Mão (3).
    const c2 = chart({ solar: { year: 1991, month: 7, day: 1 } });
    expect(c2.yinYangSex).toBe("am_nam");
    expect(BRANCHES[where(c2, "hoa_tinh")!]).toBe("Ngọ"); // Dậu − 3
    expect(BRANCHES[where(c2, "linh_tinh")!]).toBe("Sửu"); // Tuất + 3
  });

  it("Vietnamese fixed Thiên Thương (Nô Bộc) / Thiên Sứ (Tật Ách), Giải Thần with Phượng Các, Thiên Y with Thiên Riêu", () => {
    const noBoc = c.palaces.find((p) => p.palace === "no_boc")!.branch;
    const tatAch = c.palaces.find((p) => p.palace === "tat_ach")!.branch;
    expect(where(c, "thien_thuong")).toBe(noBoc);
    expect(where(c, "thien_su")).toBe(tatAch);
    expect(where(c, "giai_than")).toBe(where(c, "phuong_cac"));
    expect(where(c, "thien_y")).toBe(where(c, "thien_rieu"));
    // Kiếp Sát for Dần Ngọ Tuất years is at Hợi.
    expect(BRANCHES[where(c, "kiep_sat")!]).toBe("Hợi");
  });

  it("Tứ Hóa (Canh)", () => {
    expect(c.hoaTargets).toEqual({ loc: "thai_duong", quyen: "vu_khuc", khoa: "thai_am", ky: "thien_dong" });
    const sun = c.palaces.flatMap((p) => p.mainStars).find((s) => s.id === "thai_duong");
    expect(sun?.hoa).toBe("loc");
  });

  it("Nhâm-year Hóa Khoa is Thiên Phủ in the Vietnamese ruleset", () => {
    const c3 = chart({ solar: { year: 1992, month: 6, day: 1 } }); // Nhâm Thân
    expect(c3.yearPillar.name).toBe("Nhâm Thân");
    expect(c3.hoaTargets.khoa).toBe("thien_phu");
  });

  it("Tuần / Triệt for Canh Ngọ", () => {
    // Canh Ngọ is in the Giáp Tý decade → void Tuất, Hợi. Canh → Triệt at Ngọ, Mùi.
    expect(c.tuan.map((b) => BRANCHES[b])).toEqual(["Tuất", "Hợi"]);
    expect(c.triet.map((b) => BRANCHES[b])).toEqual(["Ngọ", "Mùi"]);
  });

  it("Đại Hạn", () => {
    expect(c.palaces[3]!.daiHan).toEqual({ from: 5, to: 14 });
    expect(c.palaces[4]!.daiHan).toEqual({ from: 15, to: 24 });
    expect(currentDaiHan(c, 37)!.branch).toBe(6); // 35–44 at Ngọ
  });
});

describe("explicit decisions instead of guesses", () => {
  it("23:00–23:59 requires the late-Tý convention to be chosen", () => {
    const r = computeChart({ ...base, time: { hour: 23, minute: 20 } });
    expect(r).toEqual({ ok: false, needs: ["late_rat_hour"] });
    const same = chart({ time: { hour: 23, minute: 20 }, lateRatHour: "same_day" });
    const next = chart({ time: { hour: 23, minute: 20 }, lateRatHour: "next_day" });
    expect(same.lunar.day).toBe(15);
    expect(next.lunar.day).toBe(16);
    expect(same.hourBranch).toBe(0);
    expect(next.hourBranch).toBe(0);
  });

  it("a late-Tý birth on the last day of a lunar year moves to the next year only with 'next_day'", () => {
    // 2024-02-09 is the last day of Quý Mão; Tết Giáp Thìn is 2024-02-10.
    const input = { solar: { year: 2024, month: 2, day: 9 }, time: { hour: 23, minute: 30 } };
    expect(chart({ ...input, lateRatHour: "same_day" }).yearPillar.name).toBe("Quý Mão");
    expect(chart({ ...input, lateRatHour: "next_day" }).yearPillar.name).toBe("Giáp Thìn");
  });

  it("leap-month births require a leap-month rule", () => {
    const r = computeChart({ ...base, solar: { year: 2023, month: 4, day: 1 } }); // leap 2/11 Quý Mão
    expect(r).toEqual({ ok: false, needs: ["leap_month_rule"] });
    expect(chart({ solar: { year: 2023, month: 4, day: 1 }, leapMonthRule: "same_month" }).effectiveMonth).toBe(2);
    expect(chart({ solar: { year: 2023, month: 4, day: 1 }, leapMonthRule: "next_month" }).effectiveMonth).toBe(3);
    expect(chart({ solar: { year: 2023, month: 4, day: 1 }, leapMonthRule: "split_15" }).effectiveMonth).toBe(2);
    expect(chart({ solar: { year: 2023, month: 4, day: 10 }, leapMonthRule: "split_15" }).effectiveMonth).toBe(3);
  });

  it("lunar input with a non-existent date is rejected", () => {
    expect(computeChart({ ...base, calendar: "lunar", lunar: { year: 2024, month: 3, day: 1, leap: true } })).toEqual({
      ok: false,
      error: "invalid_date",
    });
    expect(computeChart({ ...base, solar: { year: 2023, month: 2, day: 29 } })).toEqual({ ok: false, error: "invalid_date" });
  });

  it("unknown birth time produces a partial chart without palaces or main stars", () => {
    const c = chart({ time: null });
    expect(c.menh).toBeNull();
    expect(c.cuc).toBeNull();
    expect(c.palaces.every((p) => p.palace === null && p.mainStars.length === 0 && p.daiHan === null)).toBe(true);
    expect(c.warnings.map((w) => w.code)).toContain("hour_unknown");
    expect(c.notComputed).toContain("main_stars");
    // Year-based stars are still placed.
    expect(BRANCHES[where(c, "loc_ton")!]).toBe("Thân");
  });

  it("unspecified sex omits direction-dependent elements instead of assuming", () => {
    const c = chart({ sex: "unspecified" });
    expect(c.direction).toBeNull();
    expect(c.palaces.every((p) => p.daiHan === null && p.trangSinh === null && p.bacSi === null)).toBe(true);
    expect(where(c, "hoa_tinh")).toBeUndefined();
    expect(c.menh).not.toBeNull();
  });
});

describe("warnings", () => {
  it("flags births near an hour-branch boundary", () => {
    expect(chart({ time: { hour: 7, minute: 5 } }).warnings.map((w) => w.code)).toContain("near_hour_boundary");
    expect(chart({ time: { hour: 6, minute: 55 } }).warnings.map((w) => w.code)).toContain("near_hour_boundary");
    expect(chart({ time: { hour: 6, minute: 30 } }).warnings.map((w) => w.code)).not.toContain("near_hour_boundary");
  });

  it("flags daylight saving time at the birthplace", () => {
    const c = chart({ timeZone: "America/New_York", solar: { year: 1991, month: 7, day: 1 }, time: { hour: 7, minute: 30 } });
    const w = c.warnings.find((x) => x.code === "dst_in_effect");
    expect(w?.detail).toMatchObject({ clockHourBranch: 4, standardTimeHourBranch: 3 });
    expect(chart({ timeZone: "Asia/Tokyo" }).warnings.map((x) => x.code)).not.toContain("dst_in_effect");
  });

  it("flags dates where Vietnamese and Chinese calendars disagree", () => {
    const c = chart({ solar: { year: 1985, month: 2, day: 1 } });
    expect(c.warnings.map((w) => w.code)).toContain("calendar_tz_divergence");
    expect(c.yearPillar.name).toBe("Ất Sửu"); // Vietnam: already Ất Sửu (Tết 1985-01-21)
  });
});

describe("reproducibility", () => {
  it("same input → byte-identical chart", () => {
    const a = canonicalJson(chart());
    for (let i = 0; i < 5; i++) expect(canonicalJson(chart())).toBe(a);
  });

  it("lunar and equivalent solar inputs produce the same chart", () => {
    const fromLunar = chart({ calendar: "lunar", lunar: { year: 1990, month: 5, day: 15, leap: false }, solar: undefined });
    expect(canonicalJson(fromLunar)).toBe(canonicalJson(chart()));
  });

  it("canonical JSON is key-order independent", () => {
    expect(canonicalJson({ b: 1, a: [2, { d: 1, c: 2 }] })).toBe(canonicalJson({ a: [2, { c: 2, d: 1 }], b: 1 }));
  });
});
