/**
 * Testes de Integração — UC011: Persistir e Restaurar Estado da Sessão
 *
 * Verifica estratégia de dupla resiliência (Redis → PostgreSQL),
 * defaults na primeira sessão, e restauração completa.
 */

import { sessionRouter } from "../../trpc/routers/session.router";
import { createMockCtx } from "./helpers";

const SESSION_TTL = 30 * 24 * 60 * 60; // 30 dias em segundos

const fullSessionState = {
  activeQuadrants: ["GROWTH", "UPSELL", "RETENCAO", "GROWTH_RETENCAO"],
  techFilter: "TODOS",
  period: "2025-01",
  location: { state: "GO", city: "Goiânia", neighborhood: "Setor Bueno" },
  mapViewport: { lat: -16.686, lng: -49.264, zoom: 12 },
  pinnedGeohashId: "6gkzm9",
};

describe("UC011 — Persistir e Restaurar Sessão", () => {
  // ─── Success Criteria ──────────────────────────────────────────────────

  describe("Success Criteria", () => {
    it("PS01: save persiste estado completo em Redis + PostgreSQL", async () => {
      const ctx = createMockCtx();
      const caller = sessionRouter.createCaller(ctx);

      const result = await caller.save({
        userId: "user-123",
        state: fullSessionState,
      });

      expect(result).toEqual({ ok: true });
      // Redis com TTL 30 dias
      expect(ctx.redis.set).toHaveBeenCalledWith(
        "session:user-123",
        JSON.stringify(fullSessionState),
        "EX",
        SESSION_TTL,
      );
      // PostgreSQL upsert
      expect(ctx.db.insert).toHaveBeenCalled();
    });

    it("PS02: get restaura estado completo da sessão anterior", async () => {
      const ctx = createMockCtx({
        cache: { "session:user-123": JSON.stringify(fullSessionState) },
      });
      const caller = sessionRouter.createCaller(ctx);

      const result = await caller.get({ userId: "user-123" });

      expect(result).toEqual(fullSessionState);
      expect(result!.activeQuadrants).toHaveLength(4);
      expect(result!.techFilter).toBe("TODOS");
      expect(result!.period).toBe("2025-01");
      expect(result!.location).toEqual({
        state: "GO",
        city: "Goiânia",
        neighborhood: "Setor Bueno",
      });
      expect(result!.pinnedGeohashId).toBe("6gkzm9");
    });
  });

  // ─── Failure Criteria ─────────────────────────────────────────────────

  describe("Failure Criteria", () => {
    it("PF01/PF02: retorna null na primeira sessão (sem dados anteriores)", async () => {
      const ctx = createMockCtx({ db: { selectRows: [] } });
      const caller = sessionRouter.createCaller(ctx);

      const result = await caller.get({ userId: "new-user" });

      expect(result).toBeNull();
    });
  });

  // ─── Business Rules ───────────────────────────────────────────────────

  describe("RN011-03: Estratégia Dupla Resiliência", () => {
    it("Redis primário — retorna sem consultar PostgreSQL", async () => {
      const state = { techFilter: "FIBRA" };
      const ctx = createMockCtx({
        cache: { "session:u1": JSON.stringify(state) },
      });
      const caller = sessionRouter.createCaller(ctx);

      const result = await caller.get({ userId: "u1" });

      expect(result).toEqual(state);
      expect(ctx.db.select).not.toHaveBeenCalled();
    });

    it("fallback PostgreSQL quando Redis miss", async () => {
      const state = { period: "2025-03" };
      const ctx = createMockCtx({
        db: { selectRows: [{ userId: "u1", state, updatedAt: "2025-01-01" }] },
      });
      const caller = sessionRouter.createCaller(ctx);

      const result = await caller.get({ userId: "u1" });

      expect(result).toEqual(state);
      expect(ctx.db.select).toHaveBeenCalled();
    });

    it("repopula Redis com TTL 30d ao restaurar do PostgreSQL", async () => {
      const state = { techFilter: "MOVEL" };
      const ctx = createMockCtx({
        db: { selectRows: [{ userId: "u1", state }] },
      });
      const caller = sessionRouter.createCaller(ctx);

      await caller.get({ userId: "u1" });

      expect(ctx.redis.set).toHaveBeenCalledWith(
        "session:u1",
        JSON.stringify(state),
        "EX",
        SESSION_TTL,
      );
    });

    it("save → get roundtrip preserva todos os campos", async () => {
      const ctx = createMockCtx();
      const caller = sessionRouter.createCaller(ctx);

      await caller.save({ userId: "u1", state: fullSessionState });
      const restored = await caller.get({ userId: "u1" });

      expect(restored).toEqual(fullSessionState);
    });
  });

  describe("RN011-01: Estrutura SessionState", () => {
    it("aceita filtros de quadrante e tecnologia", async () => {
      const state = {
        activeQuadrants: ["GROWTH", "RETENCAO"],
        techFilter: "FIBRA",
      };
      const ctx = createMockCtx();
      const caller = sessionRouter.createCaller(ctx);

      const result = await caller.save({ userId: "u1", state });

      expect(result).toEqual({ ok: true });
    });

    it("aceita localização com bairro opcional", async () => {
      const state = {
        location: { state: "SP", city: "São Paulo" },
      };
      const ctx = createMockCtx();
      const caller = sessionRouter.createCaller(ctx);

      const result = await caller.save({ userId: "u1", state });

      expect(result).toEqual({ ok: true });
    });

    it("aceita mapViewport com lat, lng e zoom", async () => {
      const state = {
        mapViewport: { lat: -23.55, lng: -46.63, zoom: 14 },
      };
      const ctx = createMockCtx();
      const caller = sessionRouter.createCaller(ctx);

      const result = await caller.save({ userId: "u1", state });

      expect(result).toEqual({ ok: true });
    });

    it("aceita pinnedGeohashId para persistir geohash fixado", async () => {
      const state = { pinnedGeohashId: "6gkzm9" };
      const ctx = createMockCtx();
      const caller = sessionRouter.createCaller(ctx);

      const result = await caller.save({ userId: "u1", state });

      expect(result).toEqual({ ok: true });
    });
  });
});
