import { sql } from "drizzle-orm";
import { withAnon } from "../db/tx";
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
} satisfies Record<string, Limit>;

/** Throws AppError('rate_limited') when the bucket is exhausted. Keys are stored hashed. */
export async function enforceRateLimit(scope: keyof typeof LIMITS, identifier: string): Promise<void> {
  const limit = LIMITS[scope];
  const key = `${scope}:${sha256(`${process.env.RATE_LIMIT_SALT ?? "mosaic"}:${identifier}`)}`;
  const allowed = await withAnon(async (tx) => {
    const r = await tx.execute<{ ok: boolean }>(
      sql`select rate_limit_hit(${key}, ${limit.windowSeconds}, ${limit.max}) as ok`,
    );
    return r.rows[0]?.ok === true;
  });
  if (!allowed) throw rateLimited();
}
