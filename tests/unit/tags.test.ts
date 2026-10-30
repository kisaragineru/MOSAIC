import { describe, expect, it } from "vitest";
import { hashtags, mergeTags, normalizeTag, similarTags, suggestTags, tagKey, tagQuery } from "@/lib/tags";

describe("one spelling per meaning", () => {
  it("stores a tag trimmed, without #, in one width and case", () => {
    expect(normalizeTag("  #Georg  Jensen ")).toBe("georg jensen");
    expect(normalizeTag("ＡＢＣ")).toBe("abc");
    expect(normalizeTag("#".repeat(3))).toBe("");
  });

  it("compares spellings loosely: kana, width, accents, spaces and dots", () => {
    expect(tagKey("ブランド")).toBe(tagKey("ぶらんど"));
    expect(tagKey("ﾌﾞﾗﾝﾄﾞ")).toBe(tagKey("ブランド"));
    expect(tagKey("Tử Vi")).toBe(tagKey("tu vi"));
    expect(tagKey("好き・ブランド")).toBe(tagKey("好きブランド"));
  });

  it("points out tags already used that look like a new one, most used first", () => {
    const known = [{ tag: "好きなブランド", n: 5 }, { tag: "ぶらんど", n: 1 }, { tag: "旅行", n: 3 }];
    expect(similarTags("ブランド", known).map((x) => x.tag)).toEqual(["ぶらんど", "好きなブランド"]);
    expect(similarTags("好きなブランド", known)).toEqual([{ tag: "ぶらんど", n: 1 }]);
    expect(similarTags("映画", known)).toEqual([]);
  });

  it("suggests what starts with the typed text, then what contains it; the most used with nothing typed", () => {
    const known = [{ tag: "好きなブランド", n: 5 }, { tag: "ブランド古着", n: 2 }, { tag: "旅行", n: 3 }];
    expect(suggestTags("ぶら", known).map((x) => x.tag)).toEqual(["ブランド古着", "好きなブランド"]);
    expect(suggestTags("", known, ["旅行"]).map((x) => x.tag)).toEqual(["好きなブランド", "ブランド古着"]);
  });
});

describe("#tags in the text", () => {
  it("are tags, up to a space or punctuation, not in C# or as bare numbers", () => {
    expect(hashtags("Georg Jensen #好きなブランド。#旅行、また行きたい")).toEqual(["好きなブランド", "旅行"]);
    expect(hashtags("I write C# and that's #1")).toEqual([]);
    expect(hashtags("＃全角 #Mixed_Case")).toEqual(["全角", "mixed_case"]);
  });

  it("join the typed tags, each once, typed first, at most 20", () => {
    expect(mergeTags(["旅行"], "京都 #旅行 #紅葉")).toEqual(["旅行", "紅葉"]);
    expect(mergeTags([], Array.from({ length: 25 }, (_, i) => `#t${i}`).join(" "))).toHaveLength(20);
  });

  it("finds the #… being typed before the caret", () => {
    expect(tagQuery("今日 #ぶら", 6)).toEqual({ start: 3, query: "ぶら" });
    expect(tagQuery("#", 1)).toEqual({ start: 0, query: "" });
    expect(tagQuery("C#", 2)).toBeNull();
    expect(tagQuery("#旅行 です", 6)).toBeNull();
  });
});
