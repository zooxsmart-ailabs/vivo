-- =============================================================================
-- Migration 0014: vw_qoe_unified + network_performance_compatible
--
-- Porta para o Drizzle a camada de compatibilidade QoE originalmente em
-- estudo/db/migrations/013_network_performance_compatible.sql, ESTENDIDA com
-- latência DL/UL separadas (val_dl_latency_iqm, val_ul_latency_iqm) — colunas
-- exigidas pelo método Ookla logístico (4 métricas: down/upl/lat_down/lat_upl).
--
-- 1. MATERIALIZED VIEW network_performance_compatible
--    Snapshot de networkPerformanceMobile + networkPerformanceFixed em formato
--    snake_case compatível com file_transfer. Pré-filtrada por:
--      - Indoor: Mobile → idLocationStartType=1 AND idLocationEndType=1
--                Fixed  → idLocationType=1
--      - BBox 5 cidades RM Goiânia (mesmo padrão de 0009_fix_city_assignment).
--    Geohash6/7/8 derivados via ST_GeoHash(geom, N).
--    Refresh manual: REFRESH MATERIALIZED VIEW CONCURRENTLY ...
--
-- 2. VIEW vw_qoe_unified
--    UNION ALL de file_transfer (Vivo, sem filtros adicionais) e a MV acima
--    (Ookla pré-filtrada). Discriminação:
--      data_source: 'file_transfer' | 'speedtest_mobile' | 'speedtest_fixed'
--      network_type: 'mobile' | 'fixed'
--    Colunas de latência DL/UL vêm como NULL na perna file_transfer (a tabela
--    Vivo não tem latência separada por sentido).
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. MATERIALIZED VIEW network_performance_compatible
-- ---------------------------------------------------------------------------

DROP MATERIALIZED VIEW IF EXISTS network_performance_compatible CASCADE;--> statement-breakpoint

CREATE MATERIALIZED VIEW network_performance_compatible AS

-- ── Mobile: indoor (start AND end) + BBox 5 cidades ──────────────────────────
SELECT
  'speedtest_mobile'::TEXT                            AS data_source,
  'mobile'::TEXT                                      AS network_type,
  -- Identidade
  "tsResult"                                          AS ts_result,
  "tsResultReceived"                                  AS ts_result_received,
  "guidResult"                                        AS guid_result,
  "attrLocationTimezone"                              AS attr_location_timezone,
  "idPlatform"::VARCHAR(7)                            AS id_platform,
  "idDevice"::VARCHAR(35)                             AS id_device,
  -- Device
  "attrDeviceModel"                                   AS attr_device_model,
  "attrDeviceBrandRaw"                                AS attr_device_brand_raw,
  "attrDeviceOsVersion"                               AS attr_device_os_version,
  -- SIM/Network
  "attrSimOperatorCommonName"                         AS attr_sim_operator_common_name,
  "attrSimOperatorNameRaw"                            AS attr_sim_operator_name_raw,
  "attrSimOperatorMcc"::SMALLINT                      AS attr_sim_operator_mcc,
  "attrSimOperatorMnc"::SMALLINT                      AS attr_sim_operator_mnc,
  "attrNetworkOperatorMcc"::SMALLINT                  AS attr_network_operator_mcc,
  "attrNetworkOperatorMnc"::SMALLINT                  AS attr_network_operator_mnc,
  "attrNetworkAsn"                                    AS attr_network_asn,
  -- Localização
  "attrLocationLatitude"                              AS attr_location_latitude,
  "attrLocationLongitude"                             AS attr_location_longitude,
  "attrLocationAccuracyM"::REAL                       AS attr_location_accuracy_m,
  "attrLocationAgeMs"::INTEGER                        AS attr_location_age_ms,
  -- Place
  "attrPlaceFormattedAddress"                         AS attr_place_formatted_address,
  "attrPlaceName"                                     AS attr_place_name,
  "attrPlaceLocalityType"                             AS attr_place_locality_type,
  "attrPlaceCountry"                                  AS attr_place_country,
  "attrPlaceCountryCode"::VARCHAR(2)                  AS attr_place_country_code,
  "attrPlaceRegion"                                   AS attr_place_region,
  "attrPlaceSubregion"                                AS attr_place_subregion,
  "attrPlaceSubsubregion"                             AS attr_place_subsubregion,
  "attrPlacePostalCode"                               AS attr_place_postal_code,
  -- Geohash via PostGIS
  ST_GeoHash("geom", 6)                               AS attr_geohash6,
  ST_GeoHash("geom", 7)                               AS attr_geohash7,
  ST_GeoHash("geom", 8)                               AS attr_geohash8,
  -- Location type (constante 1=indoor após filtro)
  1::SMALLINT                                         AS id_location_type,
  -- Performance core
  "valLatencyIqmMs"                                   AS val_latency_avg,
  ("valLatencyIqmMs" IS NOT NULL)                     AS has_latency_test_status,
  ("valDownloadKbps" / 1000.0)::DOUBLE PRECISION      AS val_dl_throughput,
  ("valDownloadKbps" IS NOT NULL)                     AS has_dl_test_status,
  ("valUploadKbps"   / 1000.0)::DOUBLE PRECISION      AS val_ul_throughput,
  ("valUploadKbps"   IS NOT NULL)                     AS has_ul_test_status,
  -- Latência DL/UL separadas (extensão v2 — método Ookla logístico)
  "valDownloadLatencyIqmMs"::DOUBLE PRECISION         AS val_dl_latency_iqm,
  ("valDownloadLatencyIqmMs" IS NOT NULL)             AS has_dl_latency_test_status,
  "valUploadLatencyIqmMs"::DOUBLE PRECISION           AS val_ul_latency_iqm,
  ("valUploadLatencyIqmMs" IS NOT NULL)               AS has_ul_latency_test_status,
  -- Discriminador wifi (mobile sempre FALSE)
  FALSE                                               AS is_wifi_connected,
  -- Network/Server
  "isNetworkVpn"                                      AS is_network_vpn,
  "attrServerName"                                    AS attr_server_name
