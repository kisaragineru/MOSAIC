/**
 * Deterministic Tử Vi Đẩu Số chart engine.
 *
 * - No randomness, no clock reads, no I/O: identical input + ruleset + ENGINE_VERSION
 *   always yields an identical chart (asserted in tests).
 * - Ambiguous school-dependent inputs (births 23:00–23:59, leap-month births) are never
 *   decided silently: the engine returns `needs` until the user makes an explicit choice.
 * - Unknown birth time yields a partial chart containing only hour-independent elements.
 */
import { addDays, isValidSolarDate, jdFromDate, lunarToSolar, solarToLunar, type LunarDate, type SolarDate } from "./calendar";
import {
  BRANCHES,
  dayBranch,
  dayStem,
  hourBranch,
  isYangStem,
  mod,
  napAmElement,
  napAmName,
  STEMS,
  yearBranch,
  yearStem,
  type Element,
} from "./canchi";
import { DEFAULT_RULESET, ENGINE_VERSION, type Ruleset } from "./ruleset";
import {
  BAC_SI,
  HOA,
  MAIN_STARS,
  PALACES,
  THAI_TUE,
  TRANG_SINH,
  type HoaId,
  type MainStarId,
  type PalaceId,
  type StarId,
} from "./stars";

export type Sex = "male" | "female" | "unspecified";
export type LateRatHour = "next_day" | "same_day";
export type LeapMonthRule = "same_month" | "next_month" | "split_15";
/**
 * Which clock a birth outside Vietnam is read by: the birthplace's own clock ('local', the default
 * and every chart before engine 1.1.0), or the same moment on Vietnam's clock, UTC+7 ('vietnam':
 * date and time both, so the lunar day and the hour agree). The user chooses; it is never guessed.
 */
export type TimeBasis = "local" | "vietnam";

export interface BirthInput {
  calendar: "solar" | "lunar";
  /** Required when calendar = 'solar'. Local civil date at the birthplace. */
  solar?: SolarDate;
  /** Required when calendar = 'lunar'. Vietnamese lunar date. */
  lunar?: LunarDate;
  /** Local clock time at the birthplace, or null if unknown. */
  time: { hour: number; minute: number } | null;
  /** IANA zone of the birthplace (used for DST / divergence warnings, not to shift the date). */
  timeZone: string;
  sex: Sex;
  lateRatHour: LateRatHour | null;
  leapMonthRule: LeapMonthRule | null;
  /** Absent = 'local'. Only applies with a known time and a birthplace outside Vietnam. */
  timeBasis?: TimeBasis;
}

export type NeedsDecision = "late_rat_hour" | "leap_month_rule";

export interface PlacedStar {
  id: StarId;
  hoa?: HoaId;
}

export interface Palace {
  branch: number;
  stem: number | null;
  /** Palace role; null when birth time is unknown. */
  palace: PalaceId | null;
  isThan: boolean;
  mainStars: PlacedStar[];
  auxStars: PlacedStar[];
  trangSinh: string | null;
  bacSi: string | null;
  thaiTue: string;
  /** Nominal (tuổi âm) age range of the 10-year period, if computable. */
  daiHan: { from: number; to: number } | null;
}

export interface ChartWarning {
  code:
    | "calendar_tz_divergence"
    | "dst_in_effect"
    | "near_hour_boundary"
    | "hour_unknown"
    | "sex_unspecified"
    | "late_rat_hour_applied"
    | "leap_month_rule_applied"
    | "time_converted_vn";
  detail?: Record<string, unknown>;
}

export interface Chart {
  engineVersion: string;
  rulesetId: string;
  solar: SolarDate;
  /** Lunar date of the (possibly late-Tý-shifted) birth day, as in the calendar. */
  lunar: LunarDate;
  /** Month number actually used for month-based placements after the leap-month rule. */
  effectiveMonth: number;
  yearPillar: { stem: number; branch: number; name: string };
  dayPillar: { stem: number; branch: number; name: string };
  hourBranch: number | null;
  napAm: { name: string; element: Element };
  /** 'duong_nam' | 'am_nam' | 'duong_nu' | 'am_nu' | null when sex unspecified */
  yinYangSex: "duong_nam" | "am_nam" | "duong_nu" | "am_nu" | null;
  /** +1 clockwise, -1 counter-clockwise, null when sex unspecified. */
  direction: 1 | -1 | null;
  menh: number | null;
  than: number | null;
  cuc: { element: Element; number: number } | null;
  /** Indexed by branch (0 = Tý ... 11 = Hợi). */
  palaces: Palace[];
  tuan: [number, number];
  triet: [number, number];
  /** Which star receives each Hóa this year (even if that star is not placed). */
  hoaTargets: Record<HoaId, StarId>;
  warnings: ChartWarning[];
  /** Elements this engine version deliberately does not compute. */
  notComputed: string[];
}

