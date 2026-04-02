/**
 * Helpers compartilhados para testes de integração.
 * Provê mock context realista e fixtures de dados.
 */

// ─── Mock Context Factory ───────────────────────────────────────────────────

export interface MockDbOptions {
  /** Responses queued in order for sequential db.execute() calls */
  executeResponses?: Array<{ rows: any[] }>;
  /** Drizzle query builder chain mock (for session router) */
  selectRows?: any[];
}

export function createMockCtx(opts: {
  db?: MockDbOptions;
  cache?: Record<string, string>;
  user?: { id: string; roles: string[] };
} = {}) {
  let executeIdx = 0;
  const responses = opts.db?.executeResponses ?? [{ rows: [] }];
  const cache = new Map<string, string>(Object.entries(opts.cache ?? {}));

  return {
    db: {
      execute: jest.fn().mockImplementation(() => {
        const resp = responses[executeIdx] ?? { rows: [] };
        executeIdx++;
        return Promise.resolve(resp);
      }),
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(opts.db?.selectRows ?? []),
        }),
      }),
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          onConflictDoUpdate: jest.fn().mockResolvedValue(undefined),
        }),
      }),
    } as any,
    redis: {
      get: jest.fn().mockImplementation((key: string) =>
        Promise.resolve(cache.get(key) ?? null),
      ),
      set: jest.fn().mockImplementation((key: string, val: string) => {
        cache.set(key, val);
        return Promise.resolve("OK");
      }),
    } as any,
    user: opts.user,
  };
}

// ─── Fixtures ───────────────────────────────────────────────────────────────

export function geohashRow(overrides: Record<string, any> = {}) {
  return {
    geohash_id: "6gkzm9",
    precision: 6,
    center_lat: -16.686,
    center_lng: -49.264,
    neighborhood: "Setor Bueno",
    city: "Goiânia",
    state: "GO",
    quadrant_type: "GROWTH",
    share_vivo: 18.5,
    share_fibra: 15.0,
    share_movel: 18.5,
    avg_satisfaction_vivo: 8.2,
    priority_score: 7.8,
    priority_label: "P1_CRITICA",
    tech_category: "FIBRA",
    trend_direction: "UP",
    trend_delta: 1.2,
    competitive_position: "Líder",
    vivo_score: 8.5,
    tim_score: 7.0,
    claro_score: 6.5,
    oi_score: null,
    download_mbps: 120.0,
    latency_ms: 15.0,
    quality_label: "EXCELENTE",
    domicilios_com_fibra: 450,
    total_domicilios: 1200,
    pessoas_com_erb: 980,
    populacao_residente: 3500,
    period: "2025-01",
    is_top10: true,
    ...overrides,
  };
}

export function crmRow(overrides: Record<string, any> = {}) {
  return {
    avg_arpu: 89.90,
    dominant_plan_type: "Fibra 500M",
    device_tier: "Premium",
    avg_income: 8500.0,
    population_density: 4200,
    income_label: "Alta",
    ...overrides,
  };
}

export function fibraRow(overrides: Record<string, any> = {}) {
  return {
    classification: "SAUDAVEL",
    score: 85,
    score_label: "ALTO",
    taxa_ocupacao: 62.0,
    portas_disponiveis: 120,
    potencial_mercado: 45.0,
    sinergia_movel: 0.8,
    ...overrides,
  };
}

export function movelRow(overrides: Record<string, any> = {}) {
  return {
    classification: "SAUDAVEL",
    score: 78,
    score_label: "ALTO",
    tech_recommendation: "5G",
    speedtest_score: 8.2,
    concentracao_renda: 0.65,
    vulnerabilidade_concorrencia: 0.3,
    ...overrides,
  };
}

export function growthDiagRow(overrides: Record<string, any> = {}) {
  return {
    score_ookla: 8.5,
    taxa_chamados: 2.1,
    share_penetracao: 18.5,
    delta_vs_lider: 1.5,
    fibra_class: "SAUDAVEL",
    movel_class: "SAUDAVEL",
    arpu_relativo: 1.15,
    canal_dominante: "Digital",
    canal_pct: 55,
    sinal_percepcao: "OK",
    sinal_concorrencia: "OK",
    sinal_infraestrutura: "OK",
    sinal_comportamento: "OK",
    recomendacao: "ATIVAR",
    recomendacao_razao: null,
    ...overrides,
  };
}

export function bairroRow(overrides: Record<string, any> = {}) {
  return {
    neighborhood: "Setor Bueno",
    city: "Goiânia",
    state: "GO",
    total_geohashes: 15,
    avg_share: 22.5,
    avg_satisfaction: 7.8,
    avg_priority_score: 7.2,
    dominant_quadrant: "GROWTH",
    geohash_count_growth: 8,
    geohash_count_upsell: 3,
    geohash_count_retencao: 2,
    geohash_count_growth_retencao: 2,
    period: "2025-01",
    ...overrides,
  };
}
