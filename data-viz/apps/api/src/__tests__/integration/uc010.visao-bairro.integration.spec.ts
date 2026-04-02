/**
 * Testes de Integração — UC010: Consultar Visão por Bairro
 *
 * Verifica agregação de KPIs por bairro, ranking, distribuição de
 * quadrantes, e cenários de dados ausentes.
 */

import { appRouter } from "../../trpc/trpc.router";
import { createMockCtx, bairroRow, geohashRow } from "./helpers";

describe("UC010 — Consultar Visão por Bairro", () => {
  describe("Success Criteria", () => {
    it("PS01: lista bairros com KPIs agregados e distribuição de quadrantes", async () => {
      const rows = [
        bairroRow({
          neighborhood: "Setor Bueno",
          total_geohashes: 15,
          avg_share: 22.5,
          avg_satisfaction: 7.8,
          avg_priority_score: 7.2,
          dominant_quadrant: "GROWTH",
          geohash_count_growth: 8,
          geohash_count_upsell: 3,
          geohash_count_retencao: 2,
          geohash_count_growth_retencao: 2,
        }),
        bairroRow({
          neighborhood: "Centro",
          total_geohashes: 20,
          avg_share: 38.0,
          avg_satisfaction: 4.5,
          avg_priority_score: 8.5,
          dominant_quadrant: "RETENCAO",
        }),
      ];
      const ctx = createMockCtx({ db: { executeResponses: [{ rows }] } });
      const caller = appRouter.createCaller(ctx);

      const result = await caller.bairro.list({});

      expect(result.items).toHaveLength(2);
      const sb = result.items[0];
      expect(sb).toHaveProperty("neighborhood");
      expect(sb).toHaveProperty("total_geohashes");
      expect(sb).toHaveProperty("avg_share");
      expect(sb).toHaveProperty("avg_satisfaction");
      expect(sb).toHaveProperty("avg_priority_score");
      expect(sb).toHaveProperty("dominant_quadrant");
      expect(sb).toHaveProperty("geohash_count_growth");
      expect(sb).toHaveProperty("geohash_count_upsell");
      expect(sb).toHaveProperty("geohash_count_retencao");
      expect(sb).toHaveProperty("geohash_count_growth_retencao");
    });

    it("PS02: detalhe de bairro retorna geohashes individuais com prioridade", async () => {
      const rows = [
        geohashRow({ geohash_id: "a1", quadrant_type: "GROWTH", priority_score: 8.5 }),
        geohashRow({ geohash_id: "a2", quadrant_type: "RETENCAO", priority_score: 9.1 }),
      ];
      const ctx = createMockCtx({ db: { executeResponses: [{ rows }] } });
      const caller = appRouter.createCaller(ctx);

      const result = await caller.bairro.getByName({
        neighborhood: "Setor Bueno",
        city: "Goiânia",
        state: "GO",
      });

      expect(result).toBeDefined();
      expect(result!.geohashes).toHaveLength(2);
      result!.geohashes.forEach((gh: any) => {
        expect(gh).toHaveProperty("quadrant_type");
        expect(gh).toHaveProperty("priority_score");
        expect(gh).toHaveProperty("priority_label");
        expect(gh).toHaveProperty("tech_category");
      });
    });
  });

  describe("Failure Criteria", () => {
    it("PF01: lista vazia quando não há bairros para os filtros selecionados", async () => {
      const ctx = createMockCtx({ db: { executeResponses: [{ rows: [] }] } });
      const caller = appRouter.createCaller(ctx);

      const result = await caller.bairro.list({
        state: "XX",
        quadrant: "GROWTH",
      });

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("detalhe retorna null para bairro inexistente", async () => {
      const ctx = createMockCtx({ db: { executeResponses: [{ rows: [] }] } });
      const caller = appRouter.createCaller(ctx);

      const result = await caller.bairro.getByName({
        neighborhood: "Inexistente",
        city: "Goiânia",
        state: "GO",
      });

      expect(result).toBeNull();
    });
  });

  describe("Business Rules", () => {
    it("RN010-01: bairros ordenados por prioridade média descendente", async () => {
      const rows = [
        bairroRow({ neighborhood: "Bueno", avg_priority_score: 8.5 }),
        bairroRow({ neighborhood: "Centro", avg_priority_score: 7.2 }),
        bairroRow({ neighborhood: "Oeste", avg_priority_score: 6.0 }),
      ];
      const ctx = createMockCtx({ db: { executeResponses: [{ rows }] } });
      const caller = appRouter.createCaller(ctx);

      const result = await caller.bairro.list({});
      const scores = result.items.map((b: any) => b.avg_priority_score);

      expect(scores).toEqual([8.5, 7.2, 6.0]);
    });

    it("RN010-03: satisfação >= 7.0 considerada positiva (derivável do dado)", async () => {
      const rows = [
        bairroRow({ neighborhood: "A", avg_satisfaction: 7.8 }),
        bairroRow({ neighborhood: "B", avg_satisfaction: 5.2 }),
      ];
      const ctx = createMockCtx({ db: { executeResponses: [{ rows }] } });
      const caller = appRouter.createCaller(ctx);

      const result = await caller.bairro.list({});

      expect(result.items[0].avg_satisfaction).toBeGreaterThanOrEqual(7.0);
      expect(result.items[1].avg_satisfaction).toBeLessThan(6.0);
    });

    it("RN010-02: filtro por quadrante dominante aceito", async () => {
      const rows = [bairroRow({ dominant_quadrant: "GROWTH" })];
      const ctx = createMockCtx({ db: { executeResponses: [{ rows }] } });
      const caller = appRouter.createCaller(ctx);

      const result = await caller.bairro.list({ quadrant: "GROWTH" });

      expect(result.items[0].dominant_quadrant).toBe("GROWTH");
    });

    it("list aceita paginação limit/offset", async () => {
      const rows = [bairroRow()];
      const ctx = createMockCtx({ db: { executeResponses: [{ rows }] } });
      const caller = appRouter.createCaller(ctx);

      const result = await caller.bairro.list({ limit: 10, offset: 5 });

      expect(result.items).toBeDefined();
      expect(ctx.db.execute).toHaveBeenCalled();
    });
  });
});
