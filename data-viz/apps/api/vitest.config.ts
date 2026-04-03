import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.spec.ts"],
    exclude: ["src/__tests__/e2e/**"],
    alias: {
      "@vivo/shared": path.resolve(__dirname, "../packages/shared/src"),
    },
  },
});
