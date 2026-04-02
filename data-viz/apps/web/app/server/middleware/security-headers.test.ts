/**
 * Testes — Server Middleware de Headers de Segurança
 *
 * Verifica que os 5 headers de segurança são setados corretamente.
 */

// vi.hoisted runs BEFORE imports (like vi.mock)
const capturedHeaders: Record<string, string> = {};
const { defineEventHandler, setHeaders } = vi.hoisted(() => {
  const captured: Record<string, string> = {};
  const defineEventHandler = (handler: Function) => handler;
  const setHeaders = (_event: any, headers: Record<string, string>) => {
    Object.assign(captured, headers);
  };
  (globalThis as any).defineEventHandler = defineEventHandler;
  (globalThis as any).setHeaders = setHeaders;
  return { defineEventHandler, setHeaders, captured };
});

import handler from "./security-headers";

describe("security-headers middleware", () => {
  beforeEach(() => {
    Object.keys(capturedHeaders).forEach((k) => delete capturedHeaders[k]);
  });

  function run() {
    const headers: Record<string, string> = {};
    const mockSetHeaders = (_e: any, h: Record<string, string>) => Object.assign(headers, h);
    // Replace setHeaders temporarily to capture per-test
    const orig = (globalThis as any).setHeaders;
    (globalThis as any).setHeaders = mockSetHeaders;
    (handler as Function)({});
    (globalThis as any).setHeaders = orig;
    return headers;
  }

  it("sets X-Content-Type-Options: nosniff", () => {
    const h = run();
    expect(h["X-Content-Type-Options"]).toBe("nosniff");
  });

  it("sets X-Frame-Options: DENY", () => {
    const h = run();
    expect(h["X-Frame-Options"]).toBe("DENY");
  });

  it("sets X-XSS-Protection: 0", () => {
    const h = run();
    expect(h["X-XSS-Protection"]).toBe("0");
  });

  it("sets Referrer-Policy: strict-origin-when-cross-origin", () => {
    const h = run();
    expect(h["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
  });

  it("sets Permissions-Policy restricting camera, microphone; allowing geolocation(self)", () => {
    const h = run();
    expect(h["Permissions-Policy"]).toBe(
      "camera=(), microphone=(), geolocation=(self)",
    );
  });

  it("sets all 5 headers in a single call", () => {
    const h = run();
    expect(Object.keys(h)).toHaveLength(5);
  });
});
