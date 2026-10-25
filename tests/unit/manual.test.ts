import { describe, expect, it } from "vitest";
import { AXES, AXIS_CHAPTER } from "@/content/axes";
import { MANUAL } from "@/content/manual-axes";
import { MANUAL_SECTIONS } from "@/content/manual-text";
import type { TendencyKey } from "@/content/questions";
import { composeManual, type ManualInput } from "@/server/services/manual";

const LOCALES = ["ja", "en", "vi"] as const;
const tri = (s: string) => ({ ja: s, en: s, vi: s });

function emptyInput(): ManualInput {
  return { name: "Hana", bio: null, claims: [], peers: { responders: 0, windows: [], comments: [] }, answers: [], prefs: [], memories: [], tuvi: null };
}

/** A well-answered user: every axis clear, likes, a story, plans, and two friends' views. */
function fullInput(): ManualInput {
  const d = emptyInput();
  d.bio = "東京で働いています。週末は山とパン屋めぐり。";
  d.claims = AXES.map((key, i) => ({ key, direction: i % 2 === 0 ? 1 : -1, state: "consistent", confidence: 0.6 + i / 100, evidence: 5, rejected: false, userNote: null }));
  d.peers = {
    responders: 2,
    windows: AXES.map((key, i) => ({ key, self: i % 2 === 0 ? 1 : -1, lean: i < 3 ? (i % 2 === 0 ? 1 : -1) : i === 3 ? 1 : 0, window: i < 3 ? "open" : i === 3 ? "different" : "hidden" })),
    comments: [{ text: "話をよく聞いてくれる人です。", name: "Ken" }],
  };
  d.answers = [
    { questionId: "l.season", prompt: tri("好きな季節は？"), chapter: "likes", category: "hobbies", label: tri("秋"), isText: false, answeredAt: "2026-10-01", changedFrom: null },
    { questionId: "s.proud_recent", prompt: tri("最近誇らしかったことは？"), chapter: "story", category: "past", label: tri("初めてフルマラソンを完走した"), isText: true, answeredAt: "2026-10-02", changedFrom: null },
    { questionId: "s.bucket", prompt: tri("いつかやりたいことは？"), chapter: "story", category: "future", label: tri("ベトナムを縦断する旅"), isText: true, answeredAt: "2026-10-03", changedFrom: null },
    { questionId: "v.money", prompt: tri("お金より時間？"), chapter: "life", category: "values", label: tri("時間"), isText: false, answeredAt: "2026-10-04", changedFrom: tri("お金") },
  ];
  d.prefs = [{ label: "コーヒー", sentiment: "love" }, { label: "人混み", sentiment: "dislike" }];
  d.memories = [
    { kind: "achievement", labels: ["achievement"], title: "資格に合格", body: "半年かけて勉強した。", date: "2026-03-01", sealedUntil: null },
    { kind: "goal", labels: ["goal"], title: "英語で発表する", body: null, date: "2026-05-01", sealedUntil: null },
    { kind: "letter_to_future", labels: [], title: null, body: null, date: "2026-05-02", sealedUntil: "2027-05-02" },
  ];
  d.tuvi = { summary: "命宮（子）: 紫微", keywords: ["気品", "統率"], paragraphs: ["命宮に紫微があり、伝統的には落ち着いた気品と結びつけられます。"], now: "▶ 現在 · 数え年 26〜35歳：大限は財帛宮" };
  return d;
}

describe("manual content", () => {
  it("has text for every axis, both poles, in every language", () => {
    for (const key of AXES) {
      const m = MANUAL[key];
      expect(m, key).toBeDefined();
      for (const l of LOCALES) {
        expect(m!.mixed[l].length, `${key}.mixed.${l}`).toBeGreaterThan(20);
        for (const pole of ["pos", "neg"] as const) {
          const p = m![pole];
          for (const part of ["portrait", "thrive", "ask", "watch"] as const) expect(p[part][l].trim().length, `${key}.${pole}.${part}.${l}`).toBeGreaterThan(l === "ja" ? 30 : 50);
        }
      }
      // A portrait is a paragraph, not a line.
      expect(m!.pos.portrait.ja.length).toBeGreaterThanOrEqual(80);
      expect(m!.neg.portrait.ja.length).toBeGreaterThanOrEqual(80);
    }
  });

  it("never states a verdict", () => {
    for (const key of AXES)
      for (const pole of ["pos", "neg"] as const)
        for (const part of ["portrait", "thrive", "watch"] as const) {
          expect(MANUAL[key]![pole][part].en).not.toMatch(/\byou (always|never|must)\b/i);
          expect(MANUAL[key]![pole][part].ja).not.toMatch(/必ず|絶対/);
        }
  });

  it("writes the ask lines in the reader's own voice", () => {
    for (const key of AXES) for (const pole of ["pos", "neg"] as const) expect(MANUAL[key]![pole].ask.en, `${key}.${pole}`).toMatch(/\b(I|I'm|I'd|me|my)\b/);
  });
});

