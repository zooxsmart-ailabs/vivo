import { pgEnum } from "drizzle-orm/pg-core";

export const quadrantType = pgEnum("quadrant_type", [
  "OPORTUNIDADE",
  "FORTALEZA",
  "EXPANSAO",
  "RISCO",
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
]);

export const movelClass = pgEnum("movel_class", [
  "MELHORA_QUALIDADE",
  "SAUDAVEL",
  "EXPANSAO_COBERTURA",
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
  "EMPAREDADA",
  "ABAIXO",
  "ISOLADA",
]);

export const shareLevel = pgEnum("share_level", [
  "MUITO_ALTA",
  "ALTA",
  "MEDIA",
  "BAIXA",
]);
