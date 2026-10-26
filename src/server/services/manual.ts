/**
 * The self manual (取扱説明書): everything MOSAIC knows about you, written out as one piece of
 * reading. Nothing here is new data — it rearranges your answers, records, the tendencies derived
 * from them, what others said (as /me/others shows it) and your Tử Vi reading.
 *
 * gatherManual() reads; composeManual() is pure and does all the writing, so it can be tested
 * without a database.
 */
import { eq } from "drizzle-orm";
import { AXES, AXIS_CHAPTER, AXIS_LABEL, chapterOf, PEER_POLES, type Chapter } from "@/content/axes";
import { COMBOS } from "@/content/insight-combos";
import { PALACE_PLAIN } from "@/lib/tuvi/plain";
import type { MainStarId } from "@/lib/tuvi/stars";
import { MANUAL, type ManualPart } from "@/content/manual-axes";
import { RECORD_KIND, STORY, STORY_LINES } from "@/content/manual-story";
import { MANUAL_CHAPTERS, MANUAL_PHRASE as P, SECTION_TEXT, type ManualSectionId } from "@/content/manual-text";
import { LIKE_LINES, VOICE } from "@/content/manual-voice";
import { GIFT_HINTS } from "@/content/gift-hints";
import type { I18nText, TendencyKey } from "@/content/questions";
import type { Answer } from "@/lib/discovery/answers";
import { answerLabel } from "@/lib/discovery/format";
import { MIN_EVIDENCE } from "@/lib/discovery/tendency-model";
import type { Locale } from "@/lib/i18n/locales";
import type { Window } from "@/lib/johari";
import { profiles } from "../db/schema";
import { withUser } from "../db/tx";
import { getHistory } from "./discovery";
import { listMemories } from "./memories";
import { listPreferences } from "./people";
import { johari } from "./peers";
import { listTendencies, type ClaimState } from "./tendencies";
import { getTuvi } from "./tuvi";
import { typeInsight } from "./tuvi-type";
import { receivedGifts } from "./gift-boxes";

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

export type ManualBlock =
  | { t: "p"; text: string }
  | { t: "quote"; text: string; cite?: string }
  | { t: "list"; title?: string; items: string[] }
  | { t: "kv"; title?: string; items: { k: string; v: string }[] }
  | { t: "axis"; key: TendencyKey; name: string; pole: string; level: "consistent" | "emerging" | "mixed"; badge: string; portrait: string; thrive?: string; watch?: string; labels: { thrive: string; watch: string }; meta: string; extra: string[] }
  | { t: "note"; text: string }
  /** A chapter not written yet: a blurred sample, how far away it is, and where to go. */
  | { t: "locked"; text: string; sample: string; href: string; label: string }
  | { t: "link"; href: string; text: string }
  | { t: "episode"; key?: EpisodeKey; title: string; paragraphs: string[] }
  | { t: "storyTitle"; title: string; subtitle: string }
  /** The Tử Vi type(s) as pictures, with where the type comes from. */
  | { t: "types"; ids: MainStarId[]; caption: string };

export const EPISODES = ["prologue", "childhood", "path", "now", "future", "epilogue"] as const;
export type EpisodeKey = (typeof EPISODES)[number];

/** "core": built from answers and tendencies; "personal": your stories, plans and others' words. */
export type ManualScope = "core" | "personal" | "self";

export interface ManualSection {
  id: ManualSectionId;
  title: string;
  icon: string;
  scope: ManualScope;
  blocks: ManualBlock[];
  chars: number;
  /** Nothing written here yet. */
  locked: boolean;
}

export interface Manual {
  name: string;
  sections: ManualSection[];
  chars: number;
  minutes: number;
  stats: { answers: number; memories: number; axesKnown: number; axes: number; responders: number; written: number; sections: number };
}

export interface ManualClaim {
  key: TendencyKey;
  direction: 1 | -1;
  state: ClaimState;
  confidence: number;
  evidence: number;
  rejected: boolean;
  userNote: string | null;
}

