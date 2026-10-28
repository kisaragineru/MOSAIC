import { describe, expect, it } from "vitest";
import { inferLabels } from "@/lib/labels";

describe("what a post is about, from its words", () => {
  it.each([
    ["資格試験に合格できた！半年がんばった。", ["achievement"]],
    ["来年はひとり旅に行くと決めた。", ["decision"]],
    ["いつかオーロラを見てみたい。", ["dream"]],
    ["もっと早く連絡すればよかった。", ["regret"]],
    ["家族との時間を一番大切にしたい。", ["value"]],
    ["友だちと海に行った。夕日がきれいだった。", ["memory"]],
    ["今日はなんだか不安で眠れない。", ["feeling"]],
    ["仕事のやり方、少し変えたほうがいい気がする。", ["thought"]],
    ["I finally passed the exam and I'm so happy.", ["achievement", "feeling"]],
    ["I should have called her sooner.", ["regret"]],
    ["Tôi đã quyết định học tiếng Nhật.", ["decision"]],
  ])("%s", (text, labels) => {
    expect(inferLabels(text)).toEqual(labels);
  });

  it("everyday things: light labels when nothing deeper is read, a passing word otherwise", () => {
    expect(inferLabels("お昼はカレー。")).toEqual(["daily"]);
    expect(inferLabels("牛乳と卵、忘れないようにメモ")).toEqual(["memo"]);
    expect(inferLabels("猫の寝相で爆笑した")).toEqual(["fun"]);
    expect(inferLabels("駅前に好きなパン屋を見つけた")).toEqual(["like"]);
    expect(inferLabels("ねむい")).toEqual(["note"]);
    expect(inferLabels("lol my cat")).toEqual(["fun"]);
    expect(inferLabels("see www.example.com")).toEqual(["note"]);
  });

  it("deeper labels come first; a liked thing stays beside them; the light ones give way", () => {
    expect(inferLabels("今日は不安で眠れない。")).toEqual(["feeling"]);
    expect(inferLabels("友だちとカフェに行った。好きな店になった。")).toEqual(["memory", "like"]);
  });

  it("counts a photo as a memory, and leaves an empty post without a label", () => {
    expect(inferLabels("", { hasMedia: true })).toEqual(["memory"]);
    expect(inferLabels("   ")).toEqual([]);
  });
});
