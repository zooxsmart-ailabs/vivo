const AUTH_COOKIE = "geo_auth";

export function useAuth() {
  const cookie = useCookie(AUTH_COOKIE, {
    maxAge: 60 * 60 * 8, // 8 horas
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });

  const config = useRuntimeConfig();

  async function login(user: string, pass: string): Promise<boolean> {
    try {
      await $fetch(`${config.public.apiBase}/auth/login`, {
        method: "POST",
        body: { user, pass },
      });
      cookie.value = "ok";
      return true;
    } catch {
      return false;
    }
  }

  async function logout() {
    await $fetch(`${config.public.apiBase}/auth/logout`, {
      method: "POST",
    }).catch(() => {});
    cookie.value = null;
  }

  const isAuthenticated = computed(() => !!cookie.value);

  return { login, logout, isAuthenticated };
}
