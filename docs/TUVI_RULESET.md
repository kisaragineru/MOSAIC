# Tử Vi engine and ruleset `vn-ttl-2026.1` (engine 1.0.0)

MOSAIC computes Tử Vi Đẩu Số charts with a **deterministic engine** (`src/lib/tuvi/engine.ts`).
No AI is involved in placing stars. Interpretation text is produced by rules
(`src/lib/tuvi/interpret.ts`) that only describe *traditional associations*.

- Code version: `ENGINE_VERSION = "1.0.0"` (`src/lib/tuvi/ruleset.ts`)
- Data version: ruleset id `vn-ttl-2026.1` (tables in `src/lib/tuvi/ruleset.ts`, also stored in
  `tuvi_ruleset_versions.rules` for provenance)
- Every stored chart records `ruleset_id`, `engine_version` and `input_hash`
  (`sha256(canonical input + ruleset + engine)`). Identical input → identical chart (tested).
  Changing a rule requires a new ruleset id; old charts are never silently recomputed.

## 1. Calendar

| Item | Rule | Verification |
|---|---|---|
| Solar ↔ lunar | Hồ Ngọc Đức astronomical algorithm (Meeus new moon / solar longitude), **UTC+7** (Vietnamese calendar) | Tết dates 1985, 2007, 2020, 2023–2026; leap months 2012/14/17/20/23/25; every day 1901–2099 compared with `lunar-javascript` (independent, UTC+8) — all differences confined to 11 explained months (pre‑1929 Beijing local time; new moon within minutes of midnight). Round-trip of every day 2000–2030. |
| Year boundary | Lunar New Year (Tết), not Lập Xuân | standard for Tử Vi; asserted in tests |
| Vietnam vs China | If UTC+7 and UTC+8 give different lunar dates, the chart carries warning `calendar_tz_divergence` (both values recorded). Vietnam used UTC+8 for parts of its history (before 1968 in the North; South Vietnam 1959–1975) — MOSAIC always uses UTC+7 and warns instead of guessing. | tested (1985-02-01) |
| Birth time | Local clock time at the birthplace, as entered. Not converted to true solar time. | — |
| DST | If DST was in effect at the birthplace (IANA zone), warning `dst_in_effect` shows the clock-time and standard-time hour branches; no automatic shift. | tested (America/New_York) |
| Hour boundary | Warning `near_hour_boundary` within 10 min of an hour-branch boundary. | tested |

### Decisions that are school-dependent → asked, never guessed

| Situation | Options (user chooses; stored in `birth_profiles`) |
|---|---|
| Born 23:00–23:59 (late Tý) | `next_day` (Tý of the next lunar day) / `same_day` |
| Born in a leap lunar month | `same_month` / `next_month` / `split_15` (1–15 this month, 16+ next) |

Until chosen, the engine returns `needs` and no chart is stored or shown.

### Unknown birth time
No palace, Mệnh/Thân, Cục, main star, Đại Hạn or hour-based star is computed. Only year/month/day
elements are placed. The UI can list the 12 candidate hours (computed on the fly, never stored).

### Sex unspecified
The traditional method uses yin/yang × sex for direction. If the user prefers not to say,
Đại Hạn, Tràng Sinh, Bác Sĩ ring and Hỏa/Linh Tinh are **not computed** (no default assumed).

## 2. Chart rules

Branch indices Tý=0 … Hợi=11; months/hours counted as in the classical texts.

