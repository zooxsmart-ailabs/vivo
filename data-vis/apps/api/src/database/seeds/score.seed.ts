import { Pool } from "pg";
import { seedFromCsv, resolveDataPath } from "./utils";

export async function seedScore(pool: Pool): Promise<void> {
  // CS Score Calc (100 rows, semicolon-delimited, uppercase headers)
  // Headers match SQL columns after lowercase — no columnMap needed
  console.log("Seeding score (sample)...");
  const count = await seedFromCsv(
    pool,
    "score",
    resolveDataPath("estudo/AMOSTRA_CS_SCORE_CALC.csv"),
    {
      delimiter: ";",
    }
  );
  console.log(`  Inserted ${count} score rows`);
}
