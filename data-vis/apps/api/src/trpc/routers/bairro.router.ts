import { z } from "zod";
import { sql } from "drizzle-orm";
import { t, publicProcedure } from "../trpc.base";

export const bairroRouter = t.router({
  /**
   * UC010 — Lista bairros com KPIs agregados.
   * Suporta filtros por estado, cidade, quadrante e período.
   * Ordena por prioridade média descendente.
   */
  list: publicProcedure
    .input(
      z.object({
        period: z.string().optional(),
        state: z.string().length(2).optional(),
        city: z.string().optional(),
        quadrant: z
          .enum(["GROWTH", "UPSELL", "RETENCAO", "GROWTH_RETENCAO"])
          .optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const cacheKey = `cache:bairros:${JSON.stringify(input)}`;
      const cached = await ctx.redis.get(cacheKey);
      if (cached) return JSON.parse(cached);

      const rows = await ctx.db.execute<{
        neighborhood: string;
        city: string;
        state: string;
        total_geohashes: number;
        avg_share: number;
        avg_satisfaction: number;
        avg_priority_score: number;
        dominant_quadrant: string;
        geohash_count_growth: number;
        geohash_count_upsell: number;
        geohash_count_retencao: number;
        geohash_count_growth_retencao: number;
        period: string;
      }>(sql`
        SELECT
          gc.neighborhood,
          gc.city,
          gc.state,
          COUNT(*)::int                                      AS total_geohashes,
          ROUND(AVG(s.share_vivo)::numeric, 2)              AS avg_share,
          ROUND(AVG(s.avg_satisfaction_vivo)::numeric, 2)   AS avg_satisfaction,
          ROUND(AVG(s.priority_score)::numeric, 2)          AS avg_priority_score,
          MODE() WITHIN GROUP (ORDER BY s.quadrant_type)    AS dominant_quadrant,
          COUNT(*) FILTER (WHERE s.quadrant_type = 'GROWTH')::int           AS geohash_count_growth,
          COUNT(*) FILTER (WHERE s.quadrant_type = 'UPSELL')::int           AS geohash_count_upsell,
          COUNT(*) FILTER (WHERE s.quadrant_type = 'RETENCAO')::int         AS geohash_count_retencao,
          COUNT(*) FILTER (WHERE s.quadrant_type = 'GROWTH_RETENCAO')::int  AS geohash_count_growth_retencao,
          s.period
        FROM vw_geohash_summary s
        JOIN geohash_cell gc ON gc.geohash_id = s.geohash_id
        WHERE gc.neighborhood IS NOT NULL
          ${input.period ? sql`AND s.period = ${input.period}` : sql`AND s.period = (SELECT MAX(period) FROM vw_geohash_summary)`}
          ${input.state ? sql`AND gc.state = ${input.state}` : sql``}
          ${input.city ? sql`AND gc.city = ${input.city}` : sql``}
          ${input.quadrant ? sql`AND s.quadrant_type = ${input.quadrant}` : sql``}
        GROUP BY gc.neighborhood, gc.city, gc.state, s.period
        ORDER BY avg_priority_score DESC
        LIMIT ${input.limit}
        OFFSET ${input.offset}
      `);

      const result = {
        items: rows.rows,
        total: rows.rows.length,
      };

      await ctx.redis.set(cacheKey, JSON.stringify(result), "EX", 300);
      return result;
    }),

  /**
   * UC010 — Detalhe de um bairro específico com distribuição de geohashes.
   */
  getByName: publicProcedure
    .input(
      z.object({
        neighborhood: z.string(),
        city: z.string(),
        state: z.string().length(2),
        period: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.execute<{
        geohash_id: string;
        quadrant_type: string;
        share_vivo: number;
        avg_satisfaction_vivo: number;
        priority_score: number;
        priority_label: string;
        tech_category: string;
        trend_direction: string;
        trend_delta: number;
        competitive_position: string;
      }>(sql`
        SELECT
          s.geohash_id,
          s.quadrant_type,
          s.share_vivo,
          s.avg_satisfaction_vivo,
          s.priority_score,
          s.priority_label,
          s.tech_category,
          s.trend_direction,
          s.trend_delta,
          s.competitive_position
        FROM vw_geohash_summary s
        JOIN geohash_cell gc ON gc.geohash_id = s.geohash_id
        WHERE gc.neighborhood = ${input.neighborhood}
          AND gc.city = ${input.city}
          AND gc.state = ${input.state}
          ${input.period ? sql`AND s.period = ${input.period}` : sql`AND s.period = (SELECT MAX(period) FROM vw_geohash_summary)`}
        ORDER BY s.priority_score DESC
      `);

      if (rows.rows.length === 0) return null;

      return {
        neighborhood: input.neighborhood,
        city: input.city,
        state: input.state,
        geohashes: rows.rows,
      };
    }),
});
