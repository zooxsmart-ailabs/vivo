import type Redis from "ioredis";
import type { DrizzleDB } from "../database/drizzle.provider";
import type { IaSummaryServiceContract } from "../ia-summary/ia-summary.types";

export interface TrpcContext {
  db: DrizzleDB;
  redis: Redis;
  user?: { id: string; roles: string[] };
  iaSummary: IaSummaryServiceContract;
}
