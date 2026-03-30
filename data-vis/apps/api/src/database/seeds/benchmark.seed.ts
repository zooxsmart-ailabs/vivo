import { Pool } from "pg";

export async function seedBenchmark(pool: Pool): Promise<void> {
  console.log("Seeding benchmark_config...");

  const values = [
    // Quadrant thresholds (Levantamento sec.5)
    ["shareThresholdAlto", "ESTADO", "GO", 40],
    ["shareThresholdBaixo", "ESTADO", "GO", 30],
    ["satisfacaoThresholdAlta", "ESTADO", "GO", 7.5],
    ["satisfacaoThresholdBaixa", "ESTADO", "GO", 6.0],
    // Trend thresholds (Levantamento sec.2)
    ["trendThresholdUp", "ESTADO", "GO", 1.0],
    ["trendThresholdDown", "ESTADO", "GO", -1.0],
    // National benchmarks
    ["satisfacaoMedia", "NACIONAL", null, 6.5],
    ["shareMedia", "NACIONAL", null, 32],
    // Income thresholds (Levantamento sec.1)
    ["rendaAlta", "ESTADO", "GO", 10000],
    ["rendaBaixa", "ESTADO", "GO", 3500],
    // Density
    ["densidadeAlta", "ESTADO", "GO", 15000],
    ["densidadeBaixa", "ESTADO", "GO", 5000],
  ] as const;

  for (const [key, scope, region, value] of values) {
    await pool.query(
      `INSERT INTO benchmark_config (key, scope, region, value)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING`,
      [key, scope, region, value]
    );
  }

  console.log(`  Inserted ${values.length} benchmark configs`);
}
