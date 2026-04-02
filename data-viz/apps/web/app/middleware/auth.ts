/**
 * Route middleware for authentication.
 * Currently a placeholder — will redirect to login when auth is implemented.
 */
export default defineNuxtRouteMiddleware((_to, _from) => {
  // TODO: Check for valid JWT token in cookie/localStorage
  // If not authenticated, redirect to OAuth portal:
  //   return navigateTo('/login', { external: true });
});
