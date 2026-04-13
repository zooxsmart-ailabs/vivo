-- =============================================================================
-- Migration 0005: Score V2 — composite score from file_transfer + video +
--   web_browsing (replaces legacy `score` table dependency).
--
-- Source: estudo/query_score_v2.ipynb (analyst-validated queries)
--
-- Changes:
--  1. Creates vw_score_mobile (mobile composite score, precision 6+7)
--  2. Creates vw_score_fibra  (fiber composite score, precision 6+7)
--  3. Drops + recreates vw_geohash_summary using new score views
--  4. Ensures geohash_cell covers geohashes from new tables
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. VIEW: vw_score_mobile
--    Composite QoE score for mobile network (is_wifi_connected IS NOT TRUE).
--    Weights (scores.pdf): Latency 0.30 + Video 0.30 + Web 0.30 + TP 0.10
--    Without throughput:   Latency 0.35 + Video 0.30 + Web 0.35
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
            AVG(CASE WHEN attr_video_rebuffering_count = 0 THEN 1.0 ELSE 0.0 END) * 100 AS score_rebuffering,
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
            AVG(CASE WHEN attr_video_rebuffering_count = 0 THEN 1.0 ELSE 0.0 END) * 100,
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
-- 2. VIEW: vw_score_fibra
--    Composite QoE score for fiber network (is_wifi_connected = TRUE).
--    Weights (scores.pdf): Latency 0.40 + Video 0.30 + Web 0.20 + TP 0.10
--    Without throughput:   Latency 0.45 + Video 0.30 + Web 0.25
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
            -- Latency pillar for fiber: (latency + tcp_connect) / 2
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
        -- Graceful degradation when some components are NULL
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
            AVG(CASE WHEN attr_video_rebuffering_count = 0 THEN 1.0 ELSE 0.0 END) * 100 AS score_rebuffering,
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
            AVG(CASE WHEN attr_video_rebuffering_count = 0 THEN 1.0 ELSE 0.0 END) * 100,
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
FROM combinado;--> statement-breakpoint


-- ---------------------------------------------------------------------------
-- 3. Ensure geohash_cell has entries for all geohashes in new tables
-- ---------------------------------------------------------------------------
INSERT INTO geohash_cell (geohash_id, precision, center_lat, center_lng, city, state, created_at)
SELECT DISTINCT attr_geohash7, 7::SMALLINT,
    AVG(attr_location_latitude) OVER (PARTITION BY attr_geohash7),
    AVG(attr_location_longitude) OVER (PARTITION BY attr_geohash7),
    'Goiânia', 'GO', NOW()
FROM file_transfer
WHERE attr_geohash7 IS NOT NULL AND attr_location_latitude IS NOT NULL
ON CONFLICT (geohash_id) DO NOTHING;--> statement-breakpoint

INSERT INTO geohash_cell (geohash_id, precision, center_lat, center_lng, city, state, created_at)
SELECT DISTINCT attr_geohash6, 6::SMALLINT,
    AVG(attr_location_latitude) OVER (PARTITION BY attr_geohash6),
    AVG(attr_location_longitude) OVER (PARTITION BY attr_geohash6),
    'Goiânia', 'GO', NOW()
FROM file_transfer
WHERE attr_geohash6 IS NOT NULL AND attr_location_latitude IS NOT NULL
ON CONFLICT (geohash_id) DO NOTHING;--> statement-breakpoint


-- ---------------------------------------------------------------------------
-- 4. Recreate vw_geohash_summary using new score views
--    (DROP CASCADE also drops vw_bairro_summary which we recreate in step 5)
-- ---------------------------------------------------------------------------
DROP MATERIALIZED VIEW IF EXISTS vw_geohash_summary CASCADE;--> statement-breakpoint

