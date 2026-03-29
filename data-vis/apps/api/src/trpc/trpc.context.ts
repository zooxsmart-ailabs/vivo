import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type Redis from "ioredis";

export interface TrpcContext {
  db: NodePgDatabase;
  redis: Redis;
  user?: { id: string; roles: string[] };
}
