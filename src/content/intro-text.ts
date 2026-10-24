/**
 * Sentences for the intro MOSAIC drafts: first person, in two tones. Each takes facts the user
 * gave (a tendency, an answer, a favourite) and never adds anything they didn't.
 */
import type { I18nText } from "./questions";

export type IntroTone = "polite" | "casual";
export type IntroLength = "one" | "short" | "long";
type T2 = Record<IntroTone, I18nText>;

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const listEn = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);
const listVi = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} và ${xs.at(-1)}`);

export const INTRO = {
  first: (p: I18nText): T2 => ({
    polite: { ja: `${p.ja}タイプです。`, en: `I'm someone who ${p.en}.`, vi: `Tôi là người ${p.vi}.` },
    casual: { ja: `${p.ja}タイプ。`, en: `Someone who ${p.en}.`, vi: `Mình là người ${p.vi}.` },
  }),
  also: (p: I18nText): T2 => ({
    polite: { ja: `${p.ja}ところもあります。`, en: `I'm also someone who ${p.en}.`, vi: `Tôi cũng là người ${p.vi}.` },
    casual: { ja: `${p.ja}ところもある。`, en: `Also someone who ${p.en}.`, vi: `Mình cũng ${p.vi}.` },
  }),
  third: (p: I18nText): T2 => ({
    polite: { ja: `どちらかといえば、${p.ja}ほうです。`, en: `If anything, I'm someone who ${p.en}.`, vi: `Nếu phải nói thêm, tôi là người ${p.vi}.` },
    casual: { ja: `どちらかといえば${p.ja}ほう。`, en: `And if anything, someone who ${p.en}.`, vi: `Nếu nói thêm thì mình ${p.vi}.` },
  }),
  /** Sentences for a few "likes" answers; a is the answer's label in each language. */
  likes: {
    "l.season": (a: I18nText): T2 => ({
      polite: { ja: `好きな季節は${a.ja}です。`, en: `My favourite season is ${lower(a.en)}.`, vi: `Mùa tôi thích nhất là ${lower(a.vi)}.` },
      casual: { ja: `好きな季節は${a.ja}。`, en: `Favourite season: ${lower(a.en)}.`, vi: `Mùa mình thích nhất là ${lower(a.vi)}.` },
    }),
    "l.place_relax": (a: I18nText): T2 => ({
      polite: { ja: `いちばんくつろげるのは${a.ja}です。`, en: `I relax best ${lower(a.en)}.`, vi: `Tôi thư giãn tốt nhất ${lower(a.vi)}.` },
      casual: { ja: `いちばんくつろげるのは${a.ja}。`, en: `I'm happiest ${lower(a.en)}.`, vi: `Mình thư giãn tốt nhất ${lower(a.vi)}.` },
    }),
    "l.weekend_morning": (a: I18nText): T2 => ({
      polite: { ja: `週末の朝は「${a.ja}」が好きです。`, en: `My ideal weekend morning: ${lower(a.en)}.`, vi: `Sáng cuối tuần, tôi thích ${lower(a.vi)}.` },
      casual: { ja: `週末の朝は${a.ja}派。`, en: `Weekend mornings mean ${lower(a.en)}.`, vi: `Sáng cuối tuần là phải ${lower(a.vi)}.` },
    }),
    "l.gift_receive": (a: I18nText): T2 => ({
      polite: { ja: `いちばんうれしい贈り物は${a.ja}です。`, en: `The gift that makes me happiest is ${lower(a.en)}.`, vi: `Món quà làm tôi vui nhất là ${lower(a.vi)}.` },
      casual: { ja: `うれしい贈り物は${a.ja}。`, en: `Best gift: ${lower(a.en)}.`, vi: `Quà mình thích nhất là ${lower(a.vi)}.` },
    }),
  } as Record<string, (a: I18nText) => T2>,
  favourites: (xs: string[]): T2 => ({
    polite: { ja: `好きなものは${xs.join("や")}です。`, en: `I love ${listEn(xs)}.`, vi: `Tôi thích ${listVi(xs)}.` },
    casual: { ja: `好きなのは${xs.join("とか")}。`, en: `Big fan of ${listEn(xs)}.`, vi: `Mình mê ${listVi(xs)}.` },
  }),
  tuvi: (persona: I18nText): T2 => ({
    polite: { ja: `Tử Vi では「${persona.ja}」と出ました。`, en: `Tử Vi calls me “${persona.en}”.`, vi: `Theo Tử Vi, tôi là “${persona.vi}”.` },
    casual: { ja: `Tử Vi によると「${persona.ja}」らしい。`, en: `According to Tử Vi, I'm “${persona.en}”.`, vi: `Tử Vi bảo mình là “${persona.vi}”.` },
  }),
  closing: {
    polite: { ja: "どうぞよろしくお願いします。", en: "Nice to meet you.", vi: "Rất vui được làm quen." },
    casual: { ja: "よろしく！", en: "Say hi!", vi: "Làm quen nhé!" },
  } as T2,
  empty: {
    polite: { ja: "MOSAICを始めたばかりです。これから少しずつ、自分のことを書いていきます。", en: "I've only just started on MOSAIC — more about me soon.", vi: "Tôi vừa mới bắt đầu dùng MOSAIC — sẽ sớm có thêm về tôi." },
    casual: { ja: "MOSAICはじめたばかり。これから少しずつ。", en: "New here — more soon.", vi: "Mình mới dùng MOSAIC — từ từ sẽ có thêm." },
  } as T2,
};
