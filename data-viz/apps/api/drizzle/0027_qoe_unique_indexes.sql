-- =============================================================================
-- Migration 0027: unique indexes em (guid_result, ts_result) para
-- file_transfer / video / web_browsing.
--
-- Sem esses indexes, COPY → essas tabelas insere duplicatas silenciosamente,
-- impedindo re-runs idempotentes do loader Ookla. Aplicado depois que o
-- copy_loader passou a usar staging UNLOGGED + INSERT ... ON CONFLICT
-- DO NOTHING.
--
-- Indexes parciais (WHERE guid_result IS NOT NULL) porque guid_result e
-- nullable no parquet e linhas com NULL nao tem identidade unica suficiente
-- para deduplicar. Postgres aceita partial unique como conflict target em
-- INSERT ... ON CONFLICT DO NOTHING (sem listar a key explicitamente).
--
-- !!! ATENCAO !!!
-- Esta migration FALHA se houver duplicatas em (guid_result, ts_result) WHERE
-- guid_result IS NOT NULL nas tabelas. Antes de aplicar, rode o script de
-- limpeza em docs/db/scripts/dedup_qoe.sql conforme contagem da query de
-- diagnostico (ver README de data-core/ookla).
-- =============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS file_transfer_guid_ts_uniq
    ON file_transfer (guid_result, ts_result)
    WHERE guid_result IS NOT NULL;--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS video_guid_ts_uniq
    ON video (guid_result, ts_result)
    WHERE guid_result IS NOT NULL;--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS web_browsing_guid_ts_uniq
    ON web_browsing (guid_result, ts_result)
    WHERE guid_result IS NOT NULL;
