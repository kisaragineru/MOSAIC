import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { getDb, getPool, type Db } from "./client";
import * as schema from "./schema";

export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/**
 * Error raised for any failed database operation. Drizzle's own error message embeds the
 * SQL and its bound parameters (diary text, search terms, token hashes), and Next.js logs
 * uncaught errors verbatim — so the original is never allowed to escape. Only the SQLSTATE
 * and PostgreSQL's primary message (which names constraints/tables, not values) are kept;
 * `detail` (which can contain key values) is dropped.
 */
export class DbError extends Error {
  readonly code: string | undefined;
  readonly cause: { code: string | undefined; message: string };
  constructor(code: string | undefined, pgMessage: string) {
    super(`database error${code ? ` ${code}` : ""}`);
    this.name = "DbError";
    this.code = code;
    this.cause = { code, message: pgMessage };
  }
}

/**
 * SQLSTATEs whose PostgreSQL primary message never contains data values (they name
 * tables/constraints only), plus the codes raised by MOSAIC's own SQL functions, whose
 * messages are fixed identifiers. For any other code the message is dropped, because e.g.
 * 22P02 ("invalid input syntax for type uuid: \"…\"") echoes the offending value.
 */
const SAFE_MESSAGE_CODES = new Set(["P0001", "P0002", "22023", "42501", "23503", "23505", "23514", "40001", "40P01", "57014"]);

function sanitize(e: unknown): unknown {
  if (e instanceof DbError) return e;
  const err = e as { name?: string; code?: unknown; message?: unknown; cause?: { code?: unknown; message?: unknown } };
  const pg = err?.cause && typeof err.cause === "object" && "code" in err.cause ? err.cause : typeof err?.code === "string" && /^[0-9A-Z]{5}$/.test(err.code) ? err : null;
  const isDrizzle = err?.name === "DrizzleQueryError" || (typeof err?.message === "string" && err.message.startsWith("Failed query:"));
  if (!pg && !isDrizzle) return e; // application errors (AppError, ZodError, …) pass through
  const code = typeof pg?.code === "string" ? pg.code : undefined;
  const message = code && SAFE_MESSAGE_CODES.has(code) && typeof pg?.message === "string" ? pg.message : "";
  return new DbError(code, message);
}

/**
 * Run `fn` in a transaction whose Row Level Security identity is `userId`.
 * Every query touching personal data MUST go through this (or withAnon for the
 * narrow pre-auth functions). The setting is transaction-local, so pooled
 * connections never leak identity between requests.
 */
export async function withUser<T>(userId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) throw new Error("invalid user id");
  return identified(userId, fn);
}

/** Transaction with no identity: RLS hides all personal rows. Used for login/rate limits. */
export async function withAnon<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return identified("", fn);
}

/**
 * BEGIN and the transaction-local identity go in one round trip (a simple-protocol query of two
 * statements), so every transaction costs one fewer trip to the database. `who` is a checked
 * UUID or empty, so it can be written into the statement.
 */
async function identified<T>(who: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  let client;
  try {
    client = await getPool().connect();
  } catch (e) {
    throw sanitize(e);
  }
  let broken = false;
  try {
    await client.query(`begin; select set_config('app.user_id', '${who}', true)`);
    const result = await fn(drizzle(client, { schema }) as unknown as Tx);
    await client.query("commit");
    return result;
  } catch (e) {
    await client.query("rollback").catch(() => {
      broken = true;
    });
    throw sanitize(e);
  } finally {
    client.release(broken);
  }
}
