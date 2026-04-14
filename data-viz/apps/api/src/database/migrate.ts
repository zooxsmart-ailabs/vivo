import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { readFileSync } from "node:fs";
import { join } from "node:path";

async function isBootstrapDone(pool: Pool): Promise<boolean> {
  // vw_geohash_summary só existe após o timescale-setup.sql ter rodado
  const { rows } = await pool.query(`
    SELECT 1 FROM pg_matviews WHERE matviewname = 'vw_geohash_summary'
  `);
  return rows.length > 0;
}

async function main() {
  const pool = new Pool({
    host: process.env.DATABASE_HOST || "localhost",
    port: parseInt(process.env.DATABASE_PORT || "5432", 10),
    user: process.env.DATABASE_USER || "vivo",
    password: process.env.DATABASE_PASSWORD || "changeme",
    database: process.env.DATABASE_NAME || "vivo_geointel",
  });

  const db = drizzle(pool);

  console.log("1/3 Creating extensions...");
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS timescaledb;
    CREATE EXTENSION IF NOT EXISTS postgis;
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
  `);

  console.log("2/3 Running Drizzle migrations...");
  await migrate(db, {
    migrationsFolder: join(__dirname, "../../drizzle"),
  });

  const bootstrapDone = await isBootstrapDone(pool);
  if (bootstrapDone) {
    console.log("3/3 TimescaleDB bootstrap already applied — skipping.");
  } else {
    console.log("3/3 Setting up TimescaleDB features (first run)...");
    const timescaleSql = readFileSync(
      join(__dirname, "../../drizzle/custom/timescale-setup.sql"),
      "utf-8",
    );
    await pool.query(timescaleSql);
    console.log("    Bootstrap complete.");
  }

  console.log("All migrations complete!");
  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
