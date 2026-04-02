import appConfig from "./app.config";

describe("appConfig", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns default port 3008 when PORT not set", () => {
    delete process.env.PORT;
    const config = appConfig();
    expect(config.port).toBe(3008);
  });

  it("parses PORT as integer", () => {
    process.env.PORT = "4000";
    const config = appConfig();
    expect(config.port).toBe(4000);
  });

  it("returns default nodeEnv 'development'", () => {
    delete process.env.NODE_ENV;
    const config = appConfig();
    expect(config.nodeEnv).toBe("development");
  });

  it("splits CORS_ORIGINS by comma", () => {
    process.env.CORS_ORIGINS =
      "http://localhost:3000,http://localhost:3005,https://app.vivo.com";
    const config = appConfig();
    expect(config.corsOrigins).toEqual([
      "http://localhost:3000",
      "http://localhost:3005",
      "https://app.vivo.com",
    ]);
  });

  it("returns single-element array for single CORS origin", () => {
    process.env.CORS_ORIGINS = "http://localhost:3005";
    const config = appConfig();
    expect(config.corsOrigins).toEqual(["http://localhost:3005"]);
  });

  it("returns default CORS origin when not set", () => {
    delete process.env.CORS_ORIGINS;
    const config = appConfig();
    expect(config.corsOrigins).toEqual(["http://localhost:3005"]);
  });

  it("returns JWT_SECRET from env", () => {
    process.env.JWT_SECRET = "my-super-secret";
    const config = appConfig();
    expect(config.jwtSecret).toBe("my-super-secret");
  });

  it("returns default jwtExpiration '1h'", () => {
    delete process.env.JWT_EXPIRATION;
    const config = appConfig();
    expect(config.jwtExpiration).toBe("1h");
  });
});
