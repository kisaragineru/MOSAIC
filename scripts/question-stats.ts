/**
 * Question quality report for maintainers (aggregates only, no personal data):
 * how often each question is answered or skipped, how answers spread across options, and how
 * people rated it. Groups smaller than MIN_GROUP are not shown so no one can be singled out.
 *
 *   pnpm tsx scripts/question-stats.ts            # table
 *   pnpm tsx scripts/question-stats.ts --json     # machine-readable
 *
 * Uses MIGRATION_DATABASE_URL (the owner role), like the seed: run it from a trusted machine.
 */
import { Pool } from "pg";
import { QUESTION_BANK } from "../src/content/questions";
import { loadEnv } from "./env";

const MIN_GROUP = 5;

async function main() {
  loadEnv();
  const url = process.env.MIGRATION_DATABASE_URL;
  if (!url) throw new Error("MIGRATION_DATABASE_URL is required");
  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    // Latest response per user and question: what people currently answer.
    const latest = await pool.query<{ question_id: string; status: string; value: string | null; n: string }>(`
      with l as (
        select distinct on (user_id, question_id) question_id, status, answer
        from question_responses order by user_id, question_id, answered_at desc, id desc
      )
      select question_id, status,
             coalesce(answer->>'choice', answer->>'scale') as value, count(*)::text as n
      from l group by question_id, status, value`);
    const fb = await pool.query<{ question_id: string; good: string; bad: string }>(`
      select question_id, count(*) filter (where rating = 1)::text as good, count(*) filter (where rating = -1)::text as bad
      from question_feedback group by question_id`);
    const rows = QUESTION_BANK.filter((q) => !q.followUpOnly).map((q) => {
      const mine = latest.rows.filter((r) => r.question_id === q.id);
      const answered = mine.filter((r) => r.status === "answered").reduce((a, r) => a + Number(r.n), 0);
      const skipped = mine.filter((r) => r.status === "skipped").reduce((a, r) => a + Number(r.n), 0);
      const dist = mine.filter((r) => r.status === "answered" && r.value !== null);
      // Share of the most common answer: near 100% means the question tells us little.
      const top = dist.length ? Math.max(...dist.map((r) => Number(r.n))) : 0;
      const f = fb.rows.find((r) => r.question_id === q.id);
      const total = answered + skipped;
      return {
        id: q.id,
        responses: total,
        skipRate: total >= MIN_GROUP ? Math.round((skipped / total) * 100) : null,
        topAnswerShare: answered >= MIN_GROUP && dist.length ? Math.round((top / answered) * 100) : null,
        good: f && Number(f.good) + Number(f.bad) >= MIN_GROUP ? Number(f.good) : null,
        bad: f && Number(f.good) + Number(f.bad) >= MIN_GROUP ? Number(f.bad) : null,
      };
    });
    if (process.argv.includes("--json")) {
      console.log(JSON.stringify(rows, null, 2));
      return;
    }
    console.log(`(groups under ${MIN_GROUP} are shown as "-")`);
    console.table(rows.map((r) => ({ ...r, skipRate: r.skipRate ?? "-", topAnswerShare: r.topAnswerShare ?? "-", good: r.good ?? "-", bad: r.bad ?? "-" })));
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
