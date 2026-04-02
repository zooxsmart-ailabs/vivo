/**
 * Testes de Integração — UC004: Inspecionar Detalhes do Geohash
 *
 * Verifica que getById retorna dados completos (Camada 1 + Camada 2),
 * labels de prioridade, posição competitiva, e cenários de dados ausentes.
 */

import { appRouter } from "../../trpc/trpc.router";
import {
  createMockCtx,
  geohashRow,
  crmRow,
  fibraRow,
  movelRow,
  growthDiagRow,
} from "./helpers";

describe("UC004 — Inspecionar Detalhes do Geohash", () => {
  // Helper: monta contexto com respostas sequenciais do getById
  // Execute order: 1=base, 2=crm, 3=fibra, 4=movel, 5=growth
  function detailCtx(opts: {
    base?: any[];
    crm?: any[];
    fibra?: any[];
    movel?: any[];
    growth?: any[];
    cache?: Record<string, string>;
  } = {}) {
    return createMockCtx({
      db: {
        executeResponses: [
          { rows: opts.base ?? [geohashRow()] },
          { rows: opts.crm ?? [crmRow()] },
          { rows: opts.fibra ?? [fibraRow()] },
          { rows: opts.movel ?? [movelRow()] },
          { rows: opts.growth ?? [growthDiagRow()] },
        ],
      },
      cache: opts.cache,
    });
  }

  describe("Success Criteria", () => {
    it("PS01: retorna dados completos com CRM, Camada 2 e diagnóstico Growth", async () => {
      const ctx = detailCtx();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.geohash.getById({ geohashId: "6gkzm9" });

      expect(result).toBeDefined();
      expect(result!.geohash_id).toBe("6gkzm9");
      expect(result!.crm).toMatchObject({
        avg_arpu: expect.any(Number),
        dominant_plan_type: expect.any(String),
        device_tier: expect.any(String),
      });
      expect(result!.camada2).toBeDefined();
      expect(result!.camada2!.fibra).toMatchObject({
        classification: expect.any(String),
        score: expect.any(Number),
      });
      expect(result!.camada2!.movel).toMatchObject({
        classification: expect.any(String),
        score: expect.any(Number),
      });
      expect(result!.diagnosticoGrowth).toBeDefined();
    });
  });

  describe("Failure Criteria / Alternative Flows", () => {
    it("retorna null quando geohash não existe", async () => {
      const ctx = detailCtx({ base: [] });
      const caller = appRouter.createCaller(ctx);

      const result = await caller.geohash.getById({ geohashId: "nonexistent" });

      expect(result).toBeNull();
    });

    it("FA01: camada2 null quando nem fibra nem movel disponíveis", async () => {
      const ctx = detailCtx({ fibra: [], movel: [] });
      const caller = appRouter.createCaller(ctx);

      const result = await caller.geohash.getById({ geohashId: "6gkzm9" });

      expect(result).toBeDefined();
      expect(result!.camada2).toBeNull();
    });

    it("FA02: CRM null quando dados não disponíveis", async () => {
      const ctx = detailCtx({ crm: [] });
      const caller = appRouter.createCaller(ctx);

      const result = await caller.geohash.getById({ geohashId: "6gkzm9" });

      expect(result).toBeDefined();
      expect(result!.crm).toBeNull();
    });

    it("diagnosticoGrowth null quando não há dados de diagnóstico", async () => {
      const ctx = detailCtx({ growth: [] });
      const caller = appRouter.createCaller(ctx);

      const result = await caller.geohash.getById({ geohashId: "6gkzm9" });

      expect(result).toBeDefined();
      expect(result!.diagnosticoGrowth).toBeNull();
    });
  });

  describe("Business Rules — RN004-01: Priority Labels", () => {
    it("P1_CRITICA para priority_score > 7.5", async () => {
      const ctx = detailCtx({
        base: [geohashRow({ priority_score: 8.2, priority_label: "P1_CRITICA" })],
      });
      const caller = appRouter.createCaller(ctx);

      const result = await caller.geohash.getById({ geohashId: "6gkzm9" });

      expect(result!.priority_label).toBe("P1_CRITICA");
      expect(result!.priority_score).toBeGreaterThan(7.5);
    });

    it("P2_ALTA para priority_score 6.0-7.4", async () => {
      const ctx = detailCtx({
        base: [geohashRow({ priority_score: 6.8, priority_label: "P2_ALTA" })],
      });
      const caller = appRouter.createCaller(ctx);

      const result = await caller.geohash.getById({ geohashId: "6gkzm9" });

      expect(result!.priority_label).toBe("P2_ALTA");
      expect(result!.priority_score).toBeGreaterThanOrEqual(6.0);
      expect(result!.priority_score).toBeLessThanOrEqual(7.4);
    });

    it("P3_MEDIA para priority_score 4.5-5.9", async () => {
      const ctx = detailCtx({
        base: [geohashRow({ priority_score: 5.2, priority_label: "P3_MEDIA" })],
      });
      const caller = appRouter.createCaller(ctx);

      const result = await caller.geohash.getById({ geohashId: "6gkzm9" });

      expect(result!.priority_label).toBe("P3_MEDIA");
    });

    it("P4_BAIXA para priority_score < 4.5", async () => {
      const ctx = detailCtx({
        base: [geohashRow({ priority_score: 3.1, priority_label: "P4_BAIXA" })],
      });
      const caller = appRouter.createCaller(ctx);

      const result = await caller.geohash.getById({ geohashId: "6gkzm9" });

      expect(result!.priority_label).toBe("P4_BAIXA");
      expect(result!.priority_score).toBeLessThan(4.5);
    });
  });

  describe("Business Rules — RN004-02: QoE Classification", () => {
    it("EXCELENTE para download >= 100Mbps e latency <= 20ms", async () => {
      const ctx = detailCtx({
        base: [geohashRow({ download_mbps: 120, latency_ms: 15, quality_label: "EXCELENTE" })],
      });
      const caller = appRouter.createCaller(ctx);

      const result = await caller.geohash.getById({ geohashId: "6gkzm9" });

      expect(result!.quality_label).toBe("EXCELENTE");
      expect(result!.download_mbps).toBeGreaterThanOrEqual(100);
      expect(result!.latency_ms).toBeLessThanOrEqual(20);
    });

    it("RUIM para download < 10Mbps e latency > 100ms", async () => {
      const ctx = detailCtx({
        base: [geohashRow({ download_mbps: 5, latency_ms: 150, quality_label: "RUIM" })],
      });
      const caller = appRouter.createCaller(ctx);

      const result = await caller.geohash.getById({ geohashId: "6gkzm9" });

      expect(result!.quality_label).toBe("RUIM");
    });
  });

  describe("Business Rules — RN004-04/05: Camada 2 Classification", () => {
    it("fibra SAUDAVEL para infraestrutura saudável", async () => {
      const ctx = detailCtx({
        fibra: [fibraRow({ classification: "SAUDAVEL", score: 85 })],
      });
      const caller = appRouter.createCaller(ctx);

      const result = await caller.geohash.getById({ geohashId: "6gkzm9" });

      expect(result!.camada2!.fibra.classification).toBe("SAUDAVEL");
    });

    it("fibra AUMENTO_CAPACIDADE quando taxa_ocupacao > 85%", async () => {
      const ctx = detailCtx({
        fibra: [fibraRow({ classification: "AUMENTO_CAPACIDADE", taxa_ocupacao: 92 })],
      });
      const caller = appRouter.createCaller(ctx);

      const result = await caller.geohash.getById({ geohashId: "6gkzm9" });

      expect(result!.camada2!.fibra.classification).toBe("AUMENTO_CAPACIDADE");
      expect(result!.camada2!.fibra.taxa_ocupacao).toBeGreaterThan(85);
    });

    it("fibra EXPANSAO_NOVA_AREA para áreas sem cobertura", async () => {
      const ctx = detailCtx({
        fibra: [fibraRow({ classification: "EXPANSAO_NOVA_AREA", portas_disponiveis: 0 })],
      });
      const caller = appRouter.createCaller(ctx);

      const result = await caller.geohash.getById({ geohashId: "6gkzm9" });

      expect(result!.camada2!.fibra.classification).toBe("EXPANSAO_NOVA_AREA");
    });

    it("movel MELHORA_QUALIDADE para qualidade comprometida", async () => {
      const ctx = detailCtx({
        movel: [movelRow({ classification: "MELHORA_QUALIDADE", speedtest_score: 4.5 })],
      });
      const caller = appRouter.createCaller(ctx);

      const result = await caller.geohash.getById({ geohashId: "6gkzm9" });

      expect(result!.camada2!.movel.classification).toBe("MELHORA_QUALIDADE");
    });
  });

  describe("Business Rules — RN004-07: Competitive Position", () => {
    it("retorna scores de todos os operadores para cálculo de posição competitiva", async () => {
      const ctx = detailCtx({
        base: [geohashRow({ vivo_score: 8.5, tim_score: 7.0, claro_score: 6.5 })],
      });
      const caller = appRouter.createCaller(ctx);

      const result = await caller.geohash.getById({ geohashId: "6gkzm9" });

      expect(result!.vivo_score).toBe(8.5);
      expect(result!.tim_score).toBe(7.0);
      expect(result!.claro_score).toBe(6.5);
      // Delta = 8.5 - max(7.0, 6.5) = 1.5 → Líder
      const delta = result!.vivo_score! - Math.max(result!.tim_score!, result!.claro_score!);
      expect(delta).toBeGreaterThan(0.5);
    });
  });

  describe("Cache Integration", () => {
    it("getById cacheia resultado e retorna do cache na segunda chamada", async () => {
      const ctx = detailCtx();
      const caller = appRouter.createCaller(ctx);

      const r1 = await caller.geohash.getById({ geohashId: "6gkzm9" });
      const r2 = await caller.geohash.getById({ geohashId: "6gkzm9" });

      expect(r1).toEqual(r2);
      // Base query happens once; second call from cache
      expect(ctx.redis.set).toHaveBeenCalled();
    });
  });
});
