import { describe, expect, it } from "vitest";
import { en } from "@/lib/i18n/messages/en";
import { ja } from "@/lib/i18n/messages/ja";
import { answerQuestion, axisProgress } from "@/server/services/discovery";
import { QUESTION_BANK } from "@/content/questions";
import { chapterOf } from "@/content/axes";
import { portrait, tileViews, type ExtraTile } from "@/server/services/mosaic";
import { saveBirthProfile } from "@/server/services/tuvi";
import { makeUser } from "../helpers/factory";

const pick = (userId: string, questionId: string, choice: string) => answerQuestion(userId, { questionId, questionVersion: 1, answer: { choice } });

describe("mosaic portrait", () => {
  it("starts empty: 17 axis tiles and 3 more, nothing revealed", async () => {
    const u = await makeUser();
    const p = await portrait(u.userId);
    expect(p.tiles).toHaveLength(20);
    expect(p.total).toBe(20);
    expect(p.revealed).toBe(0);
    expect(p.tiles.every((t) => t.level === "empty")).toBe(true);
    const views = tileViews(p, ja, "ja");
    expect(views.find((v) => v.id === "planning")!.body).toMatch(/まだ手がかりがありません/);
  });

  it("fills a tile as agreeing answers come in, and leans it the right way", async () => {
    const u = await makeUser();
    await pick(u.userId, "p.weekend_plan", "plan");
    let tile = (await portrait(u.userId)).tiles.find((t) => t.kind === "axis" && t.key === "planning")!;
    expect(tile.level).toBe("gathering");
    const gathering = tileViews(await portrait(u.userId), ja, "ja").find((v) => v.id === "planning")!;
    expect(gathering.body).toMatch(/あと2問/);
    expect(gathering).toMatchObject({ badge: "あと2問", progress: [1, 3], icons: ["🗓️", "🌊"] });
    await pick(u.userId, "ax.plan_pack", "packed_list");
    await pick(u.userId, "ax.plan_deadline", "early");
    const p = await portrait(u.userId);
    tile = p.tiles.find((t) => t.kind === "axis" && t.key === "planning")!;
    expect(tile).toMatchObject({ level: "consistent", direction: 1, evidence: 3 });
    expect(p.revealed).toBe(1);
    const v = tileViews(p, en, "en").find((x) => x.id === "planning")!;
    expect(v.label).toBe("Planner");
    expect(v.body).toBe("You often prefer to plan ahead.");
    expect(v.evidenceHref).toBe("/insights#t-planning");
    expect(v.href).toBe("/discover/chapter/self?axis=planning");
    // A filled tile says how clearly it shows and which side, never that it is finished.
    expect(v).toMatchObject({ badge: "✓ Clear", icons: ["🗓️"], progress: null });
  });

  it("shows both sides when answers disagree", async () => {
    const u = await makeUser();
    await pick(u.userId, "p.weekend_plan", "plan");
    await pick(u.userId, "ax.plan_pack", "morning");
    await pick(u.userId, "ax.plan_deadline", "last");
    await pick(u.userId, "t.itinerary", "detailed");
    const p = await portrait(u.userId);
    const tile = p.tiles.find((t) => t.kind === "axis" && t.key === "planning")!;
    expect(tile).toMatchObject({ level: "mixed", direction: null, evidence: 4 });
    expect(tileViews(p, ja, "ja").find((v) => v.id === "planning")!.body).toMatch(/どちらの面も出ています/);
  });

  it("lights the Tử Vi tile once there is a chart", async () => {
    const u = await makeUser();
    await saveBirthProfile(u.userId, { calendarInput: "solar", solarDate: "1990-06-07", timeKnown: true, birthTime: "06:30", timeZone: "Asia/Ho_Chi_Minh", sex: "male" });
    const p = await portrait(u.userId);
    expect(p.tiles.find((t) => t.kind === "tuvi")!.level).toBe("consistent");
    expect(tileViews(p, ja, "ja").find((v) => v.id === "tuvi")!.badge).toBe("✓ 命盤あり");
  });

  it("counts a chapter tile by its own questions, not the three an axis needs", async () => {
    const u = await makeUser();
    const q = QUESTION_BANK.find((x) => !x.followUpOnly && x.active !== false && chapterOf(x) === "likes" && x.format === "single")!;
    await pick(u.userId, q.id, q.options![0]!.value);
    const p = await portrait(u.userId);
    const tile = p.tiles.find((t) => t.kind === "likes") as ExtraTile;
    const v = tileViews(p, ja, "ja").find((x) => x.id === "likes")!;
    const left = tile.total - tile.done;
    expect(v.badge).toBe(left <= 3 ? `あと${left}問` : `${tile.done}/${tile.total}`);
    expect(v.progress).toEqual([1, tile.total]);
  });

  it("counts every tile, Tử Vi and the chapters included, and focuses questions on one piece", async () => {
    const u = await makeUser();
    await pick(u.userId, "p.weekend_plan", "plan");
    const ap = await axisProgress(u.userId, "planning");
    expect(ap.answered).toBe(1);
    expect(ap.total).toBeGreaterThanOrEqual(3);
    const next = QUESTION_BANK.find((q) => q.id === ap.nextId)!;
    expect(next.signals?.some((x) => x.claimKey === "planning")).toBe(true);
    expect((await portrait(u.userId)).revealed).toBe(0);
    // A Tử Vi chart is a piece too: 1 of 20.
    await saveBirthProfile(u.userId, { calendarInput: "solar", solarDate: "1990-06-07", timeKnown: true, birthTime: "06:30", timeZone: "Asia/Ho_Chi_Minh", sex: "male" });
    const p = await portrait(u.userId);
    expect(p).toMatchObject({ revealed: 1, total: 20 });
  });
});
