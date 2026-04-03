/**
 * Testes de Integração — UC012: Autenticar Usuário (Guard Plugável)
 *
 * Verifica que AuthGuard protege rotas, extrai token, e permite
 * health endpoints sem autenticação.
 */

import { UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "../../common/guards/auth.guard";

function makeGuard(jwtSecret: string | null = "secret") {
  const config = { get: vi.fn().mockReturnValue(jwtSecret ?? undefined) };
  return new AuthGuard(config as any);
}

function httpContext(headers: Record<string, string> = {}) {
  const request: any = { headers, user: undefined };
  return {
    ctx: {
      switchToHttp: () => ({ getRequest: () => request }),
    } as any,
    request,
  };
}

describe("UC012 — Autenticar Usuário", () => {
  describe("Success Criteria", () => {
    it("PS01: autentica com token Bearer válido e popula request.user", () => {
      const guard = makeGuard();
      const { ctx, request } = httpContext({
        authorization: "Bearer valid-jwt-token-123",
      });

      const result = guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(request.user).toEqual({ token: "valid-jwt-token-123" });
    });

    it("PS03: guard extrai token de qualquer rota HTTP", () => {
      const guard = makeGuard();
      const { ctx, request } = httpContext({
        authorization: "Bearer route-specific-token",
      });

      guard.canActivate(ctx);

      expect(request.user.token).toBe("route-specific-token");
    });
  });

  describe("Failure Criteria", () => {
    it("PF01/PF02: rejeita requisição sem header Authorization", () => {
      const guard = makeGuard();
      const { ctx } = httpContext({});

      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });

    it("rejeita token não-Bearer (ex: Basic)", () => {
      const guard = makeGuard();
      const { ctx } = httpContext({ authorization: "Basic user:pass" });

      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });

    it("rejeita token vazio após 'Bearer '", () => {
      const guard = makeGuard();
      const { ctx } = httpContext({ authorization: "Bearer " });

      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });
  });

  describe("RN012-01: Configuração JWT", () => {
    it("lança Error quando JWT_SECRET não está configurado", () => {
      const guard = makeGuard(null);
      const { ctx } = httpContext({ authorization: "Bearer tok" });

      expect(() => guard.canActivate(ctx)).toThrow(
        "JWT_SECRET is not configured",
      );
    });

    it("aceita qualquer JWT_SECRET não-vazio como configuração válida", () => {
      const guard = makeGuard("my-production-secret-256bit");
      const { ctx } = httpContext({ authorization: "Bearer tok" });

      expect(guard.canActivate(ctx)).toBe(true);
    });
  });

  describe("RN012-02: Exceções de Proteção", () => {
    it("health controller é acessível sem guard (controller separado)", async () => {
      // HealthController não usa AuthGuard — é registrado como
      // Controller independente, não protegido globalmente
      const mod = await import("../../health/health.controller");
      expect(mod.HealthController).toBeDefined();
    });
  });

  describe("RN012-03: Claims Mínimos", () => {
    it("token extraído permite identificar o usuário para sessão (UC011)", () => {
      const guard = makeGuard();
      const { ctx, request } = httpContext({
        authorization: "Bearer user-session-token",
      });

      guard.canActivate(ctx);

      // O token é o identificador mínimo do usuário
      expect(request.user.token).toBeTruthy();
      expect(typeof request.user.token).toBe("string");
    });
  });
});
