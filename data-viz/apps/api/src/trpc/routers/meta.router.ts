import { z } from "zod";
import { sql } from "drizzle-orm";
import { t, publicProcedure } from "../trpc.base";

export const metaRouter = t.router({
  /**
   * UC006 — Lista todos os períodos disponíveis para seleção de filtro temporal.
   * Consulta as tabelas de agregação mensais para obter os períodos existentes.
   */
  availablePeriods: publicProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.execute<{ period: string }>(sql`
      SELECT DISTINCT period
      FROM vw_geohash_summary
      ORDER BY period DESC
      LIMIT 36
    `);
    return rows.rows.map((r) => r.period);
  }),

  /**
   * Retorna os benchmarks de referência para cálculo de insights comparativos.
   */
  benchmarks: publicProcedure
    .input(
      z.object({
        scope: z.enum(["NACIONAL", "ESTADO", "CIDADE"]).optional(),
        state: z.string().length(2).optional(),
        city: z.string().optional(),
        period: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const cached = await ctx.redis.get(
        `cache:benchmarks:${input.scope ?? "NACIONAL"}:${input.state ?? ""}:${input.period ?? "latest"}`,
      );
      if (cached) return JSON.parse(cached);

      const rows = await ctx.db.execute<{
        scope: string;
        state: string | null;
        city: string | null;
        metric_name: string;
        metric_value: number;
        period: string;
      }>(sql`
        SELECT scope, state, city, metric_name, metric_value, period
        FROM benchmark_config
        WHERE 1=1
          ${input.scope ? sql`AND scope = ${input.scope}` : sql``}
          ${input.state ? sql`AND state = ${input.state}` : sql``}
          ${input.period ? sql`AND period = ${input.period}` : sql`AND period = (SELECT MAX(period) FROM benchmark_config)`}
        ORDER BY scope, metric_name
      `);

      const result = rows.rows.reduce(
        (acc, row) => {
          acc[row.metric_name] = row.metric_value;
          return acc;
        },
        {} as Record<string, number>,
      );

      await ctx.redis.set(
        `cache:benchmarks:${input.scope ?? "NACIONAL"}:${input.state ?? ""}:${input.period ?? "latest"}`,
        JSON.stringify(result),
        "EX",
        3600, // 1h TTL
      );

      return result;
    }),

  /**
   * Retorna estados e cidades disponíveis para UC008 (filtro geográfico).
   */
  locations: publicProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.execute<{
      state: string;
      city: string;
      neighborhood: string | null;
    }>(sql`
      SELECT DISTINCT state, city, neighborhood
      FROM geohash_cell
      ORDER BY state, city, neighborhood
    `);

    const byState: Record<string, Record<string, Set<string>>> = {};
    for (const row of rows.rows) {
      if (!byState[row.state]) byState[row.state] = {};
      if (!byState[row.state][row.city])
        byState[row.state][row.city] = new Set();
      if (row.neighborhood) byState[row.state][row.city].add(row.neighborhood);
    }

    return Object.entries(byState).map(([state, cities]) => ({
      state,
      cities: Object.entries(cities).map(([city, neighborhoods]) => ({
        city,
        neighborhoods: [...neighborhoods].sort(),
      })),
    }));
  }),
});