| Element | Rule | Verification |
|---|---|---|
| Mệnh / Thân | From Dần: forward to month, then backward (Mệnh) / forward (Thân) by hour | **iztro** differential (≈1,300 charts) + hand-derived reference |
| 12 palaces | Clockwise from Mệnh: Mệnh, Phụ Mẫu, Phúc Đức, Điền Trạch, Quan Lộc, Nô Bộc, Thiên Di, Tật Ách, Tài Bạch, Tử Tức, Phu Thê, Huynh Đệ | iztro |
| Palace stems | Ngũ Hổ Độn (Giáp/Kỷ → Bính Dần …) | iztro + unit test |
| Ngũ Hành Cục | Nạp Âm of Mệnh stem-branch (Thủy 2, Mộc 3, Kim 4, Thổ 5, Hỏa 6) | iztro; closed form checked against all 30 Nạp Âm names |
| Tử Vi position | q = ⌈day/cục⌉, r = q·cục − day; from Dần count q; ±r by parity | iztro (all days 1–29 × 12 hours × all five Cục) |
| 14 main stars | Tử Vi group (−1, −3, −4, −5, −8); Thiên Phủ mirrored on Dần–Thân axis; Phủ group (+1…+6, +10) | iztro |
| Lộc Tồn, Kình Dương, Đà La | by year stem; ±1 | iztro |
| Thiên Khôi / Thiên Việt | Vietnamese table (“Giáp Mậu Canh ngưu dương …, Lục Tân phùng mã hổ”) | iztro (same table) |
| Văn Xương / Văn Khúc | Tuất backward / Thìn forward by hour | iztro |
| Tả Phù / Hữu Bật | Thìn forward / Tuất backward by month | iztro |
| Địa Không / Địa Kiếp | from Hợi, backward / forward by hour | iztro |
| Thiên Mã, Đào Hoa (Hàm Trì), Hoa Cái, Cô Thần, Quả Tú | by year-branch triad / season | iztro |
| Thiên Khốc / Thiên Hư, Long Trì / Phượng Các, Hồng Loan / Thiên Hỷ | by year branch | iztro |
| Thiên Hình, Thiên Riêu | by month | iztro |
| Tam Thai / Bát Tọa | from Tả Phù / Hữu Bật by day | iztro |
| Ân Quang | from Văn Xương, forward (day − 1), back one | iztro |
| Thiên Tài / Thiên Thọ | from Mệnh / Thân by year branch | iztro |
| **Tứ Hóa** | Vietnamese mnemonic table. **Nhâm: Lương, Tử, Phủ (Khoa), Vũ** — differs from iztro’s default (Tả Phù); iztro is configured to the Vietnamese row for comparison | iztro (configured) + unit test for Nhâm |
| Tuần (Tuần Trung Không Vong) | void pair of the year’s decade | iztro (its single 旬空 branch ∈ our pair) |
| Triệt | by year stem (Giáp/Kỷ Thân-Dậu …) | iztro (截路 + 空亡) |
| Tràng Sinh ring | start by Cục (Thủy/Thổ Thân, Mộc Hợi, Kim Tỵ, Hỏa Dần); direction by yin/yang × sex | iztro |
| Bác Sĩ ring | from Lộc Tồn; direction by yin/yang × sex | iztro |
| Thái Tuế ring | from year branch, clockwise (VN names) | iztro (position-aligned) |
| Đại Hạn | starts at Mệnh at age = Cục; Dương Nam/Âm Nữ clockwise, else counter-clockwise; nominal (tuổi âm) ages | iztro |
| **Hỏa Tinh / Linh Tinh** | VN rule: start by triad (“Dần Ngọ Tuất nhân Sửu Mão …”); Dương Nam/Âm Nữ: Hỏa forward, Linh backward; reverse otherwise. Chinese texts count both forward. | Hỏa agrees with iztro for forward cases; Linh and reverse cases **hand-derived only** |
| **Thiên Thương / Thiên Sứ** | VN fixed: Nô Bộc / Tật Ách | **hand-derived only** |
| **Giải Thần** | with Phượng Các (VN) | **hand-derived only** (iztro’s 解神 is a different rule) |
| **Thiên Y** | with Thiên Riêu (month) | **hand-derived only** |
| **Kiếp Sát** | by triad | **hand-derived only** |
| Thiên La / Địa Võng | fixed Thìn / Tuất | trivial |

### Deliberately NOT computed in this version (`chart.notComputed`)
- **Star brightness (miếu/vượng/đắc/hãm)** — tables differ between sources; not guessed.
- **Thiên Quý** — iztro counts forward from Văn Khúc; some Vietnamese texts count backward.
  Excluded until checked against an authoritative Vietnamese reference.
- Tiểu Hạn, Lưu niên stars, Đẩu Quân, Thai Phụ/Phong Cáo, Quốc Ấn/Đường Phù, Thiên Quan/Thiên Phúc,
  Lưu Hà/Thiên Trù, Thiên Đức/Nguyệt Đức.

## 3. Interpretation (`interp-3`)
- Sections: personality (Mệnh + Thân), friends & siblings (Nô Bộc, Huynh Đệ), love (Phu Thê),
  career (Quan Lộc), money (Tài Bạch), family & home (Phụ Mẫu, Điền Trạch, Tử Tức), cycles (Đại Hạn).
- Each paragraph carries rule ids (e.g. `menh.main.thien_co`, `phu_the.hoa.ky`, `menh.vo_chinh_dieu`);
  stored in `tuvi_interpretations.rule_ids`.
