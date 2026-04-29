import { pgTable, doublePrecision, boolean } from "drizzle-orm/pg-core";

export const vivoCoverage = pgTable("vivo_coverage", {
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  flgFibra: boolean("flg_fibra").notNull().default(false),
  flg4g: boolean("flg_4g").notNull().default(false),
  flg5g: boolean("flg_5g").notNull().default(false),
  // geom, geohash7, geohash6 are GENERATED ALWAYS columns — skipped
});
