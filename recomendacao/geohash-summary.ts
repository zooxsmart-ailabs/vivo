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

//  Diagnostico deterministico por dimensao (alimenta o prompt narrativo)

function humanizeSnakeCase(s: string): string {
  return s
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function displayClassificacao(c: Classificacao): string {
  const map: Record<Classificacao, string> = {
    ACIMA: "ACIMA",
    ABAIXO: "ABAIXO",
    NA_MEDIA: "NA MÉDIA",
  };
  return map[c];
}

function displayTendencia(c: Classificacao): string {
  const map: Record<Classificacao, string> = {
    ACIMA: "POSITIVA",
    ABAIXO: "NEGATIVA",
    NA_MEDIA: "ESTÁVEL",
  };
  return map[c];
}

function buildDiagnostico(
  d: GeohashDetail,
  b: BenchmarkThresholds,
): string {
  const shareClass = classificar(d.share_vivo, b.shareAlto, b.shareBaixo);
  const satClass =
    d.vivo_score != null
      ? classificar(d.vivo_score, b.satisfacaoAlta, b.satisfacaoBaixa)
      : null;
  const income = d.crm?.avg_income;
  const rendaClass =
    income != null ? classificar(income, b.rendaAlta, b.rendaBaixa) : null;
  const tendClass = classificarTendencia(
    d.trend_delta,
    b.trendUp,
    b.trendDown,
  );

  const lines: string[] = [];

  lines.push(
    `📍 ${d.city} (${d.geohash_id}) — ${d.quadrant_type} / ${d.tech_category}`,
  );
  lines.push("");

  // MERCADO
  const shareDetalhe =
    shareClass === "ABAIXO"
      ? `abaixo do piso de ${b.shareBaixo}%`
      : shareClass === "ACIMA"
        ? `acima do teto de ${b.shareAlto}%`
        : `entre os limiares (${b.shareBaixo}%–${b.shareAlto}%)`;
  lines.push(
    `▸ MERCADO:     Share ${d.share_vivo}% [${displayClassificacao(shareClass)}] — ${shareDetalhe}`,
  );

  // SATISFAÇÃO
  if (d.vivo_score != null && satClass != null) {
    const satDetalhe =
      satClass === "ABAIXO"
        ? `abaixo do piso de ${b.satisfacaoBaixa}`
        : satClass === "ACIMA"
          ? `acima do teto de ${b.satisfacaoAlta}`
          : `entre os limiares (${b.satisfacaoBaixa}–${b.satisfacaoAlta})`;
    lines.push(
      `▸ SATISFAÇÃO:  ${d.vivo_score}/10 [${displayClassificacao(satClass)}] — ${satDetalhe}`,
    );
  }

  // REDE
  if (d.download_mbps != null) {
    const qual = d.quality_label ?? "Regular";
    lines.push(
      `▸ REDE:        ${d.download_mbps} Mbps ↓ / ${d.latency_ms ?? 0}ms ↑ — qualidade ${qual}`,
    );
  }

  // RENDA
  if (income != null && rendaClass != null) {
    const perfil = inferirPerfilRegiao(d);
    const perfilStr = perfil ? ` — perfil ${perfil}` : "";
    lines.push(
      `▸ RENDA:       ${formatBRL(income)} [${displayClassificacao(rendaClass)}]${perfilStr}`,
    );
  }

  // TENDÊNCIA
  const sign = d.trend_delta > 0 ? "+" : "";
  const tendLabel = displayTendencia(tendClass);
  const tendDetalhe =
    tendClass === "ACIMA"
      ? `acima do limiar de +${b.trendUp}pp`
      : tendClass === "ABAIXO"
        ? `abaixo do limiar de ${b.trendDown}pp`
        : `entre os limiares (${b.trendDown}pp a +${b.trendUp}pp)`;
  lines.push(
    `▸ TENDÊNCIA:   ${sign}${d.trend_delta}pp [${tendLabel}] — ${tendDetalhe}`,
  );

  // INFRA
  const fc = d.camada2?.fibra?.classification;
  const mc = d.camada2?.movel?.classification;
  if (fc || mc) {
    const parts: string[] = [];
    if (fc) parts.push(`Fibra: ${humanizeSnakeCase(fc)}`);
    if (mc) parts.push(`Móvel: ${humanizeSnakeCase(mc)}`);
    lines.push(`▸ INFRA:       ${parts.join(" | ")}`);
  }

  return lines.join("\n");
}

//  Chamada OpenAI

async function callOpenAI(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-5.4-mini",
      temperature: 0.2,
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

//  Prompt narrativo — analise em 4 blocos tematicos

const NARRATIVE_TEMPLATE = `Voce e um analista estrategico de telecomunicacoes. Com base no diagnostico abaixo, produza uma analise narrativa em 3 a 4 paragrafos curtos, sem titulos, sem rotulos, sem listas, sem topicos e sem emojis.

A analise deve seguir esta progressao tematica:

1) Demografia e potencial: classifique a area como alto, medio ou baixo valor; mencione a renda media em R$; compare com a media da regiao (acima, abaixo ou na media); descreva o perfil populacional; indique o potencial comercial da area.

2) Satisfacao e competicao: avalie como esta a satisfacao da Vivo; compare com concorrentes; aponte quem se destaca em movel e quem se destaca em fibra; explique a implicacao disso para aquisicao, retencao ou upgrade.

3) Share e oportunidade comercial: compare o share da Vivo em movel vs fibra; indique a tendencia do share; interprete se existe demanda reprimida, oportunidade de aquisicao, upgrade, convergencia ou risco.

4) Sintese estrategica: consolide a leitura da area; aponte qual movimento faz mais sentido (aquisicao, upgrade, retencao ou melhoria previa de qualidade); use conclusao analitica, sem imperativo direto.

Diagnostico de referencia:
{diagnostico}

Quadrante estrategico: {quadrant}

Regras obrigatorias:
1. Produza SOMENTE os paragrafos de analise, sem titulo, sem introducao, sem fechamento, sem bullets, sem numeros, sem emojis.
2. Nao usar cabecalhos, bullets, numeracao ou formatacao visivel.
3. Tom executivo, frases encadeadas, linguagem natural.
4. Priorizar inferencia de negocio e relacoes de causa e efeito entre os dados.
5. O texto deve soar como um diagnostico regional para negocio telecom.
6. Evitar repeticao excessiva de nomes de indicadores.
7. Cada paragrafo deve ter linguagem executiva, analitica e objetiva.
8. Sempre que possivel, relacionar causa e efeito entre os dados.
9. Se o perfil de renda estiver disponivel no diagnostico, incorpore-o naturalmente na analise.
10. Produza entre 2 e 4 paragrafos curtos, com no máximo 3 linhas e no mínimo 2, separados por linha em branco.`;

export function buildPrompt(
  d: GeohashDetail,
  b: BenchmarkThresholds = DEFAULT_BENCHMARKS,
): string {
  const diagnostico = buildDiagnostico(d, b);
  return NARRATIVE_TEMPLATE.replace("{diagnostico}", diagnostico).replace(
    "{quadrant}",
    d.quadrant_type,
  );
}

/**
 * Normaliza o output narrativo do modelo:
 *   1. Remove cabecalhos numerados ou com marcadores.
 *   2. Normaliza espacamento entre paragrafos (exatamente uma linha em branco).
 *   3. Trim geral.
 */
function formatNarrative(raw: string): string {
  let text = raw.trim();
  // Remove cabecalhos numerados (ex: "1.", "2)", "Bloco 1 —", etc.)
  text = text.replace(/^\s*(?:\d+[\.\)]\s*[-—]?\s*|Bloco\s+\d+\s*[-—:]\s*)/gim, "");

  // Remove linhas de marcadores (bullets, hifens iniciais)
  text = text.replace(/^\s*[-•]\s+/gm, "");

  // Normaliza paragrafos: colapsa 3+ quebras em exatamente 2 (um paragrafo de separacao)
  text = text.replace(/\n{3,}/g, "\n\n");

  return text.trim();
}

export async function generateSummary(
  detail: GeohashDetail,
  apiKey: string,
  benchmarks: BenchmarkThresholds = DEFAULT_BENCHMARKS,
): Promise<string> {
  const prompt = buildPrompt(detail, benchmarks);
  const raw = await callOpenAI(prompt, apiKey);
  return formatNarrative(raw);
}