export type ChartOutcome =
  | { ok: true; chart: Chart }
  | { ok: false; needs: NeedsDecision[] }
  | { ok: false; error: "invalid_date" | "invalid_time" };

const CUC_BY_ELEMENT: Record<Element, number> = { thuy: 2, moc: 3, kim: 4, tho: 5, hoa: 6 };

/** Stem of the palace at `branch` (Ngũ Hổ Độn: Giáp/Kỷ → Bính Dần, ...). */
export function palaceStem(yStem: number, branch: number): number {
  const danStem = mod((yStem % 5) * 2 + 2, 10);
  return mod(danStem + mod(branch - 2, 12), 10);
}

/** Tử Vi position from Cục number and lunar day. */
export function tuViPosition(cuc: number, day: number): number {
  const q = Math.ceil(day / cuc);
  const r = q * cuc - day;
  const base = 2 + q - 1;
  return mod(r % 2 === 0 ? base + r : base - r, 12);
}

/** Positions of the 14 main stars (branch per star). */
export function mainStarPositions(tuVi: number): Record<MainStarId, number> {
  const z = tuVi;
  const f = mod(4 - z, 12);
  return {
    tu_vi: z,
    thien_co: mod(z - 1, 12),
    thai_duong: mod(z - 3, 12),
    vu_khuc: mod(z - 4, 12),
    thien_dong: mod(z - 5, 12),
    liem_trinh: mod(z - 8, 12),
    thien_phu: f,
    thai_am: mod(f + 1, 12),
    tham_lang: mod(f + 2, 12),
    cu_mon: mod(f + 3, 12),
    thien_tuong: mod(f + 4, 12),
    thien_luong: mod(f + 5, 12),
    that_sat: mod(f + 6, 12),
    pha_quan: mod(f + 10, 12),
  };
}

type Triad = "than_ty_thin" | "ty_dau_suu" | "dan_ngo_tuat" | "hoi_mao_mui";
function triadOf(branch: number): Triad {
  return (["than_ty_thin", "ty_dau_suu", "dan_ngo_tuat", "hoi_mao_mui"] as const)[branch % 4]!;
}

/** UTC offset in minutes of `timeZone` at the given UTC instant. */
function tzOffsetMinutes(timeZone: string, utcMs: number): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" }).formatToParts(new Date(utcMs));
  const name = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const m = /GMT([+-])(\d{2}):?(\d{2})?/.exec(name);
  if (!m) return 0;
  const v = Number(m[2]) * 60 + Number(m[3] ?? 0);
  return m[1] === "-" ? -v : v;
}

/** Vietnam's own zones: a birth there is read by its clock whatever the time basis. */
const VIETNAM_ZONES = new Set(["Asia/Ho_Chi_Minh", "Asia/Saigon"]);
export const isVietnamZone = (tz: string) => VIETNAM_ZONES.has(tz);

/**
 * The same moment on Vietnam's clock (UTC+7): the birthplace's local date and time are turned
 * into an instant with that zone's offset at the time (summer time and past offsets included).
 */