export interface ManualAnswer {
  questionId: string;
  prompt: I18nText;
  chapter: Chapter;
  category: string;
  /** The answer as text in each locale (choices resolved to their labels). */
  label: I18nText;
  /** The chosen option values (empty for text and scale answers). */
  values?: string[];
  isText: boolean;
  answeredAt: string;
  /** When the user said their view changed: the previous answer. */
  changedFrom: I18nText | null;
}

export interface ManualInput {
  name: string;
  bio: string | null;
  claims: ManualClaim[];
  peers: { responders: number; windows: { key: TendencyKey; self: 1 | -1 | 0; lean: 1 | -1 | 0; window: Window }[]; comments: { text: string; name: string | null }[] };
  answers: ManualAnswer[];
  prefs: { label: string; sentiment: string }[];
  memories: { kind: string; labels: string[]; title: string | null; body: string | null; date: string; sealedUntil: string | null }[];
  /** Growth records from gift boxes this user received (parents' and grandparents' words). */
  gifts?: { from: string; date: string | null; title: string | null; body: string }[];
  /** The type: from the chart, MOSAIC's judgment from answers, a provisional lean, or the person's own pick. */
  types?: { ids: MainStarId[]; source: "chart" | "answers" | "provisional" | "picked" } | null;
  tuvi: {
    summary: string | null;
    keywords: string[];
    paragraphs: string[];
    now: string | null;
    /** For the story: the birth year's name, its Nạp Âm, Mệnh as a kind of person, the current decade's theme. */
    yearName?: string;
    napAm?: string;
    persona?: string;
    cycleTopic?: string;
  } | null;
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

const said = (c: ManualClaim | undefined) => !!c && !c.rejected && (c.state === "consistent" || c.state === "emerging");
const PEOPLE_FIRST: Chapter[] = ["people", "self", "mind", "life"];
const STORY_KINDS = ["achievement", "decision", "memory", "value", "regret"];
const FUTURE_KINDS = ["goal", "dream"];
const MAX_RECORDS = 6;
const clip = (s: string, max = 320) => (s.length > max ? `${s.slice(0, max)}…` : s);

/** Characters per minute of comfortable reading. */
const READING_RATE: Record<Locale, number> = { ja: 500, en: 1100, vi: 1000 };

function blockText(b: ManualBlock): string {
  switch (b.t) {
    case "p":
    case "note":
    case "quote":
      return b.text;
    case "list":
      return (b.title ?? "") + b.items.join("");
    case "kv":
      return (b.title ?? "") + b.items.map((i) => i.k + i.v).join("");
    case "axis":
      return b.name + b.portrait + (b.thrive ?? "") + (b.watch ?? "") + b.extra.join("");
    case "link":
    case "locked":
    case "types":
      return "";
    case "episode":
      return b.title + b.paragraphs.join("");
    case "storyTitle":
      return b.title + b.subtitle;
  }
}

export function composeManual(d: ManualInput, locale: Locale): Manual {
  const L = (t: I18nText) => t[locale];
  const claim = (k: TendencyKey) => d.claims.find((c) => c.key === k);
  const poleOf = (k: TendencyKey, dir: 1 | -1) => (dir === 1 ? PEER_POLES[k].pos : PEER_POLES[k].neg);
  const sections: ManualSection[] = [];
  const add = (id: ManualSectionId, scope: ManualScope, blocks: ManualBlock[]) => {
    const s = SECTION_TEXT[id];
    const all: ManualBlock[] = s.lead ? [{ t: "p", text: L(s.lead) }, ...blocks] : blocks;
    sections.push({ id, title: L(s.title), icon: s.icon, scope, blocks: all, chars: all.reduce((n, b) => n + blockText(b).length, 0), locked: blocks.some((b) => b.t === "locked") });
  };
  const peerWindow = (k: TendencyKey) => d.peers.windows.find((w) => w.key === k);
  const textAnswers = (pred: (a: ManualAnswer) => boolean) => d.answers.filter(pred);

  // 0. Introduction
  const records = d.memories.length;
  add("intro", "self", [
    { t: "p", text: L(P.introBody(d.name, d.answers.length, records)) },
    { t: "p", text: L(P.introHow) },
    // Their own words for the people who matter open the manual, as written.
    ...(d.bio?.trim() ? ([{ t: "p", text: L(VOICE.bioLead(d.name)) }, { t: "quote", text: clip(d.bio.trim(), 600) }] as ManualBlock[]) : []),
  ]);

  // 1. In a few words
  const top = d.claims
    .filter(said)
    .sort((a, b) => (a.state === b.state ? b.confidence - a.confidence || a.key.localeCompare(b.key) : a.state === "consistent" ? -1 : 1))
    .slice(0, 3);
  // MOSAIC's reading in its own words: one portrait from the tendencies, the Tử Vi type, how they
  // decide, what they love and what they're aiming for, rather than the answers quoted back.
  const answer = (id: string) => d.answers.find((a) => a.questionId === id);
  const likeLines = d.answers
    .filter((a) => LIKE_LINES[a.questionId] && a.values?.length)
    .map((a) => LIKE_LINES[a.questionId]!(d.name, a.values![0]!, a.label))
    .filter((x): x is I18nText => !!x)
    .map(L);
  const portrait: string[] = [];
  if (top.length) {
    portrait.push(L(VOICE.traits(d.name, top.map((c) => poleOf(c.key, c.direction)))));
    const combo = COMBOS.find((x) => top.some((c) => c.key === x.a[0] && c.direction === x.a[1]) && d.claims.filter(said).some((c) => c.key === x.b[0] && c.direction === x.b[1]));
    if (combo) portrait.push(L(VOICE.combo(d.name, combo.title)));
  }
  const decide = answer("p.decide")?.values?.[0];
  const decideLine = decide ? VOICE.decide(d.name, decide) : null;
  const daily = [decideLine ? L(decideLine) : null, ...likeLines.slice(0, 2)].filter((x): x is string => !!x);
  const summary: ManualBlock[] = [];
  if (portrait.length) summary.push({ t: "p", text: portrait.join(locale === "ja" ? "" : " ") });
  if (daily.length) summary.push({ t: "p", text: daily.join(locale === "ja" ? "" : " ") });
  if (d.tuvi?.persona) summary.push({ t: "p", text: L(VOICE.tuvi(d.name, d.tuvi.persona, d.tuvi.keywords)) });
  const goal = answer("fut.one_thing");
  if (goal) summary.push({ t: "p", text: L(VOICE.goal(d.name, clip(L(goal.label), 120))) });
  const lead = top[0];
  const leadAsk = lead && MANUAL[lead.key] ? L((lead.direction === 1 ? MANUAL[lead.key]!.pos : MANUAL[lead.key]!.neg).ask) : null;
  if (leadAsk) summary.push({ t: "p", text: L(VOICE.ask(leadAsk)) });
  if (summary.length && summary.length < 3) summary.push({ t: "note", text: L(VOICE.thin) });
  if (!summary.length) summary.push({ t: "locked", text: L(P.lockedSummary), sample: L(P.sample), href: "/discover/all", label: L(P.answerMore) });
  add("summary", "core", summary);

  // 2. The four axis chapters
  for (const ch of MANUAL_CHAPTERS) {
    const blocks: ManualBlock[] = [];
    for (const key of AXES.filter((k) => AXIS_CHAPTER[k] === ch)) {
      const c = claim(key);
      const text = MANUAL[key];
      if (!c || !text || c.state === "insufficient") continue;
      if (c.rejected) {
        blocks.push({ t: "note", text: `${L(AXIS_LABEL[key].name)} — ${L(P.rejected)}` });
        continue;
      }
      const extra: string[] = [];
      const w = peerWindow(key);
      if (w?.window === "open") extra.push(L(P.othersSame(L(P.people))));
      else if (w?.window === "different" && w.lean !== 0) extra.push(L(P.othersDiff(L(P.people), poleOf(key, w.lean))));
      else if (w?.window === "blind" && w.lean !== 0) extra.push(L(P.othersBlind(L(P.people), poleOf(key, w.lean))));
      if (c.userNote) extra.push(`${L(P.yourNote)}${locale === "ja" ? "：" : ": "}${c.userNote}`);
      const labels = { thrive: L(P.thrive), watch: L(P.watch) };
      if (c.state === "mixed") {
        blocks.push({ t: "axis", key, name: L(AXIS_LABEL[key].name), pole: `${L(AXIS_LABEL[key].pos)} / ${L(AXIS_LABEL[key].neg)}`, level: "mixed", badge: L(P.mixed), portrait: L(text.mixed), labels, meta: L(P.basedOn(c.evidence)), extra });
        continue;
      }
      const part: ManualPart = c.direction === 1 ? text.pos : text.neg;
      const pole = c.direction === 1 ? AXIS_LABEL[key].pos : AXIS_LABEL[key].neg;
      blocks.push({
        t: "axis",
        key,
        name: L(AXIS_LABEL[key].name),
        pole: L(pole),
        level: c.state,
        badge: L(c.state === "consistent" ? P.consistent : P.emerging),
        portrait: L(part.portrait),
        thrive: L(part.thrive),
        watch: L(part.watch),
        labels,
        meta: L(P.basedOn(c.evidence)),
        extra,
      });
    }
    const keys = AXES.filter((k) => AXIS_CHAPTER[k] === ch);
    if (!blocks.some((b) => b.t === "axis")) {
      const need = Math.min(...keys.map((k) => Math.max(1, MIN_EVIDENCE - (claim(k)?.evidence ?? 0))));
      const sample = MANUAL[keys[0]!]!.pos;
      blocks.push({ t: "locked", text: L(P.lockedAxes(need)), sample: `${L(sample.portrait)} ${L(sample.thrive)}`, href: `/discover/chapter/${ch}`, label: L(P.answerMore) });
    } else blocks.push({ t: "link", href: `/discover/chapter/${ch}`, text: L(P.chapterLink) });
    add(ch, "core", blocks);
  }

  // 3. Likes
  const likes: ManualBlock[] = [];
  const likeAnswers = textAnswers((a) => a.chapter === "likes" || a.questionId.startsWith("l."));
  // First in MOSAIC's words: how they like to live, what they love, and what that suggests.
  const loves = d.prefs.filter((p) => p.sentiment === "love" || p.sentiment === "like").map((p) => p.label).slice(0, 6);
  const likeProse = [...likeLines, ...(loves.length ? [L(VOICE.favourites(d.name, loves))] : [])];
  if (likeProse.length) likes.push({ t: "p", text: L(VOICE.likesIntro(d.name)) }, { t: "p", text: likeProse.join(locale === "ja" ? "" : " ") });
  const hints = d.answers
    .flatMap((a) => (a.values ?? []).map((v) => GIFT_HINTS[a.questionId]?.[v]?.idea))
    .filter((x): x is I18nText => !!x)
    .slice(0, 2);
  if (hints.length) likes.push({ t: "p", text: hints.map((h) => L(VOICE.hint(h))).join(locale === "ja" ? "" : " ") });
  if (likeAnswers.length) likes.push({ t: "kv", title: L(VOICE.likesList), items: likeAnswers.map((a) => ({ k: L(a.prompt), v: L(a.label) })) });
  const bySentiment = (["love", "like", "wants", "dislike", "avoid"] as const)
    .map((s) => ({ s, items: d.prefs.filter((p) => p.sentiment === s).map((p) => p.label) }))
    .filter((g) => g.items.length);
  if (bySentiment.length) likes.push({ t: "kv", title: L(P.likesFromPrefs), items: bySentiment.map((g) => ({ k: L(P.sentiment[g.s]!), v: g.items.join("、") })) });
  if (!likes.length) likes.push({ t: "locked", text: L(P.lockedLikes), sample: L(P.sample), href: "/discover/chapter/likes", label: L(P.answerMore) });
  add("likes", "core", likes);

  // 4. Tips: the "ask" lines, people chapter first
  const asks = PEOPLE_FIRST.flatMap((ch) => AXES.filter((k) => AXIS_CHAPTER[k] === ch))
    .map((k) => ({ k, c: claim(k) }))
    .filter(({ c, k }) => said(c) && MANUAL[k])
    .map(({ k, c }) => L((c!.direction === 1 ? MANUAL[k]!.pos : MANUAL[k]!.neg).ask));
  add(
    "tips",
    "core",
    asks.length
      ? [{ t: "list", items: asks }, { t: "p", text: L(P.tipsOutro) }]
      : [{ t: "locked", text: L(P.lockedTips), sample: `${L(MANUAL.social_energy!.pos.ask)} ${L(MANUAL.planning!.pos.ask)}`, href: "/discover/all", label: L(P.answerMore) }],
  );

  // 5. As others see me
  const others: ManualBlock[] = [];
  if (d.peers.responders === 0) {
    others.push({ t: "note", text: L(P.othersNone) }, { t: "link", href: "/me/others", text: L(P.othersAsk) });
  } else {
    others.push({ t: "p", text: L(P.othersIntro(d.peers.responders)) });
    for (const win of ["open", "blind", "hidden", "different"] as const) {
      const items = d.peers.windows
        .filter((w) => w.window === win)
        .map((w) =>
          win === "different"
            ? `${L(poleOf(w.key, w.self as 1 | -1))} ⇄ ${L(poleOf(w.key, w.lean as 1 | -1))}`
            : L(poleOf(w.key, (win === "blind" ? w.lean : w.self) as 1 | -1)),
        );
      if (items.length) others.push({ t: "list", title: L(P.windows[win]), items });
    }
    for (const c of d.peers.comments) others.push({ t: "quote", text: clip(c.text, 600), cite: c.name ?? undefined });
  }
  add("others", "personal", others);

  // 6. Tử Vi
  const tuvi: ManualBlock[] = [];
  if (d.types?.ids.length) tuvi.push({ t: "types", ids: d.types.ids, caption: L(P.typeCaption[d.types.source]) });
  if (!d.tuvi) {
    tuvi.push({ t: "locked", text: L(P.tuviNone), sample: L(P.sample), href: "/tuvi", label: L(P.tuviSetup) });
  } else {
    if (d.tuvi.summary) tuvi.push({ t: "kv", items: [{ k: L(P.tuviMenh), v: d.tuvi.summary }] });
    if (d.tuvi.keywords.length) tuvi.push({ t: "list", title: L(P.tuviKeywords), items: d.tuvi.keywords });
    for (const p of d.tuvi.paragraphs) tuvi.push({ t: "p", text: p });
    if (d.tuvi.now) tuvi.push({ t: "kv", items: [{ k: L(P.tuviNow), v: d.tuvi.now.replace(/^▶\s*[^·]*·\s*/, "") }] });
    tuvi.push({ t: "link", href: "/tuvi", text: L(P.tuviMore) });
  }
  add("tuvi", "personal", tuvi);

  // 7. Story & 8. Future: answers, then records
  const storyFrom = (cat: string, kinds: string[], none: I18nText): ManualBlock[] => {
    const out: ManualBlock[] = [];
    const ans = textAnswers((a) => a.category === cat);
    if (ans.length) {
      out.push({ t: "p", text: `— ${L(P.storyAnswers)}` });
      for (const a of ans) {
        const line = STORY_LINES[a.questionId];
        if (line) out.push({ t: "p", text: L(line.line(d.name, clip(L(a.label), 280))) });
        else out.push(a.isText ? { t: "quote", text: clip(L(a.label)), cite: L(a.prompt) } : { t: "kv", items: [{ k: L(a.prompt), v: L(a.label) }] });
      }
    }
    const recs = d.memories.filter((m) => m.labels.some((l) => kinds.includes(l)) && !m.sealedUntil && (m.title || m.body)).slice(0, MAX_RECORDS);
    if (recs.length) {
      out.push({ t: "p", text: `— ${L(P.storyRecords)}` });
      for (const m of recs) out.push({ t: "quote", text: clip([m.title, m.body].filter(Boolean).join(" — ")), cite: m.date });
    }
    if (!out.length) out.push({ t: "note", text: L(none) }, { t: "link", href: "/memories/new", text: L(P.storyRecords) });
    return out;
  };
  add("story", "personal", storyFrom("past", STORY_KINDS, P.storyNone));
  const future = storyFrom("future", FUTURE_KINDS, P.futureNone);
  const sealed = d.memories.filter((m) => m.kind === "letter_to_future" && m.sealedUntil);
  for (const m of sealed) future.push({ t: "note", text: L(P.letterSealed(m.sealedUntil!)) });
  add("future", "personal", future);

  // 9. What has changed
  const changes: ManualBlock[] = [];
  for (const a of d.answers.filter((x) => x.changedFrom)) changes.push({ t: "kv", items: [{ k: L(a.prompt), v: L(P.changedFrom(L(a.changedFrom!), L(a.label), a.answeredAt)) }] });
  for (const a of textAnswers((x) => x.category === "change")) changes.push({ t: "quote", text: clip(L(a.label)), cite: L(a.prompt) });
  add("changes", "personal", changes.length ? changes : [{ t: "note", text: L(P.changesNone) }]);

  // 10. Still unknown
  const unknown = AXES.filter((k) => {
    const c = claim(k);
    return !c || c.state === "insufficient";
  });
  add(
    "unknown",
    "self",
    unknown.length
      ? [
          { t: "list", items: unknown.map((k) => L(P.unknownAxis(L(AXIS_LABEL[k].name), Math.max(1, MIN_EVIDENCE - (claim(k)?.evidence ?? 0))))) },
          { t: "link", href: "/discover/chapters", text: L(P.answerMore) },
        ]
      : [{ t: "p", text: L(P.unknownDone) }],
  );

  add("novel", "personal", story(d, locale, said, poleOf, claim));

  const chars = sections.reduce((n, s) => n + s.chars, 0);
  return {
    name: d.name,
    sections,
    chars,
    minutes: Math.max(1, Math.round(chars / READING_RATE[locale])),
    stats: {
      answers: d.answers.length,
      memories: records,
      axesKnown: d.claims.filter(said).length,
      axes: AXES.length,
      responders: d.peers.responders,
      written: sections.filter((x) => !x.locked).length,
      sections: sections.length,
    },
  };
}

// ---------------------------------------------------------------------------
// The story: everything above, told as short episodes (manual-story.ts)
// ---------------------------------------------------------------------------

function story(
  d: ManualInput,
  locale: Locale,
  said: (c: ManualClaim | undefined) => boolean,
  poleOf: (k: TendencyKey, dir: 1 | -1) => I18nText,
  claim: (k: TendencyKey) => ManualClaim | undefined,
): ManualBlock[] {
  const L = (t: I18nText) => t[locale];
  const name = d.name;
  const known = AXES.map(claim)
    .filter((c): c is ManualClaim => said(c))
    .sort((a, b) => (a.state === b.state ? b.confidence - a.confidence || a.key.localeCompare(b.key) : a.state === "consistent" ? -1 : 1));
  const combo = COMBOS.find((x) => known.some((c) => c.key === x.a[0] && c.direction === x.a[1]) && known.some((c) => c.key === x.b[0] && c.direction === x.b[1]));
  const lines = (episode: "childhood" | "path" | "future") =>
    d.answers.filter((a) => STORY_LINES[a.questionId]?.episode === episode).map((a) => L(STORY_LINES[a.questionId]!.line(name, clip(L(a.label), 200))));
  const records = (kinds: string[]) =>
    d.memories
      .filter((m) => m.labels.some((l) => kinds.includes(l)) && !m.sealedUntil && m.title)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5)
      .map((m) => {
        const [y, mo] = m.date.split("-");
        const date = locale === "ja" ? `${y}年${Number(mo)}月` : locale === "vi" ? `Tháng ${Number(mo)}/${y}` : `${y}-${mo}`;
        const line = L(STORY.record(date, clip(m.title!, 80), name, L(RECORD_KIND[m.labels.find((l) => kinds.includes(l)) ?? m.kind] ?? RECORD_KIND.memory!)));
        return m.body ? `${line}${locale === "ja" ? "" : " "}${clip(m.body, 160)}` : line;
      });

