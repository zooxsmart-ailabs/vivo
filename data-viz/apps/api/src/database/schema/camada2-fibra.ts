import {
  pgTable,
  varchar,
  smallint,
  numeric,
  timestamp,
  primaryKey,
} from "drizzle-orm/pg-core";
import { geohashCell } from "./geohash-cell";
import { fibraClass, scoreLabel } from "./_enums";

export const camada2Fibra = pgTable(
  "camada2_fibra",
  {
    geohashId: varchar("geohash_id", { length: 12 })
      .notNull()
      .references(() => geohashCell.geohashId),
    period: varchar("period", { length: 7 }).notNull(), // YYYY-MM
    classification: fibraClass("classification").notNull(),
    score: smallint("score").notNull(), // 0-100
    scoreLabel: scoreLabel("score_label").notNull(),
    taxaOcupacao: numeric("taxa_ocupacao", { precision: 5, scale: 2 }),
    portasDisponiveis: numeric("portas_disponiveis", { precision: 5, scale: 2 }),
    potencialMercado: numeric("potencial_mercado", { precision: 5, scale: 2 }),
    sinergiaMovel: numeric("sinergia_movel", { precision: 5, scale: 2 }),
    capturedAt: timestamp("captured_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.geohashId, t.period] })],
);
