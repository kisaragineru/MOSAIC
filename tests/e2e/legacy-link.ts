import { Client } from "pg";

/**
 * Turns a QR link back into one made before showing it counted as its owner's yes, so the reader's
 * tap leaves the connection waiting for the owner (as links from before still do).
 */
export async function makeLegacyLink(url: string) {
  const token = url.split("#")[1]!;
  const db = new Client({ connectionString: process.env.E2E_MIGRATION_DATABASE_URL ?? "postgres://mosaic_owner:owner_dev_pw@localhost:5432/mosaic_e2e" });
  await db.connect();
  try {
    await db.query("update profile_shares set connect_scopes = null, connect_text_version = null where token = $1", [token]);
  } finally {
    await db.end();
  }
}