  const out: ManualBlock[] = [
    { t: "storyTitle", title: L(STORY.title(name)), subtitle: L(combo ? STORY.subtitle(L(combo.title)) : STORY.subtitlePlain) },
  ];
  const tv = d.tuvi;
  const prologue = tv?.yearName && tv.napAm ? [L(STORY.born(name, tv.yearName, tv.napAm)), ...(tv.persona ? [L(STORY.star(tv.persona))] : [])] : [L(STORY.bornUnknown(name))];
  out.push({ t: "episode", key: "prologue", title: L(STORY.episodes.prologue), paragraphs: prologue });

  const fromFamily = (d.gifts ?? [])
    .slice()
    .sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999"))
    .slice(0, 6)
    .map((x) => {
      const date = x.date ? (locale === "ja" ? `${Number(x.date.slice(0, 4))}年${Number(x.date.slice(5, 7))}月` : x.date.slice(0, 7)) : null;
      return L(STORY.giftLine(date, x.from, clip(x.title ? `${x.title} — ${x.body}` : x.body, 160)));
    });
  const childhood = [...fromFamily, ...lines("childhood")];
  if (childhood.length) out.push({ t: "episode", key: "childhood", title: L(STORY.episodes.childhood), paragraphs: childhood });
  const path = [...lines("path"), ...records(["achievement", "decision", "memory", "regret", "value"])];
  if (path.length) out.push({ t: "episode", key: "path", title: L(STORY.episodes.path), paragraphs: path });

