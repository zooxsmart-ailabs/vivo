import redisConfig from "./redis.config";

describe("redisConfig", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns defaults when no env vars set", () => {
    delete process.env.REDIS_HOST;
    delete process.env.REDIS_PORT;
    delete process.env.REDIS_PASSWORD;

    const config = redisConfig();

    expect(config.host).toBe("localhost");
    expect(config.port).toBe(6379);
    expect(config.password).toBeUndefined();
  });

  it("parses REDIS_PORT as integer", () => {
    process.env.REDIS_PORT = "6380";
    const config = redisConfig();
    expect(config.port).toBe(6380);
  });

  it("reads REDIS_HOST from env", () => {
    process.env.REDIS_HOST = "redis.prod.internal";
    const config = redisConfig();
    expect(config.host).toBe("redis.prod.internal");
  });

  it("password is undefined when REDIS_PASSWORD is empty string", () => {
    process.env.REDIS_PASSWORD = "";
    const config = redisConfig();
    expect(config.password).toBeUndefined();
  });

  it("reads REDIS_PASSWORD when set", () => {
    process.env.REDIS_PASSWORD = "r3d1s-s3cret";
    const config = redisConfig();
    expect(config.password).toBe("r3d1s-s3cret");
  });
});
