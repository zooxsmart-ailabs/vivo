/**
 * Custom Cypress commands for tRPC interception.
 *
 * Intercepts httpBatchLink requests (GET for queries, POST for mutations)
 * and returns superjson-wrapped responses matching the procedure names.
 */

export function setupTrpcStubs(stubs: Record<string, any>) {
  // Queries — GET /trpc/{proc1},{proc2}?batch=1&input=...
  cy.intercept("GET", "**/trpc/**", (req) => {
    const url = new URL(req.url);
    const path = url.pathname.split("/trpc/")[1] ?? "";
    const procs = path.split(",").filter(Boolean);

    const response = procs.map((proc) => ({
      result: { data: { json: stubs[proc] ?? null } },
    }));

    req.reply(response);
  }).as("trpcQuery");

  // Mutations — POST /trpc/{proc}?batch=1
  cy.intercept("POST", "**/trpc/**", (req) => {
    const url = new URL(req.url);
    const path = url.pathname.split("/trpc/")[1] ?? "";
    const procs = path.split(",").filter(Boolean);

    const response = procs.map((proc) => ({
      result: { data: { json: stubs[`mutation:${proc}`] ?? { ok: true } } },
    }));

    req.reply(response);
  }).as("trpcMutation");
}

// ─── Fixtures ───────────────────────────────────────────────────────────────

export const FIXTURE_GEOHASH_LIST = [
  {
    geohash_id: "6gkzm9",
    precision: 6,
    center_lat: -16.686,
    center_lng: -49.264,
    neighborhood: "Setor Bueno",
    city: "Goiânia",
    state: "GO",
    quadrant_type: "GROWTH",
    share_vivo: 18.5,
    avg_satisfaction_vivo: 8.2,
    priority_score: 8.8,
    priority_label: "P1_CRITICA",
    tech_category: "FIBRA",
    trend_direction: "UP",
    trend_delta: 1.2,
    competitive_position: "Líder",
    period: "2025-01",
    is_top10: true,
  },
  {
    geohash_id: "6gkzmb",
    precision: 6,
    center_lat: -16.688,
    center_lng: -49.260,
    neighborhood: "Setor Bueno",
    city: "Goiânia",
    state: "GO",
    quadrant_type: "RETENCAO",
    share_vivo: 42.0,
    avg_satisfaction_vivo: 3.8,
    priority_score: 9.2,
    priority_label: "P1_CRITICA",
    tech_category: "MOVEL",
    trend_direction: "DOWN",
    trend_delta: -2.1,
    competitive_position: "Abaixo",
    period: "2025-01",
    is_top10: true,
  },
  {
    geohash_id: "6gkzmc",
    precision: 6,
    center_lat: -16.690,
    center_lng: -49.258,
    neighborhood: "Centro",
    city: "Goiânia",
    state: "GO",
    quadrant_type: "UPSELL",
    share_vivo: 55.0,
    avg_satisfaction_vivo: 8.9,
    priority_score: 7.0,
    priority_label: "P2_ALTA",
    tech_category: "AMBOS",
    trend_direction: "STABLE",
    trend_delta: 0.1,
    competitive_position: "Competitivo",
    period: "2025-01",
    is_top10: false,
  },
];

export const FIXTURE_RANKING = {
  GROWTH: [
    {
      geohash_id: "6gkzm9",
      neighborhood: "Setor Bueno",
      city: "Goiânia",
      state: "GO",
      quadrant_type: "GROWTH",
      share_vivo: 18.5,
      avg_satisfaction_vivo: 8.2,
      priority_score: 8.8,
      priority_label: "P1_CRITICA",
      tech_category: "FIBRA",
      trend_direction: "UP",
      trend_delta: 1.2,
      competitive_position: "Líder",
      rank_within_quadrant: 1,
      period: "2025-01",
    },
    {
      geohash_id: "6gkzmd",
      neighborhood: "Centro",
      city: "Goiânia",
      state: "GO",
      quadrant_type: "GROWTH",
      share_vivo: 12.0,
      avg_satisfaction_vivo: 7.5,
      priority_score: 7.2,
      priority_label: "P2_ALTA",
      tech_category: "MOVEL",
      trend_direction: "UP",
      trend_delta: 0.8,
      competitive_position: "Competitivo",
      rank_within_quadrant: 2,
      period: "2025-01",
    },
  ],
  UPSELL: [],
  RETENCAO: [],
  GROWTH_RETENCAO: [],
};

export const FIXTURE_GEOHASH_DETAIL = {
  geohash_id: "6gkzm9",
  precision: 6,
  center_lat: -16.686,
  center_lng: -49.264,
  neighborhood: "Setor Bueno",
  city: "Goiânia",
  state: "GO",
  quadrant_type: "GROWTH",
  share_vivo: 18.5,
  avg_satisfaction_vivo: 8.2,
  priority_score: 8.8,
  priority_label: "P1_CRITICA",
  tech_category: "FIBRA",
  trend_direction: "UP",
  trend_delta: 1.2,
  competitive_position: "Líder",
  vivo_score: 8.5,
  tim_score: 7.0,
  claro_score: 6.5,
  download_mbps: 120,
  latency_ms: 15,
  quality_label: "EXCELENTE",
  period: "2025-01",
  crm: { avg_arpu: 89.9, dominant_plan_type: "Fibra 500M", device_tier: "Premium" },
  camada2: {
    fibra: { classification: "SAUDAVEL", score: 85 },
    movel: { classification: "SAUDAVEL", score: 78 },
  },
  diagnosticoGrowth: null,
};

export const FIXTURE_LOCATIONS = [
  {
    state: "GO",
    cities: [
      { city: "Goiânia", neighborhoods: ["Centro", "Setor Bueno", "Setor Oeste"] },
      { city: "Anápolis", neighborhoods: ["Jundiaí"] },
    ],
  },
  {
    state: "SP",
    cities: [{ city: "São Paulo", neighborhoods: ["Pinheiros", "Bela Vista"] }],
  },
];

export const FIXTURE_BAIRRO_LIST = {
  items: [
    {
      neighborhood: "Setor Bueno",
      city: "Goiânia",
      state: "GO",
      total_geohashes: 15,
      avg_share: 22.5,
      avg_satisfaction: 7.8,
      avg_priority_score: 8.2,
      dominant_quadrant: "GROWTH",
      geohash_count_growth: 8,
      geohash_count_upsell: 3,
      geohash_count_retencao: 2,
      geohash_count_growth_retencao: 2,
      period: "2025-01",
    },
    {
      neighborhood: "Centro",
      city: "Goiânia",
      state: "GO",
      total_geohashes: 20,
      avg_share: 38.0,
      avg_satisfaction: 4.5,
      avg_priority_score: 7.5,
      dominant_quadrant: "RETENCAO",
      geohash_count_growth: 2,
      geohash_count_upsell: 5,
      geohash_count_retencao: 10,
      geohash_count_growth_retencao: 3,
      period: "2025-01",
    },
  ],
  total: 2,
};