FROM "networkPerformanceMobile"
WHERE "idLocationStartType" = 1
  AND "idLocationEndType"   = 1
  AND "attrLocationLatitude"  IS NOT NULL
  AND "attrLocationLongitude" IS NOT NULL
  AND (
    -- Goiânia core
    ("attrLocationLatitude"  BETWEEN -16.83 AND -16.55
     AND "attrLocationLongitude" BETWEEN -49.43 AND -49.14)
    -- Aparecida de Goiânia (sul)
    OR ("attrLocationLatitude"  BETWEEN -16.97 AND -16.77
        AND "attrLocationLongitude" BETWEEN -49.40 AND -49.17)
    -- Senador Canedo (leste)
    OR ("attrLocationLatitude"  BETWEEN -16.80 AND -16.62
        AND "attrLocationLongitude" BETWEEN -49.14 AND -48.87)
    -- Trindade (oeste)
    OR ("attrLocationLatitude"  BETWEEN -16.75 AND -16.55
        AND "attrLocationLongitude" < -49.43
        AND "attrLocationLongitude" > -49.65)
    -- Goianira (noroeste)
    OR ("attrLocationLatitude"  BETWEEN -16.60 AND -16.39
        AND "attrLocationLongitude" BETWEEN -49.62 AND -49.36)
  )

UNION ALL

-- ── Fixed: indoor + BBox 5 cidades ───────────────────────────────────────────
SELECT
  'speedtest_fixed'::TEXT                             AS data_source,
  'fixed'::TEXT                                       AS network_type,
  "tsResult"                                          AS ts_result,
  "tsResultReceived"                                  AS ts_result_received,
  "guidResult"                                        AS guid_result,
  "attrLocationTimezone"                              AS attr_location_timezone,
  "idPlatform"::VARCHAR(7)                            AS id_platform,
  "idDevice"::VARCHAR(35)                             AS id_device,
  "attrDeviceModel"                                   AS attr_device_model,
  "attrDeviceBrandRaw"                                AS attr_device_brand_raw,
  "attrDeviceOsVersion"                               AS attr_device_os_version,
  "attrSimOperatorCommonName"                         AS attr_sim_operator_common_name,
  "attrSimOperatorNameRaw"                            AS attr_sim_operator_name_raw,
  "attrSimOperatorMcc"::SMALLINT                      AS attr_sim_operator_mcc,
  "attrSimOperatorMnc"::SMALLINT                      AS attr_sim_operator_mnc,
  "attrNetworkOperatorMcc"::SMALLINT                  AS attr_network_operator_mcc,
  "attrNetworkOperatorMnc"::SMALLINT                  AS attr_network_operator_mnc,
  -- attrNetworkAsn não existe em networkPerformanceFixed
  NULL::BIGINT                                        AS attr_network_asn,
  "attrLocationLatitude"                              AS attr_location_latitude,
  "attrLocationLongitude"                             AS attr_location_longitude,
  "attrLocationAccuracyM"::REAL                       AS attr_location_accuracy_m,
  "attrLocationAgeMs"::INTEGER                        AS attr_location_age_ms,
  -- attrPlaceFormattedAddress não existe em networkPerformanceFixed
  NULL::TEXT                                          AS attr_place_formatted_address,
  "attrPlaceName"                                     AS attr_place_name,
  "attrPlaceLocalityType"                             AS attr_place_locality_type,
  "attrPlaceCountry"                                  AS attr_place_country,
  "attrPlaceCountryCode"::VARCHAR(2)                  AS attr_place_country_code,
  "attrPlaceRegion"                                   AS attr_place_region,
  "attrPlaceSubregion"                                AS attr_place_subregion,
  "attrPlaceSubsubregion"                             AS attr_place_subsubregion,
  "attrPlacePostalCode"                               AS attr_place_postal_code,
  ST_GeoHash("geom", 6)                               AS attr_geohash6,
  ST_GeoHash("geom", 7)                               AS attr_geohash7,
  ST_GeoHash("geom", 8)                               AS attr_geohash8,
  1::SMALLINT                                         AS id_location_type,
  "valLatencyIqmMs"                                   AS val_latency_avg,
  ("valLatencyIqmMs" IS NOT NULL)                     AS has_latency_test_status,
  "valDownloadMbps"::DOUBLE PRECISION                 AS val_dl_throughput,
  ("valDownloadMbps" IS NOT NULL)                     AS has_dl_test_status,
  "valUploadMbps"::DOUBLE PRECISION                   AS val_ul_throughput,
  ("valUploadMbps"   IS NOT NULL)                     AS has_ul_test_status,
  "valDownloadLatencyIqmMs"::DOUBLE PRECISION         AS val_dl_latency_iqm,
  ("valDownloadLatencyIqmMs" IS NOT NULL)             AS has_dl_latency_test_status,
  "valUploadLatencyIqmMs"::DOUBLE PRECISION           AS val_ul_latency_iqm,
  ("valUploadLatencyIqmMs" IS NOT NULL)               AS has_ul_latency_test_status,
  TRUE                                                AS is_wifi_connected,
  "isNetworkVpn"                                      AS is_network_vpn,
  "attrServerName"                                    AS attr_server_name
