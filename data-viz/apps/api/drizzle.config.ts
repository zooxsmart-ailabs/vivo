import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/database/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    host: process.env.DATABASE_HOST || "localhost",
    port: parseInt(process.env.DATABASE_PORT || "5432", 10),
    user: process.env.DATABASE_USER || "vivo",
    password: process.env.DATABASE_PASSWORD || "changeme",
    database: process.env.DATABASE_NAME || "vivo_geointel",
    ssl: false,
  },
});
