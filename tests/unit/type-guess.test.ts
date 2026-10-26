import { describe, expect, it } from "vitest";
import { AXES_NEEDED, guessType, TYPE_PROFILE, type GuessClaim } from "@/lib/tuvi/type-guess";

const claimsFor = (profile: GuessClaim["key"][], dirs: Record<string, 1 | -1>, state: GuessClaim["state"] = "consistent"): GuessClaim[] =>
  profile.map((key) => ({ key, direction: dirs[key] ?? 1, state, rejected: false }));

describe("MOSAIC's type judgment from answers", () => {
  it("settles nothing with few answers, and shows how far along it is", () => {
    expect(guessType([])).toEqual({ types: [], progress: 0, known: 0 });
    const g = guessType([{ key: "social_energy", direction: 1, state: "consistent", rejected: false }]);
    expect(g.types).toEqual([]);
    expect(g.progress).toBeGreaterThan(0);
    expect(g.progress).toBeLessThan(100);
  });

  it("settles a type once enough axes agree with it", () => {
    const sun = TYPE_PROFILE.thai_duong as Record<string, 1 | -1>;
    // The sun's four axes, plus two neutral-to-it answers to reach the axes needed.
    const claims = [...claimsFor(Object.keys(sun) as GuessClaim["key"][], sun), ...claimsFor(["pace", "planning"], { pace: 1, planning: -1 })];
    expect(claims.length).toBeGreaterThanOrEqual(AXES_NEEDED);
    const g = guessType(claims);
    expect(g.types).toEqual(["thai_duong"]);
    expect(g.progress).toBe(100);
  });

  it("ignores rejected, mixed and unclear tendencies", () => {
    const sun = TYPE_PROFILE.thai_duong as Record<string, 1 | -1>;
    const claims = claimsFor(Object.keys(sun) as GuessClaim["key"][], sun).map((c) => ({ ...c, rejected: true }));
    expect(guessType(claims).known).toBe(0);
    expect(guessType(claimsFor(["pace"], {}, "mixed")).known).toBe(0);
  });

  it("never reaches 100% without settling", () => {
    // Enough axes, but they pull equally in many directions.
    const claims = claimsFor(["novelty", "risk", "calm", "saving", "giving", "detail"], { novelty: 1, risk: -1, calm: 1, saving: -1, giving: 1, detail: -1 });
    const g = guessType(claims);
    if (!g.types.length) expect(g.progress).toBeLessThan(100);
  });
});
