export default defineNuxtConfig({
  srcDir: "app",

  ssr: false,

  devtools: { enabled: true },

  modules: [["@nuxtjs/tailwindcss", { cssPath: "~/assets/css/main.css" }]],

  app: {
    head: {
      title: "Vivo GeoIntelligence",
      htmlAttrs: { lang: "pt-BR" },
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        {
          name: "description",
          content:
            "Plataforma de GeoInteligência para análise estratégica de QoE",
        },
      ],
      link: [
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;700&family=DM+Sans:wght@400;500;600;700&display=swap",
        },
      ],
    },
  },

  runtimeConfig: {
    public: {
      apiBase: "http://localhost:3008",
      wsUrl: "ws://localhost:3008",
      otelEndpoint: "",
      googleMapsKey: "",
    },
  },

  typescript: {
    strict: true,
  },

  compatibilityDate: "2025-01-01",
});
