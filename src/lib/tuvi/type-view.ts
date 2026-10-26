import type { TypeView } from "@/components/tuvi-type";
import type { Locale } from "@/lib/i18n/locales";
import type { Chart } from "./engine";
import { mainsOf } from "./interpret";
import { STAR_PLAIN } from "./plain";
import { STAR_SHORT } from "./plain-names";
import { STAR_INFO } from "./stars";

/** The types behind "your essence": the Self palace's main stars, or the opposite palace's when it has none. */
export function essenceTypes(chart: Chart, locale: Locale): { types: TypeView[]; borrowed: boolean } {
  const m = mainsOf(chart, "menh");
  if (!m) return { types: [], borrowed: false };
  return { types: m.mains.map((id) => ({ id, name: STAR_INFO[id].vi, persona: STAR_PLAIN[id].persona[locale], short: STAR_SHORT[id][locale], plain: STAR_PLAIN[id].plain[locale] })), borrowed: m.borrowed };
}
