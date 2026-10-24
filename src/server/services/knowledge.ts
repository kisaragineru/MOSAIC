/**
 * "How much MOSAIC knows about you": every answer, record and reading is a piece of the mosaic.
 * Pieces add up to a level, and the next few things worth doing are suggested with what each one
 * unlocks — so a new user can see the portrait filling in, not an empty page.
 */
import { and, count, eq, isNull } from "drizzle-orm";
import { AXES, AXIS_CHAPTER, type Chapter } from "@/content/axes";
import type { TendencyKey } from "@/content/questions";
import { MIN_EVIDENCE } from "@/lib/discovery/tendency-model";
import { memoryEntries, preferenceItems, profiles, tuviCharts } from "../db/schema";
import { withUser } from "../db/tx";
import { chapterProgress } from "./discovery";
import { peerResults } from "./peers";
import { listTendencies } from "./tendencies";

/** Pieces each kind of information is worth. */
export const PIECE_WEIGHT = { answer: 1, record: 1, preference: 1, bio: 3, tuvi: 10, peer: 5 } as const;
export const MAX_PREFERENCE_PIECES = 20;
/** Pieces needed for each level (level n starts at LEVELS[n]). */
export const LEVELS = [0, 10, 30, 60, 100, 160, 250] as const;

export type NextAction =
  | { kind: "axis"; key: TendencyKey; chapter: Chapter; need: number }
  | { kind: "tuvi" | "bio" | "record" | "peers" | "likes"; need?: number };

export interface Knowledge {
  pieces: number;
  level: number;
  /** Pieces at which the current level started and the next one begins (null at the top). */
  from: number;
  to: number | null;
  parts: { answers: number; records: number; preferences: number; bio: boolean; tuvi: boolean; peers: number };
  axesKnown: number;
  axes: number;
  next: NextAction[];
}

export interface KnowledgeInput {
  answers: number;
  records: number;
  preferences: number;
  bio: boolean;
  tuvi: boolean;
  peers: number;
  /** Evidence and state per axis that has any. */
  claims: { key: TendencyKey; evidence: number; known: boolean }[];
  likesAnswered: number;
}

export function levelOf(pieces: number): { level: number; from: number; to: number | null } {
  let level = 0;
  for (let i = 0; i < LEVELS.length; i++) if (pieces >= LEVELS[i]!) level = i;
  return { level, from: LEVELS[level]!, to: LEVELS[level + 1] ?? null };
}

/** Pure: pieces, level and the next three things worth doing. */
export function composeKnowledge(d: KnowledgeInput): Knowledge {
  const pieces =
    d.answers * PIECE_WEIGHT.answer +
    d.records * PIECE_WEIGHT.record +
    Math.min(d.preferences, MAX_PREFERENCE_PIECES) * PIECE_WEIGHT.preference +
    (d.bio ? PIECE_WEIGHT.bio : 0) +
    (d.tuvi ? PIECE_WEIGHT.tuvi : 0) +
    d.peers * PIECE_WEIGHT.peer;
  const known = new Set(d.claims.filter((c) => c.known).map((c) => c.key));
  // The axis closest to saying something: fewest answers still needed (ties: the order of AXES).
  const closest = AXES.filter((k) => !known.has(k))
    .map((k) => ({ key: k, need: Math.max(1, MIN_EVIDENCE - (d.claims.find((c) => c.key === k)?.evidence ?? 0)) }))
    .sort((a, b) => a.need - b.need)[0];
  const next: NextAction[] = [];
  if (closest) next.push({ kind: "axis", key: closest.key, chapter: AXIS_CHAPTER[closest.key], need: closest.need });
  if (!d.tuvi) next.push({ kind: "tuvi" });
  if (d.records === 0) next.push({ kind: "record" });
  if (!d.bio) next.push({ kind: "bio" });
  if (d.likesAnswered < 3) next.push({ kind: "likes", need: 3 - d.likesAnswered });
  if (d.peers === 0) next.push({ kind: "peers" });
  return {
    pieces,
    ...levelOf(pieces),
    parts: { answers: d.answers, records: d.records, preferences: d.preferences, bio: d.bio, tuvi: d.tuvi, peers: d.peers },
    axesKnown: known.size,
    axes: AXES.length,
    next: next.slice(0, 3),
  };
}

export async function knowledge(userId: string): Promise<Knowledge> {
  const chapters = await chapterProgress(userId);
  const claims = await listTendencies(userId);
  const peers = await peerResults(userId);
  const counts = await withUser(userId, async (tx) => {
    const [rec] = await tx.select({ n: count() }).from(memoryEntries).where(eq(memoryEntries.userId, userId));
    const [pref] = await tx.select({ n: count() }).from(preferenceItems).where(and(eq(preferenceItems.userId, userId), isNull(preferenceItems.personId)));
    const [p] = await tx.select({ bio: profiles.bio }).from(profiles).where(eq(profiles.userId, userId));
    const [c] = await tx.select({ id: tuviCharts.id }).from(tuviCharts).where(and(eq(tuviCharts.userId, userId), eq(tuviCharts.isCurrent, true)));
    return { records: Number(rec?.n ?? 0), preferences: Number(pref?.n ?? 0), bio: !!p?.bio?.trim(), tuvi: !!c };
  });
  return composeKnowledge({
    answers: chapters.reduce((n, c) => n + c.answered, 0),
    ...counts,
    peers: peers.responders,
    claims: claims.map((c) => ({ key: c.claimKey, evidence: c.evidenceCount, known: c.userStatus !== "rejected" && (c.state === "consistent" || c.state === "emerging" || c.state === "mixed") })),
    likesAnswered: chapters.find((c) => c.chapter === "likes")?.answered ?? 0,
  });
}
