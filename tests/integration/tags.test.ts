import { describe, expect, it } from "vitest";
import { createMemory, deleteTag, editMemory, getMemory, listMemories, listTags, renameTag, setMemoryFeeling, setTagNote, tagDetail } from "@/server/services/memories";
import { makeUser } from "../helpers/factory";

describe("record tags", () => {
  it("take #tags from the text, on writing and on editing", async () => {
    const me = await makeUser();
    const id = await createMemory(me.userId, { body: "Georg Jensen #好きなブランド", tags: ["Gift"] });
    expect((await getMemory(me.userId, id)).tags).toEqual(["gift", "好きなブランド"]);
    await editMemory(me.userId, id, { body: "Georg Jensen #好きなブランド #北欧", tags: ["gift"] });
    expect((await getMemory(me.userId, id)).tags).toEqual(["gift", "北欧", "好きなブランド"].sort());
  });

  it("show how much, over what time and with which feelings; a note of mine on each", async () => {
    const me = await makeUser();
    const a = await createMemory(me.userId, { body: "#好きなブランド Georg Jensen", occurredOn: "2026-01-10" });
    const b = await createMemory(me.userId, { body: "#好きなブランド Vivienne Westwood", occurredOn: "2026-10-30" });
    await createMemory(me.userId, { body: "#旅行 京都" });
    await setMemoryFeeling(me.userId, a, "happy");
    await setMemoryFeeling(me.userId, b, "happy");
    const tags = await listTags(me.userId);
    expect(tags[0]).toEqual({ tag: "好きなブランド", n: 2, last: "2026-10-30" });
    await setTagNote(me.userId, "#好きなブランド", "プレゼント選びの参考");
    expect(await tagDetail(me.userId, "好きなブランド")).toEqual({ tag: "好きなブランド", n: 2, first: "2026-01-10", last: "2026-10-30", feelings: { happy: 2 }, note: "プレゼント選びの参考" });
    await setTagNote(me.userId, "好きなブランド", "");
    expect((await tagDetail(me.userId, "好きなブランド")).note).toBeNull();
  });

  it("can be renamed, or merged into a tag already used (records with both keep one, notes join)", async () => {
    const me = await makeUser();
    const a = await createMemory(me.userId, { body: "x", tags: ["ブランド"] });
    const both = await createMemory(me.userId, { body: "y", tags: ["ブランド", "好きなブランド"] });
    await setTagNote(me.userId, "ブランド", "古いメモ");
    await setTagNote(me.userId, "好きなブランド", "新しいメモ");
    expect(await renameTag(me.userId, "ブランド", "好きなブランド")).toBe("好きなブランド");
    expect((await getMemory(me.userId, a)).tags).toEqual(["好きなブランド"]);
    expect((await getMemory(me.userId, both)).tags).toEqual(["好きなブランド"]);
    expect(await tagDetail(me.userId, "好きなブランド")).toMatchObject({ n: 2, note: "新しいメモ\n古いメモ" });
    expect((await listTags(me.userId)).map((x) => x.tag)).toEqual(["好きなブランド"]);
    await expect(renameTag(me.userId, "好きなブランド", "  ")).rejects.toMatchObject({ code: "invalid_tag" });
  });

  it("can be taken off every record, the records staying; only my own", async () => {
    const me = await makeUser();
    const other = await makeUser();
    const id = await createMemory(me.userId, { body: "#旅行 京都" });
    const theirs = await createMemory(other.userId, { body: "#旅行 大阪" });
    await deleteTag(me.userId, "旅行");
    expect((await getMemory(me.userId, id)).tags).toEqual([]);
    expect((await getMemory(other.userId, theirs)).tags).toEqual(["旅行"]);
    await renameTag(me.userId, "旅行", "おでかけ");
    expect((await getMemory(other.userId, theirs)).tags).toEqual(["旅行"]);
  });

  it("are searched with #: tags only, loosely", async () => {
    const me = await makeUser();
    await createMemory(me.userId, { body: "ブランドの話（タグなし）" });
    await createMemory(me.userId, { body: "Georg Jensen", tags: ["好きなブランド"] });
    expect((await listMemories(me.userId, { q: "#ぶらんど" })).map((m) => m.body)).toEqual(["Georg Jensen"]);
    expect((await listMemories(me.userId, { q: "ブランド" })).length).toBe(2);
  });
});
