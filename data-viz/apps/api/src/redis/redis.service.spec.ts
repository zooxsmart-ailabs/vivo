import { Logger } from "@nestjs/common";

const mockOn = jest.fn();
const mockQuit = jest.fn().mockResolvedValue("OK");

jest.mock("ioredis", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    on: mockOn,
    quit: mockQuit,
  })),
}));

import Redis from "ioredis";
import { RedisService } from "./redis.service";

describe("RedisService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, "error").mockImplementation();
    jest.spyOn(Logger.prototype, "log").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
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

    expect(Redis).toHaveBeenCalledTimes(2);
  });

  it("configures connections with the provided host and port", () => {
    createService();

    expect(Redis).toHaveBeenCalledWith(
      expect.objectContaining({ host: "localhost", port: 6379 }),
    );
  });

  it("omits password from config when empty", () => {
    createService();

    expect(Redis).toHaveBeenCalledWith(
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

    const options = (Redis as unknown as jest.Mock).mock.calls[0][0];
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
