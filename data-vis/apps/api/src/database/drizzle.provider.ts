import { ConfigType } from "@nestjs/config";
import { Pool } from "pg";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import databaseConfig from "../common/config/database.config";
import * as schema from "./schema";

export const DRIZZLE = Symbol("DRIZZLE");

export type DrizzleDB = NodePgDatabase<typeof schema>;

export const drizzleProvider = {
  provide: DRIZZLE,
  inject: [databaseConfig.KEY],
  useFactory: (config: ConfigType<typeof databaseConfig>): DrizzleDB => {
    const pool = new Pool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
    });
    return drizzle(pool, { schema });
  },
};
