/**
 * Aceita diretamente o sape retornado por geohash.getById() da API tRPC
 */

import {
  type BenchmarkThresholds,
  DEFAULT_BENCHMARKS,
} from "./benchmark-thresholds";

//  Input

export interface GeohashDetail {
  geohash_id: string;
  city: string;
  bairro?: string | null;
  quadrant_type: string;
  tech_category: string;
  share_vivo: number;
  trend_direction: string;
  trend_delta: number;
  vivo_score?: number | null;
  tim_score?: number | null;
  claro_score?: number | null;
  download_mbps?: number | null;
  latency_ms?: number | null;
  quality_label?: string | null;
  crm?: {
    avg_income?: number | null;
    income_label?: string | null;
    device_tier?: string | null;
  } | null;
  camada2?: {
    fibra?: { classification: string } | null;
    movel?: { classification: string } | null;
  } | null;
}

//  Classificacao

type Classificacao = "ACIMA" | "ABAIXO" | "NA_MEDIA";

function classificar(
  valor: number,
  alto: number,
  baixo: number,
): Classificacao {
  if (valor >= alto) return "ACIMA";
  if (valor < baixo) return "ABAIXO";
  return "NA_MEDIA";
}

//  Helpers

function formatBRL(value: number): string {
  const n = Math.round(value);
  return `R$${n.toLocaleString("pt-BR")}`;
}

const CONSUMO: Record<string, string> = {
  Premium: "consumo premium",
  Mid: "consumo moderado",
  Basic: "consumo econômico",
};

const TECH_LABEL: Record<string, string> = {
  MOVEL: "móvel",
  FIBRA: "fibra",
};

const TECH_DISPLAY: Record<string, string> = {
  MOVEL: "MÓVEL",
  FIBRA: "FIBRA",
};

function inferirIncomeLabel(avg: number): string {
  if (avg >= 10_000) return "Alto";
  if (avg >= 5_000) return "Médio-Alto";
  if (avg >= 3_000) return "Médio";
  return "Baixo";
}

const VALOR_AREA_POR_QUADRANTE: Record<string, string> = {
  GROWTH: "alto valor",
  UPSELL: "alto potencial",
  RETENCAO: "valor estratégico",
  GROWTH_RETENCAO: "alto valor estratégico",
};

function inferirAreaValor(quadrant: string): string {
  return VALOR_AREA_POR_QUADRANTE[quadrant] ?? "valor moderado";
}

function classificacaoMercado(c: Classificacao): string {
  if (c === "ABAIXO") return "[ABAIXO de concorrentes]";
  if (c === "ACIMA") return "[Acima de concorrentes]";
  return "[Na média dos concorrentes]";
}

//  Schema estruturado

function pad(label: string, target = 15): string {
  const base = `▸ ${label}:`;
  const spaces = Math.max(3, target - base.length);
  return base + " ".repeat(spaces);
}

export function buildSchema(
  d: GeohashDetail,
  b: BenchmarkThresholds = DEFAULT_BENCHMARKS,
): string {
  const techLabel = TECH_LABEL[d.tech_category] ?? d.tech_category.toLowerCase();
  const techDisplay = TECH_DISPLAY[d.tech_category] ?? d.tech_category;

  const lines: string[] = [];

  // Cabeçalho
  const local = d.bairro ? `${d.bairro}, ${d.city}` : d.city;
  lines.push(
    `${local} (${d.geohash_id}) — ${d.quadrant_type} / ${techDisplay}`,
  );
  lines.push("");

  // PÚBLICO
  const income = d.crm?.avg_income;
  if (income != null) {
    const valor = inferirAreaValor(d.quadrant_type);
    const renda = formatBRL(income);
    const label = d.crm?.income_label ?? inferirIncomeLabel(income);
    const consumo = d.crm?.device_tier ? CONSUMO[d.crm.device_tier] : null;

    const populacao: string[] = [`População de nível ${label.toLowerCase()}`];
    if (consumo) populacao.push(consumo);

    lines.push(
      `${pad("PÚBLICO")}Área de ${valor} com renda média de ${renda} — ${populacao.join(", ")}`,
    );
    lines.push("");
  }

  // SATISFAÇÃO
  if (d.vivo_score != null) {
    const concorrentes: { name: string; score: number }[] = [];
    if (d.tim_score != null && d.tim_score > d.vivo_score) {
      concorrentes.push({ name: "TIM", score: d.tim_score });
    }
    if (d.claro_score != null && d.claro_score > d.vivo_score) {
      concorrentes.push({ name: "CLARO", score: d.claro_score });
    }
    concorrentes.sort((a, b) => b.score - a.score);

    let line = pad("SATISFAÇÃO");
    if (concorrentes.length > 0) {
      const top = concorrentes[0];
      line += `Em comparação com concorrentes, a ${top.name} tem maior destaque na área ${techLabel}. `;
    }
    line += `Satisfação VIVO: ${d.vivo_score}/10`;
    lines.push(line);
    lines.push("");
  }

  // MERCADO
  const shareClass = classificar(d.share_vivo, b.shareAlto, b.shareBaixo);
  lines.push(
    `${pad("MERCADO")}Share ${d.share_vivo}% na ${techLabel} ${classificacaoMercado(shareClass)}`,
  );
  lines.push("");

  // REDE
  if (d.download_mbps != null) {
    const qual = d.quality_label ?? "Regular";
    lines.push(
      `${pad("REDE")}${d.download_mbps} Mbps ↓ / ${d.latency_ms ?? 0}ms ↑ — qualidade ${qual}`,
    );
    lines.push("");
  }

  // TENDÊNCIA DE SHARE
  const sign = d.trend_delta > 0 ? "+" : "";
  lines.push(
    `${pad("TENDÊNCIA DE SHARE")}${sign}${d.trend_delta}pp para ${techLabel} nos próximos 3 meses`,
  );

  return lines.join("\n");
}

//  Compatibilidade: generateSummary devolve o schema deterministico
//  (a chamada à OpenAI foi removida porque o schema é totalmente derivável).

export async function generateSummary(
  detail: GeohashDetail,
  _apiKey: string,
  benchmarks: BenchmarkThresholds = DEFAULT_BENCHMARKS,
): Promise<string> {
  return buildSchema(detail, benchmarks);
}

export function buildPrompt(
  d: GeohashDetail,
  b: BenchmarkThresholds = DEFAULT_BENCHMARKS,
): string {
  return buildSchema(d, b);
}