  const now: string[] = [];
  if (known.length) {
    now.push(L(STORY.nowTraits(name, known.slice(0, 3).map((c) => poleOf(c.key, c.direction)))));
    if (combo) now.push(L(STORY.nowCombo(name, combo.title)));
    const top = known[0]!;
    const ask = MANUAL[top.key];
    if (ask) now.push(L(STORY.nowAsk(L((top.direction === 1 ? ask.pos : ask.neg).ask))));
  } else now.push(L(STORY.nowUnknown(name)));
  if (d.peers.responders > 0) now.push(L(STORY.nowPeers(name, d.peers.responders)));
  if (tv?.cycleTopic) now.push(L(STORY.nowCycle(tv.cycleTopic)));
  out.push({ t: "episode", key: "now", title: L(STORY.nowTitle(name)), paragraphs: now });

  const future = [...lines("future"), ...records(["goal", "dream"])];
  for (const m of d.memories.filter((x) => x.kind === "letter_to_future" && x.sealedUntil)) future.push(L(STORY.letter(m.sealedUntil!)));
  if (future.length) out.push({ t: "episode", key: "future", title: L(STORY.episodes.future), paragraphs: future });

  if (!childhood.length && !path.length) out.push({ t: "locked", text: L(STORY.locked), sample: L(SAMPLE_STORY), href: "/memories/new", label: L(STORY.lockedButton) });
  out.push({ t: "episode", key: "epilogue", title: L(STORY.episodes.epilogue), paragraphs: L(STORY.epilogue(name)).split("\n") });
  return out;
}