describe("composeManual", () => {
  it("lays out every section in order, all written for a well-answered user", () => {
    const m = composeManual(fullInput(), "ja");
    expect(m.sections.filter((s) => s.locked).map((s) => s.id)).toEqual([]);
    expect(m.stats.written).toBe(m.stats.sections);
    expect(m.sections.map((s) => s.id)).toEqual([...MANUAL_SECTIONS]);
    expect(m.sections.every((s) => s.blocks.length > 0 && s.title)).toBe(true);
  });

  it("is a 5,000–10,000 character read for a well-answered user, in Japanese", () => {
    const m = composeManual(fullInput(), "ja");
    expect(m.chars).toBeGreaterThanOrEqual(5000);
    expect(m.chars).toBeLessThanOrEqual(10000);
    expect(m.minutes).toBe(Math.round(m.chars / 500));
    expect(m.stats).toMatchObject({ axesKnown: 17, axes: 17, responders: 2, answers: 4, memories: 3 });
  });

  it("writes one card per known axis, in the right chapter and on the right pole", () => {
    const m = composeManual(fullInput(), "en");
    for (const ch of ["self", "mind", "people", "life"] as const) {
      const s = m.sections.find((x) => x.id === ch)!;
      const cards = s.blocks.filter((b) => b.t === "axis");
      expect(cards.length).toBe(AXES.filter((k) => AXIS_CHAPTER[k] === ch).length);
      for (const c of cards) if (c.t === "axis") expect(AXIS_CHAPTER[c.key]).toBe(ch);
    }
    const first = m.sections.find((x) => x.id === "self")!.blocks.find((b) => b.t === "axis" && b.key === AXES[0]!);
    expect(first).toMatchObject({ portrait: MANUAL[AXES[0]!]!.pos.portrait.en, level: "consistent", badge: "Clear" });
    const second = m.sections.flatMap((s) => s.blocks).find((b) => b.t === "axis" && b.key === AXES[1]!);
    expect(second).toMatchObject({ portrait: MANUAL[AXES[1]!]!.neg.portrait.en });
  });

  it("adds what others said beside the axis", () => {
    const m = composeManual(fullInput(), "ja");
    const cards = m.sections.flatMap((s) => s.blocks).filter((b) => b.t === "axis");
    const open = cards.find((b) => b.t === "axis" && b.key === AXES[0]!);
    const diff = cards.find((b) => b.t === "axis" && b.key === AXES[3]!);
    expect(open && open.t === "axis" && open.extra[0]).toMatch(/同じように見ている/);
    expect(diff && diff.t === "axis" && diff.extra[0]).toMatch(/一方で/);
    const others = m.sections.find((s) => s.id === "others")!;
    expect(others.blocks.some((b) => b.t === "quote" && b.cite === "Ken")).toBe(true);
  });

  it("starts with the clearest three and the bio", () => {
    const m = composeManual(fullInput(), "ja");
    const s = m.sections.find((x) => x.id === "summary")!;
    const list = s.blocks.find((b) => b.t === "list");
    expect(list && list.t === "list" && list.items).toHaveLength(3);
    expect(s.blocks.some((b) => b.t === "quote" && b.text.includes("パン屋"))).toBe(true);
  });

  it("leaves out an axis the user rejected, everywhere", () => {
    const d = fullInput();
    const key: TendencyKey = AXES[0]!;
    d.claims[0] = { ...d.claims[0]!, rejected: true };
    const m = composeManual(d, "en");
    const all = m.sections.flatMap((s) => s.blocks);
    expect(all.some((b) => b.t === "axis" && b.key === key)).toBe(false);
    const tips = m.sections.find((s) => s.id === "tips")!.blocks.find((b) => b.t === "list");
    expect(tips && tips.t === "list" && tips.items).not.toContain(MANUAL[key]!.pos.ask.en);
    expect(all.some((b) => b.t === "note" && b.text.includes("doesn't describe you"))).toBe(true);
    expect(m.stats.axesKnown).toBe(16);
  });

  it("uses the both-sides text for a mixed axis, without a pole", () => {
    const d = fullInput();
    d.claims[2] = { ...d.claims[2]!, state: "mixed" };
    const card = composeManual(d, "ja").sections.flatMap((s) => s.blocks).find((b) => b.t === "axis" && b.key === AXES[2]!);
    expect(card).toMatchObject({ level: "mixed", portrait: MANUAL[AXES[2]!]!.mixed.ja });
    expect(card && card.t === "axis" && card.thrive).toBeUndefined();
  });

  it("keeps a sealed letter sealed and shows a changed answer", () => {
    const m = composeManual(fullInput(), "ja");
    const future = m.sections.find((s) => s.id === "future")!;
    expect(future.blocks.some((b) => b.t === "note" && b.text.includes("2027-05-02"))).toBe(true);
    const changes = m.sections.find((s) => s.id === "changes")!;
    expect(changes.blocks.some((b) => b.t === "kv" && b.items[0]!.v.includes("「お金」から「時間」へ"))).toBe(true);
  });

  it("strips the 'now' marker from the Tử Vi cycle line", () => {
    const s = composeManual(fullInput(), "ja").sections.find((x) => x.id === "tuvi")!;
    const now = s.blocks.find((b) => b.t === "kv" && b.items[0]!.k.includes("大限"));
    expect(now && now.t === "kv" && now.items[0]!.v).toBe("数え年 26〜35歳：大限は財帛宮");
  });

  it("still reads well for someone who has just started", () => {
    for (const l of LOCALES) {
      const m = composeManual(emptyInput(), l);
      expect(m.sections.map((s) => s.id)).toEqual([...MANUAL_SECTIONS]);
      expect(m.stats.axesKnown).toBe(0);
      const unknown = m.sections.find((s) => s.id === "unknown")!.blocks.find((b) => b.t === "list");
      expect(unknown && unknown.t === "list" && unknown.items).toHaveLength(17);
      expect(m.sections.find((s) => s.id === "tuvi")!.blocks.some((b) => b.t === "locked" && b.href === "/tuvi")).toBe(true);
      for (const id of ["summary", "self", "mind", "people", "life", "likes", "tips", "tuvi"]) expect(m.sections.find((s) => s.id === id)!.locked, `${l}:${id}`).toBe(true);
      expect(m.minutes).toBeGreaterThanOrEqual(1);
    }
  });

  it("ends with the story: episodes built only from what the user answered and recorded", () => {
    const d = fullInput();
    d.tuvi = { ...d.tuvi!, yearName: "Canh Ngọ", napAm: "Lộ Bàng Thổ", persona: "頭の回転が速い作戦参謀タイプ", cycleTopic: "仕事・キャリア" };
    const m = composeManual(d, "ja");
    const novel = m.sections.at(-1)!;
    expect(novel.id).toBe("novel");
    expect(novel.blocks.find((b) => b.t === "storyTitle")).toMatchObject({ title: "『Hanaの物語』" });
    const eps = novel.blocks.filter((b) => b.t === "episode");
    const titles = eps.map((b) => (b.t === "episode" ? b.title : ""));
    expect(titles[0]).toBe("プロローグ");
    expect(titles).toContain("第2話　選んできた道");
    expect(titles).toContain("第3話　いまのHana");
    expect(titles).toContain("第4話　まだ見ぬ明日へ");
    expect(titles.at(-1)).toBe("エピローグ");
    const text = JSON.stringify(novel);
    expect(text).toContain("Canh Ngọの年、Hanaは生まれた。");
    expect(text).toContain("最近、Hanaは小さな誇りを手にした。「初めてフルマラソンを完走した」");
    expect(text).toContain("2026年3月。「資格に合格」——Hanaにとって、それはひとつの到達点だった。");
    expect(text).toContain("Hanaには、いつか叶えたいことがある。「ベトナムを縦断する旅」");
    expect(text).toContain("暦の上では、いまは「仕事・キャリア」がテーマの十年なのだという。");
    expect(text).toContain("2027-05-02に開く手紙が一通");
    expect(text).toContain("——つづく。");
    expect(novel.scope).toBe("personal");
  });

  it("starts a story even with nothing, and says where episode one will come from", () => {
    for (const l of LOCALES) {
      const novel = composeManual(emptyInput(), l).sections.at(-1)!;
      const eps = novel.blocks.filter((b) => b.t === "episode").map((b) => (b.t === "episode" ? b.title : ""));
      expect(eps).toHaveLength(3); // prologue, now, epilogue
      expect(novel.blocks.some((b) => b.t === "locked" && b.href === "/memories/new")).toBe(true);
    }
    const en = composeManual(emptyInput(), "en").sections.at(-1)!;
    expect(JSON.stringify(en)).toContain("When and where Hana was born, this story does not yet know.");
  });
});

