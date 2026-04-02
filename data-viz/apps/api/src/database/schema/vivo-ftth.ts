import {
  pgTable,
  varchar,
  integer,
  smallint,
  doublePrecision,
  primaryKey,
} from "drizzle-orm/pg-core";

export const vivoFtthCoverage = pgTable(
  "vivo_ftth_coverage",
  {
    codGeo: varchar("cod_geo", { length: 20 }).notNull(),
    anomes: integer("anomes").notNull(),
    produto: varchar("produto", { length: 20 }).notNull(),
    tpProduto: varchar("tp_produto", { length: 10 }).notNull(),
    uf: varchar("uf", { length: 2 }).notNull(),
    flgLoc: smallint("flg_loc").notNull(),
    x: doublePrecision("x").notNull(),
    y: doublePrecision("y").notNull(),
    // geom, geohash7, geohash6 are GENERATED ALWAYS columns — skipped
  },
  (table) => [primaryKey({ columns: [table.codGeo, table.anomes] })]
);
