-- =============================================================================
-- Migration 0013: Fix rebuffering score calculation
--
-- Problem: When attr_video_rebuffering_count > 0, score was set to 0.0.
--   Stakeholder correction: the score should be 0.8 (not 0) when rebuffering
--   occurs. The original Ookla documentation had an error.
--
-- Fix: Change ELSE 0.0 → ELSE 0.8 in all rebuffering AVG(CASE...) expressions
--   in both vw_score_mobile and vw_score_fibra.
--
-- Impact: Since vw_score_mobile and vw_score_fibra are regular views (not
--   materialized), this change takes effect immediately. However,
--   vw_geohash_summary (materialized) must be refreshed afterward:
--     REFRESH MATERIALIZED VIEW CONCURRENTLY vw_geohash_summary;
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Recreate vw_score_mobile with corrected rebuffering score
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS vw_score_mobile CASCADE;--> statement-breakpoint

CREATE OR REPLACE VIEW vw_score_mobile AS
WITH
file_score AS (
    SELECT
        gh AS geohash_id, precision, mes AS period_month, operadora AS operator,
        testes_file, avg_val_latency_avg, score_val_latency_avg,
        avg_val_dl_throughput, avg_val_ul_throughput,
        score_val_dl_throughput, score_val_ul_throughput,
        COALESCE(score_val_dl_throughput, 0) * 0.70
          + COALESCE(score_val_ul_throughput, 0) * 0.20
          + COALESCE(score_val_latency_avg, 0) * 0.10 AS score_throughput_pilar,
        CASE WHEN qtd_dl_ok > 0 AND total_file > 0
             AND (qtd_dl_ok::float / total_file) > 0.1
             THEN TRUE ELSE FALSE END AS throughput_disponivel
    FROM (
        SELECT
            attr_geohash7 AS gh, 7::SMALLINT AS precision,
            CASE
                WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%CLARO%' THEN 'CLARO'
                WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%TIM%'   THEN 'TIM'
                WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%VIVO%'  THEN 'VIVO'
                WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%OI%'    THEN 'OI'
                ELSE 'OUTROS'
            END AS operadora,
            DATE_TRUNC('month', ts_result)::DATE AS mes,
            COUNT(*) AS testes_file,
            AVG(val_latency_avg) AS avg_val_latency_avg,
            AVG(CASE WHEN val_latency_avg < 65 THEN 100 WHEN val_latency_avg < 220 THEN 75 WHEN val_latency_avg < 350 THEN 50 ELSE 25 END) AS score_val_latency_avg,
            AVG(val_dl_throughput) AS avg_val_dl_throughput,
            AVG(val_ul_throughput) AS avg_val_ul_throughput,
            AVG(CASE WHEN val_dl_throughput >= 25 THEN 100 WHEN val_dl_throughput >= 10 THEN 75 WHEN val_dl_throughput >= 2 THEN 50 ELSE 25 END) AS score_val_dl_throughput,
            AVG(CASE WHEN val_ul_throughput >= 12 THEN 100 WHEN val_ul_throughput >= 5 THEN 75 WHEN val_ul_throughput >= 1 THEN 50 ELSE 25 END) AS score_val_ul_throughput,
            SUM(CASE WHEN has_dl_test_status = TRUE THEN 1 ELSE 0 END) AS qtd_dl_ok,
            COUNT(*) AS total_file
        FROM file_transfer
        WHERE is_wifi_connected IS NOT TRUE
          AND attr_geohash7 IS NOT NULL
          AND val_latency_avg IS NOT NULL
          AND id_location_type = 1
        GROUP BY 1, 3, 4
        UNION ALL
        SELECT
            attr_geohash6, 6::SMALLINT,
            CASE
                WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%CLARO%' THEN 'CLARO'
                WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%TIM%'   THEN 'TIM'
                WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%VIVO%'  THEN 'VIVO'
                WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%OI%'    THEN 'OI'
                ELSE 'OUTROS'
            END,
            DATE_TRUNC('month', ts_result)::DATE,
            COUNT(*),
            AVG(val_latency_avg),
            AVG(CASE WHEN val_latency_avg < 65 THEN 100 WHEN val_latency_avg < 220 THEN 75 WHEN val_latency_avg < 350 THEN 50 ELSE 25 END),
            AVG(val_dl_throughput),
            AVG(val_ul_throughput),
            AVG(CASE WHEN val_dl_throughput >= 25 THEN 100 WHEN val_dl_throughput >= 10 THEN 75 WHEN val_dl_throughput >= 2 THEN 50 ELSE 25 END),
            AVG(CASE WHEN val_ul_throughput >= 12 THEN 100 WHEN val_ul_throughput >= 5 THEN 75 WHEN val_ul_throughput >= 1 THEN 50 ELSE 25 END),
            SUM(CASE WHEN has_dl_test_status = TRUE THEN 1 ELSE 0 END),
            COUNT(*)
        FROM file_transfer
        WHERE is_wifi_connected IS NOT TRUE
          AND attr_geohash6 IS NOT NULL
          AND val_latency_avg IS NOT NULL
          AND id_location_type = 1
        GROUP BY 1, 3, 4
    ) f_raw
),
web_score AS (
    SELECT
        gh AS geohash_id, precision, mes AS period_month, operadora AS operator,
        testes_web,
        (COALESCE(score_val_web_page_load_time, 0)
         + COALESCE(
            CASE
                WHEN taxa_fail < 0.034 THEN 100
                WHEN taxa_fail < 0.138 THEN 75
                WHEN taxa_fail < 0.268 THEN 50
                ELSE 25
            END, 0)
        ) / 2.0 AS score_web_pilar
    FROM (
        SELECT
            attr_geohash7 AS gh, 7::SMALLINT AS precision,
            CASE
                WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%CLARO%' THEN 'CLARO'
                WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%TIM%'   THEN 'TIM'
                WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%VIVO%'  THEN 'VIVO'
                WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%OI%'    THEN 'OI'
                ELSE 'OUTROS'
            END AS operadora,
            DATE_TRUNC('month', ts_result)::DATE AS mes,
            COUNT(*) AS testes_web,
            AVG(CASE WHEN val_web_page_load_time < 5000 THEN 100 ELSE 0 END) AS score_val_web_page_load_time,
            AVG(CASE WHEN is_web_page_fails_to_load THEN 1.0 ELSE 0.0 END) AS taxa_fail
        FROM web_browsing
        WHERE is_wifi_connected IS NOT TRUE
          AND attr_geohash7 IS NOT NULL
          AND id_location_type = 1
        GROUP BY 1, 3, 4
        UNION ALL
        SELECT
            attr_geohash6, 6::SMALLINT,
            CASE
                WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%CLARO%' THEN 'CLARO'
                WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%TIM%'   THEN 'TIM'
                WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%VIVO%'  THEN 'VIVO'
                WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%OI%'    THEN 'OI'
                ELSE 'OUTROS'
            END,
            DATE_TRUNC('month', ts_result)::DATE,
            COUNT(*),
            AVG(CASE WHEN val_web_page_load_time < 5000 THEN 100 ELSE 0 END),
            AVG(CASE WHEN is_web_page_fails_to_load THEN 1.0 ELSE 0.0 END)
        FROM web_browsing
        WHERE is_wifi_connected IS NOT TRUE
          AND attr_geohash6 IS NOT NULL
          AND id_location_type = 1
        GROUP BY 1, 3, 4
    ) w_raw
),
video_score AS (
    SELECT
        gh AS geohash_id, precision, mes AS period_month, operadora AS operator,
        testes_video,
        -- FIX: rebuffering_count > 0 scores 0.8 (not 0.0)
        (COALESCE(score_rebuffering, 0) + COALESCE(score_tempo_inicio, 0) + COALESCE(score_is_video_fails_to_start, 0)) / 3.0 AS score_video_pilar
    FROM (
        SELECT
            attr_geohash7 AS gh, 7::SMALLINT AS precision,
            CASE
                WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%CLARO%' THEN 'CLARO'
                WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%TIM%'   THEN 'TIM'
                WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%VIVO%'  THEN 'VIVO'
                WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%OI%'    THEN 'OI'
                ELSE 'OUTROS'
            END AS operadora,
            DATE_TRUNC('month', ts_result)::DATE AS mes,
            COUNT(*) AS testes_video,
            AVG(CASE WHEN attr_video_rebuffering_count = 0 THEN 1.0 ELSE 0.8 END) * 100 AS score_rebuffering,
            AVG(CASE WHEN val_video_time_to_start < 2000 THEN 1.0 ELSE 0.0 END) * 100 AS score_tempo_inicio,
            CASE
                WHEN AVG(CASE WHEN is_video_fails_to_start THEN 1.0 ELSE 0.0 END) = 0      THEN 100
                WHEN AVG(CASE WHEN is_video_fails_to_start THEN 1.0 ELSE 0.0 END) <= 0.185 THEN 75
                ELSE 25
            END AS score_is_video_fails_to_start
        FROM video
        WHERE is_wifi_connected IS NOT TRUE
          AND attr_geohash7 IS NOT NULL
          AND id_location_type = 1
        GROUP BY 1, 3, 4
        UNION ALL
        SELECT
            attr_geohash6, 6::SMALLINT,
            CASE
                WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%CLARO%' THEN 'CLARO'
                WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%TIM%'   THEN 'TIM'
                WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%VIVO%'  THEN 'VIVO'
                WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%OI%'    THEN 'OI'
                ELSE 'OUTROS'
            END,
            DATE_TRUNC('month', ts_result)::DATE,
            COUNT(*),
            AVG(CASE WHEN attr_video_rebuffering_count = 0 THEN 1.0 ELSE 0.8 END) * 100,
            AVG(CASE WHEN val_video_time_to_start < 2000 THEN 1.0 ELSE 0.0 END) * 100,
            CASE
                WHEN AVG(CASE WHEN is_video_fails_to_start THEN 1.0 ELSE 0.0 END) = 0      THEN 100
                WHEN AVG(CASE WHEN is_video_fails_to_start THEN 1.0 ELSE 0.0 END) <= 0.185 THEN 75
                ELSE 25
            END
        FROM video
        WHERE is_wifi_connected IS NOT TRUE
          AND attr_geohash6 IS NOT NULL
          AND id_location_type = 1
        GROUP BY 1, 3, 4
    ) v_raw
),
combinado AS (
    SELECT
        COALESCE(f.geohash_id, w.geohash_id, v.geohash_id) AS geohash_id,
        COALESCE(f.precision, w.precision, v.precision)     AS precision,
        COALESCE(f.period_month, w.period_month, v.period_month) AS period_month,
        COALESCE(f.operator, w.operator, v.operator)        AS operator,
        COALESCE(f.testes_file, 0) + COALESCE(w.testes_web, 0) + COALESCE(v.testes_video, 0) AS sample_size,
        f.score_val_latency_avg,
        f.score_throughput_pilar,
        f.throughput_disponivel,
        w.score_web_pilar,
        v.score_video_pilar
    FROM file_score f
    FULL OUTER JOIN web_score w ON f.geohash_id = w.geohash_id AND f.precision = w.precision
                                AND f.operator = w.operator AND f.period_month = w.period_month
    FULL OUTER JOIN video_score v ON COALESCE(f.geohash_id, w.geohash_id) = v.geohash_id
                                  AND COALESCE(f.precision, w.precision) = v.precision
                                  AND COALESCE(f.operator, w.operator) = v.operator
                                  AND COALESCE(f.period_month, w.period_month) = v.period_month
)
SELECT
    geohash_id, precision, period_month, operator,
    -- Composite score 0-100 → normalized to 0-10 for compatibility with quadrant thresholds
    ROUND(
        CASE WHEN COALESCE(throughput_disponivel, FALSE) THEN
            COALESCE(score_val_latency_avg * 0.30, 0)
          + COALESCE(score_video_pilar     * 0.30, 0)
          + COALESCE(score_web_pilar       * 0.30, 0)
          + COALESCE(score_throughput_pilar * 0.10, 0)
        ELSE
            COALESCE(score_val_latency_avg * 0.35, 0)
          + COALESCE(score_video_pilar     * 0.30, 0)
          + COALESCE(score_web_pilar       * 0.35, 0)
        END
    ::NUMERIC, 1) / 10.0 AS composite_score,
    sample_size,
    'MOVEL'::TEXT AS network_type
