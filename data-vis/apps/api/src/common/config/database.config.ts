import { registerAs } from "@nestjs/config";

export default registerAs("database", () => ({
  host: process.env.DATABASE_HOST || "localhost",
  port: parseInt(process.env.DATABASE_PORT || "5432", 10),
  user: process.env.DATABASE_USER || "vivo",
  password: process.env.DATABASE_PASSWORD || "changeme",
  database: process.env.DATABASE_NAME || "vivo_geointel",
  ssl: process.env.DATABASE_SSL === "true",
}));