const SAMPLE_STORY: I18nText = {
  ja: "あの春、ひとりで知らない街に降り立った。駅前の小さなパン屋で道を聞いたのが、すべての始まりだった。そこで出会った人たちが、のちに大切な仲間になるとは、まだ知らなかった。",
  en: "That spring, alone, in a town no one knew. Asking the way at a little bakery by the station was where it all began — though no one could have guessed those strangers would become dear friends.",
  vi: "Mùa xuân năm ấy, một mình đến một thành phố xa lạ. Hỏi đường ở tiệm bánh nhỏ trước ga là khởi đầu của tất cả — chưa ai biết những người lạ ấy sau này sẽ thành bạn thân.",
};

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

const allLocales = (f: (l: Locale) => string): I18nText => ({ en: f("en"), vi: f("vi"), ja: f("ja") });
const day = (d: Date) => d.toISOString().slice(0, 10);

export async function gatherManual(userId: string, locale: Locale): Promise<ManualInput> {
  const profile = await withUser(userId, async (tx) => (await tx.select({ name: profiles.displayName, bio: profiles.bio }).from(profiles).where(eq(profiles.userId, userId)))[0]);
  const claims = await listTendencies(userId);
  const peer = await johari(userId);
  const history = await getHistory(userId);
  const prefs = await listPreferences(userId, null);
  const memories = await listMemories(userId, { limit: 200 });
  const tv = await getTuvi(userId, locale);
  const received = await receivedGifts(userId);
  const ti = await typeInsight(userId, tv.chart ?? null);

  const answers: ManualAnswer[] = [];
  for (const h of history) {
    const done = h.responses.filter((r) => r.status === "answered" && r.answer);
    const latest = done[0];
    if (!latest) continue;
    const q = h.question;
    const prev = latest.changeKind === "changed_mind" ? done[1] : undefined;
    answers.push({
      questionId: q.id,
      prompt: q.prompt,
      chapter: chapterOf({ category: q.category as never, signals: q.signals ?? undefined }),
      category: q.category,
      label: allLocales((l) => answerLabel(q.options, latest.answer as Answer, l)),
      values: (() => {
        const a = latest.answer as Answer;
        return "choice" in a ? [a.choice] : "choices" in a ? a.choices : [];
      })(),
      isText: q.format === "short" || q.format === "free",
      answeredAt: day(latest.answeredAt),
      changedFrom: prev && JSON.stringify(prev.answer) !== JSON.stringify(latest.answer) ? allLocales((l) => answerLabel(q.options, prev.answer as Answer, l)) : null,
    });
  }

  const personality = tv.sections.find((s) => s.section === "personality");
  const cycles = tv.sections.find((s) => s.section === "cycles");
  return {
    name: profile?.name ?? "",
    bio: profile?.bio ?? null,
    claims: claims.map((c) => ({
      key: c.claimKey,
      direction: c.direction,
      state: c.state,
      confidence: c.confidence,
      evidence: c.evidenceCount,
      rejected: c.userStatus === "rejected",
      userNote: c.userNote,
    })),
    peers: {
      responders: peer.results.responders,
      windows: peer.axes.map((a) => ({ key: a.key, self: a.self, lean: a.counts.pos > a.counts.neg ? 1 : a.counts.neg > a.counts.pos ? -1 : 0, window: a.window })),
      comments: [
        ...peer.results.named.filter((n) => n.comment).map((n) => ({ text: n.comment!, name: n.name })),
        ...peer.results.anonymous.comments.map((text) => ({ text, name: null })),
      ],
    },
    answers,
    gifts: received.flatMap((b) =>
      b.entries
        .filter((e) => e.kind === "growth")
        .map((e) => {
          const w = b.writers.find((x) => x.user_id === e.author_id);
          return { from: w?.label ?? w?.name ?? "", date: e.occurred_on, title: e.title, body: e.body };
        }),
    ),
    prefs: prefs.map((p) => ({ label: p.label, sentiment: p.current.sentiment })),
    memories: memories.map((m) => ({ kind: m.kind, labels: m.labels, title: m.title, body: m.body, date: m.occurredOn ?? day(m.createdAt), sealedUntil: m.sealed ? m.revealOn : null })),
    types: ti.types.length
      ? { ids: ti.types, source: ti.source === "chart" ? "chart" : "answers" }
      : ti.provisional.length
        ? { ids: ti.provisional, source: "provisional" }
        : ti.selfTypes.length
          ? { ids: ti.selfTypes, source: "picked" }
          : null,
    tuvi: tv.chart
      ? {
          summary: personality?.summary ?? null,
          keywords: personality?.keywords ?? [],
          paragraphs: (personality?.paragraphs ?? []).filter((p) => p.kind !== "note").map((p) => p.text),
          now: cycles?.paragraphs.find((p) => p.text.startsWith("▶"))?.text ?? null,
          yearName: tv.chart.yearPillar.name,
          napAm: tv.chart.napAm.name,
          persona: personality?.persona,
          cycleTopic: (() => {
            const age = tv.currentAge;
            const p = age === null ? undefined : tv.chart.palaces.find((x) => x.daiHan && age >= x.daiHan.from && age <= x.daiHan.to);
            return p?.palace ? PALACE_PLAIN[p.palace][locale] : undefined;
          })(),
        }
      : null,
  };
}

export async function buildManual(userId: string, locale: Locale): Promise<Manual> {
  return composeManual(await gatherManual(userId, locale), locale);
}
