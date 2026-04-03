import { appRouter } from "./trpc.router";

function mockCtx() {
  return {
    db: { execute: vi.fn() } as any,
    redis: { get: vi.fn(), set: vi.fn() } as any,
  };
}

describe("appRouter — root procedures", () => {
  describe("health", () => {
    it("returns status ok and an ISO timestamp", async () => {
      const caller = appRouter.createCaller(mockCtx());

      const result = await caller.health();

      expect(result.status).toBe("ok");
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });
  });

  describe("ping", () => {
    it("returns 'pong' when no message provided", async () => {
      const caller = appRouter.createCaller(mockCtx());

      const result = await caller.ping({});

      expect(result.pong).toBe("pong");
      expect(result.timestamp).toBeDefined();
    });

    it("echoes the provided message", async () => {
      const caller = appRouter.createCaller(mockCtx());

      const result = await caller.ping({ message: "hello" });

      expect(result.pong).toBe("hello");
    });
  });
});
