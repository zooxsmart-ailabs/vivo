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
          href: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap",
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
      routes: ["/", "/frentes", "/bairros", "/login"],
    },
  },
  runtimeConfig: {
    public: {
      googleMapsApiKey: "",
      authUser: "", // NUXT_PUBLIC_AUTH_USER
      authPass: "", // NUXT_PUBLIC_AUTH_PASS
    },
  },
});
