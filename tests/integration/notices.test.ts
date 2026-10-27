import { describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { dismissNotices, questionClosedStreak, visibleNotices } from "@/server/services/notices";
import { withUser } from "@/server/db/tx";
import { makeUser } from "../helpers/factory";

const back = (userId: string, key: string, days: number) =>
  withUser(userId, (tx) => tx.execute(sql`update notice_dismissals set until = until - make_interval(days => ${days}), created_at = created_at - make_interval(days => ${days}) where user_id = ${userId} and key = ${key}`));

describe("Home's notices: closed ones stay away by their kind", () => {
  it("something waiting on you comes back once, three days later; closed again, it's gone", async () => {
    const { userId } = await makeUser("Hana");
    const ref = { key: "peer:1", kind: "action" as const };
    expect([...(await visibleNotices(userId, [ref]))]).toEqual(["peer:1"]);
    await dismissNotices(userId, [ref], "2026-10-27");
    expect((await visibleNotices(userId, [ref])).size).toBe(0);
    await back(userId, "peer:1", 3);
    expect((await visibleNotices(userId, [ref])).size).toBe(1);
    await dismissNotices(userId, [ref], "2026-10-30");
    await back(userId, "peer:1", 365);
    expect((await visibleNotices(userId, [ref])).size).toBe(0);
  });

  it("a coming day comes back on the day; news and habits are gone when closed", async () => {
    const { userId } = await makeUser("Hana");
    const day = { key: "date:x:2099-01-10", kind: "dated" as const, on: "2099-01-10" };
    await dismissNotices(userId, [day, { key: "news:1", kind: "once" }, { key: "question:2026-10-27", kind: "habit" }], "2026-10-27");
    const [row] = (await withUser(userId, (tx) => tx.execute<{ until: string }>(sql`select until from notice_dismissals where user_id = ${userId} and key = ${day.key}`))).rows;
    expect(new Date(row!.until).toISOString()).toBe("2099-01-10T00:00:00.000Z");
    expect((await visibleNotices(userId, [{ key: "news:1", kind: "once" }, { key: "question:2026-10-27", kind: "habit" }])).size).toBe(0);
    // Closed on its day: gone.
    await dismissNotices(userId, [{ key: "date:y:2026-10-27", kind: "dated", on: "2026-10-27" }], "2026-10-27");
    expect((await visibleNotices(userId, [{ key: "date:y:2026-10-27", kind: "dated" }])).size).toBe(0);
  });

  it("a week of closing today's question asks once whether to keep it", async () => {
    const { userId } = await makeUser("Hana");
    for (let i = 0; i < 6; i++) await dismissNotices(userId, [{ key: `question:2026-10-${20 + i}`, kind: "habit" }], "2026-10-27");
    expect(await questionClosedStreak(userId)).toBe(false);
    await dismissNotices(userId, [{ key: "question:2026-10-26", kind: "habit" }], "2026-10-27");
    expect(await questionClosedStreak(userId)).toBe(true);
    // Answered (kept): not asked again until another week of closing.
    await dismissNotices(userId, [{ key: "question-ask:2026-10-27", kind: "once" }], "2026-10-27");
    expect(await questionClosedStreak(userId)).toBe(false);
  });
});
