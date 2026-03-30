import { pgTable, varchar, jsonb, timestamp } from "drizzle-orm/pg-core";

export const userSession = pgTable("user_session", {
  userId: varchar("user_id", { length: 255 }).notNull().primaryKey(),
  state: jsonb("state").notNull(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true,
    mode: "string",
  }).notNull(),
});
