import { Pool } from "pg";
import { seedBenchmark } from "./seeds/benchmark.seed";
import { seedGeoData } from "./seeds/geo-data.seed";
import { seedGeohashCell } from "./seeds/geohash-cell.seed";
// import { seedScore } from "./seeds/score.seed";
// import { seedQoeSamples } from "./seeds/qoe-samples.seed";

async function main() {
  const pool = new Pool({
    host: process.env.DATABASE_HOST || "localhost",
    port: parseInt(process.env.DATABASE_PORT || "5432", 10),
    user: process.env.DATABASE_USER || "vivo",
    password: process.env.DATABASE_PASSWORD || "changeme",
    database: process.env.DATABASE_NAME || "vivo_geointel",
  });

  console.log("=== Starting database seed ===\n");

  try {
    await seedBenchmark(pool);
    await seedGeoData(pool);
    await seedGeohashCell(pool);
    // await seedScore(pool);
    // await seedQoeSamples(pool);
    console.log("\n=== Seed complete! ===");
  } catch (err) {
    console.error("\nSeed failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
