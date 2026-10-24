import { describe, expect, it } from "vitest";
import { composeKnowledge, LEVELS, levelOf, type KnowledgeInput } from "@/server/services/knowledge";

const empty: KnowledgeInput = { answers: 0, records: 0, preferences: 0, bio: false, tuvi: false, peers: 0, claims: [], likesAnswered: 0 };

describe("what MOSAIC knows", () => {
  it("starts at a blank canvas and suggests the closest, most useful steps", () => {
    const k = composeKnowledge(empty);
    expect(k).toMatchObject({ pieces: 0, level: 0, from: 0, to: LEVELS[1], axesKnown: 0, axes: 17 });
    expect(k.next.map((a) => a.kind)).toEqual(["axis", "tuvi", "record"]);
    expect(k.next[0]).toMatchObject({ kind: "axis", key: "social_energy", need: 3 });
  });

  it("weighs each kind of information and caps preferences", () => {
    const k = composeKnowledge({ ...empty, answers: 12, records: 3, preferences: 50, bio: true, tuvi: true, peers: 2 });
    expect(k.pieces).toBe(12 + 3 + 20 + 3 + 10 + 10);
    expect(k.level).toBe(2); // 58 pieces: 30–59
    expect(k.next.map((a) => a.kind)).toEqual(["axis", "likes"]);
  });

  it("points at the axis that needs the fewest answers", () => {
    const k = composeKnowledge({ ...empty, claims: [{ key: "planning", evidence: 2, known: false }, { key: "calm", evidence: 1, known: false }, { key: "social_energy", evidence: 3, known: true }] });
    expect(k.next[0]).toMatchObject({ kind: "axis", key: "planning", chapter: "self", need: 1 });
    expect(k.axesKnown).toBe(1);
  });

  it("has levels that only go up, and a top", () => {
    let last = -1;
    for (let p = 0; p <= 400; p += 5) {
      const l = levelOf(p);
      expect(l.level).toBeGreaterThanOrEqual(last);
      last = l.level;
      if (l.to !== null) expect(p).toBeLessThan(l.to);
    }
    expect(levelOf(10_000)).toMatchObject({ level: LEVELS.length - 1, to: null });
  });
});
