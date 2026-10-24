import { describe, expect, it } from "vitest";
import { PEER_POLES } from "@/content/axes";
import { composeIntro, type IntroFacts } from "@/server/services/intro";

const facts: IntroFacts = {
  traits: [PEER_POLES.planning.pos, PEER_POLES.novelty.pos, PEER_POLES.closeness.pos],
  likes: [
    { questionId: "l.season", label: { ja: "秋", en: "Autumn", vi: "Mùa thu" } },
    { questionId: "l.place_relax", label: { ja: "海", en: "By the sea", vi: "Bên biển" } },
  ],
  favourites: ["パン", "山歩き"],
  persona: { ja: "みんなをまとめる王様タイプ", en: "the natural leader", vi: "người dẫn dắt bẩm sinh" },
};
const none: IntroFacts = { traits: [], likes: [], favourites: [], persona: null };

describe("the intro MOSAIC drafts", () => {
  it("grows with the length, in the chosen tone", () => {
    expect(composeIntro(facts, "one", "polite", "ja")).toBe("先に計画を立てるタイプです。");
    expect(composeIntro(facts, "short", "polite", "ja")).toBe("先に計画を立てるタイプです。新しいものに飛びつくところもあります。好きな季節は秋です。");
    expect(composeIntro(facts, "short", "casual", "ja")).toBe("先に計画を立てるタイプ。新しいものに飛びつくところもある。好きな季節は秋。");
    const long = composeIntro(facts, "long", "polite", "ja");
    expect(long).toContain("どちらかといえば、少ない人と深くつきあうほうです。".replace("少ない人と深くつきあう", PEER_POLES.closeness.pos.ja));
    expect(long).toContain("いちばんくつろげるのは海です。");
    expect(long).toContain("好きなものはパンや山歩きです。");
    expect(long).toContain("Tử Vi では「みんなをまとめる王様タイプ」と出ました。");
    expect(long.endsWith("どうぞよろしくお願いします。")).toBe(true);
  });

  it("reads naturally in English and Vietnamese", () => {
    expect(composeIntro(facts, "short", "polite", "en")).toBe("I'm someone who plans ahead. I'm also someone who jumps at new things. My favourite season is autumn.");
    expect(composeIntro(facts, "one", "casual", "vi")).toBe(`Mình là người ${PEER_POLES.planning.pos.vi}.`);
  });

  it("says only what it was given", () => {
    expect(composeIntro(none, "long", "polite", "ja")).toBe("MOSAICを始めたばかりです。これから少しずつ、自分のことを書いていきます。");
    expect(composeIntro({ ...none, favourites: ["猫"] }, "one", "casual", "ja")).toBe("好きなのは猫。");
    const text = composeIntro({ ...none, traits: [PEER_POLES.calm.pos] }, "long", "polite", "en");
    expect(text).toBe(`I'm someone who ${PEER_POLES.calm.pos.en}.`);
  });
});
