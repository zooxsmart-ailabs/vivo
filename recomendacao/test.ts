import { buildPrompt, generateSummary } from "./index";
import { readFileSync } from "fs";
import { resolve } from "path";

// Carrega .env manualmente
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
  neighborhood: "Santana",
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

const minimal = {
  geohash_id: "min01",
  neighborhood: null,
  city: "São Paulo",
  quadrant_type: "UPSELL",
  tech_category: "FIBRA",
  share_vivo: 45,
  trend_direction: "STABLE",
  trend_delta: 0,
};

console.log("=== Teste 1: buildPrompt (full) ===\n");
console.log(buildPrompt(full));

console.log("\n=== Teste 2: buildPrompt (minimal) ===\n");
console.log(buildPrompt(minimal));

async function main() {
  console.log("\n=== Teste 3: generateSummary (full, chama LLM) ===\n");
  const t0 = performance.now();
  const summary = await generateSummary(full, apiKey);
  const elapsed = ((performance.now() - t0) / 1000).toFixed(2);
  console.log(summary);
  console.log(`\n(${elapsed}s)`);

  console.log("\n=== Teste 4: generateSummary (minimal, chama LLM) ===\n");
  const t1 = performance.now();
  const summary2 = await generateSummary(minimal, apiKey);
  const elapsed2 = ((performance.now() - t1) / 1000).toFixed(2);
  console.log(summary2);
  console.log(`\n(${elapsed2}s)`);
}

main();
