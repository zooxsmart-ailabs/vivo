import tailwindcss from "@tailwindcss/vite";

const baseURL =
  process.env.NUXT_APP_BASE_URL ||
  (process.env.NODE_ENV === "production" ? "/vivo/" : "/");

export default defineNuxtConfig({
  compatibilityDate: "2025-01-01",
  ssr: false,
  devtools: { enabled: true },
  app: {
    baseURL,
    buildAssetsDir: "assets",
    head: {
      title: "Vivo GeoIntelligence",
      htmlAttrs: { lang: "pt-BR" },
      link: [
        { rel: "icon", type: "image/x-icon", href: `${baseURL}favicon.ico?v=3` },
        { rel: "shortcut icon", type: "image/x-icon", href: `${baseURL}favicon.ico?v=3` },
        { rel: "icon", type: "image/png", href: `${baseURL}favicon.png?v=3` },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Nunito+Sans:ital,opsz,wght@0,6..12,400;0,6..12,500;0,6..12,600;0,6..12,700;0,6..12,800&family=DM+Sans:wght@400;500;600;700&display=swap",
        },
      ],
    },
  },
  css: ["~/assets/css/index.css"],
  vite: {
    plugins: [tailwindcss()],
  },
  nitro: {
    preset: "github-pages",
    prerender: {
      crawlLinks: true,
      routes: ["/", "/growth", "/frentes", "/bairros", "/login"],
    },
  },
  runtimeConfig: {
    public: {
      googleMapsApiKey: process.env.NUXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
      forgeApiKey: process.env.VITE_FRONTEND_FORGE_API_KEY || "F8LqzcZRQzDZYMiNishE9a",
      forgeApiUrl: process.env.VITE_FRONTEND_FORGE_API_URL || "https://forge.manus.ai",
      authUser: "admin",
      authPass: "Zx@G#Vivo!2026",
    },
  },
});
