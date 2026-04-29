-- =============================================================================
-- Migration 0025: Ookla ingestion state (catalog + run tracking)
--
-- Suporta a rotina de ingestao em duas fases (catalog/load) implementada em
-- data-core/ookla/. URLs assinadas da API Ookla expiram, por isso guardamos
-- apenas o caminho relativo estavel (remote_path) e re-resolvemos a URL
-- just-in-time no momento do download.
--
-- entity e text (nao enum) porque o catalogo cobre TODAS as entidades
-- expostas pela API Ookla (Performance, ConsumerQoE, Coverage, SignalScans,
-- dsar_reports, modern_chipsets, NPDSupplemental, ...). O loader Postgres
-- filtra para as entidades alvo via schema.ENTITIES; o uploader S3 envia
-- todos os arquivos.
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE ookla_file_status AS ENUM (
    'catalogued',
    'downloading',
    'downloaded',
    'uploading',
    'uploaded',
    'loading',
    'loaded',
    'failed',
    'skipped'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS ookla_catalog (
  entity         text              NOT NULL,
  data_date      date,
  remote_path    text              NOT NULL,
  file_name      text              NOT NULL,
  file_size      bigint,
  remote_mtime   timestamptz,
  s3_uri         text,
  status         ookla_file_status NOT NULL DEFAULT 'catalogued',
  attempts       smallint          NOT NULL DEFAULT 0,
  rows_loaded    bigint,
  error_message  text,
  catalogued_at  timestamptz       NOT NULL DEFAULT NOW(),
  uploaded_at    timestamptz,
  loaded_at      timestamptz,
  CONSTRAINT ookla_catalog_pkey PRIMARY KEY (entity, remote_path)
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_ookla_catalog_date_entity
  ON ookla_catalog (data_date, entity);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_ookla_catalog_pending
  ON ookla_catalog (status)
  WHERE status NOT IN ('loaded', 'skipped');--> statement-breakpoint

CREATE TABLE IF NOT EXISTS ookla_run (
  id           bigserial    PRIMARY KEY,
  phase        text         NOT NULL,
  started_at   timestamptz  NOT NULL DEFAULT NOW(),
  finished_at  timestamptz,
  status       text         NOT NULL DEFAULT 'running',
  stats_json   jsonb,
  CONSTRAINT ookla_run_phase_chk CHECK (phase IN ('catalog', 'load', 'sniff')),
  CONSTRAINT ookla_run_status_chk CHECK (status IN ('running', 'ok', 'failed'))
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_ookla_run_started
  ON ookla_run (started_at DESC);
