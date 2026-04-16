import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash } from "crypto";
import { eq, sql } from "drizzle-orm";
import { DRIZZLE } from "../database/drizzle.provider";
import type { DrizzleDB } from "../database/drizzle.provider";
import { geohashIaSummary } from "../database/schema/geohash-ia-summary";
import type {
  GeohashDetailForSummary,
  IaSummaryResult,
  IaSummaryServiceContract,
} from "./ia-summary.types";

// ── Migrado de /recomendacao/benchmark-thresholds.ts ─────────────────────────

interface BenchmarkThresholds {
  satisfacaoAlta: number;
  satisfacaoBaixa: number;
  shareAlto: number;
  shareBaixo: number;
  rendaAlta: number;
  rendaBaixa: number;
  trendUp: number;
  trendDown: number;
}

const DEFAULT_BENCHMARKS: BenchmarkThresholds = {
  satisfacaoAlta: 7.5,
  satisfacaoBaixa: 6.0,
  shareAlto: 40,
  shareBaixo: 30,
  rendaAlta: 10_000,
  rendaBaixa: 3_500,
  trendUp: 1.0,
  trendDown: -1.0,
};

// ── Migrado de /recomendacao/geohash-summary.ts ───────────────────────────────

type Classificacao = "ACIMA" | "ABAIXO" | "NA_MEDIA";

function classificar(valor: number, alto: number, baixo: number): Classificacao {
  if (valor >= alto) return "ACIMA";
  if (valor < baixo) return "ABAIXO";
  return "NA_MEDIA";
}

function classificarTendencia(delta: number, up: number, down: number): Classificacao {
  if (delta >= up) return "ACIMA";
  if (delta <= down) return "ABAIXO";
  return "NA_MEDIA";
}

function formatBRL(value: number): string {
  const n = Math.round(value);
  return `R$${n.toLocaleString("pt-BR")}`;
}

