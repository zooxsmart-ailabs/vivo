import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{vue,ts}",
    "./plugins/**/*.ts",
    "./server/**/*.ts",
  ],
} satisfies Config;
