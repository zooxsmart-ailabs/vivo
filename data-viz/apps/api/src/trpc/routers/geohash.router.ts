import { z } from "zod";
import { sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { observable } from "@trpc/server/observable";
import { t, publicProcedure } from "../trpc.base";
import type { DrizzleDB } from "../../database/drizzle.provider";
import type { GeohashDetailForSummary } from "../../ia-summary/ia-summary.types";

const viewportSchema = z.object({
  swLat: z.number(),
  swLng: z.number(),
  neLat: z.number(),
  neLng: z.number(),
});

const filtersSchema = z.object({
  period: z.string().optional(),
  precision: z.number().int().min(5).max(8).default(6),
  quadrants: z
    .array(z.enum(["GROWTH", "UPSELL", "RETENCAO", "GROWTH_RETENCAO"]))
    .optional(),
  tech: z.enum(["FIBRA", "MOVEL", "AMBOS", "TODOS"]).optional(),
  state: z.string().length(2).optional(),
  city: z.string().optional(),
  neighborhood: z.string().optional(),
});

/**
 * Monta o query de listagem de geohashes com filtros dinâmicos.
 * Usa vw_geohash_summary que já contém todos os indicadores calculados.
 */
async function listGeohashes(
  db: DrizzleDB,
  input: z.infer<typeof filtersSchema> & {
    viewport?: z.infer<typeof viewportSchema>;
    limit?: number;
    offset?: number;
  },
) {
  const rows = await db.execute<{
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
    is_top10: boolean;
  }>(sql`
    WITH target_period AS (
      SELECT ${input.period ? sql`${input.period}::date` : sql`(SELECT MAX(period) FROM vw_geohash_summary)`} AS p
    ),
    -- Primary: geohashes at requested precision
    primary_results AS (
      SELECT
        s.geohash_id,
        gc.precision,
        gc.center_lat,
        gc.center_lng,
        gc.neighborhood,
        gc.city,
        gc.state,
        s.quadrant_type,
        s.share_vivo,
        s.avg_satisfaction_vivo,
        s.priority_score,
        s.priority_label,
        s.tech_category,
        s.trend_direction,
        s.trend_delta,
        s.competitive_position,
        s.period
      FROM vw_geohash_summary s
      JOIN geohash_cell gc ON gc.geohash_id = s.geohash_id
      CROSS JOIN target_period tp
      WHERE gc.precision = ${input.precision}
        AND s.period = tp.p
        ${input.state ? sql`AND gc.state = ${input.state}` : sql``}
        ${input.city ? sql`AND gc.city = ${input.city}` : sql``}
        ${input.neighborhood ? sql`AND gc.neighborhood = ${input.neighborhood}` : sql``}
        ${
          input.quadrants && input.quadrants.length > 0
            ? sql`AND s.quadrant_type = ANY(${input.quadrants})`
            : sql``
        }
        ${
          input.tech && input.tech !== "TODOS"
            ? sql`AND (s.tech_category = ${input.tech} OR s.tech_category = 'AMBOS')`
            : sql``
        }
        ${
          input.viewport
            ? sql`AND gc.center_lat BETWEEN ${input.viewport.swLat} AND ${input.viewport.neLat}
                 AND gc.center_lng BETWEEN ${input.viewport.swLng} AND ${input.viewport.neLng}`
            : sql``
        }
    )${
      input.precision === 7
        ? sql`,
    -- Fallback: precision-6 geohashes that have NO children at precision 7
    fallback_parents AS (
      SELECT
        s.geohash_id,
        gc.precision,
        gc.center_lat,
        gc.center_lng,
        gc.neighborhood,
        gc.city,
        gc.state,
        s.quadrant_type,
        s.share_vivo,
        s.avg_satisfaction_vivo,
        s.priority_score,
        s.priority_label,
        s.tech_category,
        s.trend_direction,
        s.trend_delta,
        s.competitive_position,
        s.period
      FROM vw_geohash_summary s
      JOIN geohash_cell gc ON gc.geohash_id = s.geohash_id
      CROSS JOIN target_period tp
      WHERE gc.precision = 6
        AND s.period = tp.p
        AND NOT EXISTS (
          SELECT 1 FROM primary_results pr
          WHERE pr.geohash_id LIKE gc.geohash_id || '%'
        )
        ${input.state ? sql`AND gc.state = ${input.state}` : sql``}
        ${input.city ? sql`AND gc.city = ${input.city}` : sql``}
        ${input.neighborhood ? sql`AND gc.neighborhood = ${input.neighborhood}` : sql``}
        ${
          input.quadrants && input.quadrants.length > 0
            ? sql`AND s.quadrant_type = ANY(${input.quadrants})`
            : sql``
        }
        ${
          input.tech && input.tech !== "TODOS"
            ? sql`AND (s.tech_category = ${input.tech} OR s.tech_category = 'AMBOS')`
            : sql``
        }
        ${
          input.viewport
            ? sql`AND gc.center_lat BETWEEN ${input.viewport.swLat} AND ${input.viewport.neLat}
                 AND gc.center_lng BETWEEN ${input.viewport.swLng} AND ${input.viewport.neLng}`
            : sql``
        }
    )`
        : sql``
    }
    SELECT *, (RANK() OVER (ORDER BY priority_score DESC) <= 10) AS is_top10
    FROM (
      SELECT * FROM primary_results
      ${input.precision === 7 ? sql`UNION ALL SELECT * FROM fallback_parents` : sql``}
    ) combined
    ORDER BY priority_score DESC
    LIMIT ${input.limit ?? 500}
    OFFSET ${input.offset ?? 0}
  `);

  return rows.rows;
}

export const geohashRouter = t.router({
  /**
   * UC001/UC002/UC003/UC008 — Lista geohashes com filtros de quadrante,
   * tecnologia, período e localização. Cache Redis com TTL 5 min.
   */
  list: publicProcedure.input(filtersSchema).query(async ({ ctx, input }) => {
    const cacheKey = `cache:geohash:list:${JSON.stringify(input)}`;
    const cached = await ctx.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const rows = await listGeohashes(ctx.db, input);
    await ctx.redis.set(cacheKey, JSON.stringify(rows), "EX", 300);
    return rows;
  }),

  /**
   * UC004 — Detalhe completo de um geohash incluindo dados CRM e Camada 2.
   */
  getById: publicProcedure
    .input(
      z.object({
        geohashId: z.string().min(5).max(12),
        period: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const cacheKey = `cache:geohash:detail:${input.geohashId}:${input.period ?? "latest"}`;
      const cached = await ctx.redis.get(cacheKey);
      if (cached) return JSON.parse(cached);

      // Dados base da vw_geohash_summary
      const baseRows = await ctx.db.execute<{
        geohash_id: string;
        precision: number;
        center_lat: number;
        center_lng: number;
        neighborhood: string | null;
        city: string;
        state: string;
        quadrant_type: string;
        share_vivo: number;
        share_fibra: number | null;
        share_movel: number | null;
        avg_satisfaction_vivo: number;
        priority_score: number;
        priority_label: string;
        tech_category: string;
        trend_direction: string;
        trend_delta: number;
        competitive_position: string;
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
        period: string;
      }>(sql`
        SELECT
          s.*,
          gc.precision,
          gc.center_lat,
          gc.center_lng,
          gc.neighborhood,
          gc.city,
          gc.state
        FROM vw_geohash_summary s
        JOIN geohash_cell gc ON gc.geohash_id = s.geohash_id
        WHERE s.geohash_id = ${input.geohashId}
          ${input.period ? sql`AND s.period = ${input.period}` : sql`AND s.period = (SELECT MAX(period) FROM vw_geohash_summary)`}
      `);

      // Queries auxiliares — tabelas de Camada 2/CRM podem não existir ainda
      const safeQuery = <T>(query: Promise<{ rows: T[] }>) =>
        query.then((r) => r.rows[0] ?? null).catch(() => null);

      const [crm, fibra2, movel2, growthDiag] = await Promise.all([
        safeQuery<{
          avg_arpu: number | null;
          arpu_movel: number | null;
          arpu_fibra: number | null;
          dominant_plan_type: string | null;
          plan_type_movel: string | null;
          device_tier: string | null;
          avg_income: number | null;
          population_density: number | null;
          income_label: string | null;
        }>(
          ctx.db.execute(sql`
            SELECT avg_arpu, arpu_movel, arpu_fibra,
                   dominant_plan_type, plan_type_movel, device_tier,
                   avg_income, population_density, income_label
            FROM geohash_crm
            WHERE geohash_id = ${input.geohashId}
              ${input.period ? sql`AND period = ${input.period}` : sql`AND period = (SELECT MAX(period) FROM geohash_crm WHERE geohash_id = ${input.geohashId})`}
          `),
        ),
        safeQuery<{
          classification: string;
          score: number;
          score_label: string;
          taxa_ocupacao: number | null;
          portas_disponiveis: number | null;
          potencial_mercado: number | null;
          sinergia_movel: number | null;
        }>(
          ctx.db.execute(sql`
            SELECT classification, score, score_label,
                   taxa_ocupacao, portas_disponiveis, potencial_mercado, sinergia_movel
            FROM camada2_fibra
            WHERE geohash_id = ${input.geohashId}
              ${input.period ? sql`AND period = ${input.period}` : sql`AND period = (SELECT MAX(period) FROM camada2_fibra WHERE geohash_id = ${input.geohashId})`}
          `),
        ),
        safeQuery<{
          classification: string;
          score: number;
          score_label: string;
          tech_recommendation: string | null;
          speedtest_score: number | null;
          concentracao_renda: number | null;
          vulnerabilidade_concorrencia: number | null;
        }>(
          ctx.db.execute(sql`
            SELECT classification, score, score_label,
                   tech_recommendation, speedtest_score,
                   concentracao_renda, vulnerabilidade_concorrencia
            FROM camada2_movel
            WHERE geohash_id = ${input.geohashId}
              ${input.period ? sql`AND period = ${input.period}` : sql`AND period = (SELECT MAX(period) FROM camada2_movel WHERE geohash_id = ${input.geohashId})`}
          `),
        ),
        safeQuery<{
          score_ookla: number;
          score_ookla_movel: number | null;
          score_ookla_fibra: number | null;
          score_hac: number | null;
          taxa_chamados: number;
          share_penetracao: number;
          delta_vs_lider: number;
          delta_vs_lider_fibra: number | null;
          delta_vs_lider_movel: number | null;
          fibra_class: string;
          movel_class: string;
          arpu_relativo: number;
          canal_dominante: string;
          canal_pct: number;
          sinal_percepcao: string;
          sinal_concorrencia: string;
          sinal_infraestrutura: string;
          sinal_comportamento: string;
          recomendacao: string;
          decisao_movel: string | null;
          decisao_fibra: string | null;
          prio_movel: string | null;
          prio_fibra: string | null;
          recomendacao_razao: string | null;
        }>(
          ctx.db.execute(sql`
            SELECT score_ookla,
                   score_ookla_movel, score_ookla_fibra, score_hac,
                   taxa_chamados,
                   share_penetracao, delta_vs_lider,
                   delta_vs_lider_fibra, delta_vs_lider_movel,
                   fibra_class, movel_class,
                   arpu_relativo, canal_dominante, canal_pct,
                   sinal_percepcao, sinal_concorrencia,
                   sinal_infraestrutura, sinal_comportamento,
                   recomendacao,
                   decisao_movel, decisao_fibra, prio_movel, prio_fibra,
                   recomendacao_razao
            FROM diagnostico_growth
            WHERE geohash_id = ${input.geohashId}
              ${input.period ? sql`AND anomes = ${input.period}` : sql`AND anomes = (SELECT MAX(anomes) FROM diagnostico_growth WHERE geohash_id = ${input.geohashId})`}
          `),
        ),
      ]);

      if (baseRows.rows.length === 0) return null;

      const base = baseRows.rows[0];

      const result = {
        ...base,
        crm,
        camada2:
          fibra2 || movel2
            ? {
                fibra: fibra2,
                movel: movel2,
              }
            : null,
        diagnosticoGrowth: growthDiag,
      };

      await ctx.redis.set(cacheKey, JSON.stringify(result), "EX", 300);
      return result;
    }),

  /**
   * UC007 — Compara dois geohashes lado a lado.
   */
  compare: publicProcedure
    .input(
      z.object({
        geohashIds: z.array(z.string()).min(2).max(2),
        period: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const results = await Promise.all(
        input.geohashIds.map((id) =>
          ctx.db.execute<{
            geohash_id: string;
            neighborhood: string | null;
            city: string;
            quadrant_type: string;
            share_vivo: number;
            avg_satisfaction_vivo: number;
            priority_score: number;
            tech_category: string;
            trend_direction: string;
            trend_delta: number;
            competitive_position: string;
            vivo_score: number | null;
            tim_score: number | null;
            claro_score: number | null;
            download_mbps: number | null;
            latency_ms: number | null;
            quality_label: string | null;
          }>(sql`
            SELECT
              s.geohash_id,
              gc.neighborhood,
              gc.city,
              s.quadrant_type,
              s.share_vivo,
              s.avg_satisfaction_vivo,
              s.priority_score,
              s.tech_category,
              s.trend_direction,
              s.trend_delta,
              s.competitive_position,
              s.vivo_score,
              s.tim_score,
              s.claro_score,
              s.download_mbps,
              s.latency_ms,
              s.quality_label
            FROM vw_geohash_summary s
            JOIN geohash_cell gc ON gc.geohash_id = s.geohash_id
            WHERE s.geohash_id = ${id}
              ${input.period ? sql`AND s.period = ${input.period}` : sql`AND s.period = (SELECT MAX(period) FROM vw_geohash_summary)`}
          `),
        ),
      );

      return results.map((r) => r.rows[0] ?? null);
    }),

  /**
   * UC-IA-01 — Busca o resumo IA persistido para um geohash.
   * Retorna null se ainda não foi gerado.
   */
  iaSummary: publicProcedure
    .input(z.object({ geohashId: z.string().min(5).max(12) }))
    .query(async ({ ctx, input }) => {
      return ctx.iaSummary.getSummary(input.geohashId);
    }),

  /**
   * UC-IA-02 — Gera (ou regenera) o resumo IA para um geohash.
   * Busca os dados do geohash internamente, chama OpenAI e persiste o resultado.
   */
  iaGenerate: publicProcedure
    .input(
      z.object({
        geohashId: z.string().min(5).max(12),
        period: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const periodFilter = input.period
        ? sql`AND s.period = ${input.period}`
        : sql`AND s.period = (SELECT MAX(period) FROM vw_geohash_summary)`;

      const baseRows = await ctx.db.execute<{
        geohash_id: string;
        neighborhood: string | null;
        city: string;
        quadrant_type: string;
        tech_category: string;
        share_vivo: number;
        trend_direction: string;
        trend_delta: number;
        vivo_score: number | null;
        download_mbps: number | null;
        latency_ms: number | null;
        quality_label: string | null;
      }>(sql`
        SELECT s.geohash_id, gc.neighborhood, gc.city,
               s.quadrant_type, s.tech_category, s.share_vivo,
               s.trend_direction, s.trend_delta,
               s.vivo_score, s.download_mbps, s.latency_ms, s.quality_label
        FROM vw_geohash_summary s
        JOIN geohash_cell gc ON gc.geohash_id = s.geohash_id
        WHERE s.geohash_id = ${input.geohashId}
          ${periodFilter}
      `);

      if (baseRows.rows.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Geohash não encontrado",
        });
      }

      const safeQuery = <T>(query: Promise<{ rows: T[] }>) =>
        query.then((r) => r.rows[0] ?? null).catch(() => null);

      const crmPeriodFilter = input.period
        ? sql`AND period = ${input.period}`
        : sql`AND period = (SELECT MAX(period) FROM geohash_crm WHERE geohash_id = ${input.geohashId})`;

      const [crm, fibra, movel] = await Promise.all([
        safeQuery<{
          avg_income: number | null;
          income_label: string | null;
          device_tier: string | null;
        }>(
          ctx.db.execute(sql`
            SELECT avg_income, income_label, device_tier
            FROM geohash_crm
            WHERE geohash_id = ${input.geohashId} ${crmPeriodFilter}
          `),
        ),
        safeQuery<{ classification: string }>(
          ctx.db.execute(sql`
            SELECT classification FROM camada2_fibra
            WHERE geohash_id = ${input.geohashId}
            ORDER BY period DESC LIMIT 1
          `),
        ),
        safeQuery<{ classification: string }>(
          ctx.db.execute(sql`
            SELECT classification FROM camada2_movel
            WHERE geohash_id = ${input.geohashId}
            ORDER BY period DESC LIMIT 1
          `),
        ),
      ]);

      const detail: GeohashDetailForSummary = {
        ...baseRows.rows[0],
        crm,
        camada2: fibra || movel ? { fibra, movel } : null,
      };

      const result = await ctx.iaSummary.generateAndPersist(detail);

      // Invalida cache do getById para que a próxima busca não retorne stale
      const cacheKey = `cache:geohash:detail:${input.geohashId}:${input.period ?? "latest"}`;
      await ctx.redis.del(cacheKey);

      return result;
    }),

  /**
   * UC005 — Subscription WebSocket para drill-down geoespacial.
   * Emite novos dados quando o zoom muda a precisão do geohash.
   */
  subscribe: publicProcedure
    .input(
      z.object({
        viewport: viewportSchema,
        precision: z.number().int().min(5).max(8),
        period: z.string().optional(),
        quadrants: z
          .array(z.enum(["GROWTH", "UPSELL", "RETENCAO", "GROWTH_RETENCAO"]))
          .optional(),
        tech: z.enum(["FIBRA", "MOVEL", "AMBOS", "TODOS"]).optional(),
      }),
    )
    .subscription(({ input, ctx }) => {
      return observable<Awaited<ReturnType<typeof listGeohashes>>>((emit) => {
        let active = true;

        const fetch = async () => {
          if (!active) return;
          try {
            const data = await listGeohashes(ctx.db, input);
            emit.next(data);
          } catch (err) {
            emit.error(err);
          }
        };

        // Emite imediatamente e depois a cada 30s (atualização periódica)
        fetch();
        const interval = setInterval(() => {
          if (active) fetch();
        }, 30_000);

        return () => {
          active = false;
          clearInterval(interval);
        };
      });
    }),
});
