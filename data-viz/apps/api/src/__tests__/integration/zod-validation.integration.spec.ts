/**
 * Testes de Integração — Validação Zod
 *
 * Verifica que todos os routers rejeitam inputs inválidos conforme
 * os schemas Zod definidos nos endpoints tRPC.
 */

import { TRPCError } from "@trpc/server";
import { appRouter } from "../../trpc/trpc.router";
import { createMockCtx } from "./helpers";

function ctx() {
  return createMockCtx({
    db: { executeResponses: [{ rows: [] }] },
  });
}

describe("Validação Zod — Inputs Inválidos", () => {
  describe("geohash.list", () => {
    it("rejeita precision < 5", async () => {
      const caller = appRouter.createCaller(ctx());
      await expect(caller.geohash.list({ precision: 4 })).rejects.toThrow();
    });

    it("rejeita precision > 8", async () => {
      const caller = appRouter.createCaller(ctx());
      await expect(caller.geohash.list({ precision: 9 })).rejects.toThrow();
    });

    it("rejeita precision não-inteiro", async () => {
      const caller = appRouter.createCaller(ctx());
      await expect(
        caller.geohash.list({ precision: 6.5 }),
      ).rejects.toThrow();
    });

    it("rejeita state com length != 2", async () => {
      const caller = appRouter.createCaller(ctx());
      await expect(
        caller.geohash.list({ precision: 6, state: "GOI" }),
      ).rejects.toThrow();
    });

    it("rejeita quadrante inválido", async () => {
      const caller = appRouter.createCaller(ctx());
      await expect(
        caller.geohash.list({
          precision: 6,
          quadrants: ["INVALID" as any],
        }),
      ).rejects.toThrow();
    });

    it("rejeita tech inválido", async () => {
      const caller = appRouter.createCaller(ctx());
      await expect(
        caller.geohash.list({ precision: 6, tech: "WIFI" as any }),
      ).rejects.toThrow();
    });
  });

  describe("geohash.getById", () => {
    it("rejeita geohashId com menos de 5 caracteres", async () => {
      const caller = appRouter.createCaller(ctx());
      await expect(
        caller.geohash.getById({ geohashId: "abc" }),
      ).rejects.toThrow();
    });

    it("rejeita geohashId com mais de 12 caracteres", async () => {
      const caller = appRouter.createCaller(ctx());
      await expect(
        caller.geohash.getById({ geohashId: "a".repeat(13) }),
      ).rejects.toThrow();
    });

    it("aceita geohashId com 5 a 12 caracteres", async () => {
      const caller = appRouter.createCaller(ctx());
      // Should not throw (may return null due to empty DB mock)
      const r = await caller.geohash.getById({ geohashId: "6gkzm" });
      expect(r).toBeNull();
    });
  });

  describe("geohash.compare", () => {
    it("rejeita menos de 2 IDs", async () => {
      const caller = appRouter.createCaller(ctx());
      await expect(
        caller.geohash.compare({ geohashIds: ["only-one"] }),
      ).rejects.toThrow();
    });

    it("rejeita mais de 2 IDs", async () => {
      const caller = appRouter.createCaller(ctx());
      await expect(
        caller.geohash.compare({
          geohashIds: ["a1234", "b1234", "c1234"],
        }),
      ).rejects.toThrow();
    });

    it("aceita exatamente 2 IDs", async () => {
      const c = createMockCtx({
        db: {
          executeResponses: [{ rows: [] }, { rows: [] }],
        },
      });
      const caller = appRouter.createCaller(c);
      const r = await caller.geohash.compare({
        geohashIds: ["a1234", "b1234"],
      });
      expect(r).toHaveLength(2);
    });
  });

  describe("bairro.list", () => {
    it("rejeita limit < 1", async () => {
      const caller = appRouter.createCaller(ctx());
      await expect(
        caller.bairro.list({ limit: 0 }),
      ).rejects.toThrow();
    });

    it("rejeita limit > 100", async () => {
      const caller = appRouter.createCaller(ctx());
      await expect(
        caller.bairro.list({ limit: 101 }),
      ).rejects.toThrow();
    });

    it("rejeita offset negativo", async () => {
      const caller = appRouter.createCaller(ctx());
      await expect(
        caller.bairro.list({ offset: -1 }),
      ).rejects.toThrow();
    });

    it("rejeita quadrant inválido", async () => {
      const caller = appRouter.createCaller(ctx());
      await expect(
        caller.bairro.list({ quadrant: "INVALID" as any }),
      ).rejects.toThrow();
    });
  });

  describe("bairro.getByName", () => {
    it("rejeita state com length != 2", async () => {
      const caller = appRouter.createCaller(ctx());
      await expect(
        caller.bairro.getByName({
          neighborhood: "Centro",
          city: "Goiânia",
          state: "GOI",
        }),
      ).rejects.toThrow();
    });
  });

  describe("frente.ranking", () => {
    it("rejeita limit < 1", async () => {
      const caller = appRouter.createCaller(ctx());
      await expect(
        caller.frente.ranking({ limit: 0 }),
      ).rejects.toThrow();
    });

    it("rejeita limit > 50", async () => {
      const caller = appRouter.createCaller(ctx());
      await expect(
        caller.frente.ranking({ limit: 51 }),
      ).rejects.toThrow();
    });
  });

  describe("meta.benchmarks", () => {
    it("rejeita scope inválido", async () => {
      const caller = appRouter.createCaller(ctx());
      await expect(
        caller.meta.benchmarks({ scope: "REGIONAL" as any }),
      ).rejects.toThrow();
    });

    it("aceita scopes válidos", async () => {
      for (const scope of ["NACIONAL", "ESTADO", "CIDADE"] as const) {
        const caller = appRouter.createCaller(ctx());
        await expect(
          caller.meta.benchmarks({ scope }),
        ).resolves.toBeDefined();
      }
    });
  });

  describe("ping", () => {
    it("aceita input vazio", async () => {
      const caller = appRouter.createCaller(ctx());
      const result = await caller.ping({});
      expect(result.pong).toBe("pong");
    });

    it("aceita message opcional", async () => {
      const caller = appRouter.createCaller(ctx());
      const result = await caller.ping({ message: "test" });
      expect(result.pong).toBe("test");
    });
  });
});