FROM "networkPerformanceFixed"
WHERE "idLocationType" = 1
  AND "attrLocationLatitude"  IS NOT NULL
  AND "attrLocationLongitude" IS NOT NULL
  AND (
    ("attrLocationLatitude"  BETWEEN -16.83 AND -16.55
     AND "attrLocationLongitude" BETWEEN -49.43 AND -49.14)
    OR ("attrLocationLatitude"  BETWEEN -16.97 AND -16.77
        AND "attrLocationLongitude" BETWEEN -49.40 AND -49.17)
    OR ("attrLocationLatitude"  BETWEEN -16.80 AND -16.62
        AND "attrLocationLongitude" BETWEEN -49.14 AND -48.87)
    OR ("attrLocationLatitude"  BETWEEN -16.75 AND -16.55
        AND "attrLocationLongitude" < -49.43
        AND "attrLocationLongitude" > -49.65)
    OR ("attrLocationLatitude"  BETWEEN -16.60 AND -16.39
        AND "attrLocationLongitude" BETWEEN -49.62 AND -49.36)
  )

WITH DATA;--> statement-breakpoint


-- ---------------------------------------------------------------------------
-- 2. Índices
-- ---------------------------------------------------------------------------

-- UNIQUE necessário para REFRESH MATERIALIZED VIEW CONCURRENTLY
CREATE UNIQUE INDEX npc_uniq_idx
  ON network_performance_compatible (data_source, ts_result, guid_result);--> statement-breakpoint

CREATE INDEX npc_ts_idx
  ON network_performance_compatible (ts_result DESC);--> statement-breakpoint

CREATE INDEX npc_geohash7_idx
  ON network_performance_compatible (attr_geohash7, ts_result DESC);--> statement-breakpoint

CREATE INDEX npc_operator_idx
  ON network_performance_compatible
  (attr_sim_operator_common_name, ts_result DESC);--> statement-breakpoint


-- ---------------------------------------------------------------------------
-- 3. VIEW vw_qoe_unified — file_transfer + network_performance_compatible
-- ---------------------------------------------------------------------------

DROP VIEW IF EXISTS vw_qoe_unified CASCADE;--> statement-breakpoint

CREATE OR REPLACE VIEW vw_qoe_unified AS

