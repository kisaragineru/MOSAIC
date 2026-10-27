import { describe, expect, it } from "vitest";
import { answerLabel, scaleWord, scaleWords } from "@/lib/discovery/format";
import { LOCALIZED_BANK } from "@/content/questions-i18n";

const q = (id: string) => LOCALIZED_BANK.find((x) => x.id === id)!;

describe("a 1–5 answer in words", () => {
  it("each question answered in its own terms", () => {
    expect(answerLabel(q("p.lists"), { scale: 5 }, "ja")).toBe("とても安心する");
    expect(answerLabel(q("ax.social_weekend"), { scale: 1 }, "ja")).toBe("感じない");
    expect(answerLabel(q("ax.pace_act"), { scale: 3 }, "en")).toBe("Sometimes");
    expect(answerLabel(q("ax.det_mistakes"), { scale: 4 }, "ja")).toBe("やや当てはまる");
    expect(answerLabel(q("p.risk"), { scale: 4 }, "ja")).toBe("ややそう思う");
    expect(answerLabel(q("f.spicy"), { scale: 5 }, "ja")).toBe("辛いほどいい");
    expect(answerLabel(q("c.mood_week"), { scale: 2 }, "vi")).toBe("Hơi khó khăn");
    // Unknown question: still words, never a bare number.
    expect(answerLabel(null, { scale: 3 }, "ja")).toBe("どちらともいえない");
    expect(scaleWord(undefined, 9, "ja")).toBe("とてもそう思う");
  });

  it("every scale question has five distinct words in every language", () => {
    for (const x of LOCALIZED_BANK.filter((x) => x.format === "scale")) {
      const w = scaleWords(x);
      expect(w).toHaveLength(5);
      for (const l of ["ja", "en", "vi"] as const) {
        for (const y of w) expect(y[l]).toBeTruthy();
        expect(new Set(w.map((y) => y[l])).size).toBe(5);
      }
    }
  });
});
