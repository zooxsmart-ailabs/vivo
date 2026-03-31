import {
  pgTable,
  varchar,
  numeric,
  timestamp,
  primaryKey,
} from "drizzle-orm/pg-core";
import { geohashCell } from "./geohash-cell";

export const geohashCrm = pgTable(
  "geohash_crm",
  {
    geohashId: varchar("geohash_id", { length: 12 })
      .notNull()
      .references(() => geohashCell.geohashId),
    period: varchar("period", { length: 7 }).notNull(), // YYYY-MM
    avgArpu: numeric("avg_arpu", { precision: 10, scale: 2 }),
    dominantPlanType: varchar("dominant_plan_type", { length: 100 }),
    deviceTier: varchar("device_tier", { length: 20 }), // Premium | Mid | Basic
    avgIncome: numeric("avg_income", { precision: 12, scale: 2 }),
    populationDensity: numeric("population_density", { precision: 10, scale: 2 }),
    incomeLabel: varchar("income_label", { length: 50 }),
    capturedAt: timestamp("captured_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.geohashId, t.period] })],
);
