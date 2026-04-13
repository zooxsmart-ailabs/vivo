import { z } from "zod";

/** Quadrant classification for geohash cells */
export type Quadrant = "GROWTH" | "UPSELL" | "RETENCAO" | "GROWTH_RETENCAO";

/** Technology categories */
export type TechCategory = "FIBRA" | "MOVEL" | "AMBOS";

/** Signal status for each diagnostic pillar */
export type SinalType = "OK" | "ALERTA" | "CRITICO";

/** AI recommendation from growth diagnosis (v5: ATIVAR → ATACAR) */
export type RecomendacaoType = "ATACAR" | "AGUARDAR" | "BLOQUEADO";

/** Per-tech decision (v5) */
export type DecisaoTechType = "ATACAR" | "AGUARDAR";

/** Per-tech priority based on Ookla score (v5) */
export type PrioridadeGrowth = "ALTA" | "MEDIA" | "BAIXA";

/** Score type discriminator (v4) */
export type ScoreType = "MOBILE" | "FIBRA" | "CONSOLIDADO";

/** Fiber infrastructure classification (v5: +MELHORA_QUALIDADE) */
export type FibraClassification =
  | "AUMENTO_CAPACIDADE"
  | "EXPANSAO_NOVA_AREA"
  | "SAUDAVEL"
  | "SEM_FIBRA"
  | "MELHORA_QUALIDADE";

/** Mobile infrastructure classification */
export type MovelClassification =
  | "MELHORA_QUALIDADE_5G"
  | "MELHORA_QUALIDADE_4G"
  | "EXPANSAO_COBERTURA_5G"
  | "EXPANSAO_COBERTURA_4G"
  | "SAUDAVEL";

/** Growth diagnosis for a geohash — 4 pillars + AI recommendation */
export interface DiagnosticoGrowth {
  // Pilar 01 — Percepção
  score_ookla: number;
  /** v5: Score QoE Vivo Móvel (vw_score_mobile.score_final / 10) */
  score_ookla_movel: number | null;
  /** v5: Score QoE Vivo Fibra (vw_score_fibra.score_final / 10) */
  score_ookla_fibra: number | null;
  /** v5: Score HAC de qualidade fibra */
  score_hac: number | null;
  taxa_chamados: number;

  // Pilar 02 — Concorrência
  share_penetracao: number;
  delta_vs_lider: number;
  /** v5: Score Vivo Fibra - Score líder Fibra */
  delta_vs_lider_fibra: number | null;
  /** v5: Score Vivo Móvel - Score líder Móvel */
  delta_vs_lider_movel: number | null;

  // Pilar 03 — Infraestrutura
  fibra_class: FibraClassification;
  movel_class: MovelClassification;

  // Pilar 04 — Comportamento
  arpu_relativo: number;
  canal_dominante: string;
  canal_pct: number;

  // Sinais calculados
  sinal_percepcao: SinalType;
  sinal_concorrencia: SinalType;
  sinal_infraestrutura: SinalType;
  sinal_comportamento: SinalType;

  // Recomendação IA (v5: decisões + prioridades per-tech)
  recomendacao: RecomendacaoType;
  decisao_movel: DecisaoTechType | null;
  decisao_fibra: DecisaoTechType | null;
  prio_movel: PrioridadeGrowth | null;
  prio_fibra: PrioridadeGrowth | null;
  recomendacao_razao: string | null;
}

/** Health check response */
export const healthResponseSchema = z.object({
  status: z.enum(["ok", "degraded", "down"]),
  timestamp: z.string().datetime(),
  services: z.record(z.enum(["up", "down"])).optional(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

/** WebSocket event types */
export type WsEventType =
  | "geohash:updated"
  | "metric:refreshed"
  | "connection:established";

/** Base message shape for WebSocket events */
export interface WsMessage<T = unknown> {
  event: WsEventType;
  data: T;
  timestamp: string;
}
