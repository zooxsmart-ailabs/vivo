const AUTH_COOKIE = "geo_auth";

export function useAuth() {
  const cookie = useCookie(AUTH_COOKIE, {
    maxAge: 60 * 60 * 8, // 8 horas
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });

  const config = useRuntimeConfig();

  function login(user: string, pass: string): boolean {
    const validUser = config.public.authUser as string;
    const validPass = config.public.authPass as string;

    if (!validUser || !validPass) return false;

    if (user.trim() === validUser && pass === validPass) {
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
