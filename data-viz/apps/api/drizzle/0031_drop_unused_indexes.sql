-- Migration 0031: drop indexes secundarios nao utilizados nas hypertables Ookla
--
-- Auditoria via pg_stat_user_indexes (somando scans de TODOS os chunks por
-- indice logico) revelou que apenas os UNIQUE indexes (guid_ts_uniq / pkey)
-- recebem scans relevantes (12M+). Os secundarios variam de 0 a 2.4k scans —
-- todos considerados de uso baixo o suficiente pra justificar remocao em
-- favor de aceleracao do bulk INSERT (cada linha atualiza 1 indice por
-- secundario presente).
--
-- Indices preservados:
--   - *_guid_ts_uniq / _pkey  (necessarios pro ON CONFLICT do loader)
--   - npm_geom_gist_idx, npf_geom_gist_idx (PostGIS GiST: caro de recriar,
--     uso futuro provavel quando a frontend implementar consultas espaciais)
--
-- Recriacao posterior (caso necessario): pode ser feita via novas migrations
-- com CREATE INDEX CONCURRENTLY pra nao tomar lock pesado.
--
-- Espaco liberado estimado: ~12 GB. Aceleracao esperada do INSERT bulk:
-- 30-70% conforme tabela (file_transfer 7->1 indices, video 7->1, etc.).

-- file_transfer: 7 -> 1 (so' uniq)
DROP INDEX IF EXISTS file_transfer_ts_result_idx;--> statement-breakpoint
DROP INDEX IF EXISTS idx_ft_device;--> statement-breakpoint
DROP INDEX IF EXISTS idx_ft_geohash6;--> statement-breakpoint
DROP INDEX IF EXISTS idx_ft_geohash7;--> statement-breakpoint
DROP INDEX IF EXISTS idx_ft_operator_month;--> statement-breakpoint
DROP INDEX IF EXISTS idx_ft_platform;--> statement-breakpoint

-- video: 7 -> 1 (so' uniq)
DROP INDEX IF EXISTS video_ts_result_idx;--> statement-breakpoint
DROP INDEX IF EXISTS idx_video_device;--> statement-breakpoint
DROP INDEX IF EXISTS idx_video_geohash6;--> statement-breakpoint
DROP INDEX IF EXISTS idx_video_geohash7;--> statement-breakpoint
DROP INDEX IF EXISTS idx_video_operator_month;--> statement-breakpoint
DROP INDEX IF EXISTS idx_video_platform;--> statement-breakpoint

-- web_browsing: 7 -> 1 (so' uniq)
DROP INDEX IF EXISTS web_browsing_ts_result_idx;--> statement-breakpoint
DROP INDEX IF EXISTS idx_wb_device;--> statement-breakpoint
DROP INDEX IF EXISTS idx_wb_geohash6;--> statement-breakpoint
DROP INDEX IF EXISTS idx_wb_geohash7;--> statement-breakpoint
DROP INDEX IF EXISTS idx_wb_operator_month;--> statement-breakpoint
DROP INDEX IF EXISTS idx_wb_platform;--> statement-breakpoint

-- qoe_latency: 5 -> 1 (so' uniq)
DROP INDEX IF EXISTS qoe_latency_ts_result_idx;--> statement-breakpoint
DROP INDEX IF EXISTS idx_qoe_latency_geohash6;--> statement-breakpoint
DROP INDEX IF EXISTS idx_qoe_latency_geohash7;--> statement-breakpoint
DROP INDEX IF EXISTS idx_qoe_latency_operator_month;--> statement-breakpoint

-- networkPerformanceMobile: 9 -> 2 (pkey + geom_gist)
DROP INDEX IF EXISTS "networkPerformanceMobile_tsResult_idx";--> statement-breakpoint
DROP INDEX IF EXISTS npm_ts_idx;--> statement-breakpoint
DROP INDEX IF EXISTS npm_sim_operator_ts_idx;--> statement-breakpoint
DROP INDEX IF EXISTS npm_region_ts_idx;--> statement-breakpoint
DROP INDEX IF EXISTS npm_platform_ts_idx;--> statement-breakpoint
DROP INDEX IF EXISTS npm_mcc_mnc_ts_idx;--> statement-breakpoint
DROP INDEX IF EXISTS npm_conn_type_start_ts_idx;--> statement-breakpoint

-- networkPerformanceFixed: 8 -> 2 (pkey + geom_gist)
DROP INDEX IF EXISTS "networkPerformanceFixed_tsResult_idx";--> statement-breakpoint
DROP INDEX IF EXISTS npf_ts_idx;--> statement-breakpoint
DROP INDEX IF EXISTS npf_provider_ts_idx;--> statement-breakpoint
DROP INDEX IF EXISTS npf_region_ts_idx;--> statement-breakpoint
DROP INDEX IF EXISTS npf_platform_ts_idx;--> statement-breakpoint
DROP INDEX IF EXISTS npf_conn_type_ts_idx;
