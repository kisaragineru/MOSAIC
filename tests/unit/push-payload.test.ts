import { describe, expect, it } from "vitest";
import { pushPayload, type PushTarget } from "@/server/services/push";

const base: PushTarget = {
  user_id: "u", locale: "ja", endpoint: "https://push.example/x", p256dh: "k", auth: "a",
  conversation_id: "c1", conv_kind: "direct", conv_title: null, sender_name: "ソラ", msg_kind: "text", body: null,
};

describe("what a message notification says", () => {
  it("only who wrote, unless the reader chose to see the text", () => {
    expect(pushPayload(base)).toEqual({ title: "MOSAIC", body: "ソラさんからメッセージ", url: "/messages/c1", tag: "dm-c1" });
    expect(pushPayload({ ...base, body: "今どこ？" }).body).toBe("ソラさんからメッセージ\n今どこ？");
  });

  it("names the group, in the reader's language; photos and records say what they are", () => {
    expect(pushPayload({ ...base, conv_kind: "group", conv_title: "旅行" }).body).toBe("旅行：ソラさんからメッセージ");
    expect(pushPayload({ ...base, locale: "en", conv_kind: "group", conv_title: null, sender_name: "Sora" }).body).toBe("Group: a message from Sora");
    expect(pushPayload({ ...base, locale: "vi", msg_kind: "image", sender_name: "Mai" }).body).toBe("Tin nhắn từ Mai\n📷 Ảnh");
    expect(pushPayload({ ...base, msg_kind: "record" }).body).toBe("ソラさんからメッセージ\n📄 記録");
  });
});
