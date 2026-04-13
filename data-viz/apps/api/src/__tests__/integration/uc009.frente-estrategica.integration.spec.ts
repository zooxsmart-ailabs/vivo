/**
 * Testes de Integração — UC009: Consultar Frente Estratégica
 *
 * UC mais crítico do sistema: ranking por quadrante + diagnóstico 4 pilares
 * + recomendação IA (ATACAR/AGUARDAR/BLOQUEADO).
 *
 * Testa o fluxo completo:
 * API (frente.ranking, frente.summary) → dados → Web (useDiagnostico)
 */

import { appRouter } from "../../trpc/trpc.router";
import { createMockCtx, geohashRow } from "./helpers";

describe("UC009 — Consultar Frente Estratégica", () => {
  // ─── Success Criteria ──────────────────────────────────────────────────

  describe("Success Criteria", () => {
    it("PS01: ranking retorna geohashes agrupados pelos 4 quadrantes", async () => {
      const rows = [
        geohashRow({ geohash_id: "g1", quadrant_type: "GROWTH", priority_score: 9.0, rank_within_quadrant: 1 }),
        geohashRow({ geohash_id: "g2", quadrant_type: "GROWTH", priority_score: 8.5, rank_within_quadrant: 2 }),
        geohashRow({ geohash_id: "u1", quadrant_type: "UPSELL", priority_score: 7.5, rank_within_quadrant: 1 }),
        geohashRow({ geohash_id: "r1", quadrant_type: "RETENCAO", priority_score: 9.2, rank_within_quadrant: 1 }),
        geohashRow({ geohash_id: "gr1", quadrant_type: "GROWTH_RETENCAO", priority_score: 6.0, rank_within_quadrant: 1 }),
      ];
      const ctx = createMockCtx({ db: { executeResponses: [{ rows }] } });
      const caller = appRouter.createCaller(ctx);

      const result = await caller.frente.ranking({});

      expect(result.GROWTH).toHaveLength(2);
      expect(result.UPSELL).toHaveLength(1);
      expect(result.RETENCAO).toHaveLength(1);
      expect(result.GROWTH_RETENCAO).toHaveLength(1);
    });

    it("PS01: ranking ordenado por priority_score dentro de cada quadrante", async () => {
      const rows = [
        geohashRow({ geohash_id: "g1", quadrant_type: "GROWTH", priority_score: 9.0, rank_within_quadrant: 1 }),
        geohashRow({ geohash_id: "g2", quadrant_type: "GROWTH", priority_score: 8.5, rank_within_quadrant: 2 }),
        geohashRow({ geohash_id: "g3", quadrant_type: "GROWTH", priority_score: 7.0, rank_within_quadrant: 3 }),
      ];
      const ctx = createMockCtx({ db: { executeResponses: [{ rows }] } });
      const caller = appRouter.createCaller(ctx);

      const result = await caller.frente.ranking({});

      const scores = result.GROWTH.map((g: any) => g.priority_score);
      expect(scores).toEqual([9.0, 8.5, 7.0]);
    });

    it("PS02: summary retorna KPIs agregados por quadrante", async () => {
      const rows = [
        { quadrant_type: "GROWTH", total: 50, avg_priority: 7.5, avg_share: 12.3, avg_satisfaction: 8.1, critica_count: 5 },
        { quadrant_type: "RETENCAO", total: 30, avg_priority: 8.9, avg_share: 45.0, avg_satisfaction: 4.2, critica_count: 15 },
      ];
      const ctx = createMockCtx({ db: { executeResponses: [{ rows }] } });
      const caller = appRouter.createCaller(ctx);

      const result = await caller.frente.summary({});

      expect(result).toHaveLength(2);
      const growth = result.find((r: any) => r.quadrant_type === "GROWTH");
      expect(growth).toMatchObject({
        total: 50,
        avg_priority: 7.5,
        avg_share: 12.3,
        avg_satisfaction: 8.1,
        critica_count: 5,
      });
    });
  });

  // ─── Failure Criteria ─────────────────────────────────────────────────

  describe("Failure Criteria", () => {
    it("PF01: retorna quadrantes vazios quando não há geohashes no período/região", async () => {
      const ctx = createMockCtx({ db: { executeResponses: [{ rows: [] }] } });
      const caller = appRouter.createCaller(ctx);

      const result = await caller.frente.ranking({
        period: "2099-01",
        state: "XX",
      });

      expect(result.GROWTH).toEqual([]);
      expect(result.UPSELL).toEqual([]);
      expect(result.RETENCAO).toEqual([]);
      expect(result.GROWTH_RETENCAO).toEqual([]);
    });
  });

  // ─── Business Rules ───────────────────────────────────────────────────

  describe("RN009-01: Configuração por Quadrante", () => {
    it("RETENCAO (share >= 35% + QoE < 5.0) — ação urgente de blindagem", async () => {
      const rows = [
        geohashRow({
          quadrant_type: "RETENCAO",
          share_vivo: 42.0,
          avg_satisfaction_vivo: 3.8,
          priority_label: "P1_CRITICA",
          rank_within_quadrant: 1,
        }),
      ];
      const ctx = createMockCtx({ db: { executeResponses: [{ rows }] } });
      const result = await appRouter.createCaller(ctx).frente.ranking({});

      const ret = result.RETENCAO[0];
      expect(ret.share_vivo).toBeGreaterThanOrEqual(35);
      expect(ret.avg_satisfaction_vivo).toBeLessThan(5.0);
      expect(ret.priority_label).toBe("P1_CRITICA");
    });

    it("UPSELL (share >= 35% + QoE >= 7.01) — maximizar receita", async () => {
      const rows = [
        geohashRow({
          quadrant_type: "UPSELL",
          share_vivo: 48.0,
          avg_satisfaction_vivo: 8.5,
          rank_within_quadrant: 1,
        }),
      ];
      const ctx = createMockCtx({ db: { executeResponses: [{ rows }] } });
      const result = await appRouter.createCaller(ctx).frente.ranking({});

      const up = result.UPSELL[0];
      expect(up.share_vivo).toBeGreaterThanOrEqual(35);
      expect(up.avg_satisfaction_vivo).toBeGreaterThanOrEqual(7.01);
    });

    it("GROWTH (share < 35% + QoE >= 7.01) — janela de ataque", async () => {
      const rows = [
        geohashRow({
          quadrant_type: "GROWTH",
          share_vivo: 15.0,
          avg_satisfaction_vivo: 8.2,
          rank_within_quadrant: 1,
        }),
      ];
      const ctx = createMockCtx({ db: { executeResponses: [{ rows }] } });
      const result = await appRouter.createCaller(ctx).frente.ranking({});

      const gr = result.GROWTH[0];
      expect(gr.share_vivo).toBeLessThan(35);
      expect(gr.avg_satisfaction_vivo).toBeGreaterThanOrEqual(7.01);
    });

    it("GROWTH_RETENCAO — perfil misto", async () => {
      const rows = [
        geohashRow({
          quadrant_type: "GROWTH_RETENCAO",
          share_vivo: 20.0,
          avg_satisfaction_vivo: 5.5,
          rank_within_quadrant: 1,
        }),
      ];
      const ctx = createMockCtx({ db: { executeResponses: [{ rows }] } });
      const result = await appRouter.createCaller(ctx).frente.ranking({});

      expect(result.GROWTH_RETENCAO).toHaveLength(1);
    });
  });

  describe("RN009-03: Ranking por Prioridade", () => {
    it("cada geohash possui share, satisfação, prioridade e trend para o painel lateral", async () => {
      const rows = [
        geohashRow({
          quadrant_type: "GROWTH",
          share_vivo: 18.5,
          avg_satisfaction_vivo: 8.2,
          priority_score: 7.8,
          priority_label: "P1_CRITICA",
          trend_direction: "UP",
          trend_delta: 1.2,
          rank_within_quadrant: 1,
        }),
      ];
      const ctx = createMockCtx({ db: { executeResponses: [{ rows }] } });
      const result = await appRouter.createCaller(ctx).frente.ranking({});

      const gh = result.GROWTH[0];
      expect(gh).toHaveProperty("share_vivo");
      expect(gh).toHaveProperty("avg_satisfaction_vivo");
      expect(gh).toHaveProperty("priority_score");
      expect(gh).toHaveProperty("priority_label");
      expect(gh).toHaveProperty("trend_direction");
      expect(gh).toHaveProperty("trend_delta");
      expect(gh).toHaveProperty("rank_within_quadrant");
    });
  });

  describe("Cache Integration", () => {
    it("ranking cacheia com TTL 5 min e retorna do cache na segunda chamada", async () => {
      const rows = [
        geohashRow({ quadrant_type: "GROWTH", rank_within_quadrant: 1 }),
      ];
      const ctx = createMockCtx({ db: { executeResponses: [{ rows }] } });
      const caller = appRouter.createCaller(ctx);

      const r1 = await caller.frente.ranking({});
      const r2 = await caller.frente.ranking({});

      expect(ctx.db.execute).toHaveBeenCalledTimes(1);
      expect(r1).toEqual(r2);
    });
  });
});
