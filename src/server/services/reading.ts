/**
 * The Insights reading: not a list of findings but something to read, even from a few answers.
 * An overview paragraph, readings for pairs of tendencies (insight-combos.ts), and per axis the
 * manual's portrait (or, with too few answers, a clearly marked hypothesis) beside the answers it
 * came from and the next question that would sharpen it. Deterministic; composeReading() is pure.
 */
import { AXES, AXIS_CHAPTER, AXIS_LABEL, PEER_POLES, type Chapter } from "@/content/axes";
import { COMBOS } from "@/content/insight-combos";
import { MANUAL } from "@/content/manual-axes";
import { LOCALIZED_BANK } from "@/content/questions-i18n";
import { QUESTION_BANK, type I18nText, type TendencyKey } from "@/content/questions";
import { READING as R } from "@/content/reading-text";
import type { Answer } from "@/lib/discovery/answers";
import { answerLabel } from "@/lib/discovery/format";
import { MIN_EVIDENCE } from "@/lib/discovery/tendency-model";
import type { Locale } from "@/lib/i18n/locales";
import { answeredQuestionIds } from "./discovery";
import { listTendencies, type ClaimState, type ClaimView } from "./tendencies";

export interface ReadingCard {
  key: TendencyKey;
  claimId: string;
  chapter: Chapter;
  name: string;
  pole: string;
  kind: "consistent" | "emerging" | "mixed" | "hypothesis";
  lead: string | null;
  body: string;
  quotes: string[];
  /** A question that would add to this axis, and how many answers are still needed (hypotheses). */
  nextQuestionId: string | null;
  need: number;
}

export interface Reading {
  overview: string[];
  combos: { title: string; text: string }[];
  cards: ReadingCard[];
}

export interface ReadingClaim {
  id: string;
  key: TendencyKey;
  direction: 1 | -1;
  state: ClaimState;
  confidence: number;
  evidenceCount: number;
  rejected: boolean;
  evidence: { questionId: string; polarity: number; answer: Answer | null }[];
}

const QMETA = new Map(LOCALIZED_BANK.map((q) => [q.id, q]));
const ORDER = new Map(AXES.map((k, i) => [k, i]));
const firstSentence = (s: string, locale: Locale) => {
  const m = locale === "ja" ? s.match(/^.+?。/) : s.match(/^.+?[.!?](\s|$)/);
  return (m ? m[0] : s).trim();
};

export function composeReading(claims: ReadingClaim[], answered: Set<string>, answers: number, locale: Locale): Reading {
  const L = (t: I18nText) => t[locale];
  const pole = (k: TendencyKey, d: 1 | -1) => (d === 1 ? PEER_POLES[k].pos : PEER_POLES[k].neg);
  const live = claims.filter((c) => !c.rejected && c.evidenceCount > 0);
  const said = live
    .filter((c) => c.state === "consistent" || c.state === "emerging")
    .sort((a, b) => (a.state === b.state ? b.confidence - a.confidence || ORDER.get(a.key)! - ORDER.get(b.key)! : a.state === "consistent" ? -1 : 1));
  const mixed = live.filter((c) => c.state === "mixed");
  const hints = live.filter((c) => c.state === "insufficient");

  const combos = COMBOS.filter((x) => said.some((c) => c.key === x.a[0] && c.direction === x.a[1]) && said.some((c) => c.key === x.b[0] && c.direction === x.b[1]));

  const overview: string[] = [];
  if (said.length === 0 && mixed.length === 0) {
    overview.push(L(hints.length ? R.onlyHints(answers) : R.none));
  } else {
    const top = said[0];
    const first = [L(R.opening(answers, said.length + mixed.length))];
    if (top) first.push(L(R.clearest(pole(top.key, top.direction))));
    overview.push(first.join(locale === "ja" ? "" : " "));
    const second = said[1];
    if (top && second) {
      const combo = combos[0];
      overview.push([L(R.alsoTwo(pole(top.key, top.direction), pole(second.key, second.direction))), combo ? L(R.comboLead(combo.title)) : ""].filter(Boolean).join(locale === "ja" ? "" : " "));
    }
    if (mixed.length) overview.push(L(R.mixedNote(mixed.map((c) => L(AXIS_LABEL[c.key].name)).join(locale === "ja" ? "」「" : ", "))));
    if (hints.length) overview.push(L(R.hintsNote(hints.length)));
    overview.push(L(R.closing));
  }

  const nextFor = (k: TendencyKey) => QUESTION_BANK.find((q) => !q.followUpOnly && q.signals?.some((s) => s.claimKey === k) && !answered.has(q.id))?.id ?? null;
  const card = (c: ReadingClaim): ReadingCard => {
    const m = MANUAL[c.key]!;
    const quotes = c.evidence.slice(0, 3).map((e) => {
      const q = QMETA.get(e.questionId);
      return L(R.quote(q?.prompt[locale] ?? e.questionId, answerLabel(q?.options ?? null, e.answer, locale)));
    });
    const base = { key: c.key, claimId: c.id, chapter: AXIS_CHAPTER[c.key], name: L(AXIS_LABEL[c.key].name), quotes, nextQuestionId: nextFor(c.key) };
    if (c.state === "mixed") return { ...base, pole: `${L(AXIS_LABEL[c.key].pos)} / ${L(AXIS_LABEL[c.key].neg)}`, kind: "mixed", lead: null, body: L(m.mixed), need: 0 };
    const part = c.direction === 1 ? m.pos : m.neg;
    const p = L(c.direction === 1 ? AXIS_LABEL[c.key].pos : AXIS_LABEL[c.key].neg);
    if (c.state === "insufficient")
      return { ...base, pole: p, kind: "hypothesis", lead: L(R.hypothesisLead(c.evidenceCount, pole(c.key, c.direction))), body: firstSentence(L(part.portrait), locale), need: Math.max(1, MIN_EVIDENCE - c.evidenceCount) };
    return { ...base, pole: p, kind: c.state, lead: null, body: `${L(part.portrait)} ${L(part.thrive)}`, need: 0 };
  };

  return {
    overview,
    combos: combos.slice(0, 3).map((x) => ({ title: L(x.title), text: L(x.text) })),
    cards: [...said, ...mixed, ...hints.sort((a, b) => b.evidenceCount - a.evidenceCount || ORDER.get(a.key)! - ORDER.get(b.key)!)].map(card),
  };
}

export function toReadingClaims(claims: ClaimView[]): ReadingClaim[] {
  return claims.map((c) => ({
    id: c.id,
    key: c.claimKey,
    direction: c.direction,
    state: c.state,
    confidence: c.confidence,
    evidenceCount: c.evidenceCount,
    rejected: c.userStatus === "rejected",
    evidence: c.evidence.map((e) => ({ questionId: e.questionId, polarity: e.polarity, answer: e.answer })),
  }));
}

export async function reading(userId: string, locale: Locale): Promise<Reading> {
  const claims = await listTendencies(userId);
  const answered = await answeredQuestionIds(userId);
  return composeReading(toReadingClaims(claims), answered, answered.size, locale);
}
