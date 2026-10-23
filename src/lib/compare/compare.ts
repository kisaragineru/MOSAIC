/**
 * Deterministic comparison of two people's CONSENTED data. No overall score is produced.
 *
 *  1. Tử Vi (traditional): relations between birth-year stems/branches, Nạp Âm elements and
 *     Mệnh palace branches. Presented as traditional associations, not predictions.
 *  2. Preferences & values: same / partly shared / different for questions BOTH answered.
 *     Questions only one person answered are listed separately and never count as different.
 *  3. Conversation hints derived from differences and shared points.
 */
import type { I18nText } from "@/content/questions";
import type { Answer } from "@/lib/discovery/answers";
import { BRANCHES, elementRelation, ELEMENT_NAMES, STEMS, type Element } from "@/lib/tuvi/canchi";

export const COMPARE_ENGINE_VERSION = "compare-1";

export interface TuviSummary {
  yearStem: number;
  yearBranch: number;
  napAmElement: Element;
  menhBranch: number | null;
}

export interface Observation {
  ruleId: string;
  text: I18nText;
}

const TAM_HOP = [
  [8, 0, 4],
  [2, 6, 10],
  [5, 9, 1],
  [11, 3, 7],
];
const LUC_HOP: [number, number][] = [[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]];
const LUC_HAI: [number, number][] = [[0, 7], [1, 6], [2, 5], [3, 4], [8, 11], [9, 10]];
const TU_HANH_XUNG = [[2, 8, 5, 11], [0, 6, 3, 9], [4, 10, 1, 7]];
const CAN_HOP: [number, number][] = [[0, 5], [1, 6], [2, 7], [3, 8], [4, 9]];
const CAN_XUNG: [number, number][] = [[0, 6], [1, 7], [2, 8], [3, 9]];

const pairIn = (pairs: [number, number][], a: number, b: number) =>
  pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

export type BranchRelation = "same" | "tam_hop" | "luc_hop" | "luc_xung" | "tu_hanh_xung" | "luc_hai" | "neutral";

export function branchRelation(a: number, b: number): BranchRelation {
  if (a === b) return "same";
  if (TAM_HOP.some((g) => g.includes(a) && g.includes(b))) return "tam_hop";
  if (pairIn(LUC_HOP, a, b)) return "luc_hop";
  if ((a + 6) % 12 === b) return "luc_xung";
  if (TU_HANH_XUNG.some((g) => g.includes(a) && g.includes(b))) return "tu_hanh_xung";
  if (pairIn(LUC_HAI, a, b)) return "luc_hai";
  return "neutral";
}

const BRANCH_TEXT: Record<BranchRelation, I18nText> = {
  same: { en: "share the same branch — traditionally read as similar rhythms and habits.", vi: "cùng một chi — theo truyền thống là có nhịp sống, thói quen tương đồng." },
  tam_hop: { en: "are in Tam Hợp (three harmonies) — traditionally read as naturally cooperative.", vi: "nằm trong Tam Hợp — theo truyền thống là dễ hợp tác, bổ trợ nhau." },
  luc_hop: { en: "are in Lục Hợp (six harmonies) — traditionally read as a close, complementary bond.", vi: "là Lục Hợp — theo truyền thống là gắn bó, bổ sung cho nhau." },
  luc_xung: { en: "are in Lục Xung (direct opposition) — traditionally read as different temperaments that need patience and talk.", vi: "là Lục Xung — theo truyền thống là hai tính khí khác biệt, cần kiên nhẫn và trò chuyện." },
  tu_hanh_xung: { en: "are in the same Tứ Hành Xung group — traditionally read as friction points worth discussing openly.", vi: "cùng nhóm Tứ Hành Xung — theo truyền thống là có điểm va chạm, nên thẳng thắn trao đổi." },
  luc_hai: { en: "are in Lục Hại — traditionally read as small misunderstandings to watch for.", vi: "là Lục Hại — theo truyền thống là dễ có hiểu lầm nhỏ, cần để ý." },
  neutral: { en: "have no special traditional relation — read as neutral.", vi: "không có quan hệ đặc biệt theo truyền thống — xem là trung tính." },
};

