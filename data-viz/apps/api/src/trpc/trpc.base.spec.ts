/**
 * Testes — protectedProcedure middleware
 *
 * Verifica que rotas protegidas rejeitam contexto sem user
 * e permitem contexto com user autenticado.
 */

import { TRPCError } from "@trpc/server";
import { t, publicProcedure, protectedProcedure } from "./trpc.base";

// Router de teste com ambas procedures
const testRouter = t.router({
  publicHello: publicProcedure.query(() => "hello-public"),
  protectedHello: protectedProcedure.query(({ ctx }) => ({
    greeting: "hello-protected",
    user: ctx.user,
  })),
});

function mockCtx(user?: { id: string; roles: string[] }) {
  return {
    db: {} as any,
    redis: {} as any,
    user,
  };
}

describe("protectedProcedure", () => {
  it("throws UNAUTHORIZED when ctx.user is undefined", async () => {
    const caller = testRouter.createCaller(mockCtx());

    await expect(caller.protectedHello()).rejects.toThrow(TRPCError);
    await expect(caller.protectedHello()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("allows access when ctx.user is defined", async () => {
    const user = { id: "u1", roles: ["admin"] };
    const caller = testRouter.createCaller(mockCtx(user));

    const result = await caller.protectedHello();

    expect(result.greeting).toBe("hello-protected");
    expect(result.user).toEqual(user);
  });

  it("publicProcedure allows access without user", async () => {
    const caller = testRouter.createCaller(mockCtx());

    const result = await caller.publicHello();

    expect(result).toBe("hello-public");
  });

  it("publicProcedure also allows access with user", async () => {
    const caller = testRouter.createCaller(
      mockCtx({ id: "u1", roles: [] }),
    );

    const result = await caller.publicHello();

    expect(result).toBe("hello-public");
  });
});