FROM combinado;--> statement-breakpoint


-- ---------------------------------------------------------------------------
-- 2. Recreate vw_score_fibra with corrected rebuffering score
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS vw_score_fibra CASCADE;--> statement-breakpoint

CREATE OR REPLACE VIEW vw_score_fibra AS
WITH
file_score AS (
    SELECT
        gh AS geohash_id, precision, mes AS period_month, operadora AS operator,
        testes_file, score_latencia_pilar,
        avg_val_dl_throughput, avg_val_ul_throughput,
        score_val_dl_throughput, score_val_ul_throughput,
        (COALESCE(score_val_dl_throughput, 0) + COALESCE(score_val_ul_throughput, 0)) / 2.0 AS score_throughput_pilar,
        CASE WHEN qtd_dl_ok > 0 AND total_file > 0
             AND (qtd_dl_ok::float / total_file) > 0.1
             THEN TRUE ELSE FALSE END AS throughput_disponivel
    FROM (
        SELECT
            attr_geohash7 AS gh, 7::SMALLINT AS precision,
            CASE
                WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%CLARO%' THEN 'CLARO'
                WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%TIM%'   THEN 'TIM'
                WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%VIVO%'  THEN 'VIVO'
                WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%OI%'    THEN 'OI'
                ELSE 'OUTROS'
            END AS operadora,
            DATE_TRUNC('month', ts_result)::DATE AS mes,
            COUNT(*) AS testes_file,
            AVG(val_latency_avg) AS avg_val_latency_avg,
            AVG(CASE WHEN val_latency_avg < 65 THEN 100 WHEN val_latency_avg < 220 THEN 75 WHEN val_latency_avg < 350 THEN 50 ELSE 25 END) AS score_val_latency_avg,
            AVG(CASE WHEN val_tcp_connect_time IS NULL THEN NULL WHEN val_tcp_connect_time < 24 THEN 100 WHEN val_tcp_connect_time < 35 THEN 75 WHEN val_tcp_connect_time < 61 THEN 50 ELSE 25 END) AS score_val_tcp_connect_time,
            AVG(val_dl_throughput) AS avg_val_dl_throughput,
            AVG(val_ul_throughput) AS avg_val_ul_throughput,
            AVG(CASE WHEN val_dl_throughput >= 25 THEN 100 WHEN val_dl_throughput >= 10 THEN 75 WHEN val_dl_throughput >= 2 THEN 50 ELSE 25 END) AS score_val_dl_throughput,
            AVG(CASE WHEN val_ul_throughput >= 12 THEN 100 WHEN val_ul_throughput >= 5 THEN 75 WHEN val_ul_throughput >= 1 THEN 50 ELSE 25 END) AS score_val_ul_throughput,
            SUM(CASE WHEN has_dl_test_status = TRUE THEN 1 ELSE 0 END) AS qtd_dl_ok,
            COUNT(*) AS total_file,
            CASE
                WHEN AVG(CASE WHEN val_latency_avg < 65 THEN 100 WHEN val_latency_avg < 220 THEN 75 WHEN val_latency_avg < 350 THEN 50 ELSE 25 END) IS NOT NULL
                 AND AVG(CASE WHEN val_tcp_connect_time IS NULL THEN NULL WHEN val_tcp_connect_time < 24 THEN 100 WHEN val_tcp_connect_time < 35 THEN 75 WHEN val_tcp_connect_time < 61 THEN 50 ELSE 25 END) IS NOT NULL
                THEN (AVG(CASE WHEN val_latency_avg < 65 THEN 100 WHEN val_latency_avg < 220 THEN 75 WHEN val_latency_avg < 350 THEN 50 ELSE 25 END)
                    + AVG(CASE WHEN val_tcp_connect_time IS NULL THEN NULL WHEN val_tcp_connect_time < 24 THEN 100 WHEN val_tcp_connect_time < 35 THEN 75 WHEN val_tcp_connect_time < 61 THEN 50 ELSE 25 END)) / 2.0
                ELSE AVG(CASE WHEN val_latency_avg < 65 THEN 100 WHEN val_latency_avg < 220 THEN 75 WHEN val_latency_avg < 350 THEN 50 ELSE 25 END)
            END AS score_latencia_pilar
        FROM file_transfer
        WHERE is_wifi_connected = TRUE
          AND attr_geohash7 IS NOT NULL
          AND val_latency_avg IS NOT NULL
          AND id_location_type = 1
        GROUP BY 1, 3, 4
        UNION ALL
        SELECT
            attr_geohash6, 6::SMALLINT,
            CASE
                WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%CLARO%' THEN 'CLARO'
                WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%TIM%'   THEN 'TIM'
                WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%VIVO%'  THEN 'VIVO'
                WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%OI%'    THEN 'OI'
                ELSE 'OUTROS'
            END,
            DATE_TRUNC('month', ts_result)::DATE,
            COUNT(*),
            AVG(val_latency_avg),
            AVG(CASE WHEN val_latency_avg < 65 THEN 100 WHEN val_latency_avg < 220 THEN 75 WHEN val_latency_avg < 350 THEN 50 ELSE 25 END),
            AVG(CASE WHEN val_tcp_connect_time IS NULL THEN NULL WHEN val_tcp_connect_time < 24 THEN 100 WHEN val_tcp_connect_time < 35 THEN 75 WHEN val_tcp_connect_time < 61 THEN 50 ELSE 25 END),
            AVG(val_dl_throughput),
            AVG(val_ul_throughput),
            AVG(CASE WHEN val_dl_throughput >= 25 THEN 100 WHEN val_dl_throughput >= 10 THEN 75 WHEN val_dl_throughput >= 2 THEN 50 ELSE 25 END),
            AVG(CASE WHEN val_ul_throughput >= 12 THEN 100 WHEN val_ul_throughput >= 5 THEN 75 WHEN val_ul_throughput >= 1 THEN 50 ELSE 25 END),
            SUM(CASE WHEN has_dl_test_status = TRUE THEN 1 ELSE 0 END),
            COUNT(*),
            CASE
                WHEN AVG(CASE WHEN val_latency_avg < 65 THEN 100 WHEN val_latency_avg < 220 THEN 75 WHEN val_latency_avg < 350 THEN 50 ELSE 25 END) IS NOT NULL
                 AND AVG(CASE WHEN val_tcp_connect_time IS NULL THEN NULL WHEN val_tcp_connect_time < 24 THEN 100 WHEN val_tcp_connect_time < 35 THEN 75 WHEN val_tcp_connect_time < 61 THEN 50 ELSE 25 END) IS NOT NULL
                THEN (AVG(CASE WHEN val_latency_avg < 65 THEN 100 WHEN val_latency_avg < 220 THEN 75 WHEN val_latency_avg < 350 THEN 50 ELSE 25 END)
                    + AVG(CASE WHEN val_tcp_connect_time IS NULL THEN NULL WHEN val_tcp_connect_time < 24 THEN 100 WHEN val_tcp_connect_time < 35 THEN 75 WHEN val_tcp_connect_time < 61 THEN 50 ELSE 25 END)) / 2.0
                ELSE AVG(CASE WHEN val_latency_avg < 65 THEN 100 WHEN val_latency_avg < 220 THEN 75 WHEN val_latency_avg < 350 THEN 50 ELSE 25 END)
            END
        FROM file_transfer
        WHERE is_wifi_connected = TRUE
          AND attr_geohash6 IS NOT NULL
          AND val_latency_avg IS NOT NULL
          AND id_location_type = 1
        GROUP BY 1, 3, 4
    ) f_raw
),
web_score AS (
    SELECT
        gh AS geohash_id, precision, mes AS period_month, operadora AS operator,
        testes_web,
        (COALESCE(score_val_web_page_first_byte_time, 0) + COALESCE(score_val_web_page_load_time, 0)) / 2.0 AS score_web_pilar
    FROM (
        SELECT
            attr_geohash7 AS gh, 7::SMALLINT AS precision,
            CASE
                WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%CLARO%' THEN 'CLARO'
                WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%TIM%'   THEN 'TIM'
                WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%VIVO%'  THEN 'VIVO'
                WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%OI%'    THEN 'OI'
                ELSE 'OUTROS'
            END AS operadora,
            DATE_TRUNC('month', ts_result)::DATE AS mes,
            COUNT(*) AS testes_web,
            AVG(CASE WHEN val_web_page_first_byte_time < 523 THEN 100 WHEN val_web_page_first_byte_time < 753 THEN 75 WHEN val_web_page_first_byte_time < 1305 THEN 50 ELSE 25 END) AS score_val_web_page_first_byte_time,
            AVG(CASE WHEN val_web_page_load_time < 5000 THEN 100 ELSE 0 END) AS score_val_web_page_load_time
        FROM web_browsing
        WHERE is_wifi_connected = TRUE
          AND attr_geohash7 IS NOT NULL
          AND id_location_type = 1
        GROUP BY 1, 3, 4
        UNION ALL
        SELECT
            attr_geohash6, 6::SMALLINT,
            CASE
                WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%CLARO%' THEN 'CLARO'
                WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%TIM%'   THEN 'TIM'
                WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%VIVO%'  THEN 'VIVO'
                WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%OI%'    THEN 'OI'
                ELSE 'OUTROS'
            END,
            DATE_TRUNC('month', ts_result)::DATE,
            COUNT(*),
            AVG(CASE WHEN val_web_page_first_byte_time < 523 THEN 100 WHEN val_web_page_first_byte_time < 753 THEN 75 WHEN val_web_page_first_byte_time < 1305 THEN 50 ELSE 25 END),
            AVG(CASE WHEN val_web_page_load_time < 5000 THEN 100 ELSE 0 END)
        FROM web_browsing
        WHERE is_wifi_connected = TRUE
          AND attr_geohash6 IS NOT NULL
          AND id_location_type = 1
        GROUP BY 1, 3, 4
    ) w_raw
),
video_score AS (
    SELECT
        gh AS geohash_id, precision, mes AS period_month, operadora AS operator,
        testes_video,
        -- Fiber video pillar: 4 components (rebuf + resolution + startup + failure) / 4
        -- FIX: rebuffering_count > 0 scores 0.8 (not 0.0)
        CASE
            WHEN score_rebuffering IS NOT NULL AND score_resolucao IS NOT NULL
             AND score_tempo_inicio IS NOT NULL AND score_is_video_fails_to_start IS NOT NULL
                THEN (score_rebuffering + score_resolucao + score_tempo_inicio + score_is_video_fails_to_start) / 4.0
            WHEN score_rebuffering IS NOT NULL AND score_tempo_inicio IS NOT NULL
             AND score_is_video_fails_to_start IS NOT NULL
                THEN (score_rebuffering + score_tempo_inicio + score_is_video_fails_to_start) / 3.0
            WHEN score_rebuffering IS NOT NULL AND score_is_video_fails_to_start IS NOT NULL
                THEN (score_rebuffering + score_is_video_fails_to_start) / 2.0
            WHEN score_is_video_fails_to_start IS NOT NULL THEN score_is_video_fails_to_start
            ELSE NULL
        END AS score_video_pilar
    FROM (
        SELECT
            attr_geohash7 AS gh, 7::SMALLINT AS precision,
            CASE
                WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%CLARO%' THEN 'CLARO'
                WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%TIM%'   THEN 'TIM'
                WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%VIVO%'  THEN 'VIVO'
                WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%OI%'    THEN 'OI'
                ELSE 'OUTROS'
            END AS operadora,
            DATE_TRUNC('month', ts_result)::DATE AS mes,
            COUNT(*) AS testes_video,
            AVG(CASE WHEN attr_video_rebuffering_count = 0 THEN 1.0 ELSE 0.8 END) * 100 AS score_rebuffering,
            AVG(CASE WHEN val_video_time_to_start < 2000 THEN 1.0 ELSE 0.0 END) * 100 AS score_tempo_inicio,
            AVG(
                CASE WHEN (
                    NULLIF(COALESCE(val_video_quality_time_1080p,0) + COALESCE(val_video_quality_time_1440p,0) + COALESCE(val_video_quality_time_2160p,0), 0)::numeric
                    / NULLIF(COALESCE(val_video_quality_time_144p,0) + COALESCE(val_video_quality_time_240p,0) + COALESCE(val_video_quality_time_360p,0) + COALESCE(val_video_quality_time_480p,0) + COALESCE(val_video_quality_time_720p,0) + COALESCE(val_video_quality_time_1080p,0) + COALESCE(val_video_quality_time_1440p,0) + COALESCE(val_video_quality_time_2160p,0), 0)
                ) >= 0.8 THEN 1.0 ELSE 0.0 END
            ) * 100 AS score_resolucao,
            CASE
                WHEN AVG(CASE WHEN is_video_fails_to_start THEN 1.0 ELSE 0.0 END) = 0      THEN 100
                WHEN AVG(CASE WHEN is_video_fails_to_start THEN 1.0 ELSE 0.0 END) <= 0.333 THEN 75
                ELSE 25
            END AS score_is_video_fails_to_start
        FROM video
        WHERE is_wifi_connected = TRUE
          AND attr_geohash7 IS NOT NULL
          AND id_location_type = 1
        GROUP BY 1, 3, 4
        UNION ALL
        SELECT
            attr_geohash6, 6::SMALLINT,
            CASE
                WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%CLARO%' THEN 'CLARO'
                WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%TIM%'   THEN 'TIM'
                WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%VIVO%'  THEN 'VIVO'
                WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%OI%'    THEN 'OI'
                ELSE 'OUTROS'
            END,
            DATE_TRUNC('month', ts_result)::DATE,
            COUNT(*),
            AVG(CASE WHEN attr_video_rebuffering_count = 0 THEN 1.0 ELSE 0.8 END) * 100,
            AVG(CASE WHEN val_video_time_to_start < 2000 THEN 1.0 ELSE 0.0 END) * 100,
            AVG(
                CASE WHEN (
                    NULLIF(COALESCE(val_video_quality_time_1080p,0) + COALESCE(val_video_quality_time_1440p,0) + COALESCE(val_video_quality_time_2160p,0), 0)::numeric
                    / NULLIF(COALESCE(val_video_quality_time_144p,0) + COALESCE(val_video_quality_time_240p,0) + COALESCE(val_video_quality_time_360p,0) + COALESCE(val_video_quality_time_480p,0) + COALESCE(val_video_quality_time_720p,0) + COALESCE(val_video_quality_time_1080p,0) + COALESCE(val_video_quality_time_1440p,0) + COALESCE(val_video_quality_time_2160p,0), 0)
                ) >= 0.8 THEN 1.0 ELSE 0.0 END
            ) * 100,
            CASE
                WHEN AVG(CASE WHEN is_video_fails_to_start THEN 1.0 ELSE 0.0 END) = 0      THEN 100
                WHEN AVG(CASE WHEN is_video_fails_to_start THEN 1.0 ELSE 0.0 END) <= 0.333 THEN 75
                ELSE 25
            END
        FROM video
        WHERE is_wifi_connected = TRUE
          AND attr_geohash6 IS NOT NULL
          AND id_location_type = 1
        GROUP BY 1, 3, 4
    ) v_raw
),
combinado AS (
    SELECT
        COALESCE(f.geohash_id, w.geohash_id, v.geohash_id) AS geohash_id,
        COALESCE(f.precision, w.precision, v.precision)     AS precision,
        COALESCE(f.period_month, w.period_month, v.period_month) AS period_month,
        COALESCE(f.operator, w.operator, v.operator)        AS operator,
        COALESCE(f.testes_file, 0) + COALESCE(w.testes_web, 0) + COALESCE(v.testes_video, 0) AS sample_size,
        f.score_latencia_pilar,
        f.score_throughput_pilar,
        f.throughput_disponivel,
        w.score_web_pilar,
        v.score_video_pilar
    FROM file_score f
    FULL OUTER JOIN web_score w ON f.geohash_id = w.geohash_id AND f.precision = w.precision
                                AND f.operator = w.operator AND f.period_month = w.period_month
    FULL OUTER JOIN video_score v ON COALESCE(f.geohash_id, w.geohash_id) = v.geohash_id
                                  AND COALESCE(f.precision, w.precision) = v.precision
                                  AND COALESCE(f.operator, w.operator) = v.operator
                                  AND COALESCE(f.period_month, w.period_month) = v.period_month
)
SELECT
    geohash_id, precision, period_month, operator,
    ROUND(
        CASE WHEN COALESCE(throughput_disponivel, FALSE) THEN
            COALESCE(score_latencia_pilar   * 0.40, 0)
          + COALESCE(score_video_pilar      * 0.30, 0)
          + COALESCE(score_web_pilar        * 0.20, 0)
          + COALESCE(score_throughput_pilar * 0.10, 0)
        ELSE
            COALESCE(score_latencia_pilar * 0.45, 0)
          + COALESCE(score_video_pilar    * 0.30, 0)
          + COALESCE(score_web_pilar      * 0.25, 0)
        END
    ::NUMERIC, 1) / 10.0 AS composite_score,
    sample_size,
    'FIBRA'::TEXT AS network_type
FROM combinado;
