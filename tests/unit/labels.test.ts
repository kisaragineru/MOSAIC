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

  it("leaves plain notes alone, and counts a photo as a memory", () => {
    expect(inferLabels("お昼はカレー。")).toEqual([]);
    expect(inferLabels("", { hasMedia: true })).toEqual(["memory"]);
  });
});
