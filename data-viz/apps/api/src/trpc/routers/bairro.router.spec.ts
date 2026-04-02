import { bairroRouter } from "./bairro.router";

function mockCtx(overrides: { cacheHit?: string; rows?: any[] } = {}) {
  return {
    db: {
      execute: jest.fn().mockResolvedValue({ rows: overrides.rows ?? [] }),
    } as any,
    redis: {
      get: jest.fn().mockResolvedValue(overrides.cacheHit ?? null),
      set: jest.fn().mockResolvedValue("OK"),
    } as any,
  };
}

describe("bairroRouter", () => {
  describe("list", () => {
    it("returns cached data on Redis hit", async () => {
      const cached = { items: [{ neighborhood: "Pinheiros" }], total: 1 };
      const ctx = mockCtx({ cacheHit: JSON.stringify(cached) });
      const caller = bairroRouter.createCaller(ctx);

      const result = await caller.list({});

      expect(result).toEqual(cached);
      expect(ctx.db.execute).not.toHaveBeenCalled();
    });

    it("queries database on cache miss and caches result", async () => {
      const rows = [
        {
          neighborhood: "Pinheiros",
          city: "São Paulo",
          state: "SP",
          total_geohashes: 12,
          avg_share: 18.5,
          avg_satisfaction: 7.2,
          avg_priority_score: 7.8,
          dominant_quadrant: "GROWTH",
          period: "2025-01",
        },
      ];
      const ctx = mockCtx({ rows });
      const caller = bairroRouter.createCaller(ctx);

      const result = await caller.list({});

      expect(result).toEqual({ items: rows, total: 1 });
      expect(ctx.redis.set).toHaveBeenCalledWith(
        expect.stringContaining("cache:bairros:"),
        expect.any(String),
        "EX",
        300,
      );
    });

    it("uses default limit of 50 and offset of 0", async () => {
      const ctx = mockCtx();
      const caller = bairroRouter.createCaller(ctx);

      await caller.list({});

      expect(ctx.db.execute).toHaveBeenCalled();
    });
  });

  describe("getByName", () => {
    it("returns null when no geohashes found in neighborhood", async () => {
      const ctx = mockCtx({ rows: [] });
      const caller = bairroRouter.createCaller(ctx);

      const result = await caller.getByName({
        neighborhood: "Unknown",
        city: "São Paulo",
        state: "SP",
      });

      expect(result).toBeNull();
    });

    it("returns neighborhood with its geohashes", async () => {
      const rows = [
        {
          geohash_id: "abc",
          quadrant_type: "GROWTH",
          share_vivo: 12,
          priority_score: 8.5,
        },
        {
          geohash_id: "def",
          quadrant_type: "UPSELL",
          share_vivo: 35,
          priority_score: 6.2,
        },
      ];
      const ctx = mockCtx({ rows });
      const caller = bairroRouter.createCaller(ctx);

      const result = await caller.getByName({
        neighborhood: "Pinheiros",
        city: "São Paulo",
        state: "SP",
      });

      expect(result).toEqual({
        neighborhood: "Pinheiros",
        city: "São Paulo",
        state: "SP",
        geohashes: rows,
      });
    });
  });
});
