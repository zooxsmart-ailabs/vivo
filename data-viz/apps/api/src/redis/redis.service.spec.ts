import { Logger } from "@nestjs/common";

const { mockOn, mockQuit, MockRedis } = vi.hoisted(() => {
  const mockOn = vi.fn();
  const mockQuit = vi.fn().mockResolvedValue("OK");
  const MockRedis = vi.fn().mockImplementation(() => ({
    on: mockOn,
    quit: mockQuit,
  }));
  return { mockOn, mockQuit, MockRedis };
});

vi.mock("ioredis", () => ({ default: MockRedis }));

import Redis from "ioredis";
import { RedisService } from "./redis.service";

describe("RedisService", () => {
  beforeEach(() => {
    mockOn.mockClear();
    mockQuit.mockClear();
    MockRedis.mockClear();
    MockRedis.mockImplementation(() => ({
      on: mockOn,
      quit: mockQuit,
    }));
    vi.spyOn(Logger.prototype, "error").mockImplementation();
    vi.spyOn(Logger.prototype, "log").mockImplementation();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createService() {
    return new RedisService({
      host: "localhost",
      port: 6379,
      password: "",
    } as any);
  }

  it("creates two Redis connections (client and subscriber)", () => {
    createService();
    expect(MockRedis).toHaveBeenCalledTimes(2);
  });

  it("configures connections with the provided host and port", () => {
    createService();
    expect(MockRedis).toHaveBeenCalledWith(
      expect.objectContaining({ host: "localhost", port: 6379 }),
    );
  });

  it("omits password from config when empty", () => {
    createService();
    expect(MockRedis).toHaveBeenCalledWith(
      expect.objectContaining({ password: undefined }),
    );
  });

  it("registers error and connect event handlers", () => {
    createService();
    const events = mockOn.mock.calls.map(([event]: [string]) => event);
    expect(events).toContain("error");
    expect(events).toContain("connect");
  });

  it("retry strategy returns exponential backoff capped at 5000ms", () => {
    createService();
    const options = MockRedis.mock.calls[0][0];
    const retry = options.retryStrategy;
    expect(retry(1)).toBe(200);
    expect(retry(10)).toBe(2000);
    expect(retry(100)).toBe(5000);
  });

  it("quits both connections on module destroy", async () => {
    const service = createService();
    await service.onModuleDestroy();
    expect(mockQuit).toHaveBeenCalledTimes(2);
  });
});
