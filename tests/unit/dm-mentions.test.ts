import { describe, expect, it } from "vitest";
import { insertMention, mentionParts, mentionQuery } from "@/lib/dm-mentions";

describe("mentions while typing", () => {
  it("finds the @… just before the caret, not in an e-mail address or across a line", () => {
    expect(mentionQuery("おはよう@ハ", 6)).toEqual({ start: 4, query: "ハ" });
    expect(mentionQuery("@", 1)).toEqual({ start: 0, query: "" });
    expect(mentionQuery("hello @so", 9)).toEqual({ start: 6, query: "so" });
    expect(mentionQuery("mail x@y", 8)).toBeNull();
    expect(mentionQuery("@ハナ\nまた", 6)).toBeNull();
    expect(mentionQuery("no at here", 5)).toBeNull();
  });

  it("writes @name and a space in place of what was typed, the caret after it", () => {
    const at = mentionQuery("明日@ハ 行く", 4)!;
    expect(insertMention("明日@ハ 行く", at, "ハナコ")).toEqual({ text: "明日@ハナコ  行く", caret: 7 });
  });
});

describe("mentions in a message", () => {
  it("marks the names it mentions, the longest first, and @all when it says so", () => {
    expect(mentionParts("@ハナコ と @ハナ、どう？", ["ハナ", "ハナコ"], false)).toEqual([
      { mention: true, text: "@ハナコ" },
      { mention: false, text: " と " },
      { mention: true, text: "@ハナ" },
      { mention: false, text: "、どう？" },
    ]);
    expect(mentionParts("@全員 集合", [], true)).toEqual([{ mention: true, text: "@全員" }, { mention: false, text: " 集合" }]);
    expect(mentionParts("@全員 集合", [], false)).toEqual([{ mention: false, text: "@全員 集合" }]);
  });
});
