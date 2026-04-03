import { metaRouter } from "./meta.router";

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

describe("metaRouter", () => {
  describe("availablePeriods", () => {
    it("returns list of period strings", async () => {
      const ctx = mockCtx({
        rows: [{ period: "2025-03" }, { period: "2025-02" }, { period: "2025-01" }],
      });
      const caller = metaRouter.createCaller(ctx);

      const result = await caller.availablePeriods();

      expect(result).toEqual(["2025-03", "2025-02", "2025-01"]);
    });

    it("returns empty array when no periods exist", async () => {
      const ctx = mockCtx({ rows: [] });
      const caller = metaRouter.createCaller(ctx);

      const result = await caller.availablePeriods();

      expect(result).toEqual([]);
    });
  });

  describe("benchmarks", () => {
    it("returns cached data on Redis hit", async () => {
      const cached = { avg_share: 25.0, avg_satisfaction: 7.0 };
      const ctx = mockCtx({ cacheHit: JSON.stringify(cached) });
      const caller = metaRouter.createCaller(ctx);

      const result = await caller.benchmarks({});

      expect(result).toEqual(cached);
      expect(ctx.db.execute).not.toHaveBeenCalled();
    });

    it("reduces rows to key-value map of metric_name to metric_value", async () => {
      const rows = [
        { metric_name: "avg_share", metric_value: 25.0, scope: "NACIONAL" },
        { metric_name: "avg_satisfaction", metric_value: 7.5, scope: "NACIONAL" },
        { metric_name: "avg_download", metric_value: 120.0, scope: "NACIONAL" },
      ];
      const ctx = mockCtx({ rows });
      const caller = metaRouter.createCaller(ctx);

      const result = await caller.benchmarks({});

      expect(result).toEqual({
        avg_share: 25.0,
        avg_satisfaction: 7.5,
        avg_download: 120.0,
      });
    });

    it("caches result with 1-hour TTL", async () => {
      const ctx = mockCtx({ rows: [] });
      const caller = metaRouter.createCaller(ctx);

      await caller.benchmarks({});

      expect(ctx.redis.set).toHaveBeenCalledWith(
        expect.stringContaining("cache:benchmarks:"),
        expect.any(String),
        "EX",
        3600,
      );
    });

    it("returns empty object when no benchmarks exist", async () => {
      const ctx = mockCtx({ rows: [] });
      const caller = metaRouter.createCaller(ctx);

      const result = await caller.benchmarks({});

      expect(result).toEqual({});
    });
  });

  describe("locations", () => {
    it("builds hierarchical state > city > neighborhood tree", async () => {
      const rows = [
        { state: "GO", city: "Goiânia", neighborhood: "Centro" },
        { state: "GO", city: "Goiânia", neighborhood: "Setor Oeste" },
        { state: "GO", city: "Anápolis", neighborhood: "Jundiaí" },
        { state: "SP", city: "São Paulo", neighborhood: "Pinheiros" },
      ];
      const ctx = mockCtx({ rows });
      const caller = metaRouter.createCaller(ctx);

      const result = await caller.locations();

      expect(result).toHaveLength(2);

      const go = result.find((s: any) => s.state === "GO");
      expect(go!.cities).toHaveLength(2);
      const goiania = go!.cities.find((c: any) => c.city === "Goiânia");
      expect(goiania!.neighborhoods).toEqual(["Centro", "Setor Oeste"]);

      const sp = result.find((s: any) => s.state === "SP");
      expect(sp!.cities).toHaveLength(1);
    });

    it("excludes null neighborhoods from the tree", async () => {
      const rows = [
        { state: "RJ", city: "Rio de Janeiro", neighborhood: null },
        { state: "RJ", city: "Rio de Janeiro", neighborhood: "Copacabana" },
      ];
      const ctx = mockCtx({ rows });
      const caller = metaRouter.createCaller(ctx);

      const result = await caller.locations();
      const rj = result.find((s: any) => s.state === "RJ");

      expect(rj!.cities[0].neighborhoods).toEqual(["Copacabana"]);
    });

    it("returns empty array when no locations exist", async () => {
      const ctx = mockCtx({ rows: [] });
      const caller = metaRouter.createCaller(ctx);

      const result = await caller.locations();

      expect(result).toEqual([]);
    });

    it("sorts neighborhoods alphabetically", async () => {
      const rows = [
        { state: "SP", city: "São Paulo", neighborhood: "Vila Madalena" },
        { state: "SP", city: "São Paulo", neighborhood: "Bela Vista" },
        { state: "SP", city: "São Paulo", neighborhood: "Pinheiros" },
      ];
      const ctx = mockCtx({ rows });
      const caller = metaRouter.createCaller(ctx);

      const result = await caller.locations();
      const sp = result.find((s: any) => s.state === "SP");

      expect(sp!.cities[0].neighborhoods).toEqual([
        "Bela Vista",
        "Pinheiros",
        "Vila Madalena",
      ]);
    });
  });
});