-- ── file_transfer (Vivo) — DL/UL latency = NULL ──────────────────────────────
SELECT
  'file_transfer'::TEXT                                        AS data_source,
  CASE WHEN is_wifi_connected THEN 'fixed' ELSE 'mobile' END   AS network_type,
  ts_result,
  ts_result_received,
  guid_result,
  attr_location_timezone,
  id_platform,
  id_device,
  attr_device_model::TEXT                                      AS attr_device_model,
  attr_device_brand_raw::TEXT                                  AS attr_device_brand_raw,
  attr_device_os_version::TEXT                                 AS attr_device_os_version,
  attr_sim_operator_common_name::TEXT                          AS attr_sim_operator_common_name,
  attr_sim_operator_name_raw::TEXT                             AS attr_sim_operator_name_raw,
  attr_sim_operator_mcc,
  attr_sim_operator_mnc,
  attr_network_operator_mcc,
  attr_network_operator_mnc,
  attr_network_asn,
  attr_location_latitude,
  attr_location_longitude,
  attr_location_accuracy_m,
  attr_location_age_ms,
  attr_place_formatted_address::TEXT                           AS attr_place_formatted_address,
  attr_place_name::TEXT                                        AS attr_place_name,
  attr_place_locality_type::TEXT                               AS attr_place_locality_type,
  attr_place_country::TEXT                                     AS attr_place_country,
  attr_place_country_code,
  attr_place_region::TEXT                                      AS attr_place_region,
  attr_place_subregion::TEXT                                   AS attr_place_subregion,
  attr_place_subsubregion::TEXT                                AS attr_place_subsubregion,
  attr_place_postal_code::TEXT                                 AS attr_place_postal_code,
  attr_geohash6::TEXT                                          AS attr_geohash6,
  attr_geohash7::TEXT                                          AS attr_geohash7,
  attr_geohash8::TEXT                                          AS attr_geohash8,
  id_location_type,
  val_latency_avg::DOUBLE PRECISION                            AS val_latency_avg,
  has_latency_test_status,
  val_dl_throughput,
  has_dl_test_status,
  val_ul_throughput,
  has_ul_test_status,
  -- file_transfer não tem latência separada por sentido
  NULL::DOUBLE PRECISION                                       AS val_dl_latency_iqm,
  FALSE                                                        AS has_dl_latency_test_status,
  NULL::DOUBLE PRECISION                                       AS val_ul_latency_iqm,
  FALSE                                                        AS has_ul_latency_test_status,
  is_wifi_connected,
  is_network_vpn,
  attr_server_name::TEXT                                       AS attr_server_name
FROM file_transfer

UNION ALL

-- ── network_performance_compatible (Ookla, indoor + 5 cidades) ──────────────
SELECT
  data_source,
  network_type,
  ts_result,
  ts_result_received,
  guid_result,
  attr_location_timezone,
  id_platform,
  id_device,
  attr_device_model,
  attr_device_brand_raw,
  attr_device_os_version,
  attr_sim_operator_common_name,
  attr_sim_operator_name_raw,
  attr_sim_operator_mcc,
  attr_sim_operator_mnc,
  attr_network_operator_mcc,
  attr_network_operator_mnc,
  attr_network_asn,
  attr_location_latitude,
  attr_location_longitude,
  attr_location_accuracy_m,
  attr_location_age_ms,
  attr_place_formatted_address,
  attr_place_name,
  attr_place_locality_type,
  attr_place_country,
  attr_place_country_code,
  attr_place_region,
  attr_place_subregion,
  attr_place_subsubregion,
  attr_place_postal_code,
  attr_geohash6,
  attr_geohash7,
  attr_geohash8,
  id_location_type,
  val_latency_avg,
  has_latency_test_status,
  val_dl_throughput,
  has_dl_test_status,
  val_ul_throughput,
  has_ul_test_status,
  val_dl_latency_iqm,
  has_dl_latency_test_status,
  val_ul_latency_iqm,
  has_ul_latency_test_status,
  is_wifi_connected,
  is_network_vpn,
  attr_server_name
FROM network_performance_compatible;--> statement-breakpoint


COMMENT ON MATERIALIZED VIEW network_performance_compatible IS
  'Snapshot v2 de networkPerformanceMobile/Fixed em formato file_transfer (snake_case), restrito a indoor (Mobile: idLocationStartType=1 AND idLocationEndType=1; Fixed: idLocationType=1) e BBox 5 cidades RM Goiânia. Geohash6/7/8 derivados via ST_GeoHash. Inclui latência DL/UL separadas (val_dl_latency_iqm, val_ul_latency_iqm) para método Ookla logístico. Refresh manual: REFRESH MATERIALIZED VIEW CONCURRENTLY network_performance_compatible.';--> statement-breakpoint

COMMENT ON VIEW vw_qoe_unified IS
  'UNION ALL de file_transfer (Vivo) + network_performance_compatible (Ookla Speedtest). Coluna data_source distingue origem (file_transfer | speedtest_mobile | speedtest_fixed); network_type distingue mobile/fixed. file_transfer entra completo (sem filtros adicionais); MV já vem pré-filtrada por indoor + 5 cidades. Latência DL/UL = NULL na perna file_transfer (não há latência separada por sentido nos dados Vivo).';