CREATE MATERIALIZED VIEW vw_geohash_summary AS
WITH
scores_all AS (
    SELECT geohash_id, precision, period_month, operator, composite_score, sample_size
    FROM vw_score_mobile
    UNION ALL
    SELECT geohash_id, precision, period_month, operator, composite_score, sample_size
    FROM vw_score_fibra
),
score_pivot AS (
    SELECT geohash_id, precision, period_month,
        AVG(CASE WHEN operator LIKE '%VIVO%' THEN composite_score END) AS vivo_score,
        AVG(CASE WHEN operator LIKE '%TIM%'  THEN composite_score END) AS tim_score,
        AVG(CASE WHEN operator LIKE '%CLARO%' THEN composite_score END) AS claro_score,
        SUM(CASE WHEN operator LIKE '%VIVO%' THEN sample_size END)     AS vivo_sample_size
    FROM scores_all GROUP BY geohash_id, precision, period_month
),
qoe_vivo AS (
    SELECT geohash_id, precision, period_month,
        avg_dl_throughput, avg_latency, p50_dl_throughput, test_count
    FROM vw_qoe_monthly WHERE operator LIKE '%VIVO%'
),
share AS (
    SELECT geohash_id, precision,
        TO_DATE(anomes::TEXT, 'YYYYMM') AS period_month,
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
        COALESCE(sp.period_month, sh.period_month) AS period_month,
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
        CASE
            WHEN COALESCE(sh.share_pct,0) >= 35 AND COALESCE(sp.vivo_score,0) >= 7.01 THEN 'UPSELL'::quadrant_type
            WHEN COALESCE(sh.share_pct,0) <  35 AND COALESCE(sp.vivo_score,0) >= 7.01 THEN 'GROWTH'::quadrant_type
            WHEN COALESCE(sh.share_pct,0) >= 35 AND COALESCE(sp.vivo_score,0) <  5.0  THEN 'RETENCAO'::quadrant_type
            ELSE 'GROWTH_RETENCAO'::quadrant_type
        END AS quadrant,
        CASE
            WHEN COALESCE(sp.vivo_score,0) - GREATEST(COALESCE(sp.tim_score,0), COALESCE(sp.claro_score,0)) >   0.5  THEN 'LIDER'::competitive_position
            WHEN COALESCE(sp.vivo_score,0) - GREATEST(COALESCE(sp.tim_score,0), COALESCE(sp.claro_score,0)) >=  0.0  THEN 'COMPETITIVO'::competitive_position
            WHEN COALESCE(sp.vivo_score,0) - GREATEST(COALESCE(sp.tim_score,0), COALESCE(sp.claro_score,0)) >= -0.5  THEN 'EMPATADO'::competitive_position
            WHEN COALESCE(sp.vivo_score,0) - GREATEST(COALESCE(sp.tim_score,0), COALESCE(sp.claro_score,0)) >= -1.0  THEN 'ABAIXO'::competitive_position
            ELSE 'CRITICO'::competitive_position
        END AS competitive_position,
        COALESCE(qv.avg_dl_throughput, 0) AS avg_dl_throughput,
        COALESCE(qv.avg_latency, 0) AS avg_latency,
        CASE
            WHEN qv.avg_dl_throughput >= 100 AND qv.avg_latency <= 20 THEN 'EXCELENTE'::quality_label
            WHEN qv.avg_dl_throughput >= 50  AND qv.avg_latency <= 40 THEN 'BOM'::quality_label
            WHEN qv.avg_dl_throughput >= 20  OR  qv.avg_latency <= 60 THEN 'REGULAR'::quality_label
            ELSE 'RUIM'::quality_label
        END AS quality_label,
        COALESCE(d.avg_income, 0) AS avg_income,
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
    LEFT JOIN share sh ON gc.geohash_id = sh.geohash_id AND gc.precision = sh.precision
                       AND (sp.period_month IS NULL OR sh.period_month = sp.period_month)
    LEFT JOIN qoe_vivo qv ON gc.geohash_id = qv.geohash_id AND gc.precision = qv.precision
                          AND qv.period_month = COALESCE(sp.period_month, sh.period_month)
    LEFT JOIN demo d  ON gc.geohash_id = d.geohash_id  AND gc.precision = d.precision
    WHERE sp.geohash_id IS NOT NULL OR sh.geohash_id IS NOT NULL
)
SELECT
    geohash_id, precision, center_lat, center_lng,
    neighborhood, city, state, period_month,
    vivo_score, tim_score, claro_score, vivo_sample_size,
    share_pct, share_fibra_pct, share_movel_pct, share_level,
    total_ftth_vivo, total_linhas_vivo,
    total_population, total_domicilios,
    technology, quadrant, competitive_position,
    avg_dl_throughput, avg_latency, quality_label,
    avg_income, priority_score,
    CASE
        WHEN priority_score >  7.5 THEN 'P1_CRITICA'::priority_label
        WHEN priority_score >= 6.0 THEN 'P2_ALTA'::priority_label
        WHEN priority_score >= 4.5 THEN 'P3_MEDIA'::priority_label
        ELSE                            'P4_BAIXA'::priority_label
    END AS priority_label,
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
    'STABLE'::trend_direction AS trend_direction,
    0.0::NUMERIC              AS trend_delta
