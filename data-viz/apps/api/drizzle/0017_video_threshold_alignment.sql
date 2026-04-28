-- =============================================================================
-- Migration 0017: vw_score_mobile/fibra — vídeo com regra threshold ≥ 0.8
--
-- Substitui o fix per-record da 0013 (rebuffering: 1.0/0.8) por regra
-- threshold per-geohash (≥ 0.8 → 100, senão 0) — mesma fórmula da
-- fn_score_ookla_video. Aplicado em:
--   - rebuffering (mobile + fibra)
--   - tempo_inicio (mobile + fibra)
--   - resolucao (apenas fibra)
--
-- Componentes inalterados:
--   - falha_video (4-tier 100/75/25)
--   - todos os componentes de file_transfer e web_browsing
--
-- Impacto: composite_score muda numericamente para registros onde a regra
-- de vídeo era determinante. Não afeta MVs downstream (vw_geohash_summary
-- usa tabela `score`, não vw_score_mobile/fibra).
-- =============================================================================


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
        score_val_web_page_load_time,
        score_falha_web,
        (COALESCE(score_val_web_page_load_time, 0) + COALESCE(score_falha_web, 0)) / 2.0 AS score_web_pilar
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
            CASE
                WHEN AVG(CASE WHEN is_web_page_fails_to_load THEN 1.0 ELSE 0.0 END) < 0.034 THEN 100
                WHEN AVG(CASE WHEN is_web_page_fails_to_load THEN 1.0 ELSE 0.0 END) < 0.138 THEN 75
                WHEN AVG(CASE WHEN is_web_page_fails_to_load THEN 1.0 ELSE 0.0 END) < 0.268 THEN 50
                ELSE 25
            END AS score_falha_web
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
            CASE
                WHEN AVG(CASE WHEN is_web_page_fails_to_load THEN 1.0 ELSE 0.0 END) < 0.034 THEN 100
                WHEN AVG(CASE WHEN is_web_page_fails_to_load THEN 1.0 ELSE 0.0 END) < 0.138 THEN 75
                WHEN AVG(CASE WHEN is_web_page_fails_to_load THEN 1.0 ELSE 0.0 END) < 0.268 THEN 50
                ELSE 25
            END
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
        score_rebuffering, score_tempo_inicio, score_is_video_fails_to_start,
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
            (CASE WHEN AVG(CASE WHEN attr_video_rebuffering_count = 0 THEN 1.0 ELSE 0.0 END) >= 0.8 THEN 100 ELSE 0 END) AS score_rebuffering,
            (CASE WHEN AVG(CASE WHEN val_video_time_to_start < 2000 THEN 1.0 ELSE 0.0 END) >= 0.8 THEN 100 ELSE 0 END) AS score_tempo_inicio,
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
            (CASE WHEN AVG(CASE WHEN attr_video_rebuffering_count = 0 THEN 1.0 ELSE 0.0 END) >= 0.8 THEN 100 ELSE 0 END),
            (CASE WHEN AVG(CASE WHEN val_video_time_to_start < 2000 THEN 1.0 ELSE 0.0 END) >= 0.8 THEN 100 ELSE 0 END),
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
        f.avg_val_latency_avg, f.score_val_latency_avg,
        f.avg_val_dl_throughput, f.avg_val_ul_throughput,
        f.score_val_dl_throughput, f.score_val_ul_throughput,
        f.score_throughput_pilar,
        f.throughput_disponivel,
        w.score_val_web_page_load_time, w.score_falha_web,
        w.score_web_pilar,
        v.score_rebuffering, v.score_tempo_inicio, v.score_is_video_fails_to_start,
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
    -- composite_score (mantido — escala 0-10)
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
    'MOVEL'::TEXT AS network_type,
    -- ── Colunas adicionadas (v0016) ────────────────────────────────────────
    score_val_latency_avg::NUMERIC AS score_latencia_pilar,
    score_video_pilar::NUMERIC,
    score_web_pilar::NUMERIC,
    score_throughput_pilar::NUMERIC,
    throughput_disponivel,
    jsonb_build_object(
        'metodo', 'vivo_threshold_v7',
        'pilares', jsonb_build_object(
            'latencia',   jsonb_build_object('avg_ms', avg_val_latency_avg, 'score', score_val_latency_avg),
            'video',      jsonb_build_object(
                'rebuffering',  score_rebuffering,
                'tempo_inicio', score_tempo_inicio,
                'falha_score',  score_is_video_fails_to_start,
                'pilar',        score_video_pilar
            ),
            'web',        jsonb_build_object(
                'carregamento', score_val_web_page_load_time,
                'falha_score',  score_falha_web,
                'pilar',        score_web_pilar
            ),
            'throughput', jsonb_build_object(
                'avg_dl_mbps',     avg_val_dl_throughput,
                'avg_ul_mbps',     avg_val_ul_throughput,
                'score_dl',        score_val_dl_throughput,
                'score_ul',        score_val_ul_throughput,
                'pilar',           score_throughput_pilar,
                'disponivel',      COALESCE(throughput_disponivel, FALSE)
            )
        ),
        'pesos_aplicados', CASE WHEN COALESCE(throughput_disponivel, FALSE)
            THEN jsonb_build_object('latencia', 0.30, 'video', 0.30, 'web', 0.30, 'throughput', 0.10)
            ELSE jsonb_build_object('latencia', 0.35, 'video', 0.30, 'web', 0.35, 'throughput', 0.00)
            END,
        'sample_size', sample_size
    ) AS calc_trace
