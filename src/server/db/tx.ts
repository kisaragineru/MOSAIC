import { sql } from "drizzle-orm";
import { getDb, type Db } from "./client";

export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/**
 * Run `fn` in a transaction whose Row Level Security identity is `userId`.
 * Every query touching personal data MUST go through this (or withAnon for the
 * narrow pre-auth functions). The setting is transaction-local, so pooled
 * connections never leak identity between requests.
 */
export async function withUser<T>(userId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) throw new Error("invalid user id");
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.user_id', ${userId}, true)`);
    return fn(tx);
  });
}

/** Transaction with no identity: RLS hides all personal rows. Used for login/rate limits. */
export async function withAnon<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.user_id', '', true)`);
    return fn(tx);
  });
}