export function toVietnamTime(solar: SolarDate, time: { hour: number; minute: number }, timeZone: string): { solar: SolarDate; time: { hour: number; minute: number } } {
  const wall = Date.UTC(solar.year, solar.month - 1, solar.day, time.hour, time.minute);
  let off = tzOffsetMinutes(timeZone, wall);
  off = tzOffsetMinutes(timeZone, wall - off * 60_000);
  const vn = new Date(wall - off * 60_000 + 7 * 60 * 60_000);
  return {
    solar: { year: vn.getUTCFullYear(), month: vn.getUTCMonth() + 1, day: vn.getUTCDate() },
    time: { hour: vn.getUTCHours(), minute: vn.getUTCMinutes() },
  };
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function dstWarning(solar: SolarDate, time: { hour: number; minute: number }, timeZone: string): ChartWarning | null {
  const wall = Date.UTC(solar.year, solar.month - 1, solar.day, time.hour, time.minute);
  let off = tzOffsetMinutes(timeZone, wall);
  off = tzOffsetMinutes(timeZone, wall - off * 60_000);
  const jan = tzOffsetMinutes(timeZone, Date.UTC(solar.year, 0, 1, 12));
  const jul = tzOffsetMinutes(timeZone, Date.UTC(solar.year, 6, 1, 12));
  const standard = Math.min(jan, jul);
  if (off <= standard) return null;
  const shiftedHour = mod(time.hour - Math.round((off - standard) / 60), 24);
  return {
    code: "dst_in_effect",
    detail: {
      offsetMinutes: off,
      standardOffsetMinutes: standard,
      clockHourBranch: hourBranch(time.hour),
      standardTimeHourBranch: hourBranch(shiftedHour),
    },
  };
}

function sameLunar(a: LunarDate, b: LunarDate) {
  return a.year === b.year && a.month === b.month && a.day === b.day && a.leap === b.leap;
}

export function computeChart(input: BirthInput, rules: Ruleset = DEFAULT_RULESET): ChartOutcome {
  const tz = rules.calendarTimeZone;
  const warnings: ChartWarning[] = [];

  // 1. Civil (solar) birth date.
  let solar: SolarDate | null;
  if (input.calendar === "solar") {
    solar = input.solar && isValidSolarDate(input.solar) ? input.solar : null;
  } else {
    solar = input.lunar ? lunarToSolar(input.lunar, tz) : null;
  }
  if (!solar || solar.year < 1900 || solar.year > 2100) return { ok: false, error: "invalid_date" };
  if (input.time) {
    const { hour, minute } = input.time;
    if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      return { ok: false, error: "invalid_time" };
    }
  }

  // 1b. Read on Vietnam's clock when the user chose it (date and time together).
  let time = input.time;
  const converted = input.timeBasis === "vietnam" && time !== null && !isVietnamZone(input.timeZone);
  if (converted) {
    const local = { solar, time: time! };
    const vn = toVietnamTime(solar, time!, input.timeZone);
    solar = vn.solar;
    time = vn.time;
    const fmt = (d: SolarDate, t: { hour: number; minute: number }) =>
      `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")} ${String(t.hour).padStart(2, "0")}:${String(t.minute).padStart(2, "0")}`;
    warnings.push({ code: "time_converted_vn", detail: { zone: input.timeZone, local: fmt(local.solar, local.time), vietnam: fmt(solar, time) } });
  }

  // 2. Explicit decisions required by school differences.
  const needs: NeedsDecision[] = [];
  const lateRat = time !== null && time.hour === 23;
  if (lateRat && !input.lateRatHour) needs.push("late_rat_hour");
  const dayForLunar = lateRat && input.lateRatHour === "next_day" ? addDays(solar, 1) : solar;
  const lunar = solarToLunar(dayForLunar, tz);
  if (lunar.leap && !input.leapMonthRule) needs.push("leap_month_rule");
  if (needs.length) return { ok: false, needs };
  if (lateRat) warnings.push({ code: "late_rat_hour_applied", detail: { rule: input.lateRatHour } });

  let effectiveMonth = lunar.month;
  if (lunar.leap) {
    const next = input.leapMonthRule === "next_month" || (input.leapMonthRule === "split_15" && lunar.day > 15);
    if (next) effectiveMonth = (lunar.month % 12) + 1;
    warnings.push({ code: "leap_month_rule_applied", detail: { rule: input.leapMonthRule, effectiveMonth } });
  }

  const alt = solarToLunar(dayForLunar, tz === 7 ? 8 : 7);
  if (!sameLunar(alt, lunar)) {
    warnings.push({ code: "calendar_tz_divergence", detail: { usedOffset: tz, otherOffset: tz === 7 ? 8 : 7, other: alt } });
  }

  // 3. Pillars and year-derived values.
  const yStem = yearStem(lunar.year);
  const yBranch = yearBranch(lunar.year);
  const jd = jdFromDate(dayForLunar.day, dayForLunar.month, dayForLunar.year);
  const dStem = dayStem(jd);
  const dBranch = dayBranch(jd);
  const yang = isYangStem(yStem);
  const yinYangSex =
    input.sex === "male" ? (yang ? "duong_nam" : "am_nam") : input.sex === "female" ? (yang ? "duong_nu" : "am_nu") : null;
  const direction: 1 | -1 | null =
    yinYangSex === null ? null : yinYangSex === "duong_nam" || yinYangSex === "am_nu" ? 1 : -1;
  if (direction === null) warnings.push({ code: "sex_unspecified" });

  const h = time ? hourBranch(time.hour) : null;
  if (time) {
    // Read on Vietnam's clock, the birthplace's summer time is already in the conversion.
    const dst = converted ? null : dstWarning(solar, time, input.timeZone);
    if (dst) warnings.push(dst);
    const { hour, minute } = time;
    const minutesToBoundary = hour % 2 === 1 ? minute : 60 - minute; // boundaries at odd hours :00
    if (minutesToBoundary <= 10) warnings.push({ code: "near_hour_boundary", detail: { minutesToBoundary } });
  } else {
    warnings.push({ code: "hour_unknown" });
  }

  const m = effectiveMonth;
  const d = lunar.day;
  const pos = new Map<StarId, number>();
  const place = (id: StarId, branch: number) => pos.set(id, mod(branch, 12));

  // Year-stem stars.
  const locTon = rules.locTon[yStem]!;
  place("loc_ton", locTon);
  place("kinh_duong", locTon + 1);
  place("da_la", locTon - 1);
  place("thien_khoi", rules.khoiViet[yStem]![0]);
  place("thien_viet", rules.khoiViet[yStem]![1]);

  // Year-branch stars.
  const triad = triadOf(yBranch);
  place("thien_ma", { than_ty_thin: 2, dan_ngo_tuat: 8, ty_dau_suu: 11, hoi_mao_mui: 5 }[triad]);
  place("dao_hoa", { than_ty_thin: 9, dan_ngo_tuat: 3, ty_dau_suu: 6, hoi_mao_mui: 0 }[triad]);
  place("hoa_cai", { than_ty_thin: 4, dan_ngo_tuat: 10, ty_dau_suu: 1, hoi_mao_mui: 7 }[triad]);
  place("kiep_sat", { than_ty_thin: 5, dan_ngo_tuat: 11, ty_dau_suu: 2, hoi_mao_mui: 8 }[triad]);
  const season = Math.floor(mod(yBranch + 1, 12) / 3);
  place("co_than", [2, 5, 8, 11][season]!);
  place("qua_tu", [10, 1, 4, 7][season]!);
  place("thien_khoc", 6 - yBranch);
  place("thien_hu", 6 + yBranch);
  place("long_tri", 4 + yBranch);
  place("phuong_cac", 10 - yBranch);
  place("giai_than", 10 - yBranch);
  place("hong_loan", 3 - yBranch);
  place("thien_hy", 3 - yBranch + 6);
  place("thien_la", 4);
  place("dia_vong", 10);

  // Month stars.
  place("ta_phu", 4 + (m - 1));
  place("huu_bat", 10 - (m - 1));
  place("thien_hinh", 9 + (m - 1));
  place("thien_rieu", 1 + (m - 1));
  place("thien_y", 1 + (m - 1));
  // Day stars (from Tả Phù / Hữu Bật).
  place("tam_thai", 4 + (m - 1) + (d - 1));
  place("bat_toa", 10 - (m - 1) - (d - 1));

  const notComputed = [
    "star_brightness",
    "tieu_han",
    "luu_nien_stars",
    "dau_quan",
    "thai_phu_phong_cao",
    "quoc_an_duong_phu",
    "thien_quan_thien_phuc",
    "luu_ha_thien_tru",
    "thien_duc_nguyet_duc",
    // Counting direction from Văn Khúc differs between sources (Chinese: forward; some
    // Vietnamese texts: backward). Not placed until verified against a Vietnamese reference.
    "thien_quy",
  ];

  let menh: number | null = null;
  let than: number | null = null;
  let cuc: Chart["cuc"] = null;

  if (h !== null) {
    // Hour stars.
    place("van_xuong", 10 - h);
    place("van_khuc", 4 + h);
    place("dia_kiep", 11 + h);
    place("dia_khong", 11 - h);
    place("an_quang", 10 - h + (d - 1) - 1);
    if (direction !== null) {
      const [hoaStart, linhStart] = rules.hoaLinh.start[triad];
      place("hoa_tinh", hoaStart + direction * h);
      place("linh_tinh", linhStart - direction * h);
    }

    // Mệnh / Thân / Cục / main stars.
    menh = mod(2 + (m - 1) - h, 12);
    than = mod(2 + (m - 1) + h, 12);
    const menhStem = palaceStem(yStem, menh);
    const cucElement = napAmElement(menhStem, menh);
    cuc = { element: cucElement, number: CUC_BY_ELEMENT[cucElement] };
    const mains = mainStarPositions(tuViPosition(cuc.number, d));
    for (const id of MAIN_STARS) place(id, mains[id]);

    place("thien_tai", menh + yBranch);
    place("thien_tho", than + yBranch);
    place("thien_thuong", menh + 5); // Nô Bộc
    place("thien_su", menh + 7); // Tật Ách
  } else {
    notComputed.push("palaces", "main_stars", "cuc", "dai_han", "trang_sinh", "hour_stars");
  }
  if (direction === null) notComputed.push("direction_dependent_rings_and_stars");

  // Tứ Hóa.
  const hoaRow = rules.tuHoa[yStem]!;
  const hoaTargets = Object.fromEntries(HOA.map((k, i) => [k, hoaRow[i]!])) as Record<HoaId, StarId>;
  const hoaOf = new Map<StarId, HoaId>(HOA.map((k, i) => [hoaRow[i]!, k]));

  // Tuần (year decade void) and Triệt.
  const xunStart = mod(yBranch - yStem, 12);
  const tuan: [number, number] = [mod(xunStart + 10, 12), mod(xunStart + 11, 12)];
  const triet = rules.triet[yStem]!;

  // Rings.
  const trangSinhStart = cuc ? { thuy: 8, tho: 8, moc: 11, kim: 5, hoa: 2 }[cuc.element] : null;

  const palaces: Palace[] = [];
  for (let b = 0; b < 12; b++) {
    const mainStars: PlacedStar[] = [];
    const auxStars: PlacedStar[] = [];
    for (const [id, branch] of pos) {
      if (branch !== b) continue;
      const star: PlacedStar = hoaOf.has(id) ? { id, hoa: hoaOf.get(id)! } : { id };
      if ((MAIN_STARS as readonly string[]).includes(id)) mainStars.push(star);
      else auxStars.push(star);
    }
    const order = (s: PlacedStar) => {
      const i = (MAIN_STARS as readonly string[]).indexOf(s.id);
      return i;
    };
    mainStars.sort((a, c) => order(a) - order(c));
    const palaceIdx = menh === null ? null : mod(b - menh, 12);
    let daiHan: Palace["daiHan"] = null;
    if (menh !== null && cuc && direction !== null) {
      const step = mod((b - menh) * direction, 12);
      daiHan = { from: cuc.number + step * 10, to: cuc.number + step * 10 + 9 };
    }
    palaces.push({
      branch: b,
      stem: menh === null ? null : palaceStem(yStem, b),
      palace: palaceIdx === null ? null : PALACES[palaceIdx]!,
      isThan: than === b,
      mainStars,
      auxStars,
      trangSinh:
        trangSinhStart !== null && direction !== null ? TRANG_SINH[mod((b - trangSinhStart) * direction, 12)]! : null,
      bacSi: direction !== null ? BAC_SI[mod((b - locTon) * direction, 12)]! : null,
      thaiTue: THAI_TUE[mod(b - yBranch, 12)]!,
      daiHan,
    });
  }

  return {
    ok: true,
    chart: {
      engineVersion: ENGINE_VERSION,
      rulesetId: rules.id,
      solar,
      lunar,
      effectiveMonth,
      yearPillar: { stem: yStem, branch: yBranch, name: `${STEMS[yStem]} ${BRANCHES[yBranch]}` },
      dayPillar: { stem: dStem, branch: dBranch, name: `${STEMS[dStem]} ${BRANCHES[dBranch]}` },
      hourBranch: h,
      napAm: { name: napAmName(yStem, yBranch), element: napAmElement(yStem, yBranch) },
      yinYangSex,
      direction,
      menh,
      than,
      cuc,
      palaces,
      tuan,
      triet,
      hoaTargets,
      warnings,
      notComputed,
    },
  };
}

/** Nominal Vietnamese age (tuổi âm) in a given lunar year. */
export function nominalAge(birthLunarYear: number, currentLunarYear: number): number {
  return currentLunarYear - birthLunarYear + 1;
}

/** Palace whose Đại Hạn covers the given nominal age, or null. */
export function currentDaiHan(chart: Chart, age: number): Palace | null {
  return chart.palaces.find((p) => p.daiHan && age >= p.daiHan.from && age <= p.daiHan.to) ?? null;
}

/** Canonical JSON (sorted keys) for hashing engine input. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
