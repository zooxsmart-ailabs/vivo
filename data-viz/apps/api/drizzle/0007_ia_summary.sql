-- =============================================================================
-- Migration 0007: geohash_ia_summary
--
-- Persiste resumos executivos gerados por LLM (GPT-4o-mini) por geohash.
-- Separado de diagnostico_growth.recomendacao_razao (regras de negócio).
-- =============================================================================

CREATE TABLE IF NOT EXISTS geohash_ia_summary (
  geohash_id    VARCHAR(12)   NOT NULL REFERENCES geohash_cell(geohash_id),
  summary_text  TEXT          NOT NULL,
  model         VARCHAR(50)   NOT NULL DEFAULT 'gpt-4o-mini',
  prompt_hash   VARCHAR(64),
  generated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT geohash_ia_summary_pkey PRIMARY KEY (geohash_id)
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_ia_summary_generated_at
  ON geohash_ia_summary (generated_at DESC);
