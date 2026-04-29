// geohashAdapter.ts — Converte respostas do tRPC para o formato GeohashEntry
// usado pelos componentes migrados do protótipo (MapView, GeohashPanel, etc).
//
// `geohash.list` (vw_geohash_summary) → adaptForMap: shape leve só com o
// necessário para renderizar polígonos no mapa.
//
// `geohash.getById` (summary + crm + camada2 + diagnostico_growth) →
// adaptForPanel: shape completo do GeohashEntry, com defaults para campos
// que ainda não existem no backend.

import type {
  Camada2Class,
  GeohashEntry,
  Priority,
  Quadrant,
  Technology,
} from "./goiania";
import { priorityFromScore, QUADRANT_CONFIG } from "./goiania";

type ListRow = {
  geohash_id: string;
  precision: number;
  center_lat: number;
  center_lng: number;
  neighborhood: string | null;
  city: string;
  state: string;
  quadrant_type: string;
  share_vivo: number;
  avg_satisfaction_vivo: number;
  priority_score: number;
  priority_label: string;
  tech_category: string;
  trend_direction: string;
  trend_delta: number;
  competitive_position: string;
  period: string;
  has_vivo_data: boolean;
  is_top10?: boolean;
};

type DetailRow = ListRow & {
  share_fibra: number | null;
  share_movel: number | null;
  vivo_score: number | null;
  tim_score: number | null;
  claro_score: number | null;
  oi_score: number | null;
  download_mbps: number | null;
  latency_ms: number | null;
  quality_label: string | null;
  domicilios_com_fibra: number | null;
  total_domicilios: number | null;
  pessoas_com_erb: number | null;
  populacao_residente: number | null;
  // Campos que vêm direto da vw_geohash_summary (s.*) — geohash_crm pode estar vazia.
  avg_income: number | null;
  total_population: number | null;
  crm: {
    avg_arpu: number | null;
    arpu_movel: number | null;
    arpu_fibra: number | null;
    dominant_plan_type: string | null;
    plan_type_movel: string | null;
    device_tier: string | null;
    avg_income: number | null;
    population_density: number | null;
    income_label: string | null;
  } | null;
  camada2: {
    fibra: {
      classification: string;
      score: number;
      score_label: string;
      taxa_ocupacao: number | null;
      portas_disponiveis: number | null;
      potencial_mercado: number | null;
      sinergia_movel: number | null;
    } | null;
    movel: {
      classification: string;
      score: number;
      score_label: string;
    } | null;
  } | null;
  diagnosticoGrowth: {
    score_ookla: number;
    score_ookla_movel: number | null;
    score_ookla_fibra: number | null;
    score_hac: number | null;
    taxa_chamados: number;
    share_penetracao: number;
    delta_vs_lider: number;
    delta_vs_lider_fibra: number | null;
    delta_vs_lider_movel: number | null;
    arpu_relativo: number;
    canal_dominante: string;
    canal_pct: number;
    decisao_movel: string | null;
    decisao_fibra: string | null;
  } | null;
};

const VALID_QUADRANTS: Quadrant[] = [
  "GROWTH",
  "UPSELL",
  "RETENCAO",
  "GROWTH_RETENCAO",
];
const VALID_TECH: Technology[] = ["FIBRA", "MOVEL", "AMBOS"];
const VALID_CAMADA2: Camada2Class[] = [
  "SAUDAVEL",
  "MELHORA_QUALIDADE",
  "AUMENTO_CAPACIDADE",
  "EXPANSAO_NOVA_AREA",
  "EXPANSAO_COBERTURA",
];

function asQuadrant(v: string): Quadrant {
  return (VALID_QUADRANTS as string[]).includes(v) ? (v as Quadrant) : "GROWTH";
}

function asTech(v: string): Technology {
  if ((VALID_TECH as string[]).includes(v)) return v as Technology;
  return "MOVEL";
}

function asCamada2(v: string | null | undefined): Camada2Class {
  if (v && (VALID_CAMADA2 as string[]).includes(v)) return v as Camada2Class;
  return "SAUDAVEL";
}

