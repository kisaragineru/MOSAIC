import { describe, expect, it } from "vitest";
import { anniversaries } from "@/server/services/pair-history";

describe("connection anniversaries", () => {
  it("day 100, then each year, up to today", () => {
    expect(anniversaries("2025-06-24", "2025-10-01")).toEqual([]);
    expect(anniversaries("2025-06-24", "2025-10-02")).toEqual([{ kind: "days100", on: "2025-10-02" }]);
    expect(anniversaries("2024-06-24", "2026-07-01")).toEqual([
      { kind: "days100", on: "2024-10-02" },
      { kind: "years", on: "2025-06-24", n: 1 },
      { kind: "years", on: "2026-06-24", n: 2 },
    ]);
  });
  it("29 February is kept on 28 February in other years", () => {
    expect(anniversaries("2024-02-29", "2025-03-01").at(-1)).toEqual({ kind: "years", on: "2025-02-28", n: 1 });
    expect(anniversaries("2024-02-29", "2028-02-29").at(-1)).toEqual({ kind: "years", on: "2028-02-29", n: 4 });
  });
});
