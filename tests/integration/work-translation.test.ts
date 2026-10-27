import { describe, expect, it, vi } from "vitest";

// The AI returns its input with "[vi]" in front of every string (enough to see what was translated).
const calls = vi.hoisted(() => ({ n: 0 }));
vi.mock("@/server/ai/claude", () => ({
  aiConfigured: () => true,
  AI_MODEL: "test",
  generateStructured: async ({ user }: { user: string }) => {
    calls.n++;
    const tag = (v: unknown): unknown => (typeof v === "string" ? (v ? `[vi] ${v}` : v) : Array.isArray(v) ? v.map(tag) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, tag(x)])) : v);
    return { ok: true, data: tag(JSON.parse(user)) };
  },
}));

import { saveBirthProfile } from "@/server/services/tuvi";
import { handOver, makeWork, revokeLink, translatedWork } from "@/server/services/works";
import { makeUser } from "../helpers/factory";

describe("a work read in the reader's language", () => {
  it("is translated once per link and kept; not for the same language; gone with the link", async () => {
    const hana = await makeUser("Hana");
    await saveBirthProfile(hana.userId, { calendarInput: "solar", solarDate: "1990-06-07", timeKnown: true, birthTime: "06:30", timeZone: "Asia/Ho_Chi_Minh", sex: "female" });
    const workId = await makeWork(hana.userId, "ja", { title: "ハナの物語", answerIds: [] });
    const { id, token } = await handOver(hana.userId, workId, { recipient: "リン", note: "読んでほしくて", days: 14 });

    expect(await translatedWork(token, null, "ja", true)).toBeNull(); // written in Japanese
    expect(await translatedWork(token, null, "vi", false)).toBeNull(); // not asked for yet
    const tr = (await translatedWork(token, null, "vi", true))!;
    expect(tr.title).toBe("[vi] ハナの物語");
    expect(tr.note).toBe("[vi] 読んでほしくて");
    expect(tr.content.episodes[0]!.paragraphs[0]).toMatch(/^\[vi\] /);
    expect(tr.content.name).toBe("Hana"); // names stay
    const n = calls.n;
    expect((await translatedWork(token, null, "vi", false))!.title).toBe("[vi] ハナの物語");
    expect((await translatedWork(token, null, "vi", true))!.title).toBe("[vi] ハナの物語");
    expect(calls.n).toBe(n); // kept, not translated again

    await revokeLink(hana.userId, id);
    expect(await translatedWork(token, null, "vi", true)).toBeNull();
  });
});