function asPriority(v: string | null | undefined, score: number): Priority {
  if (v === "ALTA" || v === "MEDIA" || v === "BAIXA") return v;
  return priorityFromScore(score);
}

function trendDir(v: string): "UP" | "DOWN" | "STABLE" {
  if (v === "UP" || v === "DOWN" || v === "STABLE") return v;
  return "STABLE";
}

function pickSatisfaction(detail: DetailRow) {
  const arr: { name: string; score: number; color: string }[] = [];
  if (detail.vivo_score != null)
    arr.push({ name: "VIVO", score: detail.vivo_score, color: "#22C55E" });
  if (detail.tim_score != null)
    arr.push({ name: "TIM", score: detail.tim_score, color: "#EAB308" });
  if (detail.claro_score != null)
    arr.push({ name: "CLARO", score: detail.claro_score, color: "#EF4444" });
  if (detail.oi_score != null)
    arr.push({ name: "OI", score: detail.oi_score, color: "#F5A623" });
  return arr;
}

function pickStrategy(quadrant: Quadrant) {
  const cfg = QUADRANT_CONFIG[quadrant];
  return {
    title: cfg.label.toUpperCase(),
    motive: "",
    color: cfg.color,
    bgColor: cfg.bg,
  };
}

/** Shape mínimo que MapView/legenda usam para criar polígonos. */
export interface MapGeohash {
  id: string;
  quadrant: Quadrant;
  technology: Technology;
  lat: number;
  lng: number;
  hasVivoData: boolean;
  priorityScore: number;
}

export function adaptForMap(rows: ListRow[]): MapGeohash[] {
  return rows.map((r) => ({
    id: r.geohash_id,
    quadrant: asQuadrant(r.quadrant_type),
    technology: asTech(r.tech_category),
    lat: Number(r.center_lat),
    lng: Number(r.center_lng),
    hasVivoData: r.has_vivo_data !== false,
    priorityScore: Number(r.priority_score) || 0,
  }));
}

/**
 * Converte a resposta de `geohash.getById` no shape `GeohashEntry` esperado
 * pelo `GeohashPanel`. Campos que ainda não existem no backend recebem
 * defaults consistentes — ver MIGRATION_NOTES no fim do arquivo.
 */
