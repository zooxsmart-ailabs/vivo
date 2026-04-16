import { buildPrompt, generateSummary } from "./index";
import { readFileSync } from "fs";
import { resolve } from "path";

// Crrega .env manualmente
const envPath = resolve(__dirname, "../.env");
const apiKey = readFileSync(envPath, "utf-8")
  .split("\n")
  .find((l) => l.startsWith("OPENAI_API_KEY="))
  ?.split("=")
  .slice(1)
  .join("=")
  .trim();

if (!apiKey) {
  console.error("OPENAI_API_KEY nao encontrada em", envPath);
  process.exit(1);
}

const full = {
  geohash_id: "6gyf4b",
  city: "São Paulo",
  quadrant_type: "GROWTH",
  tech_category: "MOVEL",
  share_vivo: 28,
  trend_direction: "UP",
  trend_delta: 2.1,
  vivo_score: 6.1,
  tim_score: 8.2,
  claro_score: 7.4,
  download_mbps: 42,
  latency_ms: 38,
  quality_label: "Regular",
  crm: { device_tier: "Mid", avg_income: 5200, income_label: "Médio" },
  camada2: {
    fibra: { classification: "EXPANSAO_NOVA_AREA" },
    movel: { classification: "MELHORA_QUALIDADE" },
  },
};


async function main() {
  console.log("=== Cenario completo ===\n");
  const analise1 = await generateSummary(full, apiKey);
  console.log(analise1);
}

main();
