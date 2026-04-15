import {
  pgTable,
  varchar,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { geohashCell } from "./geohash-cell";

export const geohashIaSummary = pgTable(
  "geohash_ia_summary",
  {
    geohashId: varchar("geohash_id", { length: 12 })
      .notNull()
      .primaryKey()
      .references(() => geohashCell.geohashId),
    summaryText: text("summary_text").notNull(),
    model: varchar("model", { length: 50 }).notNull().default("gpt-4o-mini"),
    promptHash: varchar("prompt_hash", { length: 64 }),
    generatedAt: timestamp("generated_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_ia_summary_generated_at").on(table.generatedAt)],
);
