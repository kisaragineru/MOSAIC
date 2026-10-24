import { describe, expect, it } from "vitest";
import { othersLean, windowOf } from "@/lib/johari";

describe("Johari window", () => {
  it("places each combination of self view and others' view", () => {
    expect(windowOf(1, { pos: 2, neutral: 1, neg: 0 })).toBe("open");
    expect(windowOf(-1, { pos: 0, neutral: 0, neg: 3 })).toBe("open");
    expect(windowOf(1, { pos: 0, neutral: 0, neg: 2 })).toBe("different");
    expect(windowOf(1, { pos: 1, neutral: 0, neg: 1 })).toBe("hidden"); // a tie is no side
    expect(windowOf(1, { pos: 0, neutral: 3, neg: 0 })).toBe("hidden");
    expect(windowOf(0, { pos: 2, neutral: 0, neg: 1 })).toBe("blind");
    expect(windowOf(0, { pos: 0, neutral: 2, neg: 0 })).toBe("unknown");
    expect(windowOf(0, { pos: 0, neutral: 0, neg: 0 })).toBe("unknown");
    expect(windowOf(-1, { pos: 0, neutral: 0, neg: 0 })).toBe("hidden");
  });
  it("leans only on a strict majority between the two poles", () => {
    expect(othersLean({ pos: 3, neutral: 5, neg: 2 })).toBe(1);
    expect(othersLean({ pos: 2, neutral: 0, neg: 2 })).toBe(0);
  });
});
