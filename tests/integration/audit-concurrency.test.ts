import { describe, expect, it } from "vitest";
import { answerQuestion, getHistory } from "@/server/services/discovery";
import { listTendencies } from "@/server/services/tendencies";
import { makeUser } from "../helpers/factory";

describe("AUD-04: concurrent answers from one user", () => {
  it("parallel answers that touch the same tendency all succeed and all are stored", async () => {
    const u = await makeUser();
    const qs = [
      { questionId: "p.weekend_plan", answer: { choice: "plan" } },
      { questionId: "p.lists", answer: { scale: 5 } },
      { questionId: "t.itinerary", answer: { choice: "detailed" } },
      { questionId: "p.recharge", answer: { choice: "alone" } },
      { questionId: "p.party", answer: { scale: 1 } },
    ];
    const results = await Promise.allSettled(qs.map((q) => answerQuestion(u.userId, { ...q, questionVersion: 1 })));
    const failed = results.filter((r) => r.status === "rejected").map((r) => String((r as PromiseRejectedResult).reason?.code ?? (r as PromiseRejectedResult).reason));
    expect(failed).toEqual([]);
    expect((await getHistory(u.userId)).length).toBe(5);
    // The final claims must reflect ALL committed answers, not the last writer's view.
    const claims = await listTendencies(u.userId);
    expect(claims.find((c) => c.claimKey === "planning")).toMatchObject({ evidenceCount: 3, supportCount: 3 });
    expect(claims.find((c) => c.claimKey === "social_energy")).toMatchObject({ evidenceCount: 2, direction: -1 });
  });
});
