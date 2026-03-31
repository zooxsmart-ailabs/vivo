import { z } from "zod";
import { sql } from "drizzle-orm";
import { t, publicProcedure } from "../trpc.base";

const QUADRANT_LIMIT = 20;

export const frenteRouter = t.router({
  /**
   * UC009 — Ranking de geohashes por frente estratégica.
   * Retorna os top geohashes de cada quadrante, ordenados por priority_score.
   * Inclui dados de Camada 2 para visualização da ficha técnica no painel lateral.
   */
  ranking: publicProcedure
    .input(
      z.object({
        period: z.string().optional(),
        state: z.string().length(2).optional(),
        city: z.string().optional(),
        limit: z.number().min(1).max(50).default(QUADRANT_LIMIT),
      }),
    )
    .query(async ({ ctx, input }) => {
      const cacheKey = `cache:frente:ranking:${JSON.stringify(input)}`;
      const cached = await ctx.redis.get(cacheKey);
      if (cached) return JSON.parse(cached);

      const rows = await ctx.db.execute<{
        geohash_id: string;
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
        rank_within_quadrant: number;
        period: string;
      }>(sql`
        SELECT *
        FROM (
          SELECT
            s.geohash_id,
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
            RANK() OVER (
              PARTITION BY s.quadrant_type
              ORDER BY s.priority_score DESC
            )::int AS rank_within_quadrant,
            s.period
          FROM vw_geohash_summary s
          JOIN geohash_cell gc ON gc.geohash_id = s.geohash_id
          WHERE 1=1
            ${input.period ? sql`AND s.period = ${input.period}` : sql`AND s.period = (SELECT MAX(period) FROM vw_geohash_summary)`}
            ${input.state ? sql`AND gc.state = ${input.state}` : sql``}
            ${input.city ? sql`AND gc.city = ${input.city}` : sql``}
        ) ranked
        WHERE rank_within_quadrant <= ${input.limit}
        ORDER BY quadrant_type, rank_within_quadrant
      `);

      // Agrupa por quadrante
      const byQuadrant: Record<string, typeof rows.rows> = {
        GROWTH: [],
        UPSELL: [],
        RETENCAO: [],
        GROWTH_RETENCAO: [],
      };

      for (const row of rows.rows) {
        if (byQuadrant[row.quadrant_type]) {
          byQuadrant[row.quadrant_type].push(row);
        }
      }

      await ctx.redis.set(cacheKey, JSON.stringify(byQuadrant), "EX", 300);
      return byQuadrant;
    }),

  /**
   * UC009 — Resumo de KPIs por frente estratégica para o header do painel.
   */
  summary: publicProcedure
    .input(
      z.object({
        period: z.string().optional(),
        state: z.string().length(2).optional(),
        city: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.execute<{
        quadrant_type: string;
        total: number;
        avg_priority: number;
        avg_share: number;
        avg_satisfaction: number;
        critica_count: number;
      }>(sql`
        SELECT
          s.quadrant_type,
          COUNT(*)::int                                         AS total,
          ROUND(AVG(s.priority_score)::numeric, 2)             AS avg_priority,
          ROUND(AVG(s.share_vivo)::numeric, 1)                 AS avg_share,
          ROUND(AVG(s.avg_satisfaction_vivo)::numeric, 2)      AS avg_satisfaction,
          COUNT(*) FILTER (WHERE s.priority_label = 'P1_CRITICA')::int AS critica_count
        FROM vw_geohash_summary s
        JOIN geohash_cell gc ON gc.geohash_id = s.geohash_id
        WHERE 1=1
          ${input.period ? sql`AND s.period = ${input.period}` : sql`AND s.period = (SELECT MAX(period) FROM vw_geohash_summary)`}
          ${input.state ? sql`AND gc.state = ${input.state}` : sql``}
          ${input.city ? sql`AND gc.city = ${input.city}` : sql``}
        GROUP BY s.quadrant_type
      `);

      return rows.rows;
    }),
});
