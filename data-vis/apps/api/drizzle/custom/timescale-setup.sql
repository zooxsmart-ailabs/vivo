-- =============================================================================
-- TimescaleDB Setup — runs after Drizzle table migrations
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. ENUMS (created by Drizzle migration, but CREATE TYPE IF NOT EXISTS
--    is not standard SQL — use DO block for safety)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE quadrant_type AS ENUM ('OPORTUNIDADE','FORTALEZA','EXPANSAO','RISCO');
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
  CREATE TYPE fibra_class AS ENUM ('AUMENTO_CAPACIDADE','EXPANSAO_NOVA_AREA','SAUDAVEL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE movel_class AS ENUM ('MELHORA_QUALIDADE','SAUDAVEL','EXPANSAO_COBERTURA');
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
  CREATE TYPE competitive_position AS ENUM ('LIDER','COMPETITIVO','EMPAREDADA','ABAIXO','ISOLADA');
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
