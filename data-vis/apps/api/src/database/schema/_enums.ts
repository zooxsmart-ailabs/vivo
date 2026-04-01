import { pgEnum } from "drizzle-orm/pg-core";

export const quadrantType = pgEnum("quadrant_type", [
  "GROWTH",
  "UPSELL",
  "RETENCAO",
  "GROWTH_RETENCAO",
]);

export const techCategory = pgEnum("tech_category", [
  "FIBRA",
  "MOVEL",
  "AMBOS",
]);

export const operatorName = pgEnum("operator_name", [
  "VIVO",
  "TIM",
  "CLARO",
  "OI",
  "OUTROS",
]);

export const trendDirection = pgEnum("trend_direction", [
  "UP",
  "DOWN",
  "STABLE",
]);

export const fibraClass = pgEnum("fibra_class", [
  "AUMENTO_CAPACIDADE",
  "EXPANSAO_NOVA_AREA",
  "SAUDAVEL",
  "SEM_FIBRA",
]);

export const movelClass = pgEnum("movel_class", [
  "MELHORA_QUALIDADE_5G",
  "MELHORA_QUALIDADE_4G",
  "EXPANSAO_COBERTURA_5G",
  "EXPANSAO_COBERTURA_4G",
  "SAUDAVEL",
]);

export const priorityLabel = pgEnum("priority_label", [
  "P1_CRITICA",
  "P2_ALTA",
  "P3_MEDIA",
  "P4_BAIXA",
]);

export const qualityLabel = pgEnum("quality_label", [
  "EXCELENTE",
  "BOM",
  "REGULAR",
  "RUIM",
]);

export const benchmarkScope = pgEnum("benchmark_scope", [
  "NACIONAL",
  "ESTADO",
  "CIDADE",
]);

export const competitivePosition = pgEnum("competitive_position", [
  "LIDER",
  "COMPETITIVO",
  "EMPATADO",
  "ABAIXO",
  "CRITICO",
]);

export const shareLevel = pgEnum("share_level", [
  "MUITO_ALTA",
  "ALTA",
  "MEDIA",
  "BAIXA",
]);

export const scoreLabel = pgEnum("score_label", [
  "BAIXO",
  "MEDIO",
  "ALTO",
  "CRITICO",
]);

export const techRecommendation = pgEnum("tech_recommendation", [
  "5G_PREMIUM",
  "4G_MASS",
]);

export const recomendacaoType = pgEnum("recomendacao_type", [
  "ATIVAR",
  "AGUARDAR",
  "BLOQUEADO",
]);

export const sinalType = pgEnum("sinal_type", ["OK", "ALERTA", "CRITICO"]);
