import type Redis from "ioredis";
import type { DrizzleDB } from "../database/drizzle.provider";

export interface TrpcContext {
  db: DrizzleDB;
  redis: Redis;
  user?: { id: string; roles: string[] };
}
