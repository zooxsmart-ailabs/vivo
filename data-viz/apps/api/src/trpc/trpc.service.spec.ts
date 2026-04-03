import { TrpcService } from "./trpc.service";

describe("TrpcService", () => {
  let service: TrpcService;
  const mockDb = { execute: vi.fn() } as any;
  const mockRedisClient = { get: vi.fn(), set: vi.fn() };
  const mockRedis = { client: mockRedisClient } as any;

  beforeEach(() => {
    service = new TrpcService(mockDb, mockRedis);
  });

  describe("createContext", () => {
    it("returns context with db, redis client, and user from request", () => {
      const user = { id: "u1", roles: ["admin"] };
      const ctx = service.createContext({ req: { user } });

      expect(ctx.db).toBe(mockDb);
      expect(ctx.redis).toBe(mockRedisClient);
      expect(ctx.user).toEqual(user);
    });

    it("returns context without user when request has no user", () => {
      const ctx = service.createContext({ req: {} });

      expect(ctx.db).toBe(mockDb);
      expect(ctx.redis).toBe(mockRedisClient);
      expect(ctx.user).toBeUndefined();
    });

    it("handles null request gracefully", () => {
      const ctx = service.createContext({ req: null });

      expect(ctx.user).toBeUndefined();
    });
  });

  describe("createWsContext", () => {
    it("returns context with db, redis client, and user from WS request", () => {
      const user = { id: "ws-user", roles: [] };
      const ctx = service.createWsContext({ req: { user } });

      expect(ctx.db).toBe(mockDb);
      expect(ctx.redis).toBe(mockRedisClient);
      expect(ctx.user).toEqual(user);
    });

    it("returns context without user for anonymous WS connection", () => {
      const ctx = service.createWsContext({ req: {} });

      expect(ctx.user).toBeUndefined();
    });
  });
});
