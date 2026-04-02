import { z } from "zod";

/** Quadrant classification for geohash cells */
export type Quadrant = "GROWTH" | "UPSELL" | "RETENCAO" | "GROWTH_RETENCAO";

/** Technology categories */
export type TechCategory = "FIBRA" | "MOVEL" | "AMBOS";

/** Signal status for each diagnostic pillar */
export type SinalType = "OK" | "ALERTA" | "CRITICO";

/** AI recommendation from growth diagnosis */
export type RecomendacaoType = "ATIVAR" | "AGUARDAR" | "BLOQUEADO";

/** Fiber infrastructure classification */
export type FibraClassification =
  | "AUMENTO_CAPACIDADE"
  | "EXPANSAO_NOVA_AREA"
  | "SAUDAVEL"
  | "SEM_FIBRA";

/** Mobile infrastructure classification */
export type MovelClassification =
  | "MELHORA_QUALIDADE_5G"
  | "MELHORA_QUALIDADE_4G"
  | "EXPANSAO_COBERTURA_5G"
  | "EXPANSAO_COBERTURA_4G"
  | "SAUDAVEL";

/** Growth diagnosis for a geohash — 4 pillars + AI recommendation */
export interface DiagnosticoGrowth {
  score_ookla: number;
  taxa_chamados: number;
  share_penetracao: number;
  delta_vs_lider: number;
  fibra_class: FibraClassification;
  movel_class: MovelClassification;
  arpu_relativo: number;
  canal_dominante: string;
  canal_pct: number;
  sinal_percepcao: SinalType;
  sinal_concorrencia: SinalType;
  sinal_infraestrutura: SinalType;
  sinal_comportamento: SinalType;
  recomendacao: RecomendacaoType;
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
