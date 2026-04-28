import { Pool } from "pg";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const p = new Pool({
  host: process.env.DATABASE_HOST,
  port: +process.env.DATABASE_PORT,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  statement_timeout: 600000,
});

const files = [
  ["0016_score_ookla_functions.sql", 1745366600000],
];

try {
  for (const [f, when] of files) {
    const sql = readFileSync("drizzle/" + f, "utf-8");
    const chunks = sql
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);
    console.log(`=== ${f} (${chunks.length} chunks) ===`);
    const t0 = Date.now();
    try {
      await p.query("BEGIN");
      for (let i = 0; i < chunks.length; i++) {
        const tt = Date.now();
        await p.query(chunks[i]);
        const ms = Date.now() - tt;
        if (ms > 500)
          console.log(`  chunk ${i + 1}/${chunks.length} took ${ms}ms`);
      }
      const hash = createHash("sha256").update(sql).digest("hex");
      await p.query(
        "INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)",
        [hash, String(when)]
      );
      await p.query("COMMIT");
      console.log(`  OK in ${Date.now() - t0}ms`);
    } catch (e) {
      await p.query("ROLLBACK");
      console.log(`  FAILED: ${e.message}`);
      if (e.position) console.log(`  position: ${e.position}`);
      if (e.where) console.log(`  where: ${e.where}`);
      throw e;
    }
  }
} finally {
  await p.end();
}