export function compareTuvi(a: TuviSummary, b: TuviSummary, names: [string, string]): Observation[] {
  const obs: Observation[] = [];
  const yr = branchRelation(a.yearBranch, b.yearBranch);
  obs.push({
    ruleId: `year_branch.${yr}`,
    text: {
      en: `Birth-year branches ${BRANCHES[a.yearBranch]} (${names[0]}) and ${BRANCHES[b.yearBranch]} (${names[1]}) ${BRANCH_TEXT[yr].en}`,
      vi: `Chi năm sinh ${BRANCHES[a.yearBranch]} (${names[0]}) và ${BRANCHES[b.yearBranch]} (${names[1]}) ${BRANCH_TEXT[yr].vi}`,
    },
  });
  if (pairIn(CAN_HOP, a.yearStem, b.yearStem)) {
    obs.push({
      ruleId: "year_stem.hop",
      text: {
        en: `Stems ${STEMS[a.yearStem]} and ${STEMS[b.yearStem]} form a traditional stem combination (Thiên Can hợp).`,
        vi: `Can ${STEMS[a.yearStem]} và ${STEMS[b.yearStem]} là Thiên Can hợp theo truyền thống.`,
      },
    });
  } else if (pairIn(CAN_XUNG, a.yearStem, b.yearStem)) {
    obs.push({
      ruleId: "year_stem.xung",
      text: {
        en: `Stems ${STEMS[a.yearStem]} and ${STEMS[b.yearStem]} are traditionally considered clashing (Thiên Can xung).`,
        vi: `Can ${STEMS[a.yearStem]} và ${STEMS[b.yearStem]} theo truyền thống là Thiên Can xung.`,
      },
    });
  }
  const er = elementRelation(a.napAmElement, b.napAmElement);
  const ea = ELEMENT_NAMES[a.napAmElement];
  const eb = ELEMENT_NAMES[b.napAmElement];
  const elementText: Record<typeof er, I18nText> = {
    same: { en: `Both have ${ea.en} (${ea.vi}) Nạp Âm — traditionally "bình hòa", a balanced pairing.`, vi: `Cả hai cùng mệnh ${ea.vi} — theo truyền thống là bình hòa.` },
    a_generates_b: { en: `${names[0]}'s ${ea.en} traditionally nourishes ${names[1]}'s ${eb.en} (tương sinh).`, vi: `Mệnh ${ea.vi} của ${names[0]} sinh mệnh ${eb.vi} của ${names[1]} (tương sinh).` },
    b_generates_a: { en: `${names[1]}'s ${eb.en} traditionally nourishes ${names[0]}'s ${ea.en} (tương sinh).`, vi: `Mệnh ${eb.vi} của ${names[1]} sinh mệnh ${ea.vi} của ${names[0]} (tương sinh).` },
    a_controls_b: { en: `${names[0]}'s ${ea.en} traditionally restrains ${names[1]}'s ${eb.en} (tương khắc) — read as a reminder to balance influence.`, vi: `Mệnh ${ea.vi} của ${names[0]} khắc mệnh ${eb.vi} của ${names[1]} (tương khắc) — nên chú ý cân bằng.` },
    b_controls_a: { en: `${names[1]}'s ${eb.en} traditionally restrains ${names[0]}'s ${ea.en} (tương khắc) — read as a reminder to balance influence.`, vi: `Mệnh ${eb.vi} của ${names[1]} khắc mệnh ${ea.vi} của ${names[0]} (tương khắc) — nên chú ý cân bằng.` },
  };
  obs.push({ ruleId: `nap_am.${er}`, text: elementText[er] });
  if (a.menhBranch !== null && b.menhBranch !== null) {
    const mr = branchRelation(a.menhBranch, b.menhBranch);
    obs.push({
      ruleId: `menh_branch.${mr}`,
      text: {
        en: `Mệnh palaces at ${BRANCHES[a.menhBranch]} and ${BRANCHES[b.menhBranch]} ${BRANCH_TEXT[mr].en}`,
        vi: `Cung Mệnh tại ${BRANCHES[a.menhBranch]} và ${BRANCHES[b.menhBranch]} ${BRANCH_TEXT[mr].vi}`,
      },
    });
  } else {
    obs.push({
      ruleId: "menh_branch.unknown",
      text: {
        en: "At least one birth time is unknown, so Mệnh palaces are not compared.",
        vi: "Ít nhất một người chưa có giờ sinh nên không so sánh cung Mệnh.",
      },
    });
  }
  return obs;
}

export interface ComparableAnswer {
  questionId: string;
  answer: Answer;
}
export interface QuestionMeta {
  id: string;
  category: string;
  prompt: I18nText;
  format: string;
  options: { value: string; label: I18nText }[] | null;
}

export type ItemKind = "same" | "partly_shared" | "different";
export interface PreferenceItem {
  questionId: string;
  kind: ItemKind;
  a: Answer;
  b: Answer;
  shared?: string[];
}

export interface PreferenceComparison {
  items: PreferenceItem[];
  /** Questions one person answered (and shared) but the other didn't: NOT a mismatch. */
  onlyA: string[];
  onlyB: string[];
}

export function comparePreferences(a: ComparableAnswer[], b: ComparableAnswer[]): PreferenceComparison {
  const am = new Map(a.map((x) => [x.questionId, x.answer]));
  const bm = new Map(b.map((x) => [x.questionId, x.answer]));
  const items: PreferenceItem[] = [];
  for (const [qid, av] of [...am].sort(([x], [y]) => x.localeCompare(y))) {
    const bv = bm.get(qid);
    if (!bv) continue;
    if ("choice" in av && "choice" in bv) {
      items.push({ questionId: qid, kind: av.choice === bv.choice ? "same" : "different", a: av, b: bv });
    } else if ("choices" in av && "choices" in bv) {
      const shared = av.choices.filter((c) => bv.choices.includes(c));
      const same = shared.length === av.choices.length && shared.length === bv.choices.length;
      items.push({ questionId: qid, kind: same ? "same" : shared.length ? "partly_shared" : "different", a: av, b: bv, shared });
    } else if ("scale" in av && "scale" in bv) {
      const d = Math.abs(av.scale - bv.scale);
      items.push({ questionId: qid, kind: d === 0 ? "same" : d === 1 ? "partly_shared" : "different", a: av, b: bv });
    }
  }
  return {
    items,
    onlyA: [...am.keys()].filter((q) => !bm.has(q)).sort(),
    onlyB: [...bm.keys()].filter((q) => !am.has(q)).sort(),
  };
}

