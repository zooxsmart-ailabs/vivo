import { sessionRouter } from "./session.router";

function mockCtx(overrides: {
  redisGet?: string | null;
  dbSelectRows?: any[];
} = {}) {
  return {
    db: {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(overrides.dbSelectRows ?? []),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
        }),
      }),
    } as any,
    redis: {
      get: vi.fn().mockResolvedValue(overrides.redisGet ?? null),
      set: vi.fn().mockResolvedValue("OK"),
    } as any,
  };
}

describe("sessionRouter", () => {
  describe("get", () => {
    it("returns cached session from Redis", async () => {
      const sessionState = {
        activeQuadrants: ["GROWTH", "UPSELL"],
        techFilter: "FIBRA",
        period: "2025-01",
      };
      const ctx = mockCtx({ redisGet: JSON.stringify(sessionState) });
      const caller = sessionRouter.createCaller(ctx);

      const result = await caller.get({ userId: "user1" });

      expect(result).toEqual(sessionState);
      expect(ctx.redis.get).toHaveBeenCalledWith("session:user1");
      expect(ctx.db.select).not.toHaveBeenCalled();
    });

    it("falls back to PostgreSQL when Redis cache miss", async () => {
      const sessionState = { techFilter: "MOVEL" };
      const ctx = mockCtx({
        redisGet: null,
        dbSelectRows: [{ userId: "user1", state: sessionState, updatedAt: "2025-01-01" }],
      });
      const caller = sessionRouter.createCaller(ctx);

      const result = await caller.get({ userId: "user1" });

      expect(result).toEqual(sessionState);
    });

    it("repopulates Redis cache when found in PostgreSQL", async () => {
      const sessionState = { period: "2025-02" };
      const ctx = mockCtx({
        redisGet: null,
        dbSelectRows: [{ userId: "u1", state: sessionState }],
      });
      const caller = sessionRouter.createCaller(ctx);

      await caller.get({ userId: "u1" });

      expect(ctx.redis.set).toHaveBeenCalledWith(
        "session:u1",
        JSON.stringify(sessionState),
        "EX",
        30 * 24 * 60 * 60,
      );
    });

    it("returns null when session not found anywhere", async () => {
      const ctx = mockCtx({ redisGet: null, dbSelectRows: [] });
      const caller = sessionRouter.createCaller(ctx);

      const result = await caller.get({ userId: "unknown" });

      expect(result).toBeNull();
    });
  });

  describe("save", () => {
    it("persists session to Redis with 30-day TTL", async () => {
      const state = { activeQuadrants: ["GROWTH"], techFilter: "TODOS" as const };
      const ctx = mockCtx();
      const caller = sessionRouter.createCaller(ctx);

      await caller.save({ userId: "user1", state });

      expect(ctx.redis.set).toHaveBeenCalledWith(
        "session:user1",
        JSON.stringify(state),
        "EX",
        30 * 24 * 60 * 60,
      );
    });

    it("upserts session to PostgreSQL", async () => {
      const state = { period: "2025-03" };
      const ctx = mockCtx();
      const caller = sessionRouter.createCaller(ctx);

      await caller.save({ userId: "user1", state });

      expect(ctx.db.insert).toHaveBeenCalled();
    });

    it("returns { ok: true } on success", async () => {
      const ctx = mockCtx();
      const caller = sessionRouter.createCaller(ctx);

      const result = await caller.save({
        userId: "user1",
        state: { techFilter: "FIBRA" },
      });

      expect(result).toEqual({ ok: true });
    });
  });
});
