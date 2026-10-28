import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type Db = NodePgDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __mosaicPool?: Pool; __mosaicDb?: Db };

function createPool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const pool = new Pool({ connectionString: url, max: Number(process.env.DATABASE_POOL_MAX ?? 10) });
  // Never log query text or parameters (they may contain diary text).
  pool.on("error", (err) => console.error("[db] idle client error:", err.message));
  return pool;
}

export function getDb(): Db {
  if (!globalForDb.__mosaicDb) {
    globalForDb.__mosaicPool = createPool();
    globalForDb.__mosaicDb = drizzle(globalForDb.__mosaicPool, { schema });
  }
  return globalForDb.__mosaicDb;
}

/** The pool behind getDb(), for transactions that run their own BEGIN (see withUser). */
export function getPool(): Pool {
  getDb();
  return globalForDb.__mosaicPool!;
}

export async function closeDb() {
  await globalForDb.__mosaicPool?.end();
  globalForDb.__mosaicPool = undefined;
  globalForDb.__mosaicDb = undefined;
}
