const AUTH_COOKIE = "geo_auth";

// Credenciais fixas — altere conforme necessário
const VALID_USER = "vivo";
const VALID_PASS = "zoox@2025";

export function useAuth() {
  const cookie = useCookie(AUTH_COOKIE, {
    maxAge: 60 * 60 * 8, // 8 horas
    secure: process.env.NODE_ENV === "production",
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