const PERFIL_BASE: Record<string, string> = {
  Alto: "alta renda",
  "Médio-Alto": "renda media-alta",
  Médio: "renda intermediaria",
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

function inferirPerfilRegiao(d: GeohashDetailForSummary): string | null {
  const income = d.crm?.avg_income;
  if (income == null) return null;
  const label = d.crm?.income_label ?? inferirIncomeLabel(income);
  const base = PERFIL_BASE[label];
  if (!base) return null;
  const consumo = d.crm?.device_tier ? CONSUMO[d.crm.device_tier] : null;
  return consumo ? `${base}, ${consumo}` : base;
}

//  Diagnostico deterministico por dimensao (alimenta o prompt ORA)

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
  d: GeohashDetailForSummary,
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

//  Formato unico: OPORTUNIDADE / RISCO / ACAO

const ORA_TEMPLATE = `Voce e um analista estrategico de telecomunicacoes. Com base no diagnostico por dimensao abaixo, produza um resumo executivo em EXATAMENTE tres blocos rotulados, nesta ordem e com esta formatacao literal (inclusive as quebras de linha no meio de cada bloco):

OPORTUNIDADE:
<frase 1 do bloco>
<frase 2 do bloco>.

RISCO:
<frase 1 do bloco>
<frase 2 do bloco>.

ACAO:
<frase 1 do bloco>
<frase 2 do bloco>.

Diagnostico de referencia:
{diagnostico}

Regras obrigatorias:
1. Produza SOMENTE os tres blocos acima, sem titulo, sem introducao, sem fechamento, sem bullets, sem numeros, sem emojis.
2. Cada bloco deve ter entre 18 e 28 palavras distribuidas em duas linhas (quebra de linha apos ~10-14 palavras), terminando em ponto final.
3. OPORTUNIDADE: destaque o(s) vetor(es) positivos (ex.: tendencia, expansao de fibra/movel, perfil de renda, share alto) conectando-os a uma janela de acao.
4. RISCO: explicite as dimensoes que podem travar a conversao/retencao (ex.: satisfacao na media/abaixo, qualidade regular, share baixo, tendencia negativa).
5. ACAO: prescreva UMA acao concreta alinhada ao quadrante ({quadrant}):
   - GROWTH => campanha de aquisicao
   - UPSELL => cross-sell / upgrade de planos
   - RETENCAO => fidelizacao / reducao de churn
   - GROWTH_RETENCAO => dupla frente: aquisicao + reforco de infraestrutura
   Condicione a acao ao tratamento do risco identificado ("condicionada a...", "em paralelo a...", "apos...").
6. Use linguagem executiva, portugues brasileiro, sem repetir numeros que ja constam no diagnostico.
7. Se o perfil de renda estiver disponivel no diagnostico, referencie-o na ACAO (ex.: "perfil de renda intermediaria", "publico de alta renda").
8. Rotulos em caixa alta, exatamente: "OPORTUNIDADE:", "RISCO:", "ACAO:" (sem acentos nos rotulos; a normalizacao para "AÇÃO" e feita em pos-processamento).`;

function buildPrompt(
  d: GeohashDetailForSummary,
  b: BenchmarkThresholds = DEFAULT_BENCHMARKS,
): string {
  const diagnostico = buildDiagnostico(d, b);
  return ORA_TEMPLATE.replace("{diagnostico}", diagnostico).replace(
    "{quadrant}",
    d.quadrant_type,
  );
}

function formatOra(raw: string): string {
  const normalized = raw.replace(/A[CÇ][AÃ]O\s*:/g, "AÇÃO:").trim();

  const blockRegex =
    /(OPORTUNIDADE|RISCO|AÇÃO)\s*:\s*([\s\S]*?)(?=(?:OPORTUNIDADE|RISCO|AÇÃO)\s*:|$)/g;

  const blocks: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = blockRegex.exec(normalized)) !== null) {
    const label = match[1];
    const content = match[2].trim();

    const splitAt = content.search(/\.\s+/);
    if (splitAt >= 0) {
      const line1 = content.slice(0, splitAt + 1).trim();
      const line2 = content.slice(splitAt + 1).trim();
      blocks.push(`${label}: ${line1}\n${line2}`);
    } else {
      blocks.push(`${label}: ${content}`);
    }
  }

  return blocks.join("\n\n");
}

async function callOpenAI(prompt: string, apiKey: string): Promise<string> {
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

// ── NestJS Service ────────────────────────────────────────────────────────────

@Injectable()
export class IaSummaryService implements IaSummaryServiceContract {
  private readonly logger = new Logger(IaSummaryService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly config: ConfigService,
  ) {}

  async getSummary(geohashId: string): Promise<IaSummaryResult | null> {
    const rows = await this.db
      .select()
      .from(geohashIaSummary)
      .where(eq(geohashIaSummary.geohashId, geohashId))
      .limit(1);

    if (rows.length === 0) return null;
    return { text: rows[0].summaryText, generatedAt: rows[0].generatedAt };
  }

  async generateAndPersist(
    detail: GeohashDetailForSummary,
  ): Promise<IaSummaryResult> {
    const apiKey = this.config.get<string>("app.openaiApiKey");
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

    const prompt = buildPrompt(detail, DEFAULT_BENCHMARKS);
    const promptHash = createHash("sha256").update(prompt).digest("hex");

    this.logger.log(
      `Generating IA summary for geohash ${detail.geohash_id}`,
    );

    const raw = await callOpenAI(prompt, apiKey);
    const summaryText = formatOra(raw);
    const now = new Date().toISOString();

    await this.db
      .insert(geohashIaSummary)
      .values({
        geohashId: detail.geohash_id,
        summaryText,
        model: "gpt-4o-mini",
        promptHash,
        generatedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: geohashIaSummary.geohashId,
        set: {
          summaryText,
          promptHash,
          generatedAt: now,
          updatedAt: sql`NOW()`,
        },
      });

    return { text: summaryText, generatedAt: now };
  }
}
