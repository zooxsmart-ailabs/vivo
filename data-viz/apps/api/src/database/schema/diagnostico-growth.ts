import {
  pgTable,
  varchar,
  smallint,
  integer,
  numeric,
  text,
  timestamp,
  primaryKey,
} from "drizzle-orm/pg-core";
import { geohashCell } from "./geohash-cell";
import {
  fibraClass,
  movelClass,
  recomendacaoType,
  decisaoTechType,
  prioridadeGrowth,
  sinalType,
} from "./_enums";

export const diagnosticoGrowth = pgTable(
  "diagnostico_growth",
  {
    geohashId: varchar("geohash_id", { length: 12 })
      .notNull()
      .references(() => geohashCell.geohashId),
    precision: smallint("precision").notNull().default(6),
    anomes: integer("anomes").notNull(),

    // Pilar 01 — Percepção
    scoreOokla: numeric("score_ookla", { precision: 4, scale: 1 }).notNull(),
    scoreOoklaMovel: numeric("score_ookla_movel", {
      precision: 4,
      scale: 1,
    }),
    scoreOoklaFibra: numeric("score_ookla_fibra", {
      precision: 4,
      scale: 1,
    }),
    scoreHac: numeric("score_hac", { precision: 4, scale: 1 }),
    taxaChamados: numeric("taxa_chamados", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),

    // Pilar 02 — Concorrência
    sharePenetracao: numeric("share_penetracao", {
      precision: 5,
      scale: 2,
    }).notNull(),
    deltaVsLider: numeric("delta_vs_lider", {
      precision: 4,
      scale: 1,
    }).notNull(),
    deltaVsLiderFibra: numeric("delta_vs_lider_fibra", {
      precision: 4,
      scale: 1,
    }),
    deltaVsLiderMovel: numeric("delta_vs_lider_movel", {
      precision: 4,
      scale: 1,
    }),

    // Pilar 03 — Infraestrutura
    fibraClassification: fibraClass("fibra_class").notNull().default("SAUDAVEL"),
    movelClassification: movelClass("movel_class").notNull().default("SAUDAVEL"),

    // Pilar 04 — Comportamento
    arpuRelativo: numeric("arpu_relativo", { precision: 4, scale: 2 })
      .notNull()
      .default("1.0"),
    canalDominante: varchar("canal_dominante", { length: 30 })
      .notNull()
      .default("Digital"),
    canalPct: numeric("canal_pct", { precision: 5, scale: 2 })
      .notNull()
      .default("50.0"),

    // Sinais calculados por pilar
    sinalPercepcao: sinalType("sinal_percepcao").notNull().default("OK"),
    sinalConcorrencia: sinalType("sinal_concorrencia").notNull().default("OK"),
    sinalInfraestrutura: sinalType("sinal_infraestrutura")
      .notNull()
      .default("OK"),
    sinalComportamento: sinalType("sinal_comportamento")
      .notNull()
      .default("OK"),

    // Recomendação IA
    recomendacao: recomendacaoType("recomendacao")
      .notNull()
      .default("ATACAR"),
    decisaoMovel: decisaoTechType("decisao_movel"),
    decisaoFibra: decisaoTechType("decisao_fibra"),
    prioMovel: prioridadeGrowth("prio_movel"),
    prioFibra: prioridadeGrowth("prio_fibra"),
    recomendacaoRazao: text("recomendacao_razao"),

    // Metadata
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.geohashId, t.precision, t.anomes] })],
);
