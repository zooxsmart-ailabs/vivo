import { geohashRouter } from "./geohash.router";

function mockCtx(overrides: {
  cacheHit?: string;
  rows?: any[];
  crmRows?: any[];
  fibraRows?: any[];
  movelRows?: any[];
  growthRows?: any[];
} = {}) {
  let executeCallCount = 0;
  return {
    db: {
      execute: jest.fn().mockImplementation(() => {
        executeCallCount++;
        if (executeCallCount === 1) return Promise.resolve({ rows: overrides.rows ?? [] });
        // getById secondary queries (used by safeQuery which calls .then())
        if (executeCallCount === 2) return Promise.resolve({ rows: overrides.crmRows ?? [] });
        if (executeCallCount === 3) return Promise.resolve({ rows: overrides.fibraRows ?? [] });
        if (executeCallCount === 4) return Promise.resolve({ rows: overrides.movelRows ?? [] });
        if (executeCallCount === 5) return Promise.resolve({ rows: overrides.growthRows ?? [] });
        return Promise.resolve({ rows: [] });
      }),
    } as any,
    redis: {
      get: jest.fn().mockResolvedValue(overrides.cacheHit ?? null),
      set: jest.fn().mockResolvedValue("OK"),
    } as any,
  };
}

describe("geohashRouter", () => {
  describe("list", () => {
    it("returns cached data when Redis cache hit", async () => {
      const cachedData = [{ geohash_id: "abc123" }];
      const ctx = mockCtx({ cacheHit: JSON.stringify(cachedData) });
      const caller = geohashRouter.createCaller(ctx);

      const result = await caller.list({ precision: 6 });

      expect(result).toEqual(cachedData);
      expect(ctx.db.execute).not.toHaveBeenCalled();
    });

    it("queries database and caches result on cache miss", async () => {
      const rows = [
        {
          geohash_id: "6gkzm9",
          precision: 6,
          quadrant_type: "GROWTH",
          share_vivo: 15.5,
        },
      ];
      const ctx = mockCtx({ rows });
      const caller = geohashRouter.createCaller(ctx);

      const result = await caller.list({ precision: 6 });

      expect(result).toEqual(rows);
      expect(ctx.db.execute).toHaveBeenCalledTimes(1);
      expect(ctx.redis.set).toHaveBeenCalledWith(
        expect.stringContaining("cache:geohash:list:"),
        JSON.stringify(rows),
        "EX",
        300,
      );
    });

    it("applies default precision of 6 when not specified", async () => {
      const ctx = mockCtx({ rows: [] });
      const caller = geohashRouter.createCaller(ctx);

      await caller.list({});

      expect(ctx.db.execute).toHaveBeenCalled();
    });
  });

  describe("getById", () => {
    const baseRow = {
      geohash_id: "6gkzm9",
      precision: 6,
      center_lat: -23.55,
      center_lng: -46.63,
      neighborhood: "Pinheiros",
      city: "São Paulo",
      state: "SP",
      quadrant_type: "GROWTH",
      share_vivo: 12.5,
      avg_satisfaction_vivo: 7.8,
      priority_score: 8.2,
      priority_label: "P2_ALTA",
      tech_category: "FIBRA",
      period: "2025-01",
    };

    it("returns null when geohash is not found", async () => {
      const ctx = mockCtx({ rows: [] });
      const caller = geohashRouter.createCaller(ctx);

      const result = await caller.getById({ geohashId: "nonexistent" });

      expect(result).toBeNull();
    });

    it("returns enriched data with CRM and camada2", async () => {
      const crmData = { avg_arpu: 85.0, dominant_plan_type: "Fibra 500M" };
      const fibraData = { classification: "SAUDAVEL", score: 88 };
      const movelData = { classification: "EXPANSAO_5G", score: 72 };
      const growthData = { score_ookla: 8.5, recomendacao: "ATIVAR" };
      const ctx = mockCtx({
        rows: [baseRow],
        crmRows: [crmData],
        fibraRows: [fibraData],
        movelRows: [movelData],
        growthRows: [growthData],
      });
      const caller = geohashRouter.createCaller(ctx);

      const result = await caller.getById({ geohashId: "6gkzm9" });

      expect(result).toMatchObject({
        geohash_id: "6gkzm9",
        crm: crmData,
        camada2: { fibra: fibraData, movel: movelData },
        diagnosticoGrowth: growthData,
      });
    });

    it("uses Redis cache when available", async () => {
      const cached = { ...baseRow, crm: null, camada2: null };
      const ctx = mockCtx({ cacheHit: JSON.stringify(cached) });
      const caller = geohashRouter.createCaller(ctx);

      const result = await caller.getById({ geohashId: "6gkzm9" });

      expect(result).toEqual(cached);
      expect(ctx.db.execute).not.toHaveBeenCalled();
    });

    it("sets camada2 to null when neither fibra nor movel data exists", async () => {
      const ctx = mockCtx({ rows: [baseRow] });
      const caller = geohashRouter.createCaller(ctx);

      const result = await caller.getById({ geohashId: "6gkzm9" });

      expect(result!.camada2).toBeNull();
    });

    it("caches the result with 5-minute TTL", async () => {
      const ctx = mockCtx({ rows: [baseRow] });
      const caller = geohashRouter.createCaller(ctx);

      await caller.getById({ geohashId: "6gkzm9" });

      expect(ctx.redis.set).toHaveBeenCalledWith(
        expect.stringContaining("cache:geohash:detail:6gkzm9"),
        expect.any(String),
        "EX",
        300,
      );
    });
  });

  describe("compare", () => {
    it("returns parallel query results for two geohashes", async () => {
      const row1 = { geohash_id: "abc", share_vivo: 10 };
      const row2 = { geohash_id: "def", share_vivo: 20 };
      const ctx = {
        db: {
          execute: jest
            .fn()
            .mockResolvedValueOnce({ rows: [row1] })
            .mockResolvedValueOnce({ rows: [row2] }),
        } as any,
        redis: { get: jest.fn(), set: jest.fn() } as any,
      };
      const caller = geohashRouter.createCaller(ctx);

      const result = await caller.compare({
        geohashIds: ["abc", "def"],
      });

      expect(result).toEqual([row1, row2]);
    });

    it("returns null for a geohash not found", async () => {
      const ctx = {
        db: {
          execute: jest
            .fn()
            .mockResolvedValueOnce({ rows: [{ geohash_id: "abc" }] })
            .mockResolvedValueOnce({ rows: [] }),
        } as any,
        redis: { get: jest.fn(), set: jest.fn() } as any,
      };
      const caller = geohashRouter.createCaller(ctx);

      const result = await caller.compare({
        geohashIds: ["abc", "missing"],
      });

      expect(result[0]).toBeDefined();
      expect(result[1]).toBeNull();
    });
  });
});
