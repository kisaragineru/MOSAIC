/**
 * The mosaic portrait: one tile per axis, plus Tử Vi and the likes / story chapters.
 * Read-only summary of what MOSAIC already knows; nothing here is new data.
 */
import { and, eq } from "drizzle-orm";
import type { Hue, MosaicLabels, TileView } from "@/components/mosaic";
import { AXES, AXIS_CHAPTER, AXIS_LABEL, CHAPTER_INFO, type Chapter } from "@/content/axes";
import { TENDENCY_TEXT, type TendencyKey } from "@/content/questions";
import type { Locale } from "@/lib/i18n/locales";
import type { Dict } from "@/lib/i18n/messages/en";
import { MIN_EVIDENCE } from "@/lib/discovery/tendency-model";
import { tuviCharts } from "../db/schema";
import { withUser } from "../db/tx";
import { chapterProgress } from "./discovery";
import { listTendencies, type ClaimState } from "./tendencies";

export type TileLevel = "empty" | "gathering" | "emerging" | "consistent" | "mixed";

export interface AxisTile {
  kind: "axis";
  key: TendencyKey;
  chapter: Chapter;
  level: TileLevel;
  /** Which pole the evidence leans to (only meaningful from "emerging" on). */
  direction: 1 | -1 | null;
  evidence: number;
  /** The user said this does not describe them: shown, but never as a fact. */
  rejected: boolean;
}

export interface ExtraTile {
  kind: "tuvi" | "likes" | "story";
  level: TileLevel;
  done: number;
  total: number;
}

export type Tile = AxisTile | ExtraTile;

export interface Portrait {
  tiles: Tile[];
  /** Tiles that say something (emerging or consistent), out of all of them. */
  revealed: number;
  total: number;
}

const levelOf = (state: ClaimState | null, evidence: number): TileLevel =>
  !state || evidence === 0 ? "empty" : state === "insufficient" ? "gathering" : state === "mixed" ? "mixed" : state;

const progressLevel = (done: number, total: number): TileLevel =>
  done === 0 ? "empty" : done >= total ? "consistent" : done * 2 >= total ? "emerging" : "gathering";

export async function portrait(userId: string): Promise<Portrait> {
  const claims = await listTendencies(userId);
  const chapters = await chapterProgress(userId);
  const hasChart = await withUser(userId, async (tx) => {
    const [r] = await tx.select({ id: tuviCharts.id }).from(tuviCharts).where(and(eq(tuviCharts.userId, userId), eq(tuviCharts.isCurrent, true)));
    return !!r;
  });
  const axisTiles: AxisTile[] = AXES.map((key) => {
    const c = claims.find((x) => x.claimKey === key);
    const level = levelOf(c?.state ?? null, c?.evidenceCount ?? 0);
    return {
      kind: "axis",
      key,
      chapter: AXIS_CHAPTER[key],
      level,
      direction: c && (level === "emerging" || level === "consistent") ? c.direction : null,
      evidence: c?.evidenceCount ?? 0,
      rejected: c?.userStatus === "rejected",
    };
  });
  const ch = (id: Chapter) => chapters.find((c) => c.chapter === id)!;
  const extras: ExtraTile[] = [
    { kind: "tuvi", level: hasChart ? "consistent" : "empty", done: hasChart ? 1 : 0, total: 1 },
    { kind: "likes", level: progressLevel(ch("likes").answered, ch("likes").total), done: ch("likes").answered, total: ch("likes").total },
    { kind: "story", level: progressLevel(ch("story").answered, ch("story").total), done: ch("story").answered, total: ch("story").total },
  ];
  const tiles: Tile[] = [...axisTiles, ...extras];
  return {
    tiles,
    revealed: tiles.filter((t) => t.level === "emerging" || t.level === "consistent").length,
    total: tiles.length,
  };
}

/** How many more answers an axis needs before it can say anything. */
export const needed = (t: AxisTile) => Math.max(0, MIN_EVIDENCE - t.evidence);

// ---------------------------------------------------------------------------
// Display: every string is prepared here, in the reader's language.
// ---------------------------------------------------------------------------

export function tileViews(p: Portrait, t: Dict, locale: Locale): TileView[] {
  const m = t.mosaic;
  return p.tiles.map((tile): TileView => {
    if (tile.kind === "axis") {
      const lab = AXIS_LABEL[tile.key];
      const pole = tile.direction === 1 ? lab.pos[locale] : tile.direction === -1 ? lab.neg[locale] : null;
      const body =
        tile.level === "emerging" || tile.level === "consistent"
          ? TENDENCY_TEXT[tile.key][tile.direction === -1 ? "neg" : "pos"][locale]
          : tile.level === "mixed"
            ? m.mixedBody(lab.pos[locale], lab.neg[locale])
            : tile.level === "gathering"
              ? m.gatheringBody(needed(tile))
              : m.emptyBody;
      return {
        id: tile.key,
        hue: tile.chapter as TileView["hue"],
        level: tile.level,
        direction: tile.direction,
        label: pole ?? lab.name[locale],
        title: pole ? `${lab.name[locale]} — ${pole}` : lab.name[locale],
        body,
        meta: [tile.evidence ? m.basedOn(tile.evidence) : "", tile.rejected ? m.rejectedNote : ""].filter(Boolean).join(" · "),
        rejected: tile.rejected,
        dots: Math.min(3, tile.evidence),
        // Straight to this piece's own questions (the chapter page focuses on it).
        href: `/discover/chapter/${tile.chapter}?axis=${tile.key}`,
        hrefLabel: m.answerPiece(lab.name[locale]),
        evidenceHref: tile.evidence ? `/insights#t-${tile.key}` : null,
      };
    }
    if (tile.kind === "tuvi") {
      return {
        id: "tuvi", hue: "extra", level: tile.level, direction: null, label: "Tử Vi", title: "Tử Vi",
        body: tile.done ? m.tuviDone : m.tuviTodo, meta: "", rejected: false, dots: 0,
        href: "/tuvi", hrefLabel: tile.done ? m.tuviOpen : m.tuviStart, evidenceHref: null,
      };
    }
    const chapter = CHAPTER_INFO[tile.kind].title[locale];
    return {
      id: tile.kind, hue: "extra", level: tile.level, direction: null,
      label: tile.kind === "likes" ? m.likesShort : m.storyShort, title: chapter,
      body: m.chapterBody(tile.done, tile.total), meta: "", rejected: false, dots: 0,
      href: `/discover/chapter/${tile.kind}`, hrefLabel: m.answerChapter(chapter), evidenceHref: null,
    };
  });
}

/** The words the mosaic needs, with the name of each colour. */
export function mosaicLabels(t: Dict, locale: Locale): MosaicLabels {
  const m = t.mosaic;
  const chapters = (["self", "mind", "people", "life"] as const).map((c) => ({ hue: c as Hue, name: CHAPTER_INFO[c].title[locale] }));
  return { hint: m.hint, evidence: m.evidence, levels: m.levels, need: m.need, deeper: m.deeper, hues: [...chapters, { hue: "extra", name: m.otherHue }] };
}
