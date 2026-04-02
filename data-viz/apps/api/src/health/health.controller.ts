import { Controller, Get, Inject, Logger } from "@nestjs/common";
import { DRIZZLE, DrizzleDB } from "../database/drizzle.provider";
import { RedisService } from "../redis/redis.service";
import { sql } from "drizzle-orm";

@Controller("health")
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly redis: RedisService
  ) {}

  @Get()
  async check() {
    const services: Record<string, "up" | "down"> = {};

    try {
      await this.db.execute(sql`SELECT 1`);
      services.database = "up";
    } catch (err) {
      this.logger.warn("Database health check failed", (err as Error).message);
      services.database = "down";
    }

    try {
      await this.redis.client.ping();
      services.redis = "up";
    } catch (err) {
      this.logger.warn("Redis health check failed", (err as Error).message);
      services.redis = "down";
    }

    const allUp = Object.values(services).every((s) => s === "up");

    return {
      status: allUp ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      services,
    };
  }

  @Get("live")
  liveness() {
    return { status: "ok", uptime: process.uptime() };
  }
}
