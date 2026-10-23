import { execFileSync } from "node:child_process";
import { Pool } from "pg";
import { TEST_MIGRATION_DATABASE_URL } from "./test-env";

/** Migrate + seed the test database, then wipe user data so runs are independent. */
export default async function setup() {
  if (process.env.SKIP_DB_SETUP === "1") return;
  const env = { ...process.env, MIGRATION_DATABASE_URL: TEST_MIGRATION_DATABASE_URL };
  execFileSync("npx", ["tsx", "scripts/migrate.ts"], { env, stdio: "inherit" });
  execFileSync("npx", ["tsx", "scripts/seed.ts"], { env, stdio: "inherit" });
  const pool = new Pool({ connectionString: TEST_MIGRATION_DATABASE_URL });
  await pool.query("TRUNCATE users, rate_limit_buckets, audit_events CASCADE");
  await pool.end();
}
