/**
 * Aceita diretamente o shape retornado por geohash.getById() da API tRPC,
 */

import {
  type BenchmarkThresholds,
  DEFAULT_BENCHMARKS,
} from "./benchmark-thresholds";

//  Input:

export interface GeohashDetail {
  geohash_id: string;
  neighborhood: string | null;
  city: string;
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

function classificarTendencia(
  delta: number,
  up: number,
  down: number,
): Classificacao {
  if (delta >= up) return "ACIMA";
  if (delta <= down) return "ABAIXO";
  return "NA_MEDIA";
}

//  Helpers 

function formatBRL(value: number): string {
  const n = Math.round(value);
  return `R$${n.toLocaleString("pt-BR")}`;
}

const PERFIL_BASE: Record<string, string> = {
  Alto: "alta renda",
  "Médio-Alto": "renda media-alta",
  "Médio": "renda intermediaria",
  Baixo: "perfil popular",
};

const CONSUMO: Record<string, string> = {
  Premium: "consumo premium",
  Mid: "consumo moderado",
  Basic: "consumo economico",
};

function inferirIncomeLabel(avg: number): string {
  if (avg >= 10_000) return "Alto";
  if (avg >= 5_000) return "Médio-Alto";
  if (avg >= 3_000) return "Médio";
  return "Baixo";
}

function inferirPerfilRegiao(d: GeohashDetail): string | null {
  const income = d.crm?.avg_income;
  if (income == null) return null;

  const label = d.crm?.income_label ?? inferirIncomeLabel(income);
  const base = PERFIL_BASE[label];
  if (!base) return null;

  const consumo = d.crm?.device_tier ? CONSUMO[d.crm.device_tier] : null;
  return consumo ? `${base}, ${consumo}` : base;
}

//  Blocos condicionais do prompt

function satisfacaoBlock(d: GeohashDetail, cls: Classificacao | null): string {
  if (d.vivo_score == null)
    return "- Satisfacao Vivo: dado nao disponivel";
  return `- Satisfacao Vivo: ${d.vivo_score}/10 (classificacao: ${cls})`;
}

function redeBlock(d: GeohashDetail): string {
  if (d.download_mbps == null)
    return "- Qualidade de rede: dado nao disponivel";
  return `- Download: ${d.download_mbps} Mbps, Latencia: ${d.latency_ms ?? 0}ms, Qualidade: ${d.quality_label ?? "Regular"}`;
}

function rendaBlock(
  d: GeohashDetail,
  cls: Classificacao | null,
): string {
  const income = d.crm?.avg_income;
  if (income == null) return "- Renda media: dado nao disponivel";
  return `- Renda media: ${formatBRL(income)} (classificacao: ${cls})`;
}

function perfilBlock(d: GeohashDetail): string {
  const p = inferirPerfilRegiao(d);
  return p ? `- Perfil da regiao: ${p}` : "";
}

function camada2Block(d: GeohashDetail): string {
  const fc = d.camada2?.fibra?.classification;
  const mc = d.camada2?.movel?.classification;
  if (!fc && !mc) return "";
  const parts: string[] = [];
  if (fc) parts.push(`Fibra: ${fc}`);
  if (mc) parts.push(`Movel: ${mc}`);
  return `- Camada 2 (Infraestrutura): ${parts.join(", ")}`;
}

//  Prompt template 

const PROMPT_TEMPLATE = `Voce e um analista estrategico de telecomunicacoes. Gere um resumo executivo curto (3 a 6 frases) em portugues brasileiro sobre a area descrita abaixo.

**Dados do Geohash:**
- Bairro: {bairro}, Cidade: {cidade}
- Quadrante estrategico: {quadrant}
- Tecnologia predominante: {technology}
- Share de mercado Vivo: {shareFormatado} (classificacao: {shareClass})
{satisfacaoBlock}
{redeBlock}
{rendaBlock}
{perfilBlock}
- Tendencia de share: {tendenciaFormatada} (classificacao: {tendenciaClass})
{camada2Block}

**Thresholds de referencia:**
- Satisfacao: ACIMA >= {satisfacaoAlta}, ABAIXO < {satisfacaoBaixa}
- Share: ACIMA >= {shareAlto}%, ABAIXO < {shareBaixo}%
- Renda: Alta >= R\${rendaAlta}, Baixa < R\${rendaBaixa}
- Tendencia: Positiva >= +{trendUp}pp, Negativa <= {trendDown}pp

**Instrucoes:**
1. Classifique explicitamente cada dimensao disponivel como ACIMA, ABAIXO ou NA MEDIA em relacao aos thresholds
2. Use tom executivo e objetivo
3. Mencione o bairro e a cidade no inicio
4. Conclua com uma recomendacao estrategica alinhada ao quadrante:
   - GROWTH = foco em aquisicao de novos clientes
   - UPSELL = foco em cross-sell e upgrade de planos
   - RETENCAO = foco em fidelizacao e reducao de churn
   - GROWTH_RETENCAO = foco em estabilizacao (dupla frente: aquisicao + infraestrutura)
5. Se o perfil da regiao estiver disponivel, incorpore-o naturalmente ao resumo (ex: "area de alta renda com consumo premium")
6. Se algum dado nao estiver disponivel, mencione apenas os dados presentes
7. Escreva entre 3 e 6 frases, sem usar bullet points`;

//  Build prompt 

export function buildPrompt(
  d: GeohashDetail,
  b: BenchmarkThresholds = DEFAULT_BENCHMARKS,
): string {
  const satClass =
    d.vivo_score != null
      ? classificar(d.vivo_score, b.satisfacaoAlta, b.satisfacaoBaixa)
      : null;

  const income = d.crm?.avg_income;
  const rendaClass =
    income != null ? classificar(income, b.rendaAlta, b.rendaBaixa) : null;

  const sign = d.trend_delta > 0 ? "+" : "";
  const tendFmt = `${d.trend_direction} (${sign}${d.trend_delta}pp)`;

  const vars: Record<string, string | number> = {
    bairro: d.neighborhood ?? "Desconhecido",
    cidade: d.city,
    quadrant: d.quadrant_type,
    technology: d.tech_category,
    shareFormatado: `${d.share_vivo}%`,
    shareClass: classificar(d.share_vivo, b.shareAlto, b.shareBaixo),
    satisfacaoBlock: satisfacaoBlock(d, satClass),
    redeBlock: redeBlock(d),
    rendaBlock: rendaBlock(d, rendaClass),
    perfilBlock: perfilBlock(d),
    tendenciaFormatada: tendFmt,
    tendenciaClass: classificarTendencia(d.trend_delta, b.trendUp, b.trendDown),
    camada2Block: camada2Block(d),
    satisfacaoAlta: b.satisfacaoAlta,
    satisfacaoBaixa: b.satisfacaoBaixa,
    shareAlto: b.shareAlto,
    shareBaixo: b.shareBaixo,
    rendaAlta: formatBRL(b.rendaAlta).replace("R$", ""),
    rendaBaixa: formatBRL(b.rendaBaixa).replace("R$", ""),
    trendUp: b.trendUp,
    trendDown: b.trendDown,
  };

  return PROMPT_TEMPLATE.replace(
    /\{(\w+)\}/g,
    (_, key) => String(vars[key] ?? ""),
  );
}

//  Chamada OpenAI

export async function generateSummary(
  detail: GeohashDetail,
  apiKey: string,
  benchmarks: BenchmarkThresholds = DEFAULT_BENCHMARKS,
): Promise<string> {
  const prompt = buildPrompt(detail, benchmarks);

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${body}`);
  }

  const json = (await res.json()) as {
    choices: { message: { content: string } }[];
  };
  return json.choices[0].message.content;
}
