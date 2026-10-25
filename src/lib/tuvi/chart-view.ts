/** Props for the chart view, shared by the user's own Tử Vi page and a connected person's chart. */
import type { ChartCell, ChartCenter, ChartLabels } from "@/components/tuvi-chart";
import type { Locale } from "@/lib/i18n/locales";
import type { Dict } from "@/lib/i18n/messages/en";
import { BRANCHES, ELEMENT_NAMES } from "./canchi";
import type { Chart } from "./engine";
import { palaceDetails } from "./interpret";
import { PALACE_JA, PALACE_SHORT } from "./interpret-detail";
import { HOA_PLAIN, HOA_TIP, PALACE_CELL, pillarJa, STAR_SHORT } from "./plain-names";
import { PALACE_INFO, STAR_INFO, type MainStarId, type StarId } from "./stars";

/** A star in everyday words where it has one (the main stars), else its own name. */
const starWord = (id: StarId, locale: Locale) => (id in STAR_SHORT ? STAR_SHORT[id as MainStarId][locale] : STAR_INFO[id].vi);

export function chartView(c: Chart, locale: Locale, t: Dict, opts: { birth: boolean }) {
  const ui = t.tuvi.ui;
  const details = palaceDetails(c, locale).map((d) => ({
    ...d,
    borrowedText: d.borrowedFrom ? ui.borrowedFrom(d.borrowedFrom) : null,
    ageText: d.daiHan ? ui.ageRange(d.daiHan.from, d.daiHan.to) : null,
  }));
  // Each palace in everyday words: its area of life first, the traditional name small.
  const cells: ChartCell[] = c.palaces.map((p) => ({
    plain: p.palace ? PALACE_CELL[p.palace][locale] : (BRANCHES[p.branch] ?? ""),
    long: p.palace ? PALACE_SHORT[p.palace][locale] : (BRANCHES[p.branch] ?? ""),
    tradShort: p.palace ? (locale === "ja" ? PALACE_JA[p.palace] : PALACE_INFO[p.palace].vi) : (BRANCHES[p.branch] ?? ""),
    trad: p.palace ? (locale === "ja" ? `${PALACE_JA[p.palace]}・${PALACE_INFO[p.palace].vi}` : PALACE_INFO[p.palace].vi) : (BRANCHES[p.branch] ?? ""),
    stars: p.mainStars.map((s) => ({ word: STAR_SHORT[s.id as MainStarId]?.[locale] ?? STAR_INFO[s.id].vi, name: STAR_INFO[s.id].vi, hoa: s.hoa ?? null })),
    lucky: p.auxStars.filter((s) => STAR_INFO[s.id].group === "lucky").map((s) => STAR_INFO[s.id].vi),
    malefic: p.auxStars.filter((s) => STAR_INFO[s.id].group === "malefic").map((s) => STAR_INFO[s.id].vi),
    hoaTips: [...p.mainStars, ...p.auxStars].filter((s) => s.hoa).map((s) => HOA_TIP[s.hoa!][locale]),
  }));
  const center: ChartCenter = {
    pillar: locale === "ja" ? `${pillarJa(c.yearPillar.stem, c.yearPillar.branch)}${ui.plainYear}` : c.yearPillar.name,
    lines: [
      // A connected person's chart never shows the birth date or hour.
      ...(opts.birth
        ? [
            `${t.tuvi.lunarDate}: ${c.lunar.day}/${c.lunar.month}${c.lunar.leap ? " (nhuận)" : ""}/${c.lunar.year}`,
            `${t.tuvi.hour}: ${c.hourBranch !== null ? BRANCHES[c.hourBranch] : "?"}`,
          ]
        : []),
      `${ui.plainNature}: ${ELEMENT_NAMES[c.napAm.element][locale]}（${c.napAm.name}）`,
      ...(c.cuc ? [`${ui.plainRhythm}: ${c.cuc.number}`] : []),
      ...(c.yinYangSex ? [ui.plainYinYang[c.yinYangSex]] : []),
    ],
    hoa: (["loc", "quyen", "khoa", "ky"] as const).map((h) => ({ kind: h, plain: HOA_PLAIN[h][locale], star: starWord(c.hoaTargets[h], locale) })),
  };
  const hoaPlain = { loc: HOA_PLAIN.loc[locale], quyen: HOA_PLAIN.quyen[locale], khoa: HOA_PLAIN.khoa[locale], ky: HOA_PLAIN.ky[locale] };
  const labels: ChartLabels = {
    help: ui.plainHelp,
    menh: ui.plainMenh,
    than: ui.plainThan,
    now: ui.plainNow,
    ageNow: ui.plainAgeNow,
    related: ui.relatedLegend,
    noMain: ui.plainNoMain,
    borrow: ui.plainBorrow,
    main: ui.plainMain,
    lucky: ui.plainLucky,
    malefic: ui.plainMalefic,
    none: ui.plainNone,
    age: ui.plainAge,
    relatedTitle: ui.plainRelated,
    focusTitle: ui.focusTitle,
    self: ui.focusSelf,
    trine: ui.focusTrine,
    opposite: ui.focusOpposite,
    close: ui.close,
    tapForDetails: ui.tapForDetails,
    hoa: hoaPlain,
  };
  return { details, cells, center, labels };
}
