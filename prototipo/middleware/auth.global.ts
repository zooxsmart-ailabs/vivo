export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server) return;

  const cookie = useCookie("geo_auth");

  if (to.path === "/login") {
    if (cookie.value) return navigateTo("/");
    return;
  }

  if (!cookie.value) {
    return navigateTo("/login");
  }
});