- Vô chính diệu palaces are read through the opposite palace (stated explicitly).
- No text depends on brightness; nothing predicts events; everything is phrased as tradition.
- `interp-2` adds, per theme: the related palaces of the primary palace (tam phương tứ chính:
  the two trine palaces at +4/+8 and the opposite at +6, rule id `<palace>.tam_phuong_tu_chinh`),
  a strength and a caution line per main star (`<palace>.strength.<star>`, `<palace>.caution.<star>`),
  star-specific family readings, and a theme for each 10-year Đại Hạn taken from the role of the
  palace it falls in (e.g. a period in Quan Lộc reads as work-focused). These are interpretive
  texts in the same "traditionally associated" register; they are **not reviewed by a practitioner**
  (same open item as section 4). Content tables: `src/lib/tuvi/interpret-detail.ts`.
- `interp-3` corrects the 10-year readings after review (`interp-2` read every period's natal
  palace as its theme, at any age, and gave adult advice to childhood and lived periods):
  - Each period first states the **fact**: which natal palace its Đại Hạn falls in and what that
    palace stands for. The idea that this palace's area "comes to the fore" is presented as one
    common, softened reading, not as a rule.
  - Wording depends on the **life phase** of the period's middle age (MOSAIC's own guide, not a Tử Vi
    rule): childhood (< 13) is read through surroundings and family; youth (< 25) and adulthood
    (< 65) get the softened reading; later life (< 95) is read as what one has built and passes on;
    periods from 95 on are shown **for reference only** (a traditional chart always lists 12).
  - **Advice** (strength / caution per main star) appears only for current or future periods in
    youth and adulthood. Other periods get a **question** instead, worded for the age and for what
    the palace's domain means at that age (`PALACE_BY_AGE`: a child's career palace is school, not
    a job):
    - childhood already lived: about the child's world only; star traits are not used, since a
      child's palace describes their surroundings more than their character;
    - youth / adulthood already lived: the palace's adult domain plus a few of the stars' traits,
      "in you or in others";
    - later life: looking back if lived, "what would you like to treasure" if still ahead;
    - reference periods (95+), and childhood for a user who is still a child: no question.
  - A period without main stars says so and names the opposite palace whose stars are used
    (vô chính diệu), instead of borrowing them silently.

## 3b. Readings for two connected people (`pair-1`)

Shown only when both people agreed to the `tuvi_detail` scope (whole chart). Source:
`src/lib/compare/tuvi-pair.ts`. No score and no verdict; every reading sets two facts side by side.

- **Lenses** (MOSAIC's presentation, not a fixed rule): a relationship palace of one chart is read
  as the kind of person one is drawn to in that relationship and set beside the other person's
  Mệnh palace — partners: Phu Thê; friends: Nô Bộc; close collaborators: Huynh Đệ. Both directions
  are shown. Main stars the two palaces share are named ("can be read as close to the person one
  pictures"); no shared star is worded as a chance to discover new sides, never as a bad sign.
- **Mệnh to Mệnh**: main stars both Mệnh palaces hold.
- **Timing**: each person's current Đại Hạn (from interp-3 `lifeStages`) and the years until it
  changes; when both are in the same palace's decade, that is pointed out.
- Palaces without main stars are read through the opposite palace and say so.
- Not used, on purpose: star-element relations between the two charts (school-dependent for some
  stars) and any numeric compatibility.
- The shared chart (`src/lib/tuvi/shared-chart.ts`) drops the birth date, birth time, day pillar
  and leap-month handling; the consent text says a full chart can still narrow down birth month,
  day and hour, and that the Đại Hạn direction shows the sex entered for the calculation.

## 4. Reference checks still needed before calling the engine “verified by practitioners”
The engine is verified against an **independent implementation** (iztro, MIT) and against
**hand derivations from the classical rules**. It has **not** yet been compared with charts
published by a Vietnamese practitioner or a printed reference (e.g. a chart from Thái Thứ Lang’s
*Tử Vi Đẩu Số Tân Biên*). Recommended before launch: collect 20–30 published Vietnamese charts
(including leap months, late Tý, pre‑1968 dates) and add them as fixtures in
`tests/unit/tuvi-engine.test.ts`; resolve Thiên Quý and brightness with a domain expert.

## 5. Traditional compatibility (`compare-1`)
Year-branch relations (Tam Hợp, Lục Hợp, Lục Xung, Tứ Hành Xung, Lục Hại), stem Hợp/Xung,
Nạp Âm element generation/control, Mệnh-branch relation (only if both birth times are known).
No score is computed. Inputs are only derived summary columns (never birth date/time).
