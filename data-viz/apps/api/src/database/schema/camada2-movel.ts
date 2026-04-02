import {
  pgTable,
  varchar,
  smallint,
  numeric,
  timestamp,
  primaryKey,
} from "drizzle-orm/pg-core";
import { geohashCell } from "./geohash-cell";
import { movelClass, scoreLabel, techRecommendation } from "./_enums";

export const camada2Movel = pgTable(
  "camada2_movel",
  {
    geohashId: varchar("geohash_id", { length: 12 })
      .notNull()
      .references(() => geohashCell.geohashId),
    period: varchar("period", { length: 7 }).notNull(), // YYYY-MM
    classification: movelClass("classification").notNull(),
    score: smallint("score").notNull(), // 0-100
    scoreLabel: scoreLabel("score_label").notNull(),
    techRecommendation: techRecommendation("tech_recommendation"),
    speedtestScore: numeric("speedtest_score", { precision: 5, scale: 2 }),
    concentracaoRenda: numeric("concentracao_renda", { precision: 5, scale: 2 }),
    vulnerabilidadeConcorrencia: numeric("vulnerabilidade_concorrencia", {
      precision: 5,
      scale: 2,
    }),
    capturedAt: timestamp("captured_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.geohashId, t.period] })],
);
