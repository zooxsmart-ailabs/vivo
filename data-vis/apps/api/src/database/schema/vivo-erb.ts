import {
  pgTable,
  varchar,
  integer,
  doublePrecision,
  primaryKey,
} from "drizzle-orm/pg-core";

export const vivoMobileErb = pgTable(
  "vivo_mobile_erb",
  {
    erbCasa: varchar("erb_casa", { length: 20 }).notNull(),
    anomes: integer("anomes").notNull(),
    qtdeLnhaPos: integer("qtde_lnha_pos").notNull(),
    qtdeLnhaCtrl: integer("qtde_lnha_ctrl").notNull(),
    qtdeLnhaPre: integer("qtde_lnha_pre").notNull(),
    x: doublePrecision("x").notNull(),
    y: doublePrecision("y").notNull(),
    // geom, geohash7, geohash6 are GENERATED ALWAYS columns — skipped
  },
  (table) => [primaryKey({ columns: [table.erbCasa, table.anomes] })]
);
