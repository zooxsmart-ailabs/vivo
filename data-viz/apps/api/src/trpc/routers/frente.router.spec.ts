import { frenteRouter } from "./frente.router";

function mockCtx(overrides: { cacheHit?: string; rows?: any[] } = {}) {
  return {
    db: {
      execute: vi.fn().mockResolvedValue({ rows: overrides.rows ?? [] }),
    } as any,
    redis: {
      get: vi.fn().mockResolvedValue(overrides.cacheHit ?? null),
      set: vi.fn().mockResolvedValue("OK"),
    } as any,
  };
}

describe("frenteRouter", () => {
  describe("ranking", () => {
    it("returns cached data on Redis hit", async () => {
      const cached = { GROWTH: [], UPSELL: [], RETENCAO: [], GROWTH_RETENCAO: [] };
      const ctx = mockCtx({ cacheHit: JSON.stringify(cached) });
      const caller = frenteRouter.createCaller(ctx);

      const result = await caller.ranking({});

      expect(result).toEqual(cached);
      expect(ctx.db.execute).not.toHaveBeenCalled();
    });

    it("groups results by quadrant type", async () => {
      const rows = [
        { geohash_id: "a", quadrant_type: "GROWTH", rank_within_quadrant: 1 },
        { geohash_id: "b", quadrant_type: "GROWTH", rank_within_quadrant: 2 },
        { geohash_id: "c", quadrant_type: "UPSELL", rank_within_quadrant: 1 },
        { geohash_id: "d", quadrant_type: "RETENCAO", rank_within_quadrant: 1 },
      ];
      const ctx = mockCtx({ rows });
      const caller = frenteRouter.createCaller(ctx);

      const result = await caller.ranking({});

      expect(result.GROWTH).toHaveLength(2);
      expect(result.UPSELL).toHaveLength(1);
      expect(result.RETENCAO).toHaveLength(1);
      expect(result.GROWTH_RETENCAO).toHaveLength(0);
    });

    it("caches grouped result with 5-minute TTL", async () => {
      const ctx = mockCtx({ rows: [] });
      const caller = frenteRouter.createCaller(ctx);

      await caller.ranking({});

      expect(ctx.redis.set).toHaveBeenCalledWith(
        expect.stringContaining("cache:frente:ranking:"),
        expect.any(String),
        "EX",
        300,
      );
    });

    it("initializes all quadrant keys even when empty", async () => {
      const ctx = mockCtx({ rows: [] });
      const caller = frenteRouter.createCaller(ctx);

      const result = await caller.ranking({});

      expect(result).toHaveProperty("GROWTH");
      expect(result).toHaveProperty("UPSELL");
      expect(result).toHaveProperty("RETENCAO");
      expect(result).toHaveProperty("GROWTH_RETENCAO");
    });

    it("ignores rows with unknown quadrant type", async () => {
      const rows = [
        { geohash_id: "a", quadrant_type: "UNKNOWN_QUAD" },
      ];
      const ctx = mockCtx({ rows });
      const caller = frenteRouter.createCaller(ctx);

      const result = await caller.ranking({});

      expect(result.GROWTH).toHaveLength(0);
      expect(result.UPSELL).toHaveLength(0);
    });
  });

  describe("summary", () => {
    it("returns aggregated KPIs from database", async () => {
      const rows = [
        {
          quadrant_type: "GROWTH",
          total: 50,
          avg_priority: 7.5,
          avg_share: 12.3,
          avg_satisfaction: 8.1,
          critica_count: 5,
        },
        {
          quadrant_type: "RETENCAO",
          total: 30,
          avg_priority: 8.9,
          avg_share: 45.0,
          avg_satisfaction: 4.2,
          critica_count: 15,
        },
      ];
      const ctx = mockCtx({ rows });
      const caller = frenteRouter.createCaller(ctx);

      const result = await caller.summary({});

      expect(result).toEqual(rows);
      expect(result).toHaveLength(2);
    });

    it("returns empty array when no data", async () => {
      const ctx = mockCtx({ rows: [] });
      const caller = frenteRouter.createCaller(ctx);

      const result = await caller.summary({});

      expect(result).toEqual([]);
    });
  });
});
