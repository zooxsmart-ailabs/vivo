-- =============================================================================
-- Migration 0004: v5 — Per-tech diagnostico + MELHORA_QUALIDADE + ATACAR
--
-- Fonte: docs/use-cases/UC004-business-rules.md + UC009-business-rules.md (v5)
-- Alinha com prototipo/pages/frentes.vue (implementação de referência).
--
-- Mudanças principais:
--  - Renomeia recomendacao_type.ATIVAR → ATACAR
--  - Adiciona MELHORA_QUALIDADE ao fibra_class
--  - Cria enums decisao_tech_type, prioridade_growth, score_type
--  - Adiciona colunas per-tech em diagnostico_growth e geohash_crm
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Ensure base enums exist (idempotent for fresh installs)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE "public"."recomendacao_type" AS ENUM('ATACAR', 'AGUARDAR', 'BLOQUEADO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "public"."sinal_type" AS ENUM('OK', 'ALERTA', 'CRITICO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 2. Rename ATIVAR → ATACAR (v5 — fonte: UC009 RN009-06)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'ATIVAR'
      AND enumtypid = 'recomendacao_type'::regtype
  ) THEN
    ALTER TYPE "public"."recomendacao_type" RENAME VALUE 'ATIVAR' TO 'ATACAR';
  END IF;
END $$;--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 3. fibra_class: adiciona MELHORA_QUALIDADE (v5 — fonte: UC004 RN004-04)
-- ---------------------------------------------------------------------------
ALTER TYPE "public"."fibra_class" ADD VALUE IF NOT EXISTS 'MELHORA_QUALIDADE';--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 4. Novos enums v5 (per-tech decisões e prioridades)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE "public"."decisao_tech_type" AS ENUM('ATACAR', 'AGUARDAR');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "public"."prioridade_growth" AS ENUM('ALTA', 'MEDIA', 'BAIXA');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "public"."score_type" AS ENUM('MOBILE', 'FIBRA', 'CONSOLIDADO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 5. diagnostico_growth: colunas per-tech (v5)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'diagnostico_growth') THEN
    -- Pilar 01 — Percepção per-tech
    ALTER TABLE "diagnostico_growth" ADD COLUMN IF NOT EXISTS "score_ookla_movel" NUMERIC(4,1);
    ALTER TABLE "diagnostico_growth" ADD COLUMN IF NOT EXISTS "score_ookla_fibra" NUMERIC(4,1);
    ALTER TABLE "diagnostico_growth" ADD COLUMN IF NOT EXISTS "score_hac" NUMERIC(4,1);

    -- Pilar 02 — Concorrência per-tech
    ALTER TABLE "diagnostico_growth" ADD COLUMN IF NOT EXISTS "delta_vs_lider_fibra" NUMERIC(4,1);
    ALTER TABLE "diagnostico_growth" ADD COLUMN IF NOT EXISTS "delta_vs_lider_movel" NUMERIC(4,1);

    -- Recomendação IA per-tech
    ALTER TABLE "diagnostico_growth" ADD COLUMN IF NOT EXISTS "decisao_movel" decisao_tech_type;
    ALTER TABLE "diagnostico_growth" ADD COLUMN IF NOT EXISTS "decisao_fibra" decisao_tech_type;
    ALTER TABLE "diagnostico_growth" ADD COLUMN IF NOT EXISTS "prio_movel" prioridade_growth;
    ALTER TABLE "diagnostico_growth" ADD COLUMN IF NOT EXISTS "prio_fibra" prioridade_growth;

    -- Novo default ATACAR na recomendacao
    ALTER TABLE "diagnostico_growth" ALTER COLUMN "recomendacao" SET DEFAULT 'ATACAR'::recomendacao_type;
  END IF;
END $$;--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 6. geohash_crm: colunas per-tech (v5)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'geohash_crm') THEN
    ALTER TABLE "geohash_crm" ADD COLUMN IF NOT EXISTS "arpu_movel" NUMERIC(10,2);
    ALTER TABLE "geohash_crm" ADD COLUMN IF NOT EXISTS "arpu_fibra" NUMERIC(10,2);
    ALTER TABLE "geohash_crm" ADD COLUMN IF NOT EXISTS "plan_type_movel" VARCHAR(100);
  END IF;
END $$;
