import { describe, expect, it } from "vitest";
import { en } from "@/lib/i18n/messages/en";
import { ja } from "@/lib/i18n/messages/ja";
import { answerQuestion } from "@/server/services/discovery";
import { portrait, tileViews } from "@/server/services/mosaic";
import { saveBirthProfile } from "@/server/services/tuvi";
import { makeUser } from "../helpers/factory";

const pick = (userId: string, questionId: string, choice: string) => answerQuestion(userId, { questionId, questionVersion: 1, answer: { choice } });

describe("mosaic portrait", () => {
  it("starts empty: 17 axis tiles and 3 more, nothing revealed", async () => {
    const u = await makeUser();
    const p = await portrait(u.userId);
    expect(p.tiles).toHaveLength(20);
    expect(p.axes).toBe(17);
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
    expect(tileViews(await portrait(u.userId), ja, "ja").find((v) => v.id === "planning")!.body).toMatch(/あと2問/);
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
    expect(v.href).toBe("/discover/chapter/self");
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
  });
});