FROM combinado;--> statement-breakpoint

COMMENT ON VIEW vw_score_mobile IS
    'Score QoE Mobile v7 — componentes de vídeo (rebuffering, tempo_inicio) usam regra threshold ≥ 0.8 → 100/0 (alinhada com método Ookla, substitui o fix per-record da 0013). Demais componentes inalterados.';--> statement-breakpoint


CREATE OR REPLACE VIEW vw_score_fibra AS
WITH
file_score AS (
    SELECT
        gh AS geohash_id, precision, mes AS period_month, operadora AS operator,
        testes_file, score_latencia_pilar,
        avg_val_latency_avg, score_val_latency_avg, score_val_tcp_connect_time,
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
        score_val_web_page_first_byte_time, score_val_web_page_load_time,
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
        score_rebuffering, score_resolucao, score_tempo_inicio, score_is_video_fails_to_start,
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
            (CASE WHEN AVG(CASE WHEN attr_video_rebuffering_count = 0 THEN 1.0 ELSE 0.0 END) >= 0.8 THEN 100 ELSE 0 END) AS score_rebuffering,
            (CASE WHEN AVG(CASE WHEN val_video_time_to_start < 2000 THEN 1.0 ELSE 0.0 END) >= 0.8 THEN 100 ELSE 0 END) AS score_tempo_inicio,
            (CASE WHEN AVG(CASE WHEN (NULLIF(COALESCE(val_video_quality_time_1080p,0) + COALESCE(val_video_quality_time_1440p,0) + COALESCE(val_video_quality_time_2160p,0), 0)::numeric / NULLIF(COALESCE(val_video_quality_time_144p,0) + COALESCE(val_video_quality_time_240p,0) + COALESCE(val_video_quality_time_360p,0) + COALESCE(val_video_quality_time_480p,0) + COALESCE(val_video_quality_time_720p,0) + COALESCE(val_video_quality_time_1080p,0) + COALESCE(val_video_quality_time_1440p,0) + COALESCE(val_video_quality_time_2160p,0), 0)) >= 0.8 THEN 1.0 ELSE 0.0 END) >= 0.8 THEN 100 ELSE 0 END) AS score_resolucao,
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
            (CASE WHEN AVG(CASE WHEN attr_video_rebuffering_count = 0 THEN 1.0 ELSE 0.0 END) >= 0.8 THEN 100 ELSE 0 END),
            (CASE WHEN AVG(CASE WHEN val_video_time_to_start < 2000 THEN 1.0 ELSE 0.0 END) >= 0.8 THEN 100 ELSE 0 END),
            (CASE WHEN AVG(CASE WHEN (NULLIF(COALESCE(val_video_quality_time_1080p,0) + COALESCE(val_video_quality_time_1440p,0) + COALESCE(val_video_quality_time_2160p,0), 0)::numeric / NULLIF(COALESCE(val_video_quality_time_144p,0) + COALESCE(val_video_quality_time_240p,0) + COALESCE(val_video_quality_time_360p,0) + COALESCE(val_video_quality_time_480p,0) + COALESCE(val_video_quality_time_720p,0) + COALESCE(val_video_quality_time_1080p,0) + COALESCE(val_video_quality_time_1440p,0) + COALESCE(val_video_quality_time_2160p,0), 0)) >= 0.8 THEN 1.0 ELSE 0.0 END) >= 0.8 THEN 100 ELSE 0 END),
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
        f.avg_val_latency_avg, f.score_val_latency_avg, f.score_val_tcp_connect_time,
        f.avg_val_dl_throughput, f.avg_val_ul_throughput,
        f.score_val_dl_throughput, f.score_val_ul_throughput,
        f.score_latencia_pilar, f.score_throughput_pilar, f.throughput_disponivel,
        w.score_val_web_page_first_byte_time, w.score_val_web_page_load_time,
        w.score_web_pilar,
        v.score_rebuffering, v.score_resolucao, v.score_tempo_inicio, v.score_is_video_fails_to_start,
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
    'FIBRA'::TEXT AS network_type,
    -- ── Colunas adicionadas (v0016) ────────────────────────────────────────
    score_latencia_pilar::NUMERIC,
    score_video_pilar::NUMERIC,
    score_web_pilar::NUMERIC,
    score_throughput_pilar::NUMERIC,
    throughput_disponivel,
    jsonb_build_object(
        'metodo', 'vivo_threshold_v7_fibra',
        'pilares', jsonb_build_object(
            'responsividade', jsonb_build_object(
                'avg_latency_ms',   avg_val_latency_avg,
                'score_latencia',   score_val_latency_avg,
                'score_tcp_connect', score_val_tcp_connect_time,
                'pilar',            score_latencia_pilar
            ),
            'video', jsonb_build_object(
                'rebuffering',  score_rebuffering,
                'resolucao',    score_resolucao,
                'tempo_inicio', score_tempo_inicio,
                'falha_score',  score_is_video_fails_to_start,
                'pilar',        score_video_pilar
            ),
            'web', jsonb_build_object(
                'first_byte',    score_val_web_page_first_byte_time,
                'carregamento',  score_val_web_page_load_time,
                'pilar',         score_web_pilar
            ),
            'throughput', jsonb_build_object(
                'avg_dl_mbps',  avg_val_dl_throughput,
                'avg_ul_mbps',  avg_val_ul_throughput,
                'score_dl',     score_val_dl_throughput,
                'score_ul',     score_val_ul_throughput,
                'pilar',        score_throughput_pilar,
                'disponivel',   COALESCE(throughput_disponivel, FALSE)
            )
        ),
        'pesos_aplicados', CASE WHEN COALESCE(throughput_disponivel, FALSE)
            THEN jsonb_build_object('responsividade', 0.40, 'video', 0.30, 'web', 0.20, 'throughput', 0.10)
            ELSE jsonb_build_object('responsividade', 0.45, 'video', 0.30, 'web', 0.25, 'throughput', 0.00)
            END,
        'sample_size', sample_size
    ) AS calc_trace
FROM combinado;--> statement-breakpoint

COMMENT ON VIEW vw_score_fibra IS
    'Score QoE Fibra v7 — componentes de vídeo (rebuffering, tempo_inicio, resolucao) usam regra threshold ≥ 0.8 → 100/0 (alinhada com método Ookla, substitui o fix per-record da 0013). Demais componentes inalterados.';--> statement-breakpoint


-- ---------------------------------------------------------------------------
-- 8. CREATE OR REPLACE vw_score_comparativo_mobile
-- ---------------------------------------------------------------------------
-- Junta perna Vivo (vw_score_mobile, precision=7) com perna Ookla
-- (fn_score_ookla_consolidado('mobile', ..., 7)). Restrito a precision=7 porque
-- as funções Ookla não derivam gh6 com a mesma cobertura.

CREATE OR REPLACE VIEW vw_score_comparativo_mobile AS
SELECT
    v.geohash_id, v.precision, v.period_month, v.operator,

    -- ─── Método Vivo (categórico, v6) ───
    v.composite_score          AS vivo_composite_score,    -- escala 0-10
    v.score_latencia_pilar     AS vivo_score_latencia,     -- escala 0-100
    v.score_video_pilar        AS vivo_score_video,
    v.score_web_pilar          AS vivo_score_web,
    v.score_throughput_pilar   AS vivo_score_throughput,
    v.throughput_disponivel    AS vivo_throughput_disponivel,
    v.sample_size              AS vivo_sample_size,
    v.calc_trace               AS vivo_calc_trace,

    -- ─── Método Ookla (logístico, v1) ───
    o.score_download_p10, o.score_download_p50, o.score_download_p90,
    o.score_upload_p10,   o.score_upload_p50,   o.score_upload_p90,
    o.score_lat_down_p10, o.score_lat_down_p50, o.score_lat_down_p90,
    o.score_lat_upl_p10,  o.score_lat_upl_p50,  o.score_lat_upl_p90,
    o.score_download           AS ookla_score_download,
    o.score_upload             AS ookla_score_upload,
    o.score_latencia           AS ookla_score_latencia,
    o.score_speed_pilar        AS ookla_score_speed,
    o.score_rebuffering        AS ookla_score_rebuffering,
    o.score_tempo_inicio       AS ookla_score_tempo_inicio,
    o.score_resolucao          AS ookla_score_resolucao,
    o.score_video_pilar        AS ookla_score_video,
    o.score_web_pilar          AS ookla_score_web,
    o.score_conectividade      AS ookla_score_final,       -- escala 0-100
    o.calc_trace               AS ookla_calc_trace,

    -- ─── Delta (Ookla 0-100 vs Vivo 0-100 = composite × 10) ───
    (o.score_conectividade - v.composite_score * 10.0) AS delta_metodos
FROM vw_score_mobile v
LEFT JOIN LATERAL fn_score_ookla_consolidado('mobile', v.geohash_id,
    EXTRACT(YEAR FROM v.period_month)::INT * 100 + EXTRACT(MONTH FROM v.period_month)::INT,
    v.precision) o ON TRUE
WHERE v.precision = 7;--> statement-breakpoint

COMMENT ON VIEW vw_score_comparativo_mobile IS
    'Visão comparativa Mobile: método Vivo categórico (vw_score_mobile, precision=7) lado a lado com método Ookla logístico (fn_score_ookla_consolidado). delta_metodos compara ambos na mesma escala (0-100, multiplicando vivo_composite × 10).';--> statement-breakpoint


-- ---------------------------------------------------------------------------
-- 9. CREATE OR REPLACE vw_score_comparativo_fibra
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW vw_score_comparativo_fibra AS
SELECT
    v.geohash_id, v.precision, v.period_month, v.operator,

    -- ─── Método Vivo (categórico, v6) ───
    v.composite_score          AS vivo_composite_score,
    v.score_latencia_pilar     AS vivo_score_responsividade,
    v.score_video_pilar        AS vivo_score_video,
    v.score_web_pilar          AS vivo_score_web,
    v.score_throughput_pilar   AS vivo_score_throughput,
    v.throughput_disponivel    AS vivo_throughput_disponivel,
    v.sample_size              AS vivo_sample_size,
    v.calc_trace               AS vivo_calc_trace,

    -- ─── Método Ookla (logístico, v1) ───
    o.score_download_p10, o.score_download_p50, o.score_download_p90,
    o.score_upload_p10,   o.score_upload_p50,   o.score_upload_p90,
    o.score_lat_down_p10, o.score_lat_down_p50, o.score_lat_down_p90,
    o.score_lat_upl_p10,  o.score_lat_upl_p50,  o.score_lat_upl_p90,
    o.score_download           AS ookla_score_download,
    o.score_upload             AS ookla_score_upload,
    o.score_latencia           AS ookla_score_latencia,
    o.score_speed_pilar        AS ookla_score_speed,
    o.score_rebuffering        AS ookla_score_rebuffering,
    o.score_tempo_inicio       AS ookla_score_tempo_inicio,
    o.score_resolucao          AS ookla_score_resolucao,
    o.score_video_pilar        AS ookla_score_video,
    o.score_web_pilar          AS ookla_score_web,
    o.score_conectividade      AS ookla_score_final,
    o.calc_trace               AS ookla_calc_trace,

    (o.score_conectividade - v.composite_score * 10.0) AS delta_metodos
FROM vw_score_fibra v
LEFT JOIN LATERAL fn_score_ookla_consolidado('fixed', v.geohash_id,
    EXTRACT(YEAR FROM v.period_month)::INT * 100 + EXTRACT(MONTH FROM v.period_month)::INT,
    v.precision) o ON TRUE
WHERE v.precision = 7;--> statement-breakpoint

COMMENT ON VIEW vw_score_comparativo_fibra IS
    'Visão comparativa Fibra: método Vivo categórico (vw_score_fibra, precision=7) lado a lado com método Ookla logístico (fn_score_ookla_consolidado modo fixed). delta_metodos compara ambos na mesma escala 0-100.';
