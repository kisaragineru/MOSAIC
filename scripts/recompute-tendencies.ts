/**
 * Rebuilds tendency claims for every user whose claims were made by another model version (or
 * marked 'stale' by a migration that removed answers). Runs on deploy, after migrations, with the
 * OWNER connection; idempotent, and does nothing when everything is current.
 */
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/server/db/schema";
import type { Tx } from "../src/server/db/tx";
import { MODEL_VERSION } from "../src/lib/discovery/tendency-model";
import { recomputeTendencies } from "../src/server/services/tendencies";
import { loadEnv } from "./env";

async function main() {
  loadEnv();
  const url = process.env.MIGRATION_DATABASE_URL;
  if (!url) throw new Error("MIGRATION_DATABASE_URL is required");
  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    const db = drizzle(pool, { schema });
    const stale = await db.execute<{ user_id: string }>(
      sql`select distinct user_id from tendency_claims where model_version <> ${MODEL_VERSION}`,
    );
    for (const { user_id } of stale.rows) await db.transaction((tx) => recomputeTendencies(tx as unknown as Tx, user_id));
    console.log(`tendencies recomputed for ${stale.rows.length} user(s)`);
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
