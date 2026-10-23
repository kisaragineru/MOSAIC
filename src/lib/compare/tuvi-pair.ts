/**
 * Tử Vi readings for two connected people who both shared their whole chart ("pair-1").
 *
 * No score and no verdict. Every reading puts two facts side by side and words the traditional
 * association softly:
 *  - Lenses: one common reading takes a relationship palace of one chart (Phu Thê for partners,
 *    Nô Bộc for friends, Huynh Đệ for close collaborators) as the kind of person one is drawn to in
 *    that relationship, and sets it beside the other person's Mệnh palace. Shared main stars are
 *    pointed out; no shared star is not presented as a bad sign.
 *  - Mệnh to Mệnh: main stars both Mệnh palaces have in common.
 *  - Timing: each person's current 10-year period, and when it changes.
 * Palaces without main stars are read through the opposite palace and say so (as elsewhere).
 * The lens → palace choice is MOSAIC's presentation; see docs/TUVI_RULESET.md.
 */
import type { Locale } from "@/lib/i18n/locales";
import type { Chart } from "@/lib/tuvi/engine";
import { PALACE_JA, PALACE_SHORT } from "@/lib/tuvi/interpret-detail";
import { lifeStages, mainKeywords, mainsOf, traitWords } from "@/lib/tuvi/interpret";
import { PALACE_INFO, STAR_INFO, type MainStarId, type PalaceId } from "@/lib/tuvi/stars";

export const PAIR_VERSION = "pair-1";
export const PAIR_LENSES = ["love", "friends", "collaborators"] as const;
export type PairLens = (typeof PAIR_LENSES)[number];
export const LENS_PALACE: Record<PairLens, PalaceId> = { love: "phu_the", friends: "no_boc", collaborators: "huynh_de" };

type T = { en: string; vi: string; ja: string };
const pick = (t: T, l: Locale) => t[l];

export interface PairStar {
  name: string;
  keywords: string;
}

/** One direction of a lens: what A's relationship palace holds, beside B's Mệnh palace. */
export interface PairSide {
  from: string;
  to: string;
  palace: string;
  lensStars: PairStar[];
  borrowed: boolean;
  menhStars: PairStar[];
  shared: string[];
  text: string;
}

export interface PairLensReading {
  lens: PairLens;
  intro: string;
  sides: [PairSide, PairSide];
  prompts: string[];
}

export interface PairReadings {
  version: typeof PAIR_VERSION;
  lenses: PairLensReading[];
  menh: { text: string; a: PairStar[]; b: PairStar[] };
  timing: { lines: string[]; note: string | null };
}

const palaceName = (id: PalaceId, l: Locale) => (l === "ja" ? PALACE_JA[id] : l === "vi" ? `cung ${PALACE_INFO[id].vi}` : `${PALACE_INFO[id].vi} palace`);
const stars = (ids: MainStarId[], l: Locale): PairStar[] => ids.map((m) => ({ name: STAR_INFO[m].vi, keywords: mainKeywords(m, l) }));
const join = (xs: string[], l: Locale) => xs.join(l === "ja" ? "・" : ", ");

