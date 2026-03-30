import {
  pgTable,
  varchar,
  text,
  integer,
  doublePrecision,
  timestamp,
} from "drizzle-orm/pg-core";

export const score = pgTable("score", {
  nuAnoMesRfrn: integer("nu_ano_mes_rfrn").notNull(),
  nmOprd: varchar("nm_oprd", { length: 50 }).notNull(),
  cdGeoHsh7: varchar("cd_geo_hsh7", { length: 7 }).notNull(),
  vlVdeoScre: doublePrecision("vl_vdeo_scre"),
  qtLtraVdeoScre: integer("qt_ltra_vdeo_scre"),
  vlWebScre: doublePrecision("vl_web_scre"),
  qtLtraWebScre: integer("qt_ltra_web_scre"),
  vlNotaSpedScre: doublePrecision("vl_nota_sped_scre"),
  qtLtraSpedScre: integer("qt_ltra_sped_scre"),
  vlCntvScre: doublePrecision("vl_cntv_scre"),

  // Metadata / Auditoria
  noArqvOrig: varchar("no_arqv_orig", { length: 255 }),
  dtInsrVic: timestamp("dt_insr_vic", {
    withTimezone: true,
    mode: "string",
  }),
  dtAtlzVic: timestamp("dt_atlz_vic", {
    withTimezone: true,
    mode: "string",
  }),
  nuCnro: integer("nu_cnro"),
  dsObs: text("ds_obs"),
});
