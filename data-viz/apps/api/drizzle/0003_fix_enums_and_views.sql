-- =============================================================================
-- Migration 0003: Fix enum values to match DDL v3 + add missing enums
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. quadrant_type: OPORTUNIDADE→GROWTH, FORTALEZA→UPSELL, etc.
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'OPORTUNIDADE' AND enumtypid = 'quadrant_type'::regtype) THEN
    ALTER TYPE "public"."quadrant_type" RENAME VALUE 'OPORTUNIDADE' TO 'GROWTH';
  END IF;
END $$;--> statement-breakpoint

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'FORTALEZA' AND enumtypid = 'quadrant_type'::regtype) THEN
    ALTER TYPE "public"."quadrant_type" RENAME VALUE 'FORTALEZA' TO 'UPSELL';
  END IF;
END $$;--> statement-breakpoint

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'EXPANSAO' AND enumtypid = 'quadrant_type'::regtype) THEN
    ALTER TYPE "public"."quadrant_type" RENAME VALUE 'EXPANSAO' TO 'RETENCAO';
  END IF;
END $$;--> statement-breakpoint

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'RISCO' AND enumtypid = 'quadrant_type'::regtype) THEN
    ALTER TYPE "public"."quadrant_type" RENAME VALUE 'RISCO' TO 'GROWTH_RETENCAO';
  END IF;
END $$;--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 2. competitive_position: EMPAREDADA→EMPATADO, ISOLADA→CRITICO
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'EMPAREDADA' AND enumtypid = 'competitive_position'::regtype) THEN
    ALTER TYPE "public"."competitive_position" RENAME VALUE 'EMPAREDADA' TO 'EMPATADO';
  END IF;
END $$;--> statement-breakpoint

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ISOLADA' AND enumtypid = 'competitive_position'::regtype) THEN
    ALTER TYPE "public"."competitive_position" RENAME VALUE 'ISOLADA' TO 'CRITICO';
  END IF;
END $$;--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 3. fibra_class: add missing SEM_FIBRA
-- ---------------------------------------------------------------------------
ALTER TYPE "public"."fibra_class" ADD VALUE IF NOT EXISTS 'SEM_FIBRA';--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 4. movel_class: rename + add 5G/4G split values
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'MELHORA_QUALIDADE' AND enumtypid = 'movel_class'::regtype) THEN
    ALTER TYPE "public"."movel_class" RENAME VALUE 'MELHORA_QUALIDADE' TO 'MELHORA_QUALIDADE_5G';
  END IF;
END $$;--> statement-breakpoint

ALTER TYPE "public"."movel_class" ADD VALUE IF NOT EXISTS 'MELHORA_QUALIDADE_4G';--> statement-breakpoint

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'EXPANSAO_COBERTURA' AND enumtypid = 'movel_class'::regtype) THEN
    ALTER TYPE "public"."movel_class" RENAME VALUE 'EXPANSAO_COBERTURA' TO 'EXPANSAO_COBERTURA_5G';
  END IF;
END $$;--> statement-breakpoint

ALTER TYPE "public"."movel_class" ADD VALUE IF NOT EXISTS 'EXPANSAO_COBERTURA_4G';--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 5. Create missing enums
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE "public"."score_label" AS ENUM('BAIXO', 'MEDIO', 'ALTO', 'CRITICO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "public"."tech_recommendation" AS ENUM('SG_PREMIUM', '4G_MASS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "public"."share_level" AS ENUM('MUITO_ALTA', 'ALTA', 'MEDIA', 'BAIXA');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
