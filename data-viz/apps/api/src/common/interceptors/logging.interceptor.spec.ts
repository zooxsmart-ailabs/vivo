import { Logger } from "@nestjs/common";
import { of, firstValueFrom } from "rxjs";
import { LoggingInterceptor } from "./logging.interceptor";

describe("LoggingInterceptor", () => {
  let interceptor: LoggingInterceptor;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
    logSpy = vi.spyOn(Logger.prototype, "log").mockImplementation();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function makeContext(method: string, url: string, statusCode = 200) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ method, url }),
        getResponse: () => ({ statusCode }),
      }),
    } as any;
  }

  it("logs method, url, status code, and duration", async () => {
    const ctx = makeContext("GET", "/health", 200);
    const next = { handle: () => of("result") };

    await firstValueFrom(interceptor.intercept(ctx, next));

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^GET \/health 200 \d+ms$/),
    );
  });

  it("passes through the response value without modification", async () => {
    const ctx = makeContext("POST", "/api", 201);
    const next = { handle: () => of({ data: "test" }) };

    const value = await firstValueFrom(interceptor.intercept(ctx, next));

    expect(value).toEqual({ data: "test" });
  });
});