function side(a: Chart, b: Chart, names: [string, string], lens: PairLens, l: Locale): PairSide {
  const palace = LENS_PALACE[lens];
  const own = mainsOf(a, palace);
  const other = mainsOf(b, "menh");
  const lensIds = own?.mains ?? [];
  const menhIds = other?.mains ?? [];
  const shared = lensIds.filter((m) => menhIds.includes(m)).map((m) => STAR_INFO[m].vi);
  const [x, y] = names;
  const p = palaceName(palace, l);
  const borrowedNote = own?.borrowed
    ? pick({ ja: `（${p}に主星がないため、向かいの宮の星で読みます）`, en: ` (the ${p} has no main star, so it is read through the opposite palace)`, vi: ` (${p} không có chính tinh nên đọc qua cung đối diện)` }, l)
    : "";
  const text = shared.length
    ? pick(
        {
          ja: `${x}さんの${p}の星と、${y}さんの命宮の星が重なっています（${join(shared, l)}）。伝統的には、思い描く相手像に近い組み合わせと読まれることがあります。${borrowedNote}`,
          en: `${x}'s ${p} and ${y}'s Mệnh palace share ${join(shared, l)}. Traditionally this can be read as ${y} being close to the kind of person ${x} pictures here.${borrowedNote}`,
          vi: `${p} của ${x} và cung Mệnh của ${y} có chung sao ${join(shared, l)}. Theo truyền thống, có thể đọc là ${y} gần với hình mẫu mà ${x} hướng tới.${borrowedNote}`,
        },
        l,
      )
    : pick(
        {
          ja: `${x}さんの${p}の星と、${y}さんの命宮の星は重なっていません。違いは、相手から新しい面を知るきっかけとして読むこともできます。${borrowedNote}`,
          en: `${x}'s ${p} and ${y}'s Mệnh palace share no main star. The difference can also be read as a way to discover new sides through each other.${borrowedNote}`,
          vi: `${p} của ${x} và cung Mệnh của ${y} không có chính tinh chung. Sự khác biệt cũng có thể là dịp khám phá những mặt mới qua nhau.${borrowedNote}`,
        },
        l,
      );
  return { from: x, to: y, palace: p, lensStars: stars(lensIds, l), borrowed: !!own?.borrowed, menhStars: stars(menhIds, l), shared, text };
}

const INTRO: Record<PairLens, (p: string) => T> = {
  love: (p) => ({
    ja: `伝統的な見方の一つでは、自分の${p}に、パートナーとして惹かれやすい人の姿が表れるとされます。それぞれの${p}の星と、相手の命宮の星を並べて見てみましょう。`,
    en: `In one traditional reading, your ${p} shows the kind of partner you are drawn to. Here is each person's ${p} beside the other's Mệnh palace.`,
    vi: `Theo một cách đọc truyền thống, ${p} cho thấy kiểu người bạn đời mà mình dễ bị thu hút. Dưới đây là ${p} của mỗi người đặt cạnh cung Mệnh của người kia.`,
  }),
  friends: (p) => ({
    ja: `伝統的な見方の一つでは、自分の${p}に、友人や仲間との関わり方が表れるとされます。それぞれの${p}の星と、相手の命宮の星を並べて見てみましょう。`,
    en: `In one traditional reading, your ${p} shows how you relate to friends and peers. Here is each person's ${p} beside the other's Mệnh palace.`,
    vi: `Theo một cách đọc truyền thống, ${p} cho thấy cách mình gắn bó với bạn bè. Dưới đây là ${p} của mỗi người đặt cạnh cung Mệnh của người kia.`,
  }),
  collaborators: (p) => ({
    ja: `伝統的な見方の一つでは、自分の${p}に、きょうだいのように身近な協力者との関わり方が表れるとされます。それぞれの${p}の星と、相手の命宮の星を並べて見てみましょう。`,
    en: `In one traditional reading, your ${p} shows how you work with people as close as siblings. Here is each person's ${p} beside the other's Mệnh palace.`,
    vi: `Theo một cách đọc truyền thống, ${p} cho thấy cách mình cộng tác với những người thân như anh em. Dưới đây là ${p} của mỗi người đặt cạnh cung Mệnh của người kia.`,
  }),
};

function prompts(a: Chart, b: Chart, names: [string, string], lens: PairLens, l: Locale): string[] {
  const out: string[] = [];
  for (const [x, y, cx, cy] of [
    [names[0], names[1], a, b],
    [names[1], names[0], b, a],
  ] as const) {
    const theirs = join(traitWords(mainsOf(cy, "menh")?.mains ?? [], l).slice(0, 2), l);
    const wish = join(traitWords(mainsOf(cx, LENS_PALACE[lens])?.mains ?? [], l).slice(0, 2), l);
    if (theirs)
      out.push(pick({ ja: `${x}さんから${y}さんへ：${y}さんの持ち味（${theirs}）が表れていると感じた場面を伝えてみる`, en: `${x} to ${y}: tell ${y} about a moment their strengths (${theirs}) showed`, vi: `${x} nói với ${y}: kể về lúc thấy rõ điểm mạnh (${theirs}) của ${y}` }, l));
    if (wish)
      out.push(pick({ ja: `${x}さんがこの関係で大切にしたいもの（${wish}）について、二人で話してみる`, en: `Talk together about what ${x} values in this relationship (${wish})`, vi: `Cùng nói về điều ${x} coi trọng trong mối quan hệ này (${wish})` }, l));
  }
  return out;
}

