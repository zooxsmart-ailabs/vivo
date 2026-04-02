import databaseConfig from "./database.config";

describe("databaseConfig", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns defaults when no env vars set", () => {
    delete process.env.DATABASE_HOST;
    delete process.env.DATABASE_PORT;
    delete process.env.DATABASE_USER;
    delete process.env.DATABASE_PASSWORD;
    delete process.env.DATABASE_NAME;
    delete process.env.DATABASE_SSL;

    const config = databaseConfig();

    expect(config.host).toBe("localhost");
    expect(config.port).toBe(5432);
    expect(config.user).toBe("vivo");
    expect(config.password).toBe("changeme");
    expect(config.database).toBe("vivo_geointel");
    expect(config.ssl).toBe(false);
  });

  it("parses DATABASE_PORT as integer", () => {
    process.env.DATABASE_PORT = "5437";
    const config = databaseConfig();
    expect(config.port).toBe(5437);
  });

  it("DATABASE_SSL = 'true' returns true", () => {
    process.env.DATABASE_SSL = "true";
    const config = databaseConfig();
    expect(config.ssl).toBe(true);
  });

  it("DATABASE_SSL = 'false' returns false", () => {
    process.env.DATABASE_SSL = "false";
    const config = databaseConfig();
    expect(config.ssl).toBe(false);
  });

  it("DATABASE_SSL absent returns false", () => {
    delete process.env.DATABASE_SSL;
    const config = databaseConfig();
    expect(config.ssl).toBe(false);
  });

  it("reads all env vars when set", () => {
    process.env.DATABASE_HOST = "db.prod.vivo.com";
    process.env.DATABASE_PORT = "5433";
    process.env.DATABASE_USER = "admin";
    process.env.DATABASE_PASSWORD = "s3cret";
    process.env.DATABASE_NAME = "vivo_prod";

    const config = databaseConfig();

    expect(config.host).toBe("db.prod.vivo.com");
    expect(config.port).toBe(5433);
    expect(config.user).toBe("admin");
    expect(config.password).toBe("s3cret");
    expect(config.database).toBe("vivo_prod");
  });
});
