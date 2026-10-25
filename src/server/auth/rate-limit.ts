import { sql } from "drizzle-orm";
import { withAnon, type Tx } from "../db/tx";
import { rateLimited } from "../errors";
import { sha256 } from "./crypto";

export interface Limit {
  windowSeconds: number;
  max: number;
}

export const LIMITS = {
  login: { windowSeconds: 15 * 60, max: 10 },
  loginAccount: { windowSeconds: 15 * 60, max: 8 },
  register: { windowSeconds: 60 * 60, max: 10 },
  shareOpen: { windowSeconds: 60 * 60, max: 30 },
  giftCode: { windowSeconds: 60 * 60, max: 20 },
  ai: { windowSeconds: 60 * 60, max: 30 },
  export: { windowSeconds: 60 * 60, max: 5 },
  write: { windowSeconds: 60, max: 120 },
  comment: { windowSeconds: 60 * 60, max: 60 },
  dm: { windowSeconds: 60 * 60, max: 600 },
  linkPreview: { windowSeconds: 60 * 60, max: 120 },
} satisfies Record<string, Limit>;

const bucket = (scope: keyof typeof LIMITS, identifier: string) => `${scope}:${sha256(`${process.env.RATE_LIMIT_SALT ?? "mosaic"}:${identifier}`)}`;

/** Throws AppError('rate_limited') when the bucket is exhausted. Keys are stored hashed. */
export async function enforceRateLimit(scope: keyof typeof LIMITS, identifier: string): Promise<void> {
  const allowed = await withAnon((tx) => hitInTx(tx, scope, identifier));
  if (!allowed) throw rateLimited();
}

/** The same check inside a transaction the caller already has (one round trip fewer). */
export async function hitInTx(tx: Tx, scope: keyof typeof LIMITS, identifier: string): Promise<boolean> {
  const limit = LIMITS[scope];
  const r = await tx.execute<{ ok: boolean }>(sql`select rate_limit_hit(${bucket(scope, identifier)}, ${limit.windowSeconds}, ${limit.max}) as ok`);
  return r.rows[0]?.ok === true;
}
