import { afterEach, describe, expect, it } from "vitest";
import { companionWrites, createCompanion, deleteCompanion, listCompanions } from "@/server/services/dev-companion";
import { connectionFeed, shareTargets } from "@/server/services/memory-share";
import { listComparisons } from "@/server/services/sharing";
import { makeUser } from "../helpers/factory";

afterEach(() => {
  delete process.env.DEV_TOOLS;
});

describe("development test companion", () => {
  it("is refused unless DEV_TOOLS=on", async () => {
    const u = await makeUser();
    await expect(createCompanion(u.userId, "friend")).rejects.toMatchObject({ code: "forbidden" });
    expect(await listCompanions(u.userId)).toEqual([]);
  });

  it("connects to the owner and shares records by audience; it can write more and be removed", async () => {
    process.env.DEV_TOOLS = "on";
    const u = await makeUser("Owner");
    const other = await makeUser();
    const id = await createCompanion(u.userId, "family");
    const [c] = await listCompanions(u.userId);
    expect(c).toMatchObject({ id, name: "ミナ（テスト）" });
    expect((await listComparisons(u.userId))[0]).toMatchObject({ status: "active", otherName: "ミナ（テスト）" });
    expect((await shareTargets(u.userId))[0]!.circle).toBe("family");
    // The companion files the owner as a friend: everyone + friend-circle records, not family-only or private.
    const feed = await connectionFeed(u.userId);
    expect(feed).toHaveLength(2);
    expect(feed.some((x) => x.body.includes("自分だけの記録"))).toBe(false);
    await companionWrites(u.userId, id);
    expect(await connectionFeed(u.userId)).toHaveLength(3);
    // Not someone else's companion.
    await expect(companionWrites(other.userId, id)).rejects.toMatchObject({ code: "not_found" });
    await expect(deleteCompanion(other.userId, id)).rejects.toMatchObject({ code: "not_found" });
    await deleteCompanion(u.userId, id);
    expect(await listCompanions(u.userId)).toEqual([]);
    expect(await connectionFeed(u.userId)).toEqual([]);
  });
});