export function adaptForPanel(detail: DetailRow): GeohashEntry {
  const quadrant = asQuadrant(detail.quadrant_type);
  const technology = asTech(detail.tech_category);
  const priorityScore = Number(detail.priority_score) || 0;
  const priority = asPriority(detail.priority_label, priorityScore);

  const crm = detail.crm;
  const fibra = detail.camada2?.fibra ?? null;
  const movel = detail.camada2?.movel ?? null;
  const diag = detail.diagnosticoGrowth;

  const totalPopulation =
    Number(detail.populacao_residente ?? 0) ||
    Number(detail.total_population ?? 0) ||
    Number(detail.total_domicilios ?? 0) * 3;

  // avg_income vem direto na vw_geohash_summary (s.*); geohash_crm é fallback.
  const avgIncome = Math.round(
    Number(detail.avg_income ?? crm?.avg_income ?? 0),
  );

  const decisaoIntegrada = [diag?.decisao_movel, diag?.decisao_fibra]
    .filter(Boolean)
    .join(" · ");

  return {
    id: detail.geohash_id,
    neighborhood: detail.neighborhood ?? "—",
    city: detail.city,
    quadrant,
    isTop10: detail.is_top10 === true,
    technology,
    lat: Number(detail.center_lat),
    lng: Number(detail.center_lng),
    satisfactionScores: pickSatisfaction(detail),
    marketShare: {
      percentage: Number(detail.share_vivo) || 0,
      activeClients: 0, // backend ainda não expõe — derivado a partir de share/pop se necessário
      totalPopulation,
      label:
        Number(detail.share_vivo) >= 35 ? "Alta Penetração" : "Baixa Penetração",
    },
    shareTrend: {
      direction: trendDir(detail.trend_direction),
      delta: Number(detail.trend_delta) || 0,
      deltaMovel: 0, // backend não decompõe ainda
      deltaFibra: 0,
      shareMovel: Number(detail.share_movel ?? 0),
      shareFibra: Number(detail.share_fibra ?? 0),
    },
    crm: {
      arpu: Number(crm?.avg_arpu ?? 0),
      deviceTier: crm?.device_tier ?? "—",
      planType: crm?.dominant_plan_type ?? "—",
      arpuMovel: Number(crm?.arpu_movel ?? 0),
      arpuFibra: Number(crm?.arpu_fibra ?? 0),
      planoMovel: crm?.plan_type_movel ?? "—",
    },
    speedtest: {
      downloadMbps: Math.round(Number(detail.download_mbps ?? 0)),
      latencyMs: Math.round(Number(detail.latency_ms ?? 0)),
      qualityLabel: detail.quality_label ?? "—",
    },
    demographics: {
      avgIncome,
      incomeLabel: crm?.income_label ?? "—",
      populationDensity: Math.round(Number(crm?.population_density ?? 0)),
      populationGrowth: 0, // backend ainda não tem growth populacional
      growthLabel: "Estável",
      technology: technology === "MOVEL" ? "4G/5G" : "Fibra",
      severity: "Baixa",
    },
    diagnostico: {
      scoreOokla: Number(diag?.score_ookla ?? 0),
      scoreOoklaMovel: Number(diag?.score_ookla_movel ?? 0),
      scoreOoklaFibra: Number(diag?.score_ookla_fibra ?? 0),
      scoreHAC: Number(diag?.score_hac ?? 0),
      taxaChamados: Number(diag?.taxa_chamados ?? 0),
      sharePenetracao: Number(diag?.share_penetracao ?? detail.share_vivo) || 0,
      deltaVsLider: Number(diag?.delta_vs_lider ?? 0),
      deltaVsLiderFibra: Number(diag?.delta_vs_lider_fibra ?? 0),
      deltaVsLiderMovel: Number(diag?.delta_vs_lider_movel ?? 0),
      scoreLiderFibra: 0, // não exposto pelo backend
      scoreLiderMovel: 0,
      arpuRelativo: Number(diag?.arpu_relativo ?? 1),
      canalDominante: diag?.canal_dominante ?? "—",
      canalPct: Number(diag?.canal_pct ?? 0),
      concorrentes: [], // metadata de concorrentes não está no backend
    },
    camada2: {
      fibra: {
        classification: asCamada2(fibra?.classification),
        score: Number(fibra?.score ?? 0),
        scoreLabel: fibra?.score_label ?? "—",
        taxaOcupacao: fibra?.taxa_ocupacao ?? undefined,
        portasDisponiveis: fibra?.portas_disponiveis ?? undefined,
        potencialMercado: fibra?.potencial_mercado ?? undefined,
        sinergiaMovel: fibra?.sinergia_movel ?? undefined,
      },
      movel: {
        classification: asCamada2(movel?.classification),
        score: Number(movel?.score ?? 0),
        scoreLabel: movel?.score_label ?? "—",
      },
      decisaoIntegrada,
    },
    strategy: pickStrategy(quadrant),
    priorityScore,
    priority,
  };
}

/**
 * MIGRATION_NOTES — campos do GeohashEntry sem equivalente direto no backend:
 * - marketShare.activeClients (sem coluna em vw_geohash_summary)
 * - shareTrend.deltaMovel / deltaFibra (backend só tem trend_delta agregado)
 * - demographics.populationGrowth / growthLabel (sem coluna)
 * - demographics.severity (categórico não exposto)
 * - diagnostico.scoreLiderFibra / scoreLiderMovel (existe delta_vs_lider, não o score absoluto)
 * - diagnostico.concorrentes[] (catálogo de concorrentes não modelado)
 * - camada2.decisaoIntegrada (concatenação heurística de decisao_movel + decisao_fibra)
 */
