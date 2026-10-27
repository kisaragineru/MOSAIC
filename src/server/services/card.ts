/**
 * The calling card: what every connection sees from the start, chosen by its owner. Type and bio
 * are on by default; the friend manual (whole, or just its summary or likes) can be added. The
 * whole chart never is: from it, the server only takes the type. Accounts from before the card
 * haven't decided (null) and are asked once; until then only their bio shows, as before.
 */
import { and, eq, sql } from "drizzle-orm";
import { cache } from "react";
import { z } from "zod";
import type { TypeView } from "@/components/tuvi-type";
import type { Locale } from "@/lib/i18n/locales";
import type { Chart } from "@/lib/tuvi/engine";
import { mainsOf } from "@/lib/tuvi/interpret";
import { MAIN_STARS, type MainStarId } from "@/lib/tuvi/stars";
import { typesById } from "@/lib/tuvi/type-view";
import { uuid } from "@/lib/validation/common";
import { profiles, tuviCharts } from "../db/schema";
import { withUser } from "../db/tx";
import { mapDbError } from "../errors";
import { audit } from "./audit";

export const CARD_ITEMS = ["type", "bio", "summary", "likes", "manual"] as const;
export type CardItem = (typeof CARD_ITEMS)[number];
/** What a new card shows. */
export const CARD_DEFAULT: CardItem[] = ["type", "bio"];

/** My card's items, or null when not decided yet. */
export async function myCard(userId: string): Promise<CardItem[] | null> {
  const [p] = await withUser(userId, (tx) => tx.select({ items: profiles.cardItems }).from(profiles).where(eq(profiles.userId, userId)));
  return (p?.items as CardItem[] | null | undefined) ?? null;
}

export async function setCard(userId: string, input: unknown) {
  const items = [...new Set(z.array(z.enum(CARD_ITEMS)).max(CARD_ITEMS.length).parse(input))];
  await withUser(userId, async (tx) => {
    await tx.update(profiles).set({ cardItems: items }).where(eq(profiles.userId, userId));
    await audit(tx, userId, "card.set");
  });
}

export interface ConnectionCard {
  items: CardItem[];
  /** The type(s): from the chart, or (without one) the ones they picked themselves. */
  types: TypeView[];
  typeSource: "chart" | "picked" | null;
}

const isStar = (x: unknown): x is MainStarId => typeof x === "string" && (MAIN_STARS as readonly string[]).includes(x);

/** The other person's card in a connection (null when it isn't active). */
export async function connectionCard(userId: string, sessionId: string, locale: Locale): Promise<ConnectionCard | null> {
  const id = uuid.parse(sessionId);
  const row = await withUser(userId, async (tx) => {
    try {
      return (await tx.execute<{ c: { items: CardItem[]; chart: Chart | null; self_types: string[] | null } | null }>(sql`select connection_card(${id}) as c`)).rows[0]?.c ?? null;
    } catch (e) {
      mapDbError(e);
    }
  });
  if (!row) return null;
  const items = row.items.filter((x): x is CardItem => (CARD_ITEMS as readonly string[]).includes(x));
  if (!items.includes("type")) return { items, types: [], typeSource: null };
  const m = row.chart && row.chart.menh !== null ? mainsOf(row.chart, "menh") : null;
  if (m?.mains.length) return { items, types: typesById(m.mains, locale), typeSource: "chart" };
  const picked = (row.self_types ?? []).filter(isStar);
  return { items, types: typesById(picked, locale), typeSource: picked.length ? "picked" : null };
}

/**
 * The lead type of each of these people, for those I'm connected with whose card shows it (the
 * colour behind their initial). Everyone else is left out.
 */
export async function typeTints(userId: string, ids: (string | null | undefined)[]): Promise<Map<string, MainStarId>> {
  const list = [...new Set(ids.filter((x): x is string => !!x && uuid.safeParse(x).success && x !== userId))].slice(0, 200);
  if (!list.length) return new Map();
  const rows = await withUser(userId, async (tx) => (await tx.execute<{ user_id: string; chart: Chart | null; self_types: string[] | null }>(sql`select * from connection_types(${`{${list.join(",")}}`}::uuid[])`)).rows);
  const out = new Map<string, MainStarId>();
  for (const r of rows) {
    const m = r.chart && r.chart.menh !== null ? mainsOf(r.chart, "menh") : null;
    const lead = m?.mains[0] ?? (r.self_types ?? []).find(isStar);
    if (lead) out.set(r.user_id, lead);
  }
  return out;
}

/** My own type, behind my initial (always mine to see): from my chart, or the one I picked. */
export const myTint = cache(async (userId: string): Promise<MainStarId | null> => {
  const [row] = await withUser(userId, (tx) => tx.select({ chart: tuviCharts.chart }).from(tuviCharts).where(and(eq(tuviCharts.userId, userId), eq(tuviCharts.isCurrent, true))).limit(1));
  const chart = row?.chart as Chart | undefined;
  const m = chart && chart.menh !== null ? mainsOf(chart, "menh") : null;
  if (m?.mains[0]) return m.mains[0];
  const [p] = await withUser(userId, (tx) => tx.select({ t: profiles.selfTypes }).from(profiles).where(eq(profiles.userId, userId)));
  return (p?.t ?? []).find(isStar) ?? null;
});
