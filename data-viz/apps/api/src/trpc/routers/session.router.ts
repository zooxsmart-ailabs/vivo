import { z } from "zod";
import { eq } from "drizzle-orm";
import { t, publicProcedure } from "../trpc.base";
import { userSession } from "../../database/schema";

const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 dias

const sessionStateSchema = z.object({
  activeQuadrants: z.array(z.string()).optional(),
  techFilter: z.string().optional(),
  period: z.string().optional(),
  location: z
    .object({
      state: z.string().optional(),
      city: z.string().optional(),
      neighborhood: z.string().optional(),
    })
    .optional(),
  mapViewport: z
    .object({
      lat: z.number(),
      lng: z.number(),
      zoom: z.number(),
    })
    .optional(),
  pinnedGeohashId: z.string().optional(),
});

export const sessionRouter = t.router({
  /**
   * UC011 — Recupera o estado da sessão do usuário.
   * Estratégia: Redis (primário, TTL 30 dias) → PostgreSQL (fallback).
   */
  get: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const redisKey = `session:${input.userId}`;

      // Tenta Redis primeiro
      const cached = await ctx.redis.get(redisKey);
      if (cached) {
        return JSON.parse(cached) as z.infer<typeof sessionStateSchema>;
      }

      // Fallback: PostgreSQL
      const rows = await ctx.db
        .select()
        .from(userSession)
        .where(eq(userSession.userId, input.userId));

      if (rows.length === 0) return null;

      const state = rows[0].state as z.infer<typeof sessionStateSchema>;

      // Repopula o cache Redis
      await ctx.redis.set(redisKey, JSON.stringify(state), "EX", SESSION_TTL_SECONDS);

      return state;
    }),

  /**
   * UC011 — Persiste o estado da sessão do usuário.
   * Salva no Redis imediatamente e no PostgreSQL como fallback durável.
   */
  save: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        state: sessionStateSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const redisKey = `session:${input.userId}`;
      const now = new Date().toISOString();

      // Persiste no Redis
      await ctx.redis.set(
        redisKey,
        JSON.stringify(input.state),
        "EX",
        SESSION_TTL_SECONDS,
      );

      // Persiste no PostgreSQL (upsert)
      await ctx.db
        .insert(userSession)
        .values({
          userId: input.userId,
          state: input.state,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: userSession.userId,
          set: { state: input.state, updatedAt: now },
        });

      return { ok: true };
    }),
});
