import {
  pgTable,
  varchar,
  smallint,
  doublePrecision,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const geohashCell = pgTable("geohash_cell", {
  geohashId: varchar("geohash_id", { length: 12 }).notNull().primaryKey(),
  precision: smallint("precision").notNull(),
  centerLat: doublePrecision("center_lat").notNull(),
  centerLng: doublePrecision("center_lng").notNull(),
  geom: text("geom"), // PostGIS GEOMETRY(POLYGON, 4326) — handled via raw SQL
  neighborhood: varchar("neighborhood", { length: 100 }),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 2 }).notNull(),
  createdAt: timestamp("created_at", {
    withTimezone: true,
    mode: "string",
  }).notNull(),
});
