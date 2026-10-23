/** Props for the chart view, shared by the user's own Tử Vi page and a connected person's chart. */
import type { ChartCenter, ChartLabels } from "@/components/tuvi-chart";
import type { Locale } from "@/lib/i18n/locales";
import type { Dict } from "@/lib/i18n/messages/en";
import { BRANCHES } from "./canchi";
import type { Chart } from "./engine";
import { palaceDetails } from "./interpret";
import { PALACE_JA, PALACE_SHORT_EN } from "./interpret-detail";
import { STAR_INFO } from "./stars";

export function chartView(c: Chart, locale: Locale, t: Dict, opts: { birth: boolean }) {
  const ui = t.tuvi.ui;
  const details = palaceDetails(c, locale).map((d) => ({
    ...d,
    borrowedText: d.borrowedFrom ? ui.borrowedFrom(d.borrowedFrom) : null,
    ageText: d.daiHan ? ui.ageRange(d.daiHan.from, d.daiHan.to) : null,
  }));
  const center: ChartCenter = {
    pillar: c.yearPillar.name,
    lines: [
      // A connected person's chart never shows the birth date or hour.
      ...(opts.birth
        ? [
            `${t.tuvi.lunarDate}: ${c.lunar.day}/${c.lunar.month}${c.lunar.leap ? " (nhuận)" : ""}/${c.lunar.year}`,
            `${t.tuvi.hour}: ${c.hourBranch !== null ? BRANCHES[c.hourBranch] : "?"}`,
          ]
        : []),
      `${t.tuvi.napAm}: ${c.napAm.name}`,
      ...(c.cuc ? [`${t.tuvi.cuc}: ${c.cuc.number}`] : []),
      ...(c.yinYangSex ? [t.tuvi.yinYang[c.yinYangSex]] : []),
    ],
    hoa: (["loc", "quyen", "khoa", "ky"] as const).map((h) => ({ kind: h, star: STAR_INFO[c.hoaTargets[h]].vi })),
  };
  const localNames = c.palaces.map((x) => (!x.palace || locale === "vi" ? null : locale === "ja" ? PALACE_JA[x.palace] : PALACE_SHORT_EN[x.palace]));
  const labels: ChartLabels = {
    help: ui.chartHelp,
    palaceRole: ui.palaceRole,
    mainStars: ui.mainStars,
    auxStars: ui.auxStars,
    decade: ui.decade,
    simple: ui.chartSimple,
    detailed: ui.chartDetailed,
    menh: ui.badgeMenh,
    than: ui.badgeThan,
    menhName: ui.menhName,
    thanName: ui.thanName,
    now: ui.now,
    related: ui.relatedLegend,
    lucky: ui.lucky,
    malefic: ui.malefic,
    noMain: ui.noMain,
    focusTitle: ui.focusTitle,
    self: ui.focusSelf,
    trine: ui.focusTrine,
    opposite: ui.focusOpposite,
    close: ui.close,
    back: ui.back,
    tapForDetails: ui.tapForDetails,
  };
  return { details, center, localNames, labels };
}
