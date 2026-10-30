import { describe, expect, it } from "vitest";
import { getMemory, listMemories } from "@/server/services/memories";
import { createShare, giveConsent, openComparison, revokeComparison } from "@/server/services/sharing";
import { answerTopic, closeTopic, listTopics, sendTopic, topicInbox } from "@/server/services/topics";
import { makeUser } from "../helpers/factory";

async function pair() {
  const hana = await makeUser("ハナ");
  const sora = await makeUser("ソラ");
  const s = await openComparison(sora.userId, (await createShare(hana.userId)).token);
  await giveConsent(hana.userId, s, { scopes: [], agree: true });
  await giveConsent(sora.userId, s, { scopes: [], agree: true });
  return { hana, sora, s };
}

describe("topics to answer each other", () => {
  it("show the other's answer only once both have answered; each answer is its writer's own private record", async () => {
    const { hana, sora, s } = await pair();
    const id = await sendTopic(hana.userId, s, { preset: "embarrassing", answer: "改札で人の背中にぶつかった" }, "ja");
    // Before Sora answers: Hana sees her own answer only, Sora sees neither.
    expect(await listTopics(hana.userId, s, "ja")).toMatchObject([{ id, sent: true, prompt: "過去イチ恥ずかしかった話", status: "open", myBody: "改札で人の背中にぶつかった", theirBody: null }]);
    expect(await listTopics(sora.userId, s, "en")).toMatchObject([{ id, sent: false, prompt: "The most embarrassing thing that ever happened to you", status: "open", myBody: null, theirBody: null }]);
    expect((await topicInbox(sora.userId, "ja")).map((x) => [x.kind, x.otherName])).toEqual([["received", "ハナ"]]);

    await answerTopic(sora.userId, s, id, "発表で名前を噛んだ", "ja");
    expect(await listTopics(hana.userId, s, "ja")).toMatchObject([{ status: "answered", myBody: "改札で人の背中にぶつかった", theirBody: "発表で名前を噛んだ" }]);
    expect(await listTopics(sora.userId, s, "ja")).toMatchObject([{ status: "answered", myBody: "発表で名前を噛んだ", theirBody: "改札で人の背中にぶつかった" }]);
    expect((await topicInbox(hana.userId, "ja")).map((x) => x.kind)).toEqual(["matched"]);

    // Each answer: a private record titled and tagged with the topic (the sender's wording).
    const mine = (await listTopics(sora.userId, s, "ja"))[0]!.myEntry!;
    expect(await getMemory(sora.userId, mine)).toMatchObject({ title: "過去イチ恥ずかしかった話", body: "発表で名前を噛んだ", tags: ["過去イチ恥ずかしかった話"], visibility: "private" });
    // Answered once: not again.
    await expect(answerTopic(sora.userId, s, id, "x", "ja")).rejects.toMatchObject({ code: "topic_closed" });
  });

  it("keep at most three waiting for one person, leaving no stray record behind", async () => {
    const { hana, s } = await pair();
    for (const preset of ["laughed", "proud", "song"]) await sendTopic(hana.userId, s, { preset, answer: "a" }, "ja");
    const before = (await listMemories(hana.userId)).length;
    await expect(sendTopic(hana.userId, s, { prompt: "#自由なお題", answer: "b" }, "ja")).rejects.toMatchObject({ code: "topic_limit" });
    expect((await listMemories(hana.userId)).length).toBe(before);
    await expect(sendTopic(hana.userId, s, { prompt: "", answer: "b" }, "ja")).rejects.toMatchObject({ code: "topic_required" });
    await expect(sendTopic(hana.userId, s, { preset: "song", answer: " " }, "ja")).rejects.toMatchObject({ code: "answer_required" });
  });

  it("can be passed by the other person, or taken back by the sender while unanswered", async () => {
    const { hana, sora, s } = await pair();
    const a = await sendTopic(hana.userId, s, { prompt: "好きな朝ごはん", answer: "納豆" }, "ja");
    const b = await sendTopic(hana.userId, s, { preset: "trip", answer: "屋久島" }, "ja");
    await closeTopic(sora.userId, a, "passed");
    await expect(closeTopic(sora.userId, b, "canceled")).rejects.toMatchObject({ code: "not_found" });
    await closeTopic(hana.userId, b, "canceled");
    expect((await listTopics(hana.userId, s, "ja")).map((x) => [x.prompt, x.status])).toEqual([["好きな朝ごはん", "passed"]]);
    await expect(answerTopic(sora.userId, s, a, "ごはん", "ja")).rejects.toMatchObject({ code: "topic_closed" });
  });

  it("are only between people still connected, and never readable by anyone else", async () => {
    const { hana, sora, s } = await pair();
    const stranger = await makeUser("Stranger");
    await sendTopic(hana.userId, s, { preset: "trip", answer: "屋久島" }, "ja");
    await expect(listTopics(stranger.userId, s, "ja")).rejects.toMatchObject({ code: "not_found" });
    await revokeComparison(sora.userId, s);
    await expect(listTopics(hana.userId, s, "ja")).rejects.toMatchObject({ code: "not_connected" });
    await expect(sendTopic(hana.userId, s, { preset: "song", answer: "a" }, "ja")).rejects.toMatchObject({ code: "not_connected" });
    expect(await topicInbox(sora.userId, "ja")).toEqual([]);
  });
});
