-- Migration 0032: drop continuous aggregates nao utilizados em file_transfer
--
-- Auditoria via timescaledb_information.continuous_aggregates +
-- pg_stat_user_tables mostrou:
--   - cagg_ft_monthly_gh6: 32 kB, 0 reads
--   - cagg_ft_monthly_gh7: 32 kB, 0 reads
--
-- Cada CAGG instala um trigger ts_cagg_invalidation_trigger no hypertable
-- base que dispara a cada INSERT/UPDATE/DELETE pra registrar invalidations
-- na continuous_agg_invalidation_log. Em ingest bulk (centenas de milhares
-- de rows por arquivo), esse trigger e' custo direto.
--
-- Como ambos CAGGs estao vazios e sem leituras, o drop:
--   - remove os triggers (acelera INSERT em file_transfer)
--   - elimina jobs de refresh policy (a cada 1h pra cada CAGG)
--   - libera o catalog do timescale
--
-- Recriacao posterior: SQL original nao esta versionado, mas a definicao
-- pode ser reconstruida a partir de file_transfer (date_trunc('month',...) +
-- attr_geohash6/7 + agregacoes) caso a aplicacao venha a precisar.

DROP MATERIALIZED VIEW IF EXISTS cagg_ft_monthly_gh6 CASCADE;--> statement-breakpoint
DROP MATERIALIZED VIEW IF EXISTS cagg_ft_monthly_gh7 CASCADE;
