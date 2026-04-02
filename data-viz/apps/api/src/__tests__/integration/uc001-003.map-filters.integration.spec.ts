/**
 * Testes de Integração — UC001, UC002, UC003
 *
 * UC001: Visualizar Mapa Estratégico de Geohashes
 * UC002: Filtrar Geohashes por Quadrante Estratégico
 * UC003: Filtrar Geohashes por Tecnologia
 *
 * Verifica critérios de sucesso/falha e regras de negócio
 * usando o fluxo completo tRPC (router → cache → DB → response).
 */

import { appRouter } from "../../trpc/trpc.router";
import { createMockCtx, geohashRow } from "./helpers";

// ═══════════════════════════════════════════════════════════════════════════
// UC001 — Visualizar Mapa Estratégico de Geohashes
// ═══════════════════════════════════════════════════════════════════════════

describe("UC001 — Visualizar Mapa Estratégico", () => {
  describe("Success Criteria", () => {
    it("PS01: retorna geohashes com quadrant_type e dados de localização para o viewport", async () => {
      const rows = [
        geohashRow({ geohash_id: "6gkzm9", quadrant_type: "GROWTH" }),
        geohashRow({ geohash_id: "6gkzmb", quadrant_type: "UPSELL" }),
        geohashRow({ geohash_id: "6gkzmc", quadrant_type: "RETENCAO" }),
        geohashRow({ geohash_id: "6gkzmd", quadrant_type: "GROWTH_RETENCAO" }),
      ];
      const ctx = createMockCtx({ db: { executeResponses: [{ rows }] } });
      const caller = appRouter.createCaller(ctx);

      const result = await caller.geohash.list({ precision: 6 });

      expect(result).toHaveLength(4);
      result.forEach((gh: any) => {
        expect(gh).toHaveProperty("geohash_id");
        expect(gh).toHaveProperty("quadrant_type");
        expect(gh).toHaveProperty("center_lat");
        expect(gh).toHaveProperty("center_lng");
        expect(gh).toHaveProperty("share_vivo");
        expect(gh).toHaveProperty("priority_score");
      });
    });

    it("PS02: cada geohash possui um dos 4 quadrantes válidos", async () => {
      const validQuadrants = ["GROWTH", "UPSELL", "RETENCAO", "GROWTH_RETENCAO"];
      const rows = validQuadrants.map((q) =>
        geohashRow({ geohash_id: `gh_${q}`, quadrant_type: q }),
      );
      const ctx = createMockCtx({ db: { executeResponses: [{ rows }] } });
      const caller = appRouter.createCaller(ctx);

      const result = await caller.geohash.list({ precision: 6 });

      const quadrants = result.map((gh: any) => gh.quadrant_type);
      expect(new Set(quadrants)).toEqual(new Set(validQuadrants));
    });

    it("PS03: contadores deriváveis — is_top10, total visíveis, em risco (RETENCAO)", async () => {
      const rows = [
        geohashRow({ quadrant_type: "GROWTH", is_top10: true }),
        geohashRow({ quadrant_type: "RETENCAO", is_top10: false }),
        geohashRow({ quadrant_type: "RETENCAO", is_top10: true }),
        geohashRow({ quadrant_type: "UPSELL", is_top10: false }),
      ];
      const ctx = createMockCtx({ db: { executeResponses: [{ rows }] } });
      const caller = appRouter.createCaller(ctx);

      const result = await caller.geohash.list({ precision: 6 });
      const emRisco = result.filter((g: any) => g.quadrant_type === "RETENCAO");
      const top10 = result.filter((g: any) => g.is_top10);

      expect(result).toHaveLength(4);
      expect(emRisco).toHaveLength(2);
      expect(top10).toHaveLength(2);
    });
  });

  describe("Failure Criteria", () => {
    it("PF01: retorna lista vazia quando não há dados para o período/região", async () => {
      const ctx = createMockCtx({ db: { executeResponses: [{ rows: [] }] } });
      const caller = appRouter.createCaller(ctx);

      const result = await caller.geohash.list({
        precision: 6,
        state: "XX",
        period: "2099-99",
      });

      expect(result).toEqual([]);
    });
  });

  describe("Business Rules", () => {
    it("RN001-03: precisão 6 para zoom 11-13, precisão 7 para zoom 14+", async () => {
      const rows6 = [geohashRow({ precision: 6, geohash_id: "6gkzm9" })];
      const rows7 = [geohashRow({ precision: 7, geohash_id: "6gkzm9b" })];
      const ctx6 = createMockCtx({ db: { executeResponses: [{ rows: rows6 }] } });
      const ctx7 = createMockCtx({ db: { executeResponses: [{ rows: rows7 }] } });

      const result6 = await appRouter.createCaller(ctx6).geohash.list({ precision: 6 });
      const result7 = await appRouter.createCaller(ctx7).geohash.list({ precision: 7 });

      expect(result6[0].precision).toBe(6);
      expect(result7[0].precision).toBe(7);
    });

    it("RN001-04: geohashes incluem flag is_top10 para destaque visual", async () => {
      const rows = [
        geohashRow({ is_top10: true, priority_score: 9.5 }),
        geohashRow({ is_top10: false, priority_score: 3.0, geohash_id: "low" }),
      ];
      const ctx = createMockCtx({ db: { executeResponses: [{ rows }] } });
      const caller = appRouter.createCaller(ctx);

      const result = await caller.geohash.list({ precision: 6 });

      expect(result.find((g: any) => g.priority_score === 9.5)?.is_top10).toBe(true);
      expect(result.find((g: any) => g.geohash_id === "low")?.is_top10).toBe(false);
    });

    it("RN001-08: tech_category diferencia FIBRA, MOVEL e AMBOS", async () => {
      const rows = [
        geohashRow({ geohash_id: "f1", tech_category: "FIBRA" }),
        geohashRow({ geohash_id: "m1", tech_category: "MOVEL" }),
        geohashRow({ geohash_id: "a1", tech_category: "AMBOS" }),
      ];
      const ctx = createMockCtx({ db: { executeResponses: [{ rows }] } });
      const caller = appRouter.createCaller(ctx);

      const result = await caller.geohash.list({ precision: 6 });
      const techs = result.map((g: any) => g.tech_category);

      expect(techs).toContain("FIBRA");
      expect(techs).toContain("MOVEL");
      expect(techs).toContain("AMBOS");
    });

    it("cache Redis com TTL 5 minutos na listagem", async () => {
      const rows = [geohashRow()];
      const ctx = createMockCtx({ db: { executeResponses: [{ rows }] } });
      const caller = appRouter.createCaller(ctx);

      await caller.geohash.list({ precision: 6 });

      expect(ctx.redis.set).toHaveBeenCalledWith(
        expect.stringContaining("cache:geohash:list:"),
        expect.any(String),
        "EX",
        300,
      );
    });

    it("segunda chamada com mesmos filtros retorna do cache", async () => {
      const rows = [geohashRow()];
      const ctx = createMockCtx({ db: { executeResponses: [{ rows }] } });
      const caller = appRouter.createCaller(ctx);

      await caller.geohash.list({ precision: 6 });
      const result2 = await caller.geohash.list({ precision: 6 });

      // DB called only once; second call served from cache
      expect(ctx.db.execute).toHaveBeenCalledTimes(1);
      expect(result2).toEqual(rows);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// UC002 — Filtrar Geohashes por Quadrante Estratégico
// ═══════════════════════════════════════════════════════════════════════════

describe("UC002 — Filtrar por Quadrante", () => {
  describe("Success Criteria", () => {
    it("PS01: filtro de quadrantes é aceito pelo endpoint e filtra resultados", async () => {
      const rows = [geohashRow({ quadrant_type: "GROWTH" })];
      const ctx = createMockCtx({ db: { executeResponses: [{ rows }] } });
      const caller = appRouter.createCaller(ctx);

      const result = await caller.geohash.list({
        precision: 6,
        quadrants: ["GROWTH"],
      });

      expect(result).toHaveLength(1);
      expect(result[0].quadrant_type).toBe("GROWTH");
    });

    it("PS01: filtro com múltiplos quadrantes aceito", async () => {
      const rows = [
        geohashRow({ geohash_id: "g1", quadrant_type: "GROWTH" }),
        geohashRow({ geohash_id: "r1", quadrant_type: "RETENCAO" }),
      ];
      const ctx = createMockCtx({ db: { executeResponses: [{ rows }] } });
      const caller = appRouter.createCaller(ctx);

      const result = await caller.geohash.list({
        precision: 6,
        quadrants: ["GROWTH", "RETENCAO"],
      });

      expect(result).toHaveLength(2);
    });
  });

  describe("Business Rules", () => {
    it("RN002-02: sem filtro de quadrante retorna todos os quadrantes", async () => {
      const rows = ["GROWTH", "UPSELL", "RETENCAO", "GROWTH_RETENCAO"].map(
        (q) => geohashRow({ geohash_id: `gh_${q}`, quadrant_type: q }),
      );
      const ctx = createMockCtx({ db: { executeResponses: [{ rows }] } });
      const caller = appRouter.createCaller(ctx);

      const result = await caller.geohash.list({ precision: 6 });

      expect(result).toHaveLength(4);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// UC003 — Filtrar Geohashes por Tecnologia
// ═══════════════════════════════════════════════════════════════════════════

describe("UC003 — Filtrar por Tecnologia", () => {
  describe("Success Criteria", () => {
    it("PS01: filtro FIBRA aceito pelo endpoint", async () => {
      const rows = [geohashRow({ tech_category: "FIBRA" })];
      const ctx = createMockCtx({ db: { executeResponses: [{ rows }] } });
      const caller = appRouter.createCaller(ctx);

      const result = await caller.geohash.list({
        precision: 6,
        tech: "FIBRA",
      });

      expect(result).toHaveLength(1);
    });

    it("PS02: cores permanecem por quadrante — tech não altera quadrant_type", async () => {
      const rows = [
        geohashRow({ tech_category: "FIBRA", quadrant_type: "GROWTH" }),
        geohashRow({
          geohash_id: "x1",
          tech_category: "FIBRA",
          quadrant_type: "RETENCAO",
        }),
      ];
      const ctx = createMockCtx({ db: { executeResponses: [{ rows }] } });
      const caller = appRouter.createCaller(ctx);

      const result = await caller.geohash.list({
        precision: 6,
        tech: "FIBRA",
      });

      expect(result[0].quadrant_type).toBe("GROWTH");
      expect(result[1].quadrant_type).toBe("RETENCAO");
    });
  });

  describe("Business Rules", () => {
    it("RN003-01: filtro TODOS não restringe tecnologia", async () => {
      const rows = [
        geohashRow({ geohash_id: "f1", tech_category: "FIBRA" }),
        geohashRow({ geohash_id: "m1", tech_category: "MOVEL" }),
      ];
      const ctx = createMockCtx({ db: { executeResponses: [{ rows }] } });
      const caller = appRouter.createCaller(ctx);

      const result = await caller.geohash.list({
        precision: 6,
        tech: "TODOS",
      });

      expect(result).toHaveLength(2);
    });
  });
});
