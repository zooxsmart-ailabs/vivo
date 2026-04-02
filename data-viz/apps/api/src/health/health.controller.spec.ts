import { Logger } from "@nestjs/common";
import { HealthController } from "./health.controller";

describe("HealthController", () => {
  let controller: HealthController;
  let mockDb: any;
  let mockRedis: any;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, "warn").mockImplementation();
    mockDb = { execute: jest.fn().mockResolvedValue({ rows: [{ "?column?": 1 }] }) };
    mockRedis = { client: { ping: jest.fn().mockResolvedValue("PONG") } };
    controller = new HealthController(mockDb, mockRedis);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("check()", () => {
    it("returns ok when database and redis are both up", async () => {
      const result = await controller.check();

      expect(result.status).toBe("ok");
      expect(result.services).toEqual({ database: "up", redis: "up" });
      expect(result.timestamp).toBeDefined();
    });

    it("returns degraded when database is down", async () => {
      mockDb.execute.mockRejectedValue(new Error("connection refused"));

      const result = await controller.check();

      expect(result.status).toBe("degraded");
      expect(result.services.database).toBe("down");
      expect(result.services.redis).toBe("up");
    });

    it("returns degraded when redis is down", async () => {
      mockRedis.client.ping.mockRejectedValue(new Error("redis timeout"));

      const result = await controller.check();

      expect(result.status).toBe("degraded");
      expect(result.services.database).toBe("up");
      expect(result.services.redis).toBe("down");
    });

    it("returns degraded when both services are down", async () => {
      mockDb.execute.mockRejectedValue(new Error("db error"));
      mockRedis.client.ping.mockRejectedValue(new Error("redis error"));

      const result = await controller.check();

      expect(result.status).toBe("degraded");
      expect(result.services).toEqual({ database: "down", redis: "down" });
    });
  });

  describe("liveness()", () => {
    it("returns status ok and numeric uptime", () => {
      const result = controller.liveness();

      expect(result.status).toBe("ok");
      expect(typeof result.uptime).toBe("number");
    });
  });
});
