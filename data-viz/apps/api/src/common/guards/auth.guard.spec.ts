import { UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "./auth.guard";

describe("AuthGuard", () => {
  let guard: AuthGuard;
  let mockConfig: { get: vi.Mock };

  beforeEach(() => {
    mockConfig = { get: vi.fn().mockReturnValue("test-secret") };
    guard = new AuthGuard(mockConfig as any);
  });

  function makeContext(headers: Record<string, string> = {}) {
    const request: any = { headers, user: undefined };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
      request,
    };
  }

  it("throws Error when JWT_SECRET is not configured", () => {
    mockConfig.get.mockReturnValue(undefined);
    const { request, ...ctx } = makeContext({ authorization: "Bearer tok" });

    expect(() => guard.canActivate(ctx as any)).toThrow(
      "JWT_SECRET is not configured",
    );
  });

  it("throws UnauthorizedException when authorization header is missing", () => {
    const { request, ...ctx } = makeContext({});

    expect(() => guard.canActivate(ctx as any)).toThrow(
      UnauthorizedException,
    );
  });

  it("throws UnauthorizedException when authorization header does not start with Bearer", () => {
    const { request, ...ctx } = makeContext({ authorization: "Basic abc" });

    expect(() => guard.canActivate(ctx as any)).toThrow(
      UnauthorizedException,
    );
  });

  it("throws UnauthorizedException when token is empty", () => {
    const { request, ...ctx } = makeContext({ authorization: "Bearer " });

    expect(() => guard.canActivate(ctx as any)).toThrow(
      UnauthorizedException,
    );
  });

  it("sets request.user and returns true with valid Bearer token", () => {
    const { request, ...ctx } = makeContext({
      authorization: "Bearer my-jwt-token",
    });

    const result = guard.canActivate(ctx as any);

    expect(result).toBe(true);
    expect(request.user).toEqual({ token: "my-jwt-token" });
  });
});
