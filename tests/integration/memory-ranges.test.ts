import { describe, expect, it } from "vitest";
import { countMemoriesInRanges, createMemory } from "@/server/services/memories";
import { makeUser } from "../helpers/factory";

describe("countMemoriesInRanges", () => {
  it("counts each range by timeline date, only for the owner", async () => {
    const a = await makeUser("Ranges");
    const b = await makeUser("Other");
    await createMemory(a.userId, { kind: "memory", body: "graduation", occurredOn: "2008-06-01" });
    await createMemory(a.userId, { kind: "memory", body: "first job", occurredOn: "2012-04-01" });
    await createMemory(a.userId, { kind: "thought", body: "edge", occurredOn: "2014-01-30" });
    await createMemory(b.userId, { kind: "memory", body: "not mine", occurredOn: "2008-06-01" });
    const counts = await countMemoriesInRanges(a.userId, [
      { from: "2004-01-22", to: "2014-01-30" },
      { from: "2014-01-31", to: "2024-02-09" },
      { from: "1994-02-10", to: "2004-01-21" },
    ]);
    expect(counts).toEqual([3, 0, 0]);
  });

  it("rejects malformed dates and returns nothing for no ranges", async () => {
    const a = await makeUser("Bad");
    await expect(countMemoriesInRanges(a.userId, [{ from: "2004-13-01", to: "x" }])).rejects.toThrow();
    expect(await countMemoriesInRanges(a.userId, [])).toEqual([]);
  });
});
