import {
  pgTable,
  varchar,
  serial,
  numeric,
  date,
  timestamp,
} from "drizzle-orm/pg-core";
import { benchmarkScope } from "./_enums";

export const benchmarkConfig = pgTable("benchmark_config", {
  id: serial("id").notNull().primaryKey(),
  key: varchar("key", { length: 50 }).notNull(),
  scope: benchmarkScope("scope").notNull(),
  region: varchar("region", { length: 100 }),
  value: numeric("value", { precision: 8, scale: 3 }).notNull(),
  periodDate: date("period_date"),
  createdAt: timestamp("created_at", {
    withTimezone: true,
    mode: "string",
  }).notNull(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true,
    mode: "string",
  }).notNull(),
});
