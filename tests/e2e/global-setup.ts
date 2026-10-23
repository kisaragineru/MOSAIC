import { execFileSync } from "node:child_process";

/** Fresh schema for every E2E run (local databases only; the script refuses remote URLs). */
export default function setup() {
  const owner = process.env.E2E_MIGRATION_DATABASE_URL ?? "postgres://mosaic_owner:owner_dev_pw@localhost:5432/mosaic_e2e";
  execFileSync("bash", ["scripts/db-reset-local.sh", owner], { stdio: "inherit", env: { ...process.env, PGOPTIONS: "--client-min-messages=warning" } });
}
