import { z } from "zod";
import { t, publicProcedure, protectedProcedure } from "./trpc.base";
import { geohashRouter } from "./routers/geohash.router";
import { bairroRouter } from "./routers/bairro.router";
import { frenteRouter } from "./routers/frente.router";
import { sessionRouter } from "./routers/session.router";
import { metaRouter } from "./routers/meta.router";

export { publicProcedure, protectedProcedure };

export const appRouter = t.router({
  health: publicProcedure.query(() => ({
    status: "ok" as const,
    timestamp: new Date().toISOString(),
  })),

  ping: publicProcedure
    .input(z.object({ message: z.string().optional() }))
    .query(({ input }) => ({
      pong: input.message || "pong",
      timestamp: new Date().toISOString(),
    })),

  geohash: geohashRouter,
  bairro: bairroRouter,
  frente: frenteRouter,
  session: sessionRouter,
  meta: metaRouter,
});

export type AppRouter = typeof appRouter;
