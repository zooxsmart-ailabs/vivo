import { registerAs } from "@nestjs/config";

export default registerAs("app", () => ({
  port: parseInt(process.env.PORT || "3001", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  corsOrigins: (process.env.CORS_ORIGINS || "http://localhost:3000").split(","),
  jwtSecret: process.env.JWT_SECRET || "changeme-in-production",
  jwtExpiration: process.env.JWT_EXPIRATION || "1h",
}));
