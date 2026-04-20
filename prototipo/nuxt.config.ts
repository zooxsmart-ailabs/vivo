import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: "2025-01-01",
  ssr: false,
  devtools: { enabled: true },
  app: {
    baseURL: process.env.NUXT_APP_BASE_URL || "/vivo/",
    buildAssetsDir: "assets",
    head: {
      title: "GeoIntelligence — Vivo × Zoox",
      htmlAttrs: { lang: "pt-BR" },
      link: [
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
      forgeApiKey: process.env.VITE_FRONTEND_FORGE_API_KEY || "",
      forgeApiUrl: process.env.VITE_FRONTEND_FORGE_API_URL || "https://forge.butterfly-effect.dev",
      authUser: "admin",
      authPass: "Zx@G#Vivo!2026",
    },
  },
});
