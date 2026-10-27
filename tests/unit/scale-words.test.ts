import { describe, expect, it } from "vitest";
import { answerLabel, scaleWord, scaleWords } from "@/lib/discovery/format";
import { LOCALIZED_BANK } from "@/content/questions-i18n";

describe("a 1–5 answer in words", () => {
  it("agreement by default; spicy food and the week in their own words", () => {
    const agree = LOCALIZED_BANK.find((q) => q.id === "p.lists")!;
    expect(answerLabel(agree, { scale: 4 }, "ja")).toBe("ややそう思う");
    expect(answerLabel(agree, { scale: 1 }, "en")).toBe("Not like me");
    expect(answerLabel(LOCALIZED_BANK.find((q) => q.id === "f.spicy"), { scale: 5 }, "ja")).toBe("辛いほどいい");
    expect(answerLabel(LOCALIZED_BANK.find((q) => q.id === "c.mood_week"), { scale: 2 }, "vi")).toBe("Hơi khó khăn");
    // Unknown question: still words, never a bare number.
    expect(answerLabel(null, { scale: 3 }, "ja")).toBe("どちらともいえない");
    expect(scaleWord(undefined, 9, "ja")).toBe("そう思う");
  });

  it("every scale question has five words in every language", () => {
    for (const q of LOCALIZED_BANK.filter((x) => x.format === "scale")) {
      const w = scaleWords(q.scale);
      expect(w).toHaveLength(5);
      for (const x of w) for (const l of ["ja", "en", "vi"] as const) expect(x[l]).toBeTruthy();
    }
  });
});
