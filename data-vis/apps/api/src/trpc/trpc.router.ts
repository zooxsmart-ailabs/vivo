import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { z } from "zod";
import type { TrpcContext } from "./trpc.context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

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
});

export type AppRouter = typeof appRouter;