function timing(a: Chart, b: Chart, names: [string, string], ages: [number | null, number | null], l: Locale) {
  const now = [a, b].map((c, i) => (ages[i] === null ? undefined : lifeStages(c, l, ages[i]).find((s) => s.state === "current")));
  const lines = now.flatMap((s, i) => {
    if (!s || !s.palace) return [];
    const left = s.to - ages[i]! + 1;
    const short = pick(PALACE_SHORT[s.palace], l);
    return [
      pick(
        {
          ja: `${names[i]}さん：数え${s.from}〜${s.to}歳、「${short}」の10年（${s.label}）。あと${left}年で次の10年へ。`,
          en: `${names[i]}: ages ${s.from}–${s.to}, a “${short}” decade (${s.label}); the next one starts in ${left} year${left === 1 ? "" : "s"}.`,
          vi: `${names[i]}: ${s.from}–${s.to} tuổi, mười năm “${short}” (${s.label}); còn ${left} năm nữa sang giai đoạn mới.`,
        },
        l,
      ),
    ];
  });
  const [x, y] = now;
  const note =
    x?.palace && y?.palace && x.palace === y.palace
      ? pick(
          {
            ja: `二人とも今は「${pick(PALACE_SHORT[x.palace], l)}」の10年です。同じテーマについて、お互いの経験を話しやすい時期と読むこともできます。`,
            en: `You are both in a “${pick(PALACE_SHORT[x.palace], l)}” decade now — a time when sharing experiences on the same theme can come easily.`,
            vi: `Cả hai đang ở mười năm “${pick(PALACE_SHORT[x.palace], l)}” — dễ chia sẻ trải nghiệm về cùng một chủ đề.`,
          },
          l,
        )
      : null;
  return { lines, note };
}

export function pairReadings(a: Chart, b: Chart, names: [string, string], ages: [number | null, number | null], l: Locale): PairReadings {
  const lenses = PAIR_LENSES.map((lens) => ({
    lens,
    intro: pick(INTRO[lens](palaceName(LENS_PALACE[lens], l)), l),
    sides: [side(a, b, names, lens, l), side(b, a, [names[1], names[0]], lens, l)] as [PairSide, PairSide],
    prompts: prompts(a, b, names, lens, l),
  }));
  const ma = mainsOf(a, "menh")?.mains ?? [];
  const mb = mainsOf(b, "menh")?.mains ?? [];
  const common = ma.filter((m) => mb.includes(m)).map((m) => STAR_INFO[m].vi);
  const menhText = common.length
    ? pick(
        {
          ja: `二人の命宮には共通の星（${join(common, l)}）があります。似た持ち味を持つ組み合わせと読まれます。`,
          en: `Both Mệnh palaces hold ${join(common, l)} — traditionally read as a similar temperament.`,
          vi: `Cả hai cung Mệnh đều có ${join(common, l)} — theo truyền thống là có khí chất tương đồng.`,
        },
        l,
      )
    : pick(
        {
          ja: "二人の命宮の星は異なります。持ち味の違いは、役割を分け合える組み合わせとして読むこともできます。",
          en: "Your Mệnh palaces hold different stars. Different temperaments can also be read as roles you can share out.",
          vi: "Hai cung Mệnh có các sao khác nhau. Khí chất khác nhau cũng có thể là dịp chia sẻ vai trò.",
        },
        l,
      );
  return { version: PAIR_VERSION, lenses, menh: { text: menhText, a: stars(ma, l), b: stars(mb, l) }, timing: timing(a, b, names, ages, l) };
}
