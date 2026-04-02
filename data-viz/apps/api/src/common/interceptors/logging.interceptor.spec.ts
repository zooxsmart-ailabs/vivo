import { Logger } from "@nestjs/common";
import { of } from "rxjs";
import { LoggingInterceptor } from "./logging.interceptor";

describe("LoggingInterceptor", () => {
  let interceptor: LoggingInterceptor;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
    logSpy = jest.spyOn(Logger.prototype, "log").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function makeContext(method: string, url: string, statusCode = 200) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ method, url }),
        getResponse: () => ({ statusCode }),
      }),
    } as any;
  }

  it("logs method, url, status code, and duration", (done) => {
    const ctx = makeContext("GET", "/health", 200);
    const next = { handle: () => of("result") };

    interceptor.intercept(ctx, next).subscribe(() => {
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringMatching(/^GET \/health 200 \d+ms$/),
      );
      done();
    });
  });

  it("passes through the response value without modification", (done) => {
    const ctx = makeContext("POST", "/api", 201);
    const next = { handle: () => of({ data: "test" }) };

    interceptor.intercept(ctx, next).subscribe((value) => {
      expect(value).toEqual({ data: "test" });
      done();
    });
  });
});