FROM base
WITH DATA;--> statement-breakpoint

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_mvw_gh_summary_pk
  ON vw_geohash_summary (geohash_id, precision, period);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_mvw_gh_summary_precision_period
  ON vw_geohash_summary (precision, period);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_mvw_gh_summary_quadrant
  ON vw_geohash_summary (quadrant_type, priority_score DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_geohash_cell_precision
  ON geohash_cell (precision);--> statement-breakpoint


-- ---------------------------------------------------------------------------
-- 5. Recreate vw_bairro_summary (dropped by CASCADE above)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_bairro_summary AS
SELECT
    gs.neighborhood, gs.city, gs.state, gs.period_month,
    gs.period_month                                      AS period,
    COUNT(DISTINCT gs.geohash_id)::int                   AS geohash_count,
    COUNT(DISTINCT gs.geohash_id)::int                   AS total_geohashes,
    SUM(gs.total_population)                             AS total_population,
    SUM(gs.total_linhas_vivo) + SUM(gs.total_ftth_vivo)  AS total_clients,
    ROUND(AVG(gs.share_pct)::numeric, 2)                 AS avg_share,
    ROUND(AVG(gs.vivo_score)::numeric, 1)                AS avg_satisfaction,
    ROUND(AVG(gs.vivo_score)::numeric, 1)                AS avg_vivo_score,
    ROUND(AVG(gs.tim_score)::numeric, 1)                 AS avg_tim_score,
    ROUND(AVG(gs.claro_score)::numeric, 1)               AS avg_claro_score,
    ROUND(AVG(gs.priority_score)::numeric, 2)            AS avg_priority_score,
    MODE() WITHIN GROUP (ORDER BY gs.quadrant)           AS dominant_quadrant,
    ROUND((AVG(gs.avg_income) FILTER (WHERE gs.avg_income > 0))::numeric, 2) AS avg_income,
    SUM(gs.total_domicilios)                             AS total_domicilios,
    COUNT(*) FILTER (WHERE gs.quadrant = 'GROWTH')::int           AS geohash_count_growth,
    COUNT(*) FILTER (WHERE gs.quadrant = 'UPSELL')::int           AS geohash_count_upsell,
    COUNT(*) FILTER (WHERE gs.quadrant = 'RETENCAO')::int         AS geohash_count_retencao,
    COUNT(*) FILTER (WHERE gs.quadrant = 'GROWTH_RETENCAO')::int  AS geohash_count_growth_retencao
FROM vw_geohash_summary gs
WHERE gs.neighborhood IS NOT NULL
GROUP BY gs.neighborhood, gs.city, gs.state, gs.period_month;
