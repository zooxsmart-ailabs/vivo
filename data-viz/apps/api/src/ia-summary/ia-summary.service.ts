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

function satisfacaoBlock(d: GeohashDetailForSummary, cls: Classificacao | null): string {
  if (d.vivo_score == null) return "- Satisfacao Vivo: dado nao disponivel";
  return `- Satisfacao Vivo: ${d.vivo_score}/10 (classificacao: ${cls})`;
}

function redeBlock(d: GeohashDetailForSummary): string {
  if (d.download_mbps == null) return "- Qualidade de rede: dado nao disponivel";
  return `- Download: ${d.download_mbps} Mbps, Latencia: ${d.latency_ms ?? 0}ms, Qualidade: ${d.quality_label ?? "Regular"}`;
}

function rendaBlock(d: GeohashDetailForSummary, cls: Classificacao | null): string {
  const income = d.crm?.avg_income;
  if (income == null) return "- Renda media: dado nao disponivel";
  return `- Renda media: ${formatBRL(income)} (classificacao: ${cls})`;
}

function perfilBlock(d: GeohashDetailForSummary): string {
  const p = inferirPerfilRegiao(d);
  return p ? `- Perfil da regiao: ${p}` : "";
}

function camada2Block(d: GeohashDetailForSummary): string {
  const fc = d.camada2?.fibra?.classification;
  const mc = d.camada2?.movel?.classification;
  if (!fc && !mc) return "";
  const parts: string[] = [];
  if (fc) parts.push(`Fibra: ${fc}`);
  if (mc) parts.push(`Movel: ${mc}`);
  return `- Camada 2 (Infraestrutura): ${parts.join(", ")}`;
}

const PROMPT_TEMPLATE = `Voce e um analista estrategico de telecomunicacoes. Com base nos dados abaixo, produza uma analise narrativa em 3 a 4 paragrafos curtos, sem titulos, sem rotulos, sem listas, sem topicos e sem emojis.

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

A analise deve seguir esta progressao tematica:

1) Demografia e potencial: classifique a area como alto, medio ou baixo valor; mencione a renda media em R$; compare com a media da regiao (acima, abaixo ou na media); descreva o perfil populacional; indique o potencial comercial da area. Mencione o bairro e a cidade.

2) Satisfacao e competicao: avalie como esta a satisfacao da Vivo; compare com concorrentes; aponte quem se destaca em movel e quem se destaca em fibra; explique a implicacao disso para aquisicao, retencao ou upgrade.

3) Share e oportunidade comercial: compare o share da Vivo em movel vs fibra; indique a tendencia do share; interprete se existe demanda reprimida, oportunidade de aquisicao, upgrade, convergencia ou risco.

4) Sintese estrategica: consolide a leitura da area; aponte qual movimento faz mais sentido alinhado ao quadrante ({quadrant}):
   - GROWTH = aquisicao de novos clientes
   - UPSELL = cross-sell e upgrade de planos
   - RETENCAO = fidelizacao e reducao de churn
   - GROWTH_RETENCAO = dupla frente: aquisicao + infraestrutura
   Use conclusao analitica, sem imperativo direto.

**Regras obrigatorias:**
1. Produza SOMENTE os paragrafos de analise, sem titulo, sem introducao, sem fechamento, sem bullets, sem numeros, sem emojis.
2. Nao usar rotulos como "OPORTUNIDADE", "RISCO" ou "ACAO".
3. Nao usar cabecalhos, bullets, numeracao ou formatacao visivel.
4. Tom executivo, frases encadeadas, linguagem natural.
5. Priorizar inferencia de negocio e relacoes de causa e efeito entre os dados.
6. O texto deve soar como um diagnostico regional para negocio telecom.
7. Se o perfil da regiao estiver disponivel, incorpore-o naturalmente na analise.
8. Se algum dado nao estiver disponivel, mencione apenas os dados presentes.
9. Produza entre 3 e 4 paragrafos curtos, separados por linha em branco.`;

function buildPrompt(
  d: GeohashDetailForSummary,
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

    const summaryText = await callOpenAI(prompt, apiKey);
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