const HINTS: Record<string, I18nText> = {
  "r.love_language": {
    en: "You feel cared for in different ways. Try showing care in the way the other person named, not only your own.",
    vi: "Hai bạn cảm nhận sự quan tâm theo cách khác nhau. Hãy thử thể hiện quan tâm theo cách người kia mong muốn.",
  },
  "r.reply_speed": {
    en: "Your expectations about reply speed differ. Agreeing on what a slow reply means can prevent worry.",
    vi: "Kỳ vọng về tốc độ trả lời tin nhắn khác nhau. Thống nhất ý nghĩa của việc trả lời chậm sẽ giúp tránh lo lắng.",
  },
  "p.recharge": {
    en: "You recharge differently. Planning both shared time and time apart can help.",
    vi: "Hai bạn nạp năng lượng theo cách khác nhau. Hãy sắp xếp cả thời gian bên nhau lẫn thời gian riêng.",
  },
  "p.disagree": {
    en: "You handle disagreements differently. Talk about how each of you prefers to resolve a conflict before the next one.",
    vi: "Cách xử lý bất đồng khác nhau. Hãy nói trước về cách mỗi người muốn giải quyết mâu thuẫn.",
  },
  "w.bonus": {
    en: "You'd use unexpected money differently. A calm talk about saving and enjoying could be useful.",
    vi: "Cách dùng khoản tiền bất ngờ khác nhau. Một cuộc trò chuyện nhẹ nhàng về tiết kiệm và hưởng thụ sẽ hữu ích.",
  },
  "t.itinerary": {
    en: "Your travel planning styles differ. One of you could plan the key parts and leave free time for the other.",
    vi: "Phong cách lên kế hoạch du lịch khác nhau. Một người có thể lo phần chính, chừa thời gian tự do cho người kia.",
  },
  "p.weekend_plan": {
    en: "You approach free time differently. Alternate who decides the weekend.",
    vi: "Cách dùng thời gian rảnh khác nhau. Hãy thay phiên nhau quyết định cuối tuần.",
  },
  "fut.where_live": {
    en: "You picture different places to live. It may be worth exploring what each place means to you.",
    vi: "Hai bạn hình dung nơi sống khác nhau. Hãy tìm hiểu ý nghĩa của nơi đó với mỗi người.",
  },
};

export function conversationHints(pref: PreferenceComparison, meta: Map<string, QuestionMeta>): Observation[] {
  const hints: Observation[] = [];
  for (const item of pref.items) {
    if (item.kind === "different" && HINTS[item.questionId]) {
      hints.push({ ruleId: `hint.diff.${item.questionId}`, text: HINTS[item.questionId]! });
    }
  }
  const sharedCats = new Set(
    pref.items.filter((i) => i.kind !== "different").map((i) => meta.get(i.questionId)?.category).filter(Boolean),
  );
  if (sharedCats.has("food")) {
    hints.push({ ruleId: "hint.shared.food", text: { en: "You share some food tastes — a meal you both like is an easy plan.", vi: "Hai bạn có khẩu vị chung — một bữa ăn cả hai cùng thích là kế hoạch dễ dàng." } });
  }
  if (sharedCats.has("music") || sharedCats.has("hobbies")) {
    hints.push({ ruleId: "hint.shared.hobby", text: { en: "You share interests in music or hobbies — a natural topic to start with.", vi: "Hai bạn có chung sở thích âm nhạc hoặc giải trí — chủ đề tự nhiên để bắt đầu." } });
  }
  if (pref.onlyA.length + pref.onlyB.length > 0) {
    hints.push({
      ruleId: "hint.unanswered",
      text: {
        en: "Some questions were answered by only one of you. They are not differences — just things you haven't compared yet.",
        vi: "Có câu hỏi chỉ một người trả lời. Đó không phải khác biệt — chỉ là điều hai bạn chưa so sánh.",
      },
    });
  }
  if (hints.length === 0) {
    hints.push({
      ruleId: "hint.none",
      text: {
        en: "There isn't much shared data yet. Answering a few more daily questions (and allowing them in comparisons) will give more to talk about.",
        vi: "Chưa có nhiều dữ liệu chung. Trả lời thêm vài câu hỏi hằng ngày (và cho phép dùng để so sánh) sẽ có thêm điều để trò chuyện.",
      },
    });
  }
  return hints;
}
