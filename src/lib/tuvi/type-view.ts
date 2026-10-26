import type { TypeView } from "@/components/tuvi-type";
import type { Locale } from "@/lib/i18n/locales";
import type { Chart } from "./engine";
import { mainsOf } from "./interpret";
import { STAR_PLAIN } from "./plain";
import { STAR_SHORT } from "./plain-names";
import { MAIN_STARS, STAR_INFO, type MainStarId } from "./stars";

/** The types behind "your essence": the Self palace's main stars, or the opposite palace's when it has none. */
/**
 * The type's name in lines for narrow captions. In Japanese it splits where the description ends and
 * the noun begins ("まわりを照らす" / "太陽タイプ"), so a line never breaks inside a word.
 */
function lines(id: MainStarId, locale: Locale): string[] {
  const persona = STAR_PLAIN[id].persona[locale];
  if (locale !== "ja") return [persona];
  const at = persona.lastIndexOf(STAR_SHORT[id].ja);
  return at > 0 ? [persona.slice(0, at), persona.slice(at)] : [persona];
}

const typeOf = (id: MainStarId, locale: Locale): TypeView => ({ id, name: STAR_INFO[id].vi, persona: STAR_PLAIN[id].persona[locale], lines: lines(id, locale), plain: STAR_PLAIN[id].plain[locale] });

/** All fourteen types, in the traditional order (for a gallery). */
export const allTypes = (locale: Locale): TypeView[] => MAIN_STARS.map((id) => typeOf(id, locale));

export function essenceTypes(chart: Chart, locale: Locale): { types: TypeView[]; borrowed: boolean } {
  const m = mainsOf(chart, "menh");
  if (!m) return { types: [], borrowed: false };
  return { types: m.mains.map((id) => typeOf(id, locale)), borrowed: m.borrowed };
}
