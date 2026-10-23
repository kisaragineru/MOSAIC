/**
 * Idempotent seed of catalog data (question bank, preference categories, Tử Vi rulesets).
 * Uses the OWNER connection. Question versions are append-only: changing a question's
 * content requires bumping its version in src/content/questions.ts.
 */
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { PREFERENCE_CATEGORIES } from "../src/content/preference-categories";
import { QUESTION_BANK } from "../src/content/questions";
import { RULESETS } from "../src/lib/tuvi/ruleset";
import * as s from "../src/server/db/schema";
import { loadEnv } from "./env";

async function main() {
  loadEnv();
  const url = process.env.MIGRATION_DATABASE_URL;
  if (!url) throw new Error("MIGRATION_DATABASE_URL is required");
  const pool = new Pool({ connectionString: url, max: 1 });
  const db = drizzle(pool);
  try {
    await db.transaction(async (tx) => {
      for (const [i, c] of PREFERENCE_CATEGORIES.entries()) {
        await tx
          .insert(s.preferenceCategories)
          .values({ id: c.id, label: c.label, sortOrder: i })
          .onConflictDoUpdate({ target: s.preferenceCategories.id, set: { label: c.label, sortOrder: i } });
      }
      for (const r of RULESETS) {
        await tx
          .insert(s.tuviRulesetVersions)
          .values({ id: r.id, name: r.name, description: r.description, rules: r.rules })
          .onConflictDoNothing();
      }
      for (const q of QUESTION_BANK) {
        await tx
          .insert(s.questionDefinitions)
          .values({
            id: q.id,
            category: q.category,
            sensitivity: q.sensitivity,
            comparable: q.comparable,
            followUpOnly: q.followUpOnly ?? false,
            active: q.active ?? true,
            currentVersion: q.version,
          })
          .onConflictDoUpdate({
            target: s.questionDefinitions.id,
            set: {
              category: q.category,
              sensitivity: q.sensitivity,
              comparable: q.comparable,
              followUpOnly: q.followUpOnly ?? false,
              active: q.active ?? true,
              currentVersion: q.version,
            },
          });
        const existing = await tx.execute<{ prompt: unknown }>(
          sql`select prompt from question_versions where question_id = ${q.id} and version = ${q.version}`,
        );
        const content = {
          format: q.format,
          prompt: q.prompt,
          options: q.options ?? null,
          maxChoices: q.maxChoices ?? null,
          scale: q.scale ?? null,
          followUps: q.followUps ?? null,
          signals: q.signals ?? null,
        };
        if (existing.rows.length === 0) {
          await tx.insert(s.questionVersions).values({ questionId: q.id, version: q.version, ...content });
        } else {
          // Published versions are immutable except for translation-only fixes, which we
          // refuse to apply silently: bump the version instead.
          const same = JSON.stringify(existing.rows[0]?.prompt) === JSON.stringify(q.prompt);
          if (!same) console.warn(`[seed] ${q.id} v${q.version} differs from DB; bump its version to publish changes`);
        }
      }
    });
    console.log(
      `seeded ${PREFERENCE_CATEGORIES.length} categories, ${QUESTION_BANK.length} questions, ${RULESETS.length} rulesets`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
