// useAuth.ts — GeoIntelligence Vivo × Zoox
// Credenciais fixas para acesso ao protótipo (não usa runtimeConfig para evitar
// problema de criptografia do Nuxt SSG que substitui os valores no bundle)
const AUTH_COOKIE = "geo_auth";
const VALID_USER = "admin";
const VALID_PASS = "Zx@G#Vivo!2026";

export function useAuth() {
  const cookie = useCookie(AUTH_COOKIE, {
    maxAge: 60 * 60 * 8, // 8 horas
    sameSite: "strict",
    path: "/",
  });

  function login(user: string, pass: string): boolean {
    if (user.trim() === VALID_USER && pass === VALID_PASS) {
      cookie.value = "ok";
      return true;
    }
    return false;
  }

  function logout() {
    cookie.value = null;
  }

  const isAuthenticated = computed(() => !!cookie.value);

  return { login, logout, isAuthenticated };
}
