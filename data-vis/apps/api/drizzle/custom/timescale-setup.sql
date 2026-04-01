-- =============================================================================
-- TimescaleDB Setup — runs after Drizzle table migrations
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. ENUMS (created by Drizzle migration, but CREATE TYPE IF NOT EXISTS
--    is not standard SQL — use DO block for safety)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE quadrant_type AS ENUM ('GROWTH','UPSELL','RETENCAO','GROWTH_RETENCAO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE tech_category AS ENUM ('FIBRA','MOVEL','AMBOS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE operator_name AS ENUM ('VIVO','TIM','CLARO','OI','OUTROS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE trend_direction AS ENUM ('UP','DOWN','STABLE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE fibra_class AS ENUM ('AUMENTO_CAPACIDADE','EXPANSAO_NOVA_AREA','SAUDAVEL','SEM_FIBRA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE movel_class AS ENUM ('MELHORA_QUALIDADE_5G','MELHORA_QUALIDADE_4G','EXPANSAO_COBERTURA_5G','EXPANSAO_COBERTURA_4G','SAUDAVEL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE priority_label AS ENUM ('P1_CRITICA','P2_ALTA','P3_MEDIA','P4_BAIXA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE quality_label AS ENUM ('EXCELENTE','BOM','REGULAR','RUIM');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE benchmark_scope AS ENUM ('NACIONAL','ESTADO','CIDADE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE competitive_position AS ENUM ('LIDER','COMPETITIVO','EMPATADO','ABAIXO','CRITICO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE share_level AS ENUM ('MUITO_ALTA','ALTA','MEDIA','BAIXA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 2. HYPERTABLES (TimescaleDB)
-- ---------------------------------------------------------------------------
-- file_transfer
SELECT create_hypertable('file_transfer', by_range('ts_result'), if_not_exists => TRUE);

-- video
SELECT create_hypertable('video', by_range('ts_result'), if_not_exists => TRUE);

-- web_browsing
SELECT create_hypertable('web_browsing', by_range('ts_result'), if_not_exists => TRUE);

-- networkPerformanceFixed
SELECT create_hypertable('"networkPerformanceFixed"', by_range('tsResult'), if_not_exists => TRUE);

-- networkPerformanceMobile
SELECT create_hypertable('"networkPerformanceMobile"', by_range('tsResult'), if_not_exists => TRUE);

-- ---------------------------------------------------------------------------
-- 3. PostGIS GENERATED COLUMNS (ALTER TABLE — add after Drizzle creates base cols)
-- ---------------------------------------------------------------------------
-- geo_por_latlong
DO $$ BEGIN
  ALTER TABLE geo_por_latlong
    ADD COLUMN IF NOT EXISTS geom geometry(point, 4326)
      GENERATED ALWAYS AS (st_setsrid(st_makepoint(longitude, latitude), 4326)) STORED,
    ADD COLUMN IF NOT EXISTS geohash7 text
      GENERATED ALWAYS AS (st_geohash(st_setsrid(st_makepoint(longitude, latitude), 4326), 7)) STORED,
    ADD COLUMN IF NOT EXISTS geohash6 text
      GENERATED ALWAYS AS (st_geohash(st_setsrid(st_makepoint(longitude, latitude), 4326), 6)) STORED;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- vivo_ftth_coverage — generated columns
DO $$ BEGIN
  ALTER TABLE vivo_ftth_coverage
    ADD COLUMN IF NOT EXISTS geom geometry(point, 4326)
      GENERATED ALWAYS AS (st_setsrid(st_makepoint(x, y), 4326)) STORED,
    ADD COLUMN IF NOT EXISTS geohash7 text
      GENERATED ALWAYS AS (st_geohash(st_setsrid(st_makepoint(x, y), 4326), 7)) STORED,
    ADD COLUMN IF NOT EXISTS geohash6 text
      GENERATED ALWAYS AS (st_geohash(st_setsrid(st_makepoint(x, y), 4326), 6)) STORED;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- vivo_mobile_erb — generated columns
DO $$ BEGIN
  ALTER TABLE vivo_mobile_erb
    ADD COLUMN IF NOT EXISTS geom geometry(point, 4326)
      GENERATED ALWAYS AS (st_setsrid(st_makepoint(x, y), 4326)) STORED,
    ADD COLUMN IF NOT EXISTS geohash7 text
      GENERATED ALWAYS AS (st_geohash(st_setsrid(st_makepoint(x, y), 4326), 7)) STORED,
    ADD COLUMN IF NOT EXISTS geohash6 text
      GENERATED ALWAYS AS (st_geohash(st_setsrid(st_makepoint(x, y), 4326), 6)) STORED;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- networkPerformanceFixed — PostGIS geom column
DO $$ BEGIN
  ALTER TABLE "networkPerformanceFixed"
    ADD COLUMN IF NOT EXISTS geom geometry(point, 4326);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- networkPerformanceMobile — PostGIS geom column
DO $$ BEGIN
  ALTER TABLE "networkPerformanceMobile"
    ADD COLUMN IF NOT EXISTS geom geometry(point, 4326);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 4. ADDITIONAL INDEXES
-- ---------------------------------------------------------------------------
-- File Transfer
CREATE INDEX IF NOT EXISTS idx_ft_device ON file_transfer (id_device, ts_result DESC);
CREATE INDEX IF NOT EXISTS idx_ft_platform ON file_transfer (id_platform, ts_result DESC);
CREATE INDEX IF NOT EXISTS idx_ft_geohash7 ON file_transfer (attr_geohash7, ts_result DESC);
CREATE INDEX IF NOT EXISTS idx_ft_geohash6 ON file_transfer (attr_geohash6, ts_result DESC);
CREATE INDEX IF NOT EXISTS idx_ft_operator_month ON file_transfer (attr_sim_operator_common_name, DATE_TRUNC('month', ts_result AT TIME ZONE 'UTC'));

-- Video
CREATE INDEX IF NOT EXISTS idx_video_device ON video (id_device, ts_result DESC);
CREATE INDEX IF NOT EXISTS idx_video_platform ON video (id_platform, ts_result DESC);
CREATE INDEX IF NOT EXISTS idx_video_geohash7 ON video (attr_geohash7, ts_result DESC);
CREATE INDEX IF NOT EXISTS idx_video_geohash6 ON video (attr_geohash6, ts_result DESC);
CREATE INDEX IF NOT EXISTS idx_video_operator_month ON video (attr_sim_operator_common_name, DATE_TRUNC('month', ts_result AT TIME ZONE 'UTC'));

-- Web Browsing
CREATE INDEX IF NOT EXISTS idx_wb_device ON web_browsing (id_device, ts_result DESC);
CREATE INDEX IF NOT EXISTS idx_wb_platform ON web_browsing (id_platform, ts_result DESC);
CREATE INDEX IF NOT EXISTS idx_wb_geohash7 ON web_browsing (attr_geohash7, ts_result DESC);
CREATE INDEX IF NOT EXISTS idx_wb_geohash6 ON web_browsing (attr_geohash6, ts_result DESC);
CREATE INDEX IF NOT EXISTS idx_wb_operator_month ON web_browsing (attr_sim_operator_common_name, DATE_TRUNC('month', ts_result AT TIME ZONE 'UTC'));

-- Score
CREATE INDEX IF NOT EXISTS idx_cs_geohash ON score (cd_geo_hsh7);
CREATE INDEX IF NOT EXISTS idx_cs_operadora ON score (nm_oprd, nu_ano_mes_rfrn);
CREATE INDEX IF NOT EXISTS idx_cs_periodo ON score (nu_ano_mes_rfrn);

-- Geo
CREATE INDEX IF NOT EXISTS idx_geo_por_latlong_geohash7 ON geo_por_latlong (geohash7);
CREATE INDEX IF NOT EXISTS idx_geo_por_latlong_geom ON geo_por_latlong USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_geo_por_latlong_lat ON geo_por_latlong (latitude);
CREATE INDEX IF NOT EXISTS idx_geo_por_latlong_lon ON geo_por_latlong (longitude);

-- FTTH
CREATE INDEX IF NOT EXISTS idx_ftth_geohash7 ON vivo_ftth_coverage (geohash7, anomes);
CREATE INDEX IF NOT EXISTS idx_ftth_geohash6 ON vivo_ftth_coverage (geohash6, anomes);
CREATE INDEX IF NOT EXISTS idx_ftth_geom ON vivo_ftth_coverage USING GIST (geom);

-- ERB
CREATE INDEX IF NOT EXISTS idx_erb_geohash7 ON vivo_mobile_erb (geohash7, anomes);
CREATE INDEX IF NOT EXISTS idx_erb_geohash6 ON vivo_mobile_erb (geohash6, anomes);
CREATE INDEX IF NOT EXISTS idx_erb_geom ON vivo_mobile_erb USING GIST (geom);

-- networkPerformanceFixed
CREATE INDEX IF NOT EXISTS "networkPerformanceFixed_tsResult_idx" ON "networkPerformanceFixed" ("tsResult" DESC);
CREATE INDEX IF NOT EXISTS npf_conn_type_ts_idx ON "networkPerformanceFixed" ("idConnectionType", "tsResult" DESC);
CREATE INDEX IF NOT EXISTS npf_geom_gist_idx ON "networkPerformanceFixed" USING GIST (geom);
CREATE INDEX IF NOT EXISTS npf_platform_ts_idx ON "networkPerformanceFixed" ("idPlatform", "tsResult" DESC);
CREATE INDEX IF NOT EXISTS npf_provider_ts_idx ON "networkPerformanceFixed" ("attrProviderNameCommon", "tsResult" DESC);
CREATE INDEX IF NOT EXISTS npf_region_ts_idx ON "networkPerformanceFixed" ("attrPlaceRegion", "tsResult" DESC);
CREATE INDEX IF NOT EXISTS npf_ts_idx ON "networkPerformanceFixed" ("tsResult" DESC);

-- networkPerformanceMobile
CREATE INDEX IF NOT EXISTS "networkPerformanceMobile_tsResult_idx" ON "networkPerformanceMobile" ("tsResult" DESC);
CREATE INDEX IF NOT EXISTS npm_conn_type_start_ts_idx ON "networkPerformanceMobile" ("idConnectionTypeStart", "tsResult" DESC);
CREATE INDEX IF NOT EXISTS npm_geom_gist_idx ON "networkPerformanceMobile" USING GIST (geom);
CREATE INDEX IF NOT EXISTS npm_mcc_mnc_ts_idx ON "networkPerformanceMobile" ("attrNetworkOperatorMcc", "attrNetworkOperatorMnc", "tsResult" DESC);
CREATE INDEX IF NOT EXISTS npm_platform_ts_idx ON "networkPerformanceMobile" ("idPlatform", "tsResult" DESC);
CREATE INDEX IF NOT EXISTS npm_region_ts_idx ON "networkPerformanceMobile" ("attrPlaceRegion", "tsResult" DESC);
CREATE INDEX IF NOT EXISTS npm_sim_operator_ts_idx ON "networkPerformanceMobile" ("attrSimOperatorCommonName", "tsResult" DESC);
CREATE INDEX IF NOT EXISTS npm_ts_idx ON "networkPerformanceMobile" ("tsResult" DESC);

-- ---------------------------------------------------------------------------
-- 5. CONTINUOUS AGGREGATES (monthly QoE by geohash)
-- ---------------------------------------------------------------------------
-- File Transfer — geohash7
CREATE MATERIALIZED VIEW IF NOT EXISTS cagg_ft_monthly_gh7
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 month', ts_result) AS period_month,
  attr_geohash7 AS geohash_id,
  7::SMALLINT AS precision,
  UPPER(TRIM(attr_sim_operator_common_name)) AS operator,
  AVG(val_dl_throughput) AS avg_dl_throughput,
  AVG(val_ul_throughput) AS avg_ul_throughput,
  AVG(val_latency_avg) AS avg_latency,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY val_dl_throughput) AS p50_dl_throughput,
  COUNT(*) AS test_count
FROM file_transfer
WHERE attr_geohash7 IS NOT NULL AND val_dl_throughput IS NOT NULL
GROUP BY period_month, geohash_id, operator
WITH NO DATA;

SELECT add_continuous_aggregate_policy('cagg_ft_monthly_gh7',
  start_offset => INTERVAL '3 months', end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour', if_not_exists => TRUE);

-- File Transfer — geohash6
CREATE MATERIALIZED VIEW IF NOT EXISTS cagg_ft_monthly_gh6
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 month', ts_result) AS period_month,
  attr_geohash6 AS geohash_id,
  6::SMALLINT AS precision,
  UPPER(TRIM(attr_sim_operator_common_name)) AS operator,
  AVG(val_dl_throughput) AS avg_dl_throughput,
  AVG(val_ul_throughput) AS avg_ul_throughput,
  AVG(val_latency_avg) AS avg_latency,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY val_dl_throughput) AS p50_dl_throughput,
  COUNT(*) AS test_count
FROM file_transfer
WHERE attr_geohash6 IS NOT NULL AND val_dl_throughput IS NOT NULL
GROUP BY period_month, geohash_id, operator
WITH NO DATA;

SELECT add_continuous_aggregate_policy('cagg_ft_monthly_gh6',
  start_offset => INTERVAL '3 months', end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour', if_not_exists => TRUE);

-- ---------------------------------------------------------------------------
-- 6. UNIFIED VIEW (networkPerformanceFixed + networkPerformanceMobile)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW "networkPerformanceUnified" AS
SELECT 'mobile'::text AS "networkType",
    m."idResult",
    m."guidResult",
    m."idPlatform",
    m."tsResult",
    m."tsResultReceived",
    m."attrLocationTimezone",
    m."idDevice"::bigint AS "idDevice",
    m."attrDeviceModel",
    m."attrDeviceManufacturer",
    m."attrDeviceManufacturerRaw",
    m."attrDeviceBrandRaw",
    m."attrDeviceChipset",
    m."attrDeviceChipsetManufacturer",
    m."attrDeviceOsVersion",
    m."attrDeviceRadio",
    m."attrDeviceRamMb",
    m."attrDeviceStorageMb",
    m."attrDeviceSoftwareVersion",
    m."attrSimOperatorCommonName",
    m."attrSimOperatorNameRaw",
    m."attrSimOperatorMcc",
    m."attrSimOperatorMnc",
    m."attrNetworkOperatorMcc",
    m."attrNetworkOperatorMnc",
    m."attrIspCommonName" AS "providerName",
    m."attrTestMethod",
    m."attrTestIpVersion",
    m."idConnectionNetSpeed",
    m."attrLocationLatitude",
    m."attrLocationLongitude",
    m."attrLocationAccuracyM",
    m."attrLocationAgeMs",
    m.geom,
    m."attrPlaceName",
    m."attrPlaceLocalityType",
    m."attrPlaceCountry",
    m."attrPlaceCountryCode",
    m."attrPlaceRegion",
    m."attrPlaceSubregion",
    m."attrPlaceSubsubregion",
    m."attrPlacePostalCode",
    m."valDownloadKbps"::numeric / 1000.0 AS "valDownloadMbps",
    m."valUploadKbps"::numeric / 1000.0 AS "valUploadMbps",
    m."numTestDownloadThreads",
    m."numTestUploadThreads",
    m."valLatencyMinMs",
    m."valLatencyIqmMs",
    m."valLatencyMaxMs",
    m."valMultiserverLatencyMs",
    m."valDownloadLatencyMinMs",
    m."valDownloadLatencyIqmMs",
    m."valDownloadLatencyMaxMs",
    m."valUploadLatencyMinMs",
    m."valUploadLatencyIqmMs",
    m."valUploadLatencyMaxMs",
    m."valJitterMs",
    m."valMultiserverJitterMs",
    m."numPacketLossSent",
    m."numPacketLossReceived",
    m."metricPacketLossPercent",
    m."numTracerouteHops",
    m."attrTraceroute0IpAddress",
    m."valTraceroute0LatencyMs",
    m."attrTraceroute0PingMtu",
    m."attrTraceroute1IpAddress",
    m."valTraceroute1LatencyMs",
    m."attrTraceroute1PingMtu",
    m."attrNetworkIpv4Address",
    m."attrNetworkIpv6Address",
    m."attrNetworkAsn",
    m."isNetworkVpn",
    m."attrAppVersion",
    m."attrServerName",
    m."attrServerSponsorName",
    m."attrServerLatitude",
    m."attrServerLongitude",
    m."attrServerCountryCode",
    m."isServerAutoSelected",
    m."isServerOnNetwork",
    m."attrServerAsn",
    m."numServerDownload",
    m."attrSignalCellType",
    m."attrCellFrequencyChannel",
    m."attrCellFrequencyChannelType",
    m."attrCellLac",
    m."attrCellNrPci",
    m."isPortalIncluded",
    m."attrPortalCategories"
FROM "networkPerformanceMobile" m
UNION ALL
SELECT 'fixed'::text AS "networkType",
    f."idResult",
    f."guidResult",
    f."idPlatform",
    f."tsResult",
    f."tsResultReceived",
    f."attrLocationTimezone",
    f."idDevice",
    f."attrDeviceModel",
    f."attrDeviceManufacturer",
    f."attrDeviceManufacturerRaw",
    f."attrDeviceBrandRaw",
    f."attrDeviceChipset",
    f."attrDeviceChipsetManufacturer",
    f."attrDeviceOsVersion",
    f."attrDeviceRadio",
    f."attrDeviceRamMb",
    f."attrDeviceStorageMb",
    f."attrDeviceSoftwareVersion",
    f."attrSimOperatorCommonName",
    f."attrSimOperatorNameRaw",
    f."attrSimOperatorMcc",
    f."attrSimOperatorMnc",
    f."attrNetworkOperatorMcc",
    f."attrNetworkOperatorMnc",
    f."attrProviderNameCommon" AS "providerName",
    f."attrTestMethod",
    f."attrTestIpVersion",
    f."idConnectionNetSpeed",
    f."attrLocationLatitude",
    f."attrLocationLongitude",
    f."attrLocationAccuracyM",
    f."attrLocationAgeMs",
    f.geom,
    f."attrPlaceName",
    f."attrPlaceLocalityType",
    f."attrPlaceCountry",
    f."attrPlaceCountryCode",
    f."attrPlaceRegion",
    f."attrPlaceSubregion",
    f."attrPlaceSubsubregion",
    f."attrPlacePostalCode",
    f."valDownloadMbps",
    f."valUploadMbps",
    f."numTestDownloadThreads",
    f."numTestUploadThreads",
    f."valLatencyMinMs",
    f."valLatencyIqmMs",
    f."valLatencyMaxMs",
    f."valMultiserverLatencyMs",
    f."valDownloadLatencyMinMs",
    f."valDownloadLatencyIqmMs",
    f."valDownloadLatencyMaxMs",
    f."valUploadLatencyMinMs",
    f."valUploadLatencyIqmMs",
    f."valUploadLatencyMaxMs",
    f."valJitterMs"::double precision AS "valJitterMs",
    f."valMultiserverJitterMs",
    f."numPacketLossSent",
    f."numPacketLossReceived",
    f."metricPacketLossPercent",
    f."numTracerouteHops",
    f."attrTraceroute0IpAddress",
    f."valTraceroute0LatencyMs",
    f."attrTraceroute0PingMtu",
    f."attrTraceroute1IpAddress",
    f."valTraceroute1LatencyMs",
    f."attrTraceroute1PingMtu",
    f."attrNetworkIpv4Address",
    f."attrNetworkIpv6Address",
    f."attrNetworkAsn",
    f."isNetworkVpn",
    f."attrAppVersion",
    f."attrServerName",
    f."attrServerSponsorName",
    f."attrServerLatitude",
    f."attrServerLongitude",
    f."attrServerCountryCode",
    f."isServerAutoSelected",
    f."isServerOnNetwork",
    f."attrServerAsn",
    f."numServerDownload",
    f."attrSignalCellType",
    f."attrCellFrequencyChannel",
    f."attrCellFrequencyChannelType",
    f."attrCellLac",
    f."attrCellNrPci",
    f."isPortalIncluded",
    f."attrPortalCategories"
FROM "networkPerformanceFixed" f;

-- ---------------------------------------------------------------------------
-- 7. MISSING ENUM TYPES (created here for fresh installs)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE score_label AS ENUM ('BAIXO','MEDIO','ALTO','CRITICO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE tech_recommendation AS ENUM ('SG_PREMIUM','4G_MASS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE share_level AS ENUM ('MUITO_ALTA','ALTA','MEDIA','BAIXA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 8. FUNCTIONS
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_available_periods()
RETURNS TABLE (period_month DATE, test_count BIGINT) AS $$
    SELECT time_bucket('1 month', ts_result)::DATE, COUNT(*)
    FROM file_transfer GROUP BY 1 ORDER BY 1 DESC;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION fn_normalize_operator(raw_name TEXT)
RETURNS operator_name AS $$
    SELECT CASE
        WHEN UPPER(TRIM(raw_name)) LIKE '%VIVO%'  THEN 'VIVO'::operator_name
        WHEN UPPER(TRIM(raw_name)) LIKE '%TIM%'   THEN 'TIM'::operator_name
        WHEN UPPER(TRIM(raw_name)) LIKE '%CLARO%' THEN 'CLARO'::operator_name
        WHEN UPPER(TRIM(raw_name)) LIKE '%OI%'    THEN 'OI'::operator_name
        ELSE 'OUTROS'::operator_name
    END;
$$ LANGUAGE SQL IMMUTABLE;

-- ---------------------------------------------------------------------------
-- 9. VIEW: vw_qoe_monthly (unifica file_transfer gh6+gh7)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_qoe_monthly AS
SELECT * FROM cagg_ft_monthly_gh7
UNION ALL
SELECT * FROM cagg_ft_monthly_gh6;

-- ---------------------------------------------------------------------------
-- 10. VIEW: vw_share_real (share de mercado FTTH + ERB)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_share_real AS
WITH
share_fibra_gh7 AS (
    SELECT
        f.geohash7 AS geohash_id, 7::SMALLINT AS precision, f.anomes,
        COUNT(*) AS ftth_count,
        COALESCE(d.total_domicilios, 1) AS total_domicilios,
        LEAST(COUNT(*) * 100.0 / NULLIF(COALESCE(d.total_domicilios, 1), 0), 100) AS share_fibra_pct
    FROM vivo_ftth_coverage f
    LEFT JOIN (
        SELECT geohash7, SUM(total_de_domicilios_media) AS total_domicilios
        FROM geo_por_latlong WHERE geohash7 IS NOT NULL GROUP BY geohash7
    ) d ON f.geohash7 = d.geohash7
    GROUP BY f.geohash7, f.anomes, d.total_domicilios
),
share_fibra_gh6 AS (
    SELECT
        f.geohash6 AS geohash_id, 6::SMALLINT AS precision, f.anomes,
        COUNT(*) AS ftth_count,
        COALESCE(d.total_domicilios, 1) AS total_domicilios,
        LEAST(COUNT(*) * 100.0 / NULLIF(COALESCE(d.total_domicilios, 1), 0), 100) AS share_fibra_pct
    FROM vivo_ftth_coverage f
    LEFT JOIN (
        SELECT LEFT(geohash7, 6) AS gh6, SUM(total_de_domicilios_media) AS total_domicilios
        FROM geo_por_latlong WHERE geohash7 IS NOT NULL GROUP BY LEFT(geohash7, 6)
    ) d ON f.geohash6 = d.gh6
    GROUP BY f.geohash6, f.anomes, d.total_domicilios
),
share_movel_gh7 AS (
    SELECT
        e.geohash7 AS geohash_id, 7::SMALLINT AS precision, e.anomes,
        SUM(e.qtde_lnha_pos + e.qtde_lnha_ctrl + e.qtde_lnha_pre) AS total_linhas,
        COALESCE(d.total_pop, 1) AS total_populacao,
        LEAST(SUM(e.qtde_lnha_pos + e.qtde_lnha_ctrl + e.qtde_lnha_pre) * 100.0
              / NULLIF(COALESCE(d.total_pop, 1), 0), 100) AS share_movel_pct
    FROM vivo_mobile_erb e
    LEFT JOIN (
        SELECT geohash7, SUM(populacao_total_media) AS total_pop
        FROM geo_por_latlong WHERE geohash7 IS NOT NULL GROUP BY geohash7
    ) d ON e.geohash7 = d.geohash7
    GROUP BY e.geohash7, e.anomes, d.total_pop
),
share_movel_gh6 AS (
    SELECT
        e.geohash6 AS geohash_id, 6::SMALLINT AS precision, e.anomes,
        SUM(e.qtde_lnha_pos + e.qtde_lnha_ctrl + e.qtde_lnha_pre) AS total_linhas,
        COALESCE(d.total_pop, 1) AS total_populacao,
        LEAST(SUM(e.qtde_lnha_pos + e.qtde_lnha_ctrl + e.qtde_lnha_pre) * 100.0
              / NULLIF(COALESCE(d.total_pop, 1), 0), 100) AS share_movel_pct
    FROM vivo_mobile_erb e
    LEFT JOIN (
        SELECT LEFT(geohash7, 6) AS gh6, SUM(populacao_total_media) AS total_pop
        FROM geo_por_latlong WHERE geohash7 IS NOT NULL GROUP BY LEFT(geohash7, 6)
    ) d ON e.geohash6 = d.gh6
    GROUP BY e.geohash6, e.anomes, d.total_pop
)
SELECT
    COALESCE(f.geohash_id, m.geohash_id) AS geohash_id,
    COALESCE(f.precision, m.precision) AS precision,
    COALESCE(f.anomes, m.anomes) AS anomes,
    f.ftth_count AS total_ftth_vivo,
    f.share_fibra_pct,
    m.total_linhas AS total_linhas_vivo,
    m.share_movel_pct,
    CASE
        WHEN f.geohash_id IS NOT NULL AND m.geohash_id IS NOT NULL THEN 'AMBOS'::tech_category
        WHEN f.geohash_id IS NOT NULL THEN 'FIBRA'::tech_category
        ELSE 'MOVEL'::tech_category
    END AS technology,
    GREATEST(COALESCE(f.share_fibra_pct, 0), COALESCE(m.share_movel_pct, 0)) AS share_pct,
    CASE
        WHEN GREATEST(COALESCE(f.share_fibra_pct, 0), COALESCE(m.share_movel_pct, 0)) > 50 THEN 'MUITO_ALTA'::share_level
        WHEN GREATEST(COALESCE(f.share_fibra_pct, 0), COALESCE(m.share_movel_pct, 0)) >= 40 THEN 'ALTA'::share_level
        WHEN GREATEST(COALESCE(f.share_fibra_pct, 0), COALESCE(m.share_movel_pct, 0)) >= 30 THEN 'MEDIA'::share_level
        ELSE 'BAIXA'::share_level
    END AS share_level
FROM (SELECT * FROM share_fibra_gh7 UNION ALL SELECT * FROM share_fibra_gh6) f
FULL OUTER JOIN (SELECT * FROM share_movel_gh7 UNION ALL SELECT * FROM share_movel_gh6) m
    ON f.geohash_id = m.geohash_id AND f.precision = m.precision AND f.anomes = m.anomes;

-- ---------------------------------------------------------------------------
-- 11. VIEW: vw_geohash_summary (v3 — with API-compatible aliases)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_geohash_summary AS
WITH
scores_all AS (
    SELECT
        cd_geo_hsh7 AS geohash_id, 7::SMALLINT AS precision,
        TO_DATE(nu_ano_mes_rfrn::TEXT, 'YYYYMM') AS period_month,
        UPPER(TRIM(nm_oprd)) AS operator,
        vl_cntv_scre / 10.0 AS composite_score,
        (COALESCE(qt_ltra_vdeo_scre,0) + COALESCE(qt_ltra_web_scre,0) + COALESCE(qt_ltra_sped_scre,0)) AS sample_size
    FROM score WHERE vl_cntv_scre IS NOT NULL
    UNION ALL
    SELECT
        LEFT(cd_geo_hsh7, 6), 6::SMALLINT,
        TO_DATE(nu_ano_mes_rfrn::TEXT, 'YYYYMM'),
        UPPER(TRIM(nm_oprd)),
        AVG(vl_cntv_scre / 10.0),
        SUM(COALESCE(qt_ltra_vdeo_scre,0) + COALESCE(qt_ltra_web_scre,0) + COALESCE(qt_ltra_sped_scre,0))
    FROM score WHERE vl_cntv_scre IS NOT NULL
    GROUP BY LEFT(cd_geo_hsh7, 6), TO_DATE(nu_ano_mes_rfrn::TEXT, 'YYYYMM'), UPPER(TRIM(nm_oprd))
),
score_pivot AS (
    SELECT geohash_id, precision, period_month,
        MAX(CASE WHEN operator LIKE '%VIVO%' THEN composite_score END) AS vivo_score,
        MAX(CASE WHEN operator LIKE '%TIM%'  THEN composite_score END) AS tim_score,
        MAX(CASE WHEN operator LIKE '%CLARO%' THEN composite_score END) AS claro_score,
        MAX(CASE WHEN operator LIKE '%VIVO%' THEN sample_size END) AS vivo_sample_size
    FROM scores_all GROUP BY geohash_id, precision, period_month
),
qoe_vivo AS (
    SELECT geohash_id, precision, period_month,
        avg_dl_throughput, avg_latency, p50_dl_throughput, test_count
    FROM vw_qoe_monthly WHERE operator LIKE '%VIVO%'
),
share AS (
    SELECT geohash_id, precision, anomes,
        share_pct, share_fibra_pct, share_movel_pct,
        share_level, technology, total_ftth_vivo, total_linhas_vivo
    FROM vw_share_real
),
demo AS (
    SELECT geohash7 AS geohash_id, 7::SMALLINT AS precision,
        AVG(renda_per_capita_media) AS avg_income,
        SUM(populacao_total_media) AS total_population,
        SUM(total_de_domicilios_media) AS total_domicilios
    FROM geo_por_latlong WHERE geohash7 IS NOT NULL GROUP BY geohash7
    UNION ALL
    SELECT LEFT(geohash7, 6), 6::SMALLINT,
        AVG(renda_per_capita_media), SUM(populacao_total_media), SUM(total_de_domicilios_media)
    FROM geo_por_latlong WHERE geohash7 IS NOT NULL GROUP BY LEFT(geohash7, 6)
),
base AS (
    SELECT
        gc.geohash_id, gc.precision,
        gc.center_lat, gc.center_lng,
        gc.neighborhood, gc.city, gc.state,
        sp.period_month,
        COALESCE(sp.vivo_score, 0)       AS vivo_score,
        COALESCE(sp.tim_score, 0)        AS tim_score,
        COALESCE(sp.claro_score, 0)      AS claro_score,
        COALESCE(sp.vivo_sample_size, 0) AS vivo_sample_size,
        COALESCE(sh.share_pct, 0)        AS share_pct,
        COALESCE(sh.share_fibra_pct, 0)  AS share_fibra_pct,
        COALESCE(sh.share_movel_pct, 0)  AS share_movel_pct,
        sh.share_level,
        COALESCE(sh.total_ftth_vivo, 0)  AS total_ftth_vivo,
        COALESCE(sh.total_linhas_vivo, 0) AS total_linhas_vivo,
        COALESCE(d.total_population, 0)::INTEGER AS total_population,
        COALESCE(d.total_domicilios, 0)::INTEGER  AS total_domicilios,
        COALESCE(sh.technology, 'MOVEL'::tech_category) AS technology,
        -- Quadrant (RN001-01 v3)
        CASE
            WHEN COALESCE(sh.share_pct,0) >= 35 AND COALESCE(sp.vivo_score,0) >= 7.01 THEN 'UPSELL'::quadrant_type
            WHEN COALESCE(sh.share_pct,0) <  35 AND COALESCE(sp.vivo_score,0) >= 7.01 THEN 'GROWTH'::quadrant_type
            WHEN COALESCE(sh.share_pct,0) >= 35 AND COALESCE(sp.vivo_score,0) <  5.0  THEN 'RETENCAO'::quadrant_type
            ELSE 'GROWTH_RETENCAO'::quadrant_type
        END AS quadrant,
        -- Competitive position (RN004-07 v3)
        CASE
            WHEN COALESCE(sp.vivo_score,0) - GREATEST(COALESCE(sp.tim_score,0), COALESCE(sp.claro_score,0)) >   0.5  THEN 'LIDER'::competitive_position
            WHEN COALESCE(sp.vivo_score,0) - GREATEST(COALESCE(sp.tim_score,0), COALESCE(sp.claro_score,0)) >=  0.0  THEN 'COMPETITIVO'::competitive_position
            WHEN COALESCE(sp.vivo_score,0) - GREATEST(COALESCE(sp.tim_score,0), COALESCE(sp.claro_score,0)) >= -0.5  THEN 'EMPATADO'::competitive_position
            WHEN COALESCE(sp.vivo_score,0) - GREATEST(COALESCE(sp.tim_score,0), COALESCE(sp.claro_score,0)) >= -1.0  THEN 'ABAIXO'::competitive_position
            ELSE 'CRITICO'::competitive_position
        END AS competitive_position,
        -- QoE
        COALESCE(qv.avg_dl_throughput, 0) AS avg_dl_throughput,
        COALESCE(qv.avg_latency, 0) AS avg_latency,
        CASE
            WHEN qv.avg_dl_throughput >= 100 AND qv.avg_latency <= 20 THEN 'EXCELENTE'::quality_label
            WHEN qv.avg_dl_throughput >= 50  AND qv.avg_latency <= 40 THEN 'BOM'::quality_label
            WHEN qv.avg_dl_throughput >= 20  OR  qv.avg_latency <= 60 THEN 'REGULAR'::quality_label
            ELSE 'RUIM'::quality_label
        END AS quality_label,
        COALESCE(d.avg_income, 0) AS avg_income,
        -- Priority score (per quadrant formula)
        CASE
            WHEN COALESCE(sh.share_pct,0) >= 35 AND COALESCE(sp.vivo_score,0) < 5.0 THEN
                LEAST(10.0,
                    (10.0 - COALESCE(sp.vivo_score,0)) * 0.30
                    + LEAST(COALESCE(sh.share_pct,0) / 10.0, 10.0) * 0.25
                    + (10.0 - 5.0) * 0.25
                    + LEAST(COALESCE(d.total_population,0) / 20000.0, 10.0) * 0.10
                    + 5.0 * 0.10)
            WHEN COALESCE(sh.share_pct,0) >= 35 AND COALESCE(sp.vivo_score,0) >= 7.01 THEN
                LEAST(10.0,
                    LEAST(COALESCE(sh.share_pct,0) / 10.0, 10.0) * 0.30
                    + COALESCE(sp.vivo_score,0) * 0.25
                    + LEAST(COALESCE(d.avg_income,0) / 2000.0, 10.0) * 0.25
                    + 5.0 * 0.10
                    + LEAST(COALESCE(d.total_population,0) / 20000.0, 10.0) * 0.10)
            WHEN COALESCE(sh.share_pct,0) < 35 AND COALESCE(sp.vivo_score,0) >= 7.01 THEN
                LEAST(10.0,
                    (10.0 - LEAST(COALESCE(sh.share_pct,0) / 10.0, 10.0)) * 0.25
                    + COALESCE(sp.vivo_score,0) * 0.20
                    + LEAST(COALESCE(d.avg_income,0) / 2000.0, 10.0) * 0.20
                    + 5.0 * 0.20
                    + 5.0 * 0.15)
            ELSE
                LEAST(10.0,
                    5.0 * 0.30
                    + 5.0 * 0.25
                    + LEAST(COALESCE(d.avg_income,0) / 2000.0, 10.0) * 0.20
                    + COALESCE(sp.vivo_score,0) * 0.15
                    + LEAST(COALESCE(sh.share_pct,0) / 10.0, 10.0) * 0.10)
        END AS priority_score
    FROM geohash_cell gc
    LEFT JOIN score_pivot sp ON gc.geohash_id = sp.geohash_id AND gc.precision = sp.precision
    LEFT JOIN qoe_vivo qv ON gc.geohash_id = qv.geohash_id AND gc.precision = qv.precision
                          AND qv.period_month = sp.period_month
    LEFT JOIN share sh ON gc.geohash_id = sh.geohash_id AND gc.precision = sh.precision
    LEFT JOIN demo d  ON gc.geohash_id = d.geohash_id  AND gc.precision = d.precision
)
SELECT
    -- Canonical columns
    geohash_id, precision, center_lat, center_lng,
    neighborhood, city, state, period_month,
    vivo_score, tim_score, claro_score, vivo_sample_size,
    share_pct, share_fibra_pct, share_movel_pct, share_level,
    total_ftth_vivo, total_linhas_vivo,
    total_population, total_domicilios,
    technology, quadrant, competitive_position,
    avg_dl_throughput, avg_latency, quality_label,
    avg_income, priority_score,
    -- Priority label
    CASE
        WHEN priority_score >  7.5 THEN 'P1_CRITICA'::priority_label
        WHEN priority_score >= 6.0 THEN 'P2_ALTA'::priority_label
        WHEN priority_score >= 4.5 THEN 'P3_MEDIA'::priority_label
        ELSE                            'P4_BAIXA'::priority_label
    END AS priority_label,
    -- API-compatible aliases
    quadrant              AS quadrant_type,
    share_pct             AS share_vivo,
    vivo_score            AS avg_satisfaction_vivo,
    technology            AS tech_category,
    period_month          AS period,
    avg_dl_throughput     AS download_mbps,
    avg_latency           AS latency_ms,
    share_fibra_pct       AS share_fibra,
    share_movel_pct       AS share_movel,
    total_ftth_vivo       AS domicilios_com_fibra,
    total_linhas_vivo     AS pessoas_com_erb,
    total_population      AS populacao_residente,
    -- Trend stub (no historical data yet — compute with LAG() when available)
    'STABLE'::trend_direction AS trend_direction,
    0.0::NUMERIC              AS trend_delta
FROM base;

-- ---------------------------------------------------------------------------
-- 12. VIEW: vw_bairro_summary (neighborhood aggregation)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_bairro_summary AS
SELECT
    gs.neighborhood, gs.city, gs.state, gs.period_month,
    COUNT(DISTINCT gs.geohash_id) AS geohash_count,
    SUM(gs.total_population) AS total_population,
    SUM(gs.total_linhas_vivo) + SUM(gs.total_ftth_vivo) AS total_clients,
    ROUND(AVG(gs.share_pct)::numeric, 2) AS avg_share,
    ROUND(AVG(gs.vivo_score)::numeric, 1) AS avg_vivo_score,
    ROUND(AVG(gs.tim_score)::numeric, 1) AS avg_tim_score,
    ROUND(AVG(gs.claro_score)::numeric, 1) AS avg_claro_score,
    ROUND((AVG(gs.avg_income) FILTER (WHERE gs.avg_income > 0)::numeric), 2) AS avg_income,
    SUM(gs.total_domicilios) AS total_domicilios,
    JSONB_BUILD_OBJECT(
        'GROWTH',          COUNT(*) FILTER (WHERE gs.quadrant = 'GROWTH'),
        'UPSELL',          COUNT(*) FILTER (WHERE gs.quadrant = 'UPSELL'),
        'RETENCAO',        COUNT(*) FILTER (WHERE gs.quadrant = 'RETENCAO'),
        'GROWTH_RETENCAO', COUNT(*) FILTER (WHERE gs.quadrant = 'GROWTH_RETENCAO')
    ) AS quadrant_counts
FROM vw_geohash_summary gs
WHERE gs.neighborhood IS NOT NULL
GROUP BY gs.neighborhood, gs.city, gs.state, gs.period_month;
