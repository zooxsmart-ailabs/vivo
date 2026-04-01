import { z } from "zod";
import { sql } from "drizzle-orm";
import { observable } from "@trpc/server/observable";
import { t, publicProcedure } from "../trpc.base";
import type { DrizzleDB } from "../../database/drizzle.provider";

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
      s.period,
      (RANK() OVER (ORDER BY s.priority_score DESC) <= 10) AS is_top10
    FROM vw_geohash_summary s
    JOIN geohash_cell gc ON gc.geohash_id = s.geohash_id
    WHERE gc.precision = ${input.precision}
      ${input.period ? sql`AND s.period = ${input.period}` : sql`AND s.period = (SELECT MAX(period) FROM vw_geohash_summary)`}
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
    ORDER BY s.priority_score DESC
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

      const [crm, fibra2, movel2] = await Promise.all([
        safeQuery<{
          avg_arpu: number | null;
          dominant_plan_type: string | null;
          device_tier: string | null;
          avg_income: number | null;
          population_density: number | null;
          income_label: string | null;
        }>(
          ctx.db.execute(sql`
            SELECT avg_arpu, dominant_plan_type, device_tier,
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
