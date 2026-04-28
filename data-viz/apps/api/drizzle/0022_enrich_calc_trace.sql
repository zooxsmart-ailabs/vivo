-- =============================================================================
-- Migration 0022: enriquece calc_trace em mv_score_ookla_mobile/fibra
--
-- O calc_trace das MVs inline (0019/0021) ficou minimalista — só razões
-- intermediárias. Este fix expande para incluir:
--   - raw_percentis (4 métricas × 3 percentis)
--   - scores_parciais (12 valores)
--   - agregados (download/upload/latencia)
--   - speed.pilar
--   - video {razoes, thresholds, scores, pilar}
--   - web {razao, threshold, pilar}
--   - pesos_consolidacao
--   - score_conectividade
--
-- Apenas o JSONB final muda; resto da MV preservado.
-- Aplica em mobile (com filtro is_wifi_connected IS NOT TRUE da 0021) e fibra
-- (com is_wifi_connected = TRUE).
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. mv_score_ookla_mobile
-- ---------------------------------------------------------------------------

DROP MATERIALIZED VIEW IF EXISTS mv_score_ookla_mobile CASCADE;--> statement-breakpoint

CREATE MATERIALIZED VIEW mv_score_ookla_mobile AS
WITH
speed_base AS (
    SELECT attr_geohash7 AS gh,
        CASE WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%CLARO%' THEN 'CLARO' WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%TIM%' THEN 'TIM' WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%VIVO%' THEN 'VIVO' WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%OI%' THEN 'OI' ELSE 'OUTROS' END AS op,
        DATE_TRUNC('month', ts_result)::DATE AS pm,
        val_dl_throughput, val_ul_throughput, val_dl_latency_iqm, val_ul_latency_iqm
    FROM vw_qoe_unified
    WHERE data_source IN ('speedtest_mobile', 'speedtest_fixed')
      AND id_location_type = 1
      AND network_type = 'mobile'
      AND attr_geohash7 IS NOT NULL
),
speed_percentis AS (
    SELECT gh, op, pm, COUNT(*)::INTEGER AS total_testes_speed,
        PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY val_dl_throughput)   AS dl_p10,
        PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY val_dl_throughput)   AS dl_p50,
        PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY val_dl_throughput)   AS dl_p90,
        PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY val_ul_throughput)   AS ul_p10,
        PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY val_ul_throughput)   AS ul_p50,
        PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY val_ul_throughput)   AS ul_p90,
        PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY val_dl_latency_iqm)  AS lat_d_p10,
        PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY val_dl_latency_iqm)  AS lat_d_p50,
        PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY val_dl_latency_iqm)  AS lat_d_p90,
        PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY val_ul_latency_iqm)  AS lat_u_p10,
        PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY val_ul_latency_iqm)  AS lat_u_p50,
        PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY val_ul_latency_iqm)  AS lat_u_p90
    FROM speed_base GROUP BY gh, op, pm
),
speed_params AS (
    SELECT
        MAX(CASE WHEN metric='down'     AND percentile='p10' THEN min_log END) AS dl_p10_ml, MAX(CASE WHEN metric='down' AND percentile='p10' THEN std_dev END) AS dl_p10_sd, MAX(CASE WHEN metric='down' AND percentile='p10' THEN adjust END) AS dl_p10_aj,
        MAX(CASE WHEN metric='down'     AND percentile='p50' THEN min_log END) AS dl_p50_ml, MAX(CASE WHEN metric='down' AND percentile='p50' THEN std_dev END) AS dl_p50_sd, MAX(CASE WHEN metric='down' AND percentile='p50' THEN adjust END) AS dl_p50_aj,
        MAX(CASE WHEN metric='down'     AND percentile='p90' THEN min_log END) AS dl_p90_ml, MAX(CASE WHEN metric='down' AND percentile='p90' THEN std_dev END) AS dl_p90_sd, MAX(CASE WHEN metric='down' AND percentile='p90' THEN adjust END) AS dl_p90_aj,
        MAX(CASE WHEN metric='upl'      AND percentile='p10' THEN min_log END) AS ul_p10_ml, MAX(CASE WHEN metric='upl'  AND percentile='p10' THEN std_dev END) AS ul_p10_sd, MAX(CASE WHEN metric='upl'  AND percentile='p10' THEN adjust END) AS ul_p10_aj,
        MAX(CASE WHEN metric='upl'      AND percentile='p50' THEN min_log END) AS ul_p50_ml, MAX(CASE WHEN metric='upl'  AND percentile='p50' THEN std_dev END) AS ul_p50_sd, MAX(CASE WHEN metric='upl'  AND percentile='p50' THEN adjust END) AS ul_p50_aj,
        MAX(CASE WHEN metric='upl'      AND percentile='p90' THEN min_log END) AS ul_p90_ml, MAX(CASE WHEN metric='upl'  AND percentile='p90' THEN std_dev END) AS ul_p90_sd, MAX(CASE WHEN metric='upl'  AND percentile='p90' THEN adjust END) AS ul_p90_aj,
        MAX(CASE WHEN metric='lat_down' AND percentile='p10' THEN min_log END) AS ld_p10_ml, MAX(CASE WHEN metric='lat_down' AND percentile='p10' THEN std_dev END) AS ld_p10_sd, MAX(CASE WHEN metric='lat_down' AND percentile='p10' THEN adjust END) AS ld_p10_aj,
        MAX(CASE WHEN metric='lat_down' AND percentile='p50' THEN min_log END) AS ld_p50_ml, MAX(CASE WHEN metric='lat_down' AND percentile='p50' THEN std_dev END) AS ld_p50_sd, MAX(CASE WHEN metric='lat_down' AND percentile='p50' THEN adjust END) AS ld_p50_aj,
        MAX(CASE WHEN metric='lat_down' AND percentile='p90' THEN min_log END) AS ld_p90_ml, MAX(CASE WHEN metric='lat_down' AND percentile='p90' THEN std_dev END) AS ld_p90_sd, MAX(CASE WHEN metric='lat_down' AND percentile='p90' THEN adjust END) AS ld_p90_aj,
        MAX(CASE WHEN metric='lat_upl'  AND percentile='p10' THEN min_log END) AS lu_p10_ml, MAX(CASE WHEN metric='lat_upl'  AND percentile='p10' THEN std_dev END) AS lu_p10_sd, MAX(CASE WHEN metric='lat_upl'  AND percentile='p10' THEN adjust END) AS lu_p10_aj,
        MAX(CASE WHEN metric='lat_upl'  AND percentile='p50' THEN min_log END) AS lu_p50_ml, MAX(CASE WHEN metric='lat_upl'  AND percentile='p50' THEN std_dev END) AS lu_p50_sd, MAX(CASE WHEN metric='lat_upl'  AND percentile='p50' THEN adjust END) AS lu_p50_aj,
        MAX(CASE WHEN metric='lat_upl'  AND percentile='p90' THEN min_log END) AS lu_p90_ml, MAX(CASE WHEN metric='lat_upl'  AND percentile='p90' THEN std_dev END) AS lu_p90_sd, MAX(CASE WHEN metric='lat_upl'  AND percentile='p90' THEN adjust END) AS lu_p90_aj
    FROM score_param WHERE mode = 'mobile' AND valid_to IS NULL
),
speed_scores AS (
    SELECT pc.*,
        pa.dl_p10_ml, pa.dl_p10_sd, pa.dl_p10_aj,
        pa.dl_p50_ml, pa.dl_p50_sd, pa.dl_p50_aj,
        pa.dl_p90_ml, pa.dl_p90_sd, pa.dl_p90_aj,
        pa.ul_p10_ml, pa.ul_p10_sd, pa.ul_p10_aj,
        pa.ul_p50_ml, pa.ul_p50_sd, pa.ul_p50_aj,
        pa.ul_p90_ml, pa.ul_p90_sd, pa.ul_p90_aj,
        pa.ld_p10_ml, pa.ld_p10_sd, pa.ld_p10_aj,
        pa.ld_p50_ml, pa.ld_p50_sd, pa.ld_p50_aj,
        pa.ld_p90_ml, pa.ld_p90_sd, pa.ld_p90_aj,
        pa.lu_p10_ml, pa.lu_p10_sd, pa.lu_p10_aj,
        pa.lu_p50_ml, pa.lu_p50_sd, pa.lu_p50_aj,
        pa.lu_p90_ml, pa.lu_p90_sd, pa.lu_p90_aj,
        fn_ookla_logistic_score(pc.dl_p10,    pa.dl_p10_ml, pa.dl_p10_sd, pa.dl_p10_aj, 'a') AS s_dl_p10,
        fn_ookla_logistic_score(pc.dl_p50,    pa.dl_p50_ml, pa.dl_p50_sd, pa.dl_p50_aj, 'a') AS s_dl_p50,
        fn_ookla_logistic_score(pc.dl_p90,    pa.dl_p90_ml, pa.dl_p90_sd, pa.dl_p90_aj, 'a') AS s_dl_p90,
        fn_ookla_logistic_score(pc.ul_p10,    pa.ul_p10_ml, pa.ul_p10_sd, pa.ul_p10_aj, 'a') AS s_ul_p10,
        fn_ookla_logistic_score(pc.ul_p50,    pa.ul_p50_ml, pa.ul_p50_sd, pa.ul_p50_aj, 'a') AS s_ul_p50,
        fn_ookla_logistic_score(pc.ul_p90,    pa.ul_p90_ml, pa.ul_p90_sd, pa.ul_p90_aj, 'a') AS s_ul_p90,
        fn_ookla_logistic_score(pc.lat_d_p10, pa.ld_p10_ml, pa.ld_p10_sd, pa.ld_p10_aj, 'b') AS s_ld_p10,
        fn_ookla_logistic_score(pc.lat_d_p50, pa.ld_p50_ml, pa.ld_p50_sd, pa.ld_p50_aj, 'b') AS s_ld_p50,
        fn_ookla_logistic_score(pc.lat_d_p90, pa.ld_p90_ml, pa.ld_p90_sd, pa.ld_p90_aj, 'b') AS s_ld_p90,
        fn_ookla_logistic_score(pc.lat_u_p10, pa.lu_p10_ml, pa.lu_p10_sd, pa.lu_p10_aj, 'b') AS s_lu_p10,
        fn_ookla_logistic_score(pc.lat_u_p50, pa.lu_p50_ml, pa.lu_p50_sd, pa.lu_p50_aj, 'b') AS s_lu_p50,
        fn_ookla_logistic_score(pc.lat_u_p90, pa.lu_p90_ml, pa.lu_p90_sd, pa.lu_p90_aj, 'b') AS s_lu_p90
    FROM speed_percentis pc CROSS JOIN speed_params pa
),
video_base AS (
    SELECT attr_geohash7 AS gh,
        CASE WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%CLARO%' THEN 'CLARO' WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%TIM%' THEN 'TIM' WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%VIVO%' THEN 'VIVO' WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%OI%' THEN 'OI' ELSE 'OUTROS' END AS op,
        DATE_TRUNC('month', ts_result)::DATE AS pm,
        attr_video_rebuffering_count, val_video_time_to_start,
        CASE
            WHEN NULLIF(COALESCE(val_video_quality_time_144p,0)+COALESCE(val_video_quality_time_240p,0)+COALESCE(val_video_quality_time_360p,0)+COALESCE(val_video_quality_time_480p,0)+COALESCE(val_video_quality_time_720p,0)+COALESCE(val_video_quality_time_1080p,0)+COALESCE(val_video_quality_time_1440p,0)+COALESCE(val_video_quality_time_2160p,0), 0) IS NULL THEN NULL
            ELSE (COALESCE(val_video_quality_time_1080p,0)+COALESCE(val_video_quality_time_1440p,0)+COALESCE(val_video_quality_time_2160p,0))::NUMERIC / NULLIF(COALESCE(val_video_quality_time_144p,0)+COALESCE(val_video_quality_time_240p,0)+COALESCE(val_video_quality_time_360p,0)+COALESCE(val_video_quality_time_480p,0)+COALESCE(val_video_quality_time_720p,0)+COALESCE(val_video_quality_time_1080p,0)+COALESCE(val_video_quality_time_1440p,0)+COALESCE(val_video_quality_time_2160p,0), 0)
        END AS razao_alta_resolucao
    FROM video
    WHERE id_location_type = 1
      AND attr_geohash7 IS NOT NULL
      AND is_wifi_connected IS NOT TRUE
),
video_agg AS (
    SELECT gh, op, pm, COUNT(*)::INTEGER AS total_testes_video,
        AVG((attr_video_rebuffering_count = 0)::INT::NUMERIC) AS razao_sem_rebuffering,
        AVG((val_video_time_to_start < 2000)::INT::NUMERIC)   AS razao_tempo_lt_2s,
        AVG((razao_alta_resolucao >= 0.8)::INT::NUMERIC)      AS razao_alta_res
    FROM video_base GROUP BY gh, op, pm
),
web_base AS (
    SELECT attr_geohash7 AS gh,
        CASE WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%CLARO%' THEN 'CLARO' WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%TIM%' THEN 'TIM' WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%VIVO%' THEN 'VIVO' WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%OI%' THEN 'OI' ELSE 'OUTROS' END AS op,
        DATE_TRUNC('month', ts_result)::DATE AS pm,
        val_web_page_load_time
    FROM web_browsing
    WHERE id_location_type = 1
      AND attr_geohash7 IS NOT NULL
      AND is_wifi_connected IS NOT TRUE
),
web_agg AS (
    SELECT gh, op, pm, COUNT(*)::INTEGER AS total_testes_web,
        AVG((val_web_page_load_time < 5000)::INT::NUMERIC) AS razao_carga_lt_5s
    FROM web_base GROUP BY gh, op, pm
),
joined AS (
    SELECT
        COALESCE(s.gh, v.gh, w.gh) AS gh,
        COALESCE(s.op, v.op, w.op) AS op,
        COALESCE(s.pm, v.pm, w.pm) AS pm,
        s.total_testes_speed,
        s.dl_p10, s.dl_p50, s.dl_p90, s.ul_p10, s.ul_p50, s.ul_p90,
        s.lat_d_p10, s.lat_d_p50, s.lat_d_p90, s.lat_u_p10, s.lat_u_p50, s.lat_u_p90,
        s.dl_p10_ml, s.dl_p10_sd, s.dl_p10_aj, s.dl_p50_ml, s.dl_p50_sd, s.dl_p50_aj, s.dl_p90_ml, s.dl_p90_sd, s.dl_p90_aj,
        s.ul_p10_ml, s.ul_p10_sd, s.ul_p10_aj, s.ul_p50_ml, s.ul_p50_sd, s.ul_p50_aj, s.ul_p90_ml, s.ul_p90_sd, s.ul_p90_aj,
        s.ld_p10_ml, s.ld_p10_sd, s.ld_p10_aj, s.ld_p50_ml, s.ld_p50_sd, s.ld_p50_aj, s.ld_p90_ml, s.ld_p90_sd, s.ld_p90_aj,
        s.lu_p10_ml, s.lu_p10_sd, s.lu_p10_aj, s.lu_p50_ml, s.lu_p50_sd, s.lu_p50_aj, s.lu_p90_ml, s.lu_p90_sd, s.lu_p90_aj,
        s.s_dl_p10, s.s_dl_p50, s.s_dl_p90, s.s_ul_p10, s.s_ul_p50, s.s_ul_p90,
        s.s_ld_p10, s.s_ld_p50, s.s_ld_p90, s.s_lu_p10, s.s_lu_p50, s.s_lu_p90,
        v.total_testes_video, v.razao_sem_rebuffering, v.razao_tempo_lt_2s, v.razao_alta_res,
        w.total_testes_web, w.razao_carga_lt_5s
    FROM speed_scores s
    FULL OUTER JOIN video_agg v ON s.gh=v.gh AND s.op=v.op AND s.pm=v.pm
    FULL OUTER JOIN web_agg w   ON COALESCE(s.gh,v.gh)=w.gh AND COALESCE(s.op,v.op)=w.op AND COALESCE(s.pm,v.pm)=w.pm
)
SELECT
    j.gh AS geohash_id, 7::SMALLINT AS precision, j.pm AS period_month, j.op AS operator,
    j.s_dl_p10 AS score_download_p10, j.s_dl_p50 AS score_download_p50, j.s_dl_p90 AS score_download_p90,
    j.s_ul_p10 AS score_upload_p10,   j.s_ul_p50 AS score_upload_p50,   j.s_ul_p90 AS score_upload_p90,
    j.s_ld_p10 AS score_lat_down_p10, j.s_ld_p50 AS score_lat_down_p50, j.s_ld_p90 AS score_lat_down_p90,
    j.s_lu_p10 AS score_lat_upl_p10,  j.s_lu_p50 AS score_lat_upl_p50,  j.s_lu_p90 AS score_lat_upl_p90,
    (COALESCE(j.s_dl_p10,0)+COALESCE(j.s_dl_p50,0)+COALESCE(j.s_dl_p90,0))::NUMERIC AS score_download,
    (COALESCE(j.s_ul_p10,0)+COALESCE(j.s_ul_p50,0)+COALESCE(j.s_ul_p90,0))::NUMERIC AS score_upload,
    (COALESCE(j.s_ld_p10,0)+COALESCE(j.s_ld_p50,0)+COALESCE(j.s_ld_p90,0)+COALESCE(j.s_lu_p10,0)+COALESCE(j.s_lu_p50,0)+COALESCE(j.s_lu_p90,0))::NUMERIC AS score_latencia,
    ((COALESCE(j.s_dl_p10,0)+COALESCE(j.s_dl_p50,0)+COALESCE(j.s_dl_p90,0)) + (COALESCE(j.s_ul_p10,0)+COALESCE(j.s_ul_p50,0)+COALESCE(j.s_ul_p90,0)) + (COALESCE(j.s_ld_p10,0)+COALESCE(j.s_ld_p50,0)+COALESCE(j.s_ld_p90,0)+COALESCE(j.s_lu_p10,0)+COALESCE(j.s_lu_p50,0)+COALESCE(j.s_lu_p90,0))) / 3.0 AS score_speed_pilar,
    (CASE WHEN j.razao_sem_rebuffering >= 0.8 THEN 100 ELSE 0 END)::NUMERIC AS score_rebuffering,
    (CASE WHEN j.razao_tempo_lt_2s     >= 0.8 THEN 100 ELSE 0 END)::NUMERIC AS score_tempo_inicio,
    (CASE WHEN j.razao_alta_res        >= 0.8 THEN 100 ELSE 0 END)::NUMERIC AS score_resolucao,
    (((CASE WHEN j.razao_sem_rebuffering >= 0.8 THEN 100 ELSE 0 END) + (CASE WHEN j.razao_tempo_lt_2s >= 0.8 THEN 100 ELSE 0 END) + (CASE WHEN j.razao_alta_res >= 0.8 THEN 100 ELSE 0 END)) / 3.0)::NUMERIC AS score_video_pilar,
    (CASE WHEN j.razao_carga_lt_5s >= 0.8 THEN 100 ELSE 0 END)::NUMERIC AS score_web_pilar,
    (
        0.5  * COALESCE( ((COALESCE(j.s_dl_p10,0)+COALESCE(j.s_dl_p50,0)+COALESCE(j.s_dl_p90,0)) + (COALESCE(j.s_ul_p10,0)+COALESCE(j.s_ul_p50,0)+COALESCE(j.s_ul_p90,0)) + (COALESCE(j.s_ld_p10,0)+COALESCE(j.s_ld_p50,0)+COALESCE(j.s_ld_p90,0)+COALESCE(j.s_lu_p10,0)+COALESCE(j.s_lu_p50,0)+COALESCE(j.s_lu_p90,0))) / 3.0, 0)
      + 0.25 * COALESCE( ((CASE WHEN j.razao_sem_rebuffering >= 0.8 THEN 100 ELSE 0 END) + (CASE WHEN j.razao_tempo_lt_2s >= 0.8 THEN 100 ELSE 0 END) + (CASE WHEN j.razao_alta_res >= 0.8 THEN 100 ELSE 0 END)) / 3.0, 0)
      + 0.25 * COALESCE(  CASE WHEN j.razao_carga_lt_5s >= 0.8 THEN 100 ELSE 0 END, 0)
    )::NUMERIC AS score_conectividade,
    -- ─── calc_trace enriquecido ────────────────────────────────────────────
    jsonb_build_object(
        'metodo', 'ookla_consolidado_v2_inline',
        'modo', 'mobile',
        'speed', jsonb_build_object(
            'total_testes', j.total_testes_speed,
            'raw_percentis', jsonb_build_object(
                'download_mbps', jsonb_build_object('p10', j.dl_p10,    'p50', j.dl_p50,    'p90', j.dl_p90),
                'upload_mbps',   jsonb_build_object('p10', j.ul_p10,    'p50', j.ul_p50,    'p90', j.ul_p90),
                'lat_down_ms',   jsonb_build_object('p10', j.lat_d_p10, 'p50', j.lat_d_p50, 'p90', j.lat_d_p90),
                'lat_upl_ms',    jsonb_build_object('p10', j.lat_u_p10, 'p50', j.lat_u_p50, 'p90', j.lat_u_p90)
            ),
            'params_aplicados', jsonb_build_object(
                'download', jsonb_build_object(
                    'p10', jsonb_build_object('min_log', j.dl_p10_ml, 'std_dev', j.dl_p10_sd, 'adjust', j.dl_p10_aj),
                    'p50', jsonb_build_object('min_log', j.dl_p50_ml, 'std_dev', j.dl_p50_sd, 'adjust', j.dl_p50_aj),
                    'p90', jsonb_build_object('min_log', j.dl_p90_ml, 'std_dev', j.dl_p90_sd, 'adjust', j.dl_p90_aj)
                ),
                'upload', jsonb_build_object(
                    'p10', jsonb_build_object('min_log', j.ul_p10_ml, 'std_dev', j.ul_p10_sd, 'adjust', j.ul_p10_aj),
                    'p50', jsonb_build_object('min_log', j.ul_p50_ml, 'std_dev', j.ul_p50_sd, 'adjust', j.ul_p50_aj),
                    'p90', jsonb_build_object('min_log', j.ul_p90_ml, 'std_dev', j.ul_p90_sd, 'adjust', j.ul_p90_aj)
                ),
                'lat_down', jsonb_build_object(
                    'p10', jsonb_build_object('min_log', j.ld_p10_ml, 'std_dev', j.ld_p10_sd, 'adjust', j.ld_p10_aj),
                    'p50', jsonb_build_object('min_log', j.ld_p50_ml, 'std_dev', j.ld_p50_sd, 'adjust', j.ld_p50_aj),
                    'p90', jsonb_build_object('min_log', j.ld_p90_ml, 'std_dev', j.ld_p90_sd, 'adjust', j.ld_p90_aj)
                ),
                'lat_upl', jsonb_build_object(
                    'p10', jsonb_build_object('min_log', j.lu_p10_ml, 'std_dev', j.lu_p10_sd, 'adjust', j.lu_p10_aj),
                    'p50', jsonb_build_object('min_log', j.lu_p50_ml, 'std_dev', j.lu_p50_sd, 'adjust', j.lu_p50_aj),
                    'p90', jsonb_build_object('min_log', j.lu_p90_ml, 'std_dev', j.lu_p90_sd, 'adjust', j.lu_p90_aj)
                )
            ),
            'scores_parciais', jsonb_build_object(
                'download', jsonb_build_object('p10', j.s_dl_p10, 'p50', j.s_dl_p50, 'p90', j.s_dl_p90),
                'upload',   jsonb_build_object('p10', j.s_ul_p10, 'p50', j.s_ul_p50, 'p90', j.s_ul_p90),
                'lat_down', jsonb_build_object('p10', j.s_ld_p10, 'p50', j.s_ld_p50, 'p90', j.s_ld_p90),
                'lat_upl',  jsonb_build_object('p10', j.s_lu_p10, 'p50', j.s_lu_p50, 'p90', j.s_lu_p90)
            ),
            'agregados', jsonb_build_object(
                'download', (COALESCE(j.s_dl_p10,0)+COALESCE(j.s_dl_p50,0)+COALESCE(j.s_dl_p90,0)),
                'upload',   (COALESCE(j.s_ul_p10,0)+COALESCE(j.s_ul_p50,0)+COALESCE(j.s_ul_p90,0)),
                'latencia', (COALESCE(j.s_ld_p10,0)+COALESCE(j.s_ld_p50,0)+COALESCE(j.s_ld_p90,0)+COALESCE(j.s_lu_p10,0)+COALESCE(j.s_lu_p50,0)+COALESCE(j.s_lu_p90,0))
            ),
            'pilar', ((COALESCE(j.s_dl_p10,0)+COALESCE(j.s_dl_p50,0)+COALESCE(j.s_dl_p90,0)) + (COALESCE(j.s_ul_p10,0)+COALESCE(j.s_ul_p50,0)+COALESCE(j.s_ul_p90,0)) + (COALESCE(j.s_ld_p10,0)+COALESCE(j.s_ld_p50,0)+COALESCE(j.s_ld_p90,0)+COALESCE(j.s_lu_p10,0)+COALESCE(j.s_lu_p50,0)+COALESCE(j.s_lu_p90,0))) / 3.0
        ),
        'video', jsonb_build_object(
            'total_testes', j.total_testes_video,
            'razoes', jsonb_build_object(
                'sem_rebuffering', j.razao_sem_rebuffering,
                'tempo_lt_2s',     j.razao_tempo_lt_2s,
                'alta_resolucao',  j.razao_alta_res
            ),
            'thresholds', jsonb_build_object('sem_rebuffering', 0.8, 'tempo_lt_2s', 0.8, 'alta_resolucao', 0.8),
            'scores', jsonb_build_object(
                'rebuffering',  CASE WHEN j.razao_sem_rebuffering >= 0.8 THEN 100 ELSE 0 END,
                'tempo_inicio', CASE WHEN j.razao_tempo_lt_2s     >= 0.8 THEN 100 ELSE 0 END,
                'resolucao',    CASE WHEN j.razao_alta_res        >= 0.8 THEN 100 ELSE 0 END
            ),
            'pilar', ((CASE WHEN j.razao_sem_rebuffering >= 0.8 THEN 100 ELSE 0 END) + (CASE WHEN j.razao_tempo_lt_2s >= 0.8 THEN 100 ELSE 0 END) + (CASE WHEN j.razao_alta_res >= 0.8 THEN 100 ELSE 0 END)) / 3.0
        ),
        'web', jsonb_build_object(
            'total_testes', j.total_testes_web,
            'razao_carga_lt_5s', j.razao_carga_lt_5s,
            'threshold', 0.8,
            'pilar', CASE WHEN j.razao_carga_lt_5s >= 0.8 THEN 100 ELSE 0 END
        ),
        'pesos_consolidacao', jsonb_build_object('speed', 0.5, 'video', 0.25, 'web', 0.25),
        'score_conectividade',
            (0.5  * COALESCE( ((COALESCE(j.s_dl_p10,0)+COALESCE(j.s_dl_p50,0)+COALESCE(j.s_dl_p90,0)) + (COALESCE(j.s_ul_p10,0)+COALESCE(j.s_ul_p50,0)+COALESCE(j.s_ul_p90,0)) + (COALESCE(j.s_ld_p10,0)+COALESCE(j.s_ld_p50,0)+COALESCE(j.s_ld_p90,0)+COALESCE(j.s_lu_p10,0)+COALESCE(j.s_lu_p50,0)+COALESCE(j.s_lu_p90,0))) / 3.0, 0)
           + 0.25 * COALESCE( ((CASE WHEN j.razao_sem_rebuffering >= 0.8 THEN 100 ELSE 0 END) + (CASE WHEN j.razao_tempo_lt_2s >= 0.8 THEN 100 ELSE 0 END) + (CASE WHEN j.razao_alta_res >= 0.8 THEN 100 ELSE 0 END)) / 3.0, 0)
           + 0.25 * COALESCE(  CASE WHEN j.razao_carga_lt_5s >= 0.8 THEN 100 ELSE 0 END, 0))
    ) AS calc_trace
FROM joined j
WITH NO DATA;--> statement-breakpoint

CREATE UNIQUE INDEX mv_score_ookla_mobile_pk
    ON mv_score_ookla_mobile (geohash_id, precision, period_month, operator);--> statement-breakpoint

CREATE INDEX mv_score_ookla_mobile_period_idx
    ON mv_score_ookla_mobile (precision, period_month);--> statement-breakpoint

COMMENT ON MATERIALIZED VIEW mv_score_ookla_mobile IS
    'Snapshot diário do método Ookla logístico (mobile). v3: calc_trace enriquecido (raw_percentis + params + scores_parciais + agregados + video/web detalhado). WITH NO DATA — popular via REFRESH.';--> statement-breakpoint


-- ---------------------------------------------------------------------------
-- 2. mv_score_ookla_fibra (mesmo trace enriquecido)
-- ---------------------------------------------------------------------------

DROP MATERIALIZED VIEW IF EXISTS mv_score_ookla_fibra CASCADE;--> statement-breakpoint

CREATE MATERIALIZED VIEW mv_score_ookla_fibra AS
WITH
speed_base AS (
    SELECT attr_geohash7 AS gh,
        CASE WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%CLARO%' THEN 'CLARO' WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%TIM%' THEN 'TIM' WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%VIVO%' THEN 'VIVO' WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%OI%' THEN 'OI' ELSE 'OUTROS' END AS op,
        DATE_TRUNC('month', ts_result)::DATE AS pm,
        val_dl_throughput, val_ul_throughput, val_dl_latency_iqm, val_ul_latency_iqm
    FROM vw_qoe_unified
    WHERE data_source IN ('speedtest_mobile', 'speedtest_fixed')
      AND id_location_type = 1
      AND network_type = 'fixed'
      AND attr_geohash7 IS NOT NULL
),
speed_percentis AS (
    SELECT gh, op, pm, COUNT(*)::INTEGER AS total_testes_speed,
        PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY val_dl_throughput)  AS dl_p10,
        PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY val_dl_throughput)  AS dl_p50,
        PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY val_dl_throughput)  AS dl_p90,
        PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY val_ul_throughput)  AS ul_p10,
        PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY val_ul_throughput)  AS ul_p50,
        PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY val_ul_throughput)  AS ul_p90,
        PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY val_dl_latency_iqm) AS lat_d_p10,
        PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY val_dl_latency_iqm) AS lat_d_p50,
        PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY val_dl_latency_iqm) AS lat_d_p90,
        PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY val_ul_latency_iqm) AS lat_u_p10,
        PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY val_ul_latency_iqm) AS lat_u_p50,
        PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY val_ul_latency_iqm) AS lat_u_p90
    FROM speed_base GROUP BY gh, op, pm
),
speed_params AS (
    SELECT
        MAX(CASE WHEN metric='down'     AND percentile='p10' THEN min_log END) AS dl_p10_ml, MAX(CASE WHEN metric='down' AND percentile='p10' THEN std_dev END) AS dl_p10_sd, MAX(CASE WHEN metric='down' AND percentile='p10' THEN adjust END) AS dl_p10_aj,
        MAX(CASE WHEN metric='down'     AND percentile='p50' THEN min_log END) AS dl_p50_ml, MAX(CASE WHEN metric='down' AND percentile='p50' THEN std_dev END) AS dl_p50_sd, MAX(CASE WHEN metric='down' AND percentile='p50' THEN adjust END) AS dl_p50_aj,
        MAX(CASE WHEN metric='down'     AND percentile='p90' THEN min_log END) AS dl_p90_ml, MAX(CASE WHEN metric='down' AND percentile='p90' THEN std_dev END) AS dl_p90_sd, MAX(CASE WHEN metric='down' AND percentile='p90' THEN adjust END) AS dl_p90_aj,
        MAX(CASE WHEN metric='upl'      AND percentile='p10' THEN min_log END) AS ul_p10_ml, MAX(CASE WHEN metric='upl'  AND percentile='p10' THEN std_dev END) AS ul_p10_sd, MAX(CASE WHEN metric='upl'  AND percentile='p10' THEN adjust END) AS ul_p10_aj,
        MAX(CASE WHEN metric='upl'      AND percentile='p50' THEN min_log END) AS ul_p50_ml, MAX(CASE WHEN metric='upl'  AND percentile='p50' THEN std_dev END) AS ul_p50_sd, MAX(CASE WHEN metric='upl'  AND percentile='p50' THEN adjust END) AS ul_p50_aj,
        MAX(CASE WHEN metric='upl'      AND percentile='p90' THEN min_log END) AS ul_p90_ml, MAX(CASE WHEN metric='upl'  AND percentile='p90' THEN std_dev END) AS ul_p90_sd, MAX(CASE WHEN metric='upl'  AND percentile='p90' THEN adjust END) AS ul_p90_aj,
        MAX(CASE WHEN metric='lat_down' AND percentile='p10' THEN min_log END) AS ld_p10_ml, MAX(CASE WHEN metric='lat_down' AND percentile='p10' THEN std_dev END) AS ld_p10_sd, MAX(CASE WHEN metric='lat_down' AND percentile='p10' THEN adjust END) AS ld_p10_aj,
        MAX(CASE WHEN metric='lat_down' AND percentile='p50' THEN min_log END) AS ld_p50_ml, MAX(CASE WHEN metric='lat_down' AND percentile='p50' THEN std_dev END) AS ld_p50_sd, MAX(CASE WHEN metric='lat_down' AND percentile='p50' THEN adjust END) AS ld_p50_aj,
        MAX(CASE WHEN metric='lat_down' AND percentile='p90' THEN min_log END) AS ld_p90_ml, MAX(CASE WHEN metric='lat_down' AND percentile='p90' THEN std_dev END) AS ld_p90_sd, MAX(CASE WHEN metric='lat_down' AND percentile='p90' THEN adjust END) AS ld_p90_aj,
        MAX(CASE WHEN metric='lat_upl'  AND percentile='p10' THEN min_log END) AS lu_p10_ml, MAX(CASE WHEN metric='lat_upl'  AND percentile='p10' THEN std_dev END) AS lu_p10_sd, MAX(CASE WHEN metric='lat_upl'  AND percentile='p10' THEN adjust END) AS lu_p10_aj,
        MAX(CASE WHEN metric='lat_upl'  AND percentile='p50' THEN min_log END) AS lu_p50_ml, MAX(CASE WHEN metric='lat_upl'  AND percentile='p50' THEN std_dev END) AS lu_p50_sd, MAX(CASE WHEN metric='lat_upl'  AND percentile='p50' THEN adjust END) AS lu_p50_aj,
        MAX(CASE WHEN metric='lat_upl'  AND percentile='p90' THEN min_log END) AS lu_p90_ml, MAX(CASE WHEN metric='lat_upl'  AND percentile='p90' THEN std_dev END) AS lu_p90_sd, MAX(CASE WHEN metric='lat_upl'  AND percentile='p90' THEN adjust END) AS lu_p90_aj
    FROM score_param WHERE mode = 'fixed' AND valid_to IS NULL
),
speed_scores AS (
    SELECT pc.*,
        pa.dl_p10_ml, pa.dl_p10_sd, pa.dl_p10_aj, pa.dl_p50_ml, pa.dl_p50_sd, pa.dl_p50_aj, pa.dl_p90_ml, pa.dl_p90_sd, pa.dl_p90_aj,
        pa.ul_p10_ml, pa.ul_p10_sd, pa.ul_p10_aj, pa.ul_p50_ml, pa.ul_p50_sd, pa.ul_p50_aj, pa.ul_p90_ml, pa.ul_p90_sd, pa.ul_p90_aj,
        pa.ld_p10_ml, pa.ld_p10_sd, pa.ld_p10_aj, pa.ld_p50_ml, pa.ld_p50_sd, pa.ld_p50_aj, pa.ld_p90_ml, pa.ld_p90_sd, pa.ld_p90_aj,
        pa.lu_p10_ml, pa.lu_p10_sd, pa.lu_p10_aj, pa.lu_p50_ml, pa.lu_p50_sd, pa.lu_p50_aj, pa.lu_p90_ml, pa.lu_p90_sd, pa.lu_p90_aj,
        fn_ookla_logistic_score(pc.dl_p10,    pa.dl_p10_ml, pa.dl_p10_sd, pa.dl_p10_aj, 'a') AS s_dl_p10,
        fn_ookla_logistic_score(pc.dl_p50,    pa.dl_p50_ml, pa.dl_p50_sd, pa.dl_p50_aj, 'a') AS s_dl_p50,
        fn_ookla_logistic_score(pc.dl_p90,    pa.dl_p90_ml, pa.dl_p90_sd, pa.dl_p90_aj, 'a') AS s_dl_p90,
        fn_ookla_logistic_score(pc.ul_p10,    pa.ul_p10_ml, pa.ul_p10_sd, pa.ul_p10_aj, 'a') AS s_ul_p10,
        fn_ookla_logistic_score(pc.ul_p50,    pa.ul_p50_ml, pa.ul_p50_sd, pa.ul_p50_aj, 'a') AS s_ul_p50,
        fn_ookla_logistic_score(pc.ul_p90,    pa.ul_p90_ml, pa.ul_p90_sd, pa.ul_p90_aj, 'a') AS s_ul_p90,
        fn_ookla_logistic_score(pc.lat_d_p10, pa.ld_p10_ml, pa.ld_p10_sd, pa.ld_p10_aj, 'b') AS s_ld_p10,
        fn_ookla_logistic_score(pc.lat_d_p50, pa.ld_p50_ml, pa.ld_p50_sd, pa.ld_p50_aj, 'b') AS s_ld_p50,
        fn_ookla_logistic_score(pc.lat_d_p90, pa.ld_p90_ml, pa.ld_p90_sd, pa.ld_p90_aj, 'b') AS s_ld_p90,
        fn_ookla_logistic_score(pc.lat_u_p10, pa.lu_p10_ml, pa.lu_p10_sd, pa.lu_p10_aj, 'b') AS s_lu_p10,
        fn_ookla_logistic_score(pc.lat_u_p50, pa.lu_p50_ml, pa.lu_p50_sd, pa.lu_p50_aj, 'b') AS s_lu_p50,
        fn_ookla_logistic_score(pc.lat_u_p90, pa.lu_p90_ml, pa.lu_p90_sd, pa.lu_p90_aj, 'b') AS s_lu_p90
    FROM speed_percentis pc CROSS JOIN speed_params pa
),
video_base AS (
    SELECT attr_geohash7 AS gh,
        CASE WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%CLARO%' THEN 'CLARO' WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%TIM%' THEN 'TIM' WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%VIVO%' THEN 'VIVO' WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%OI%' THEN 'OI' ELSE 'OUTROS' END AS op,
        DATE_TRUNC('month', ts_result)::DATE AS pm,
        attr_video_rebuffering_count, val_video_time_to_start,
        CASE
            WHEN NULLIF(COALESCE(val_video_quality_time_144p,0)+COALESCE(val_video_quality_time_240p,0)+COALESCE(val_video_quality_time_360p,0)+COALESCE(val_video_quality_time_480p,0)+COALESCE(val_video_quality_time_720p,0)+COALESCE(val_video_quality_time_1080p,0)+COALESCE(val_video_quality_time_1440p,0)+COALESCE(val_video_quality_time_2160p,0), 0) IS NULL THEN NULL
            ELSE (COALESCE(val_video_quality_time_1080p,0)+COALESCE(val_video_quality_time_1440p,0)+COALESCE(val_video_quality_time_2160p,0))::NUMERIC / NULLIF(COALESCE(val_video_quality_time_144p,0)+COALESCE(val_video_quality_time_240p,0)+COALESCE(val_video_quality_time_360p,0)+COALESCE(val_video_quality_time_480p,0)+COALESCE(val_video_quality_time_720p,0)+COALESCE(val_video_quality_time_1080p,0)+COALESCE(val_video_quality_time_1440p,0)+COALESCE(val_video_quality_time_2160p,0), 0)
        END AS razao_alta_resolucao
    FROM video
    WHERE id_location_type = 1
      AND attr_geohash7 IS NOT NULL
      AND is_wifi_connected = TRUE
),
video_agg AS (
    SELECT gh, op, pm, COUNT(*)::INTEGER AS total_testes_video,
        AVG((attr_video_rebuffering_count = 0)::INT::NUMERIC) AS razao_sem_rebuffering,
        AVG((val_video_time_to_start < 2000)::INT::NUMERIC)   AS razao_tempo_lt_2s,
        AVG((razao_alta_resolucao >= 0.8)::INT::NUMERIC)      AS razao_alta_res
    FROM video_base GROUP BY gh, op, pm
),
web_base AS (
    SELECT attr_geohash7 AS gh,
        CASE WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%CLARO%' THEN 'CLARO' WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%TIM%' THEN 'TIM' WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%VIVO%' THEN 'VIVO' WHEN UPPER(TRIM(attr_sim_operator_common_name)) LIKE '%OI%' THEN 'OI' ELSE 'OUTROS' END AS op,
        DATE_TRUNC('month', ts_result)::DATE AS pm,
        val_web_page_load_time
    FROM web_browsing
    WHERE id_location_type = 1
      AND attr_geohash7 IS NOT NULL
      AND is_wifi_connected = TRUE
),
web_agg AS (
    SELECT gh, op, pm, COUNT(*)::INTEGER AS total_testes_web,
        AVG((val_web_page_load_time < 5000)::INT::NUMERIC) AS razao_carga_lt_5s
    FROM web_base GROUP BY gh, op, pm
),
joined AS (
    SELECT
        COALESCE(s.gh, v.gh, w.gh) AS gh,
        COALESCE(s.op, v.op, w.op) AS op,
        COALESCE(s.pm, v.pm, w.pm) AS pm,
        s.total_testes_speed,
        s.dl_p10, s.dl_p50, s.dl_p90, s.ul_p10, s.ul_p50, s.ul_p90,
        s.lat_d_p10, s.lat_d_p50, s.lat_d_p90, s.lat_u_p10, s.lat_u_p50, s.lat_u_p90,
        s.dl_p10_ml, s.dl_p10_sd, s.dl_p10_aj, s.dl_p50_ml, s.dl_p50_sd, s.dl_p50_aj, s.dl_p90_ml, s.dl_p90_sd, s.dl_p90_aj,
        s.ul_p10_ml, s.ul_p10_sd, s.ul_p10_aj, s.ul_p50_ml, s.ul_p50_sd, s.ul_p50_aj, s.ul_p90_ml, s.ul_p90_sd, s.ul_p90_aj,
        s.ld_p10_ml, s.ld_p10_sd, s.ld_p10_aj, s.ld_p50_ml, s.ld_p50_sd, s.ld_p50_aj, s.ld_p90_ml, s.ld_p90_sd, s.ld_p90_aj,
        s.lu_p10_ml, s.lu_p10_sd, s.lu_p10_aj, s.lu_p50_ml, s.lu_p50_sd, s.lu_p50_aj, s.lu_p90_ml, s.lu_p90_sd, s.lu_p90_aj,
        s.s_dl_p10, s.s_dl_p50, s.s_dl_p90, s.s_ul_p10, s.s_ul_p50, s.s_ul_p90,
        s.s_ld_p10, s.s_ld_p50, s.s_ld_p90, s.s_lu_p10, s.s_lu_p50, s.s_lu_p90,
        v.total_testes_video, v.razao_sem_rebuffering, v.razao_tempo_lt_2s, v.razao_alta_res,
        w.total_testes_web, w.razao_carga_lt_5s
    FROM speed_scores s
    FULL OUTER JOIN video_agg v ON s.gh=v.gh AND s.op=v.op AND s.pm=v.pm
    FULL OUTER JOIN web_agg w   ON COALESCE(s.gh,v.gh)=w.gh AND COALESCE(s.op,v.op)=w.op AND COALESCE(s.pm,v.pm)=w.pm
)
SELECT
    j.gh AS geohash_id, 7::SMALLINT AS precision, j.pm AS period_month, j.op AS operator,
    j.s_dl_p10 AS score_download_p10, j.s_dl_p50 AS score_download_p50, j.s_dl_p90 AS score_download_p90,
    j.s_ul_p10 AS score_upload_p10,   j.s_ul_p50 AS score_upload_p50,   j.s_ul_p90 AS score_upload_p90,
    j.s_ld_p10 AS score_lat_down_p10, j.s_ld_p50 AS score_lat_down_p50, j.s_ld_p90 AS score_lat_down_p90,
    j.s_lu_p10 AS score_lat_upl_p10,  j.s_lu_p50 AS score_lat_upl_p50,  j.s_lu_p90 AS score_lat_upl_p90,
    (COALESCE(j.s_dl_p10,0)+COALESCE(j.s_dl_p50,0)+COALESCE(j.s_dl_p90,0))::NUMERIC AS score_download,
    (COALESCE(j.s_ul_p10,0)+COALESCE(j.s_ul_p50,0)+COALESCE(j.s_ul_p90,0))::NUMERIC AS score_upload,
    (COALESCE(j.s_ld_p10,0)+COALESCE(j.s_ld_p50,0)+COALESCE(j.s_ld_p90,0)+COALESCE(j.s_lu_p10,0)+COALESCE(j.s_lu_p50,0)+COALESCE(j.s_lu_p90,0))::NUMERIC AS score_latencia,
    ((COALESCE(j.s_dl_p10,0)+COALESCE(j.s_dl_p50,0)+COALESCE(j.s_dl_p90,0)) + (COALESCE(j.s_ul_p10,0)+COALESCE(j.s_ul_p50,0)+COALESCE(j.s_ul_p90,0)) + (COALESCE(j.s_ld_p10,0)+COALESCE(j.s_ld_p50,0)+COALESCE(j.s_ld_p90,0)+COALESCE(j.s_lu_p10,0)+COALESCE(j.s_lu_p50,0)+COALESCE(j.s_lu_p90,0))) / 3.0 AS score_speed_pilar,
    (CASE WHEN j.razao_sem_rebuffering >= 0.8 THEN 100 ELSE 0 END)::NUMERIC AS score_rebuffering,
    (CASE WHEN j.razao_tempo_lt_2s     >= 0.8 THEN 100 ELSE 0 END)::NUMERIC AS score_tempo_inicio,
    (CASE WHEN j.razao_alta_res        >= 0.8 THEN 100 ELSE 0 END)::NUMERIC AS score_resolucao,
    (((CASE WHEN j.razao_sem_rebuffering >= 0.8 THEN 100 ELSE 0 END) + (CASE WHEN j.razao_tempo_lt_2s >= 0.8 THEN 100 ELSE 0 END) + (CASE WHEN j.razao_alta_res >= 0.8 THEN 100 ELSE 0 END)) / 3.0)::NUMERIC AS score_video_pilar,
    (CASE WHEN j.razao_carga_lt_5s >= 0.8 THEN 100 ELSE 0 END)::NUMERIC AS score_web_pilar,
    (
        0.5  * COALESCE( ((COALESCE(j.s_dl_p10,0)+COALESCE(j.s_dl_p50,0)+COALESCE(j.s_dl_p90,0)) + (COALESCE(j.s_ul_p10,0)+COALESCE(j.s_ul_p50,0)+COALESCE(j.s_ul_p90,0)) + (COALESCE(j.s_ld_p10,0)+COALESCE(j.s_ld_p50,0)+COALESCE(j.s_ld_p90,0)+COALESCE(j.s_lu_p10,0)+COALESCE(j.s_lu_p50,0)+COALESCE(j.s_lu_p90,0))) / 3.0, 0)
      + 0.25 * COALESCE( ((CASE WHEN j.razao_sem_rebuffering >= 0.8 THEN 100 ELSE 0 END) + (CASE WHEN j.razao_tempo_lt_2s >= 0.8 THEN 100 ELSE 0 END) + (CASE WHEN j.razao_alta_res >= 0.8 THEN 100 ELSE 0 END)) / 3.0, 0)
      + 0.25 * COALESCE(  CASE WHEN j.razao_carga_lt_5s >= 0.8 THEN 100 ELSE 0 END, 0)
    )::NUMERIC AS score_conectividade,
    jsonb_build_object(
        'metodo', 'ookla_consolidado_v2_inline',
        'modo', 'fixed',
        'speed', jsonb_build_object(
            'total_testes', j.total_testes_speed,
            'raw_percentis', jsonb_build_object(
                'download_mbps', jsonb_build_object('p10', j.dl_p10,    'p50', j.dl_p50,    'p90', j.dl_p90),
                'upload_mbps',   jsonb_build_object('p10', j.ul_p10,    'p50', j.ul_p50,    'p90', j.ul_p90),
                'lat_down_ms',   jsonb_build_object('p10', j.lat_d_p10, 'p50', j.lat_d_p50, 'p90', j.lat_d_p90),
                'lat_upl_ms',    jsonb_build_object('p10', j.lat_u_p10, 'p50', j.lat_u_p50, 'p90', j.lat_u_p90)
            ),
            'params_aplicados', jsonb_build_object(
                'download', jsonb_build_object(
                    'p10', jsonb_build_object('min_log', j.dl_p10_ml, 'std_dev', j.dl_p10_sd, 'adjust', j.dl_p10_aj),
                    'p50', jsonb_build_object('min_log', j.dl_p50_ml, 'std_dev', j.dl_p50_sd, 'adjust', j.dl_p50_aj),
                    'p90', jsonb_build_object('min_log', j.dl_p90_ml, 'std_dev', j.dl_p90_sd, 'adjust', j.dl_p90_aj)
                ),
                'upload', jsonb_build_object(
                    'p10', jsonb_build_object('min_log', j.ul_p10_ml, 'std_dev', j.ul_p10_sd, 'adjust', j.ul_p10_aj),
                    'p50', jsonb_build_object('min_log', j.ul_p50_ml, 'std_dev', j.ul_p50_sd, 'adjust', j.ul_p50_aj),
                    'p90', jsonb_build_object('min_log', j.ul_p90_ml, 'std_dev', j.ul_p90_sd, 'adjust', j.ul_p90_aj)
                ),
                'lat_down', jsonb_build_object(
                    'p10', jsonb_build_object('min_log', j.ld_p10_ml, 'std_dev', j.ld_p10_sd, 'adjust', j.ld_p10_aj),
                    'p50', jsonb_build_object('min_log', j.ld_p50_ml, 'std_dev', j.ld_p50_sd, 'adjust', j.ld_p50_aj),
                    'p90', jsonb_build_object('min_log', j.ld_p90_ml, 'std_dev', j.ld_p90_sd, 'adjust', j.ld_p90_aj)
                ),
                'lat_upl', jsonb_build_object(
                    'p10', jsonb_build_object('min_log', j.lu_p10_ml, 'std_dev', j.lu_p10_sd, 'adjust', j.lu_p10_aj),
                    'p50', jsonb_build_object('min_log', j.lu_p50_ml, 'std_dev', j.lu_p50_sd, 'adjust', j.lu_p50_aj),
                    'p90', jsonb_build_object('min_log', j.lu_p90_ml, 'std_dev', j.lu_p90_sd, 'adjust', j.lu_p90_aj)
                )
            ),
            'scores_parciais', jsonb_build_object(
                'download', jsonb_build_object('p10', j.s_dl_p10, 'p50', j.s_dl_p50, 'p90', j.s_dl_p90),
                'upload',   jsonb_build_object('p10', j.s_ul_p10, 'p50', j.s_ul_p50, 'p90', j.s_ul_p90),
                'lat_down', jsonb_build_object('p10', j.s_ld_p10, 'p50', j.s_ld_p50, 'p90', j.s_ld_p90),
                'lat_upl',  jsonb_build_object('p10', j.s_lu_p10, 'p50', j.s_lu_p50, 'p90', j.s_lu_p90)
            ),
            'agregados', jsonb_build_object(
                'download', (COALESCE(j.s_dl_p10,0)+COALESCE(j.s_dl_p50,0)+COALESCE(j.s_dl_p90,0)),
                'upload',   (COALESCE(j.s_ul_p10,0)+COALESCE(j.s_ul_p50,0)+COALESCE(j.s_ul_p90,0)),
                'latencia', (COALESCE(j.s_ld_p10,0)+COALESCE(j.s_ld_p50,0)+COALESCE(j.s_ld_p90,0)+COALESCE(j.s_lu_p10,0)+COALESCE(j.s_lu_p50,0)+COALESCE(j.s_lu_p90,0))
            ),
            'pilar', ((COALESCE(j.s_dl_p10,0)+COALESCE(j.s_dl_p50,0)+COALESCE(j.s_dl_p90,0)) + (COALESCE(j.s_ul_p10,0)+COALESCE(j.s_ul_p50,0)+COALESCE(j.s_ul_p90,0)) + (COALESCE(j.s_ld_p10,0)+COALESCE(j.s_ld_p50,0)+COALESCE(j.s_ld_p90,0)+COALESCE(j.s_lu_p10,0)+COALESCE(j.s_lu_p50,0)+COALESCE(j.s_lu_p90,0))) / 3.0
        ),
        'video', jsonb_build_object(
            'total_testes', j.total_testes_video,
            'razoes', jsonb_build_object(
                'sem_rebuffering', j.razao_sem_rebuffering,
                'tempo_lt_2s',     j.razao_tempo_lt_2s,
                'alta_resolucao',  j.razao_alta_res
            ),
            'thresholds', jsonb_build_object('sem_rebuffering', 0.8, 'tempo_lt_2s', 0.8, 'alta_resolucao', 0.8),
            'scores', jsonb_build_object(
                'rebuffering',  CASE WHEN j.razao_sem_rebuffering >= 0.8 THEN 100 ELSE 0 END,
                'tempo_inicio', CASE WHEN j.razao_tempo_lt_2s     >= 0.8 THEN 100 ELSE 0 END,
                'resolucao',    CASE WHEN j.razao_alta_res        >= 0.8 THEN 100 ELSE 0 END
            ),
            'pilar', ((CASE WHEN j.razao_sem_rebuffering >= 0.8 THEN 100 ELSE 0 END) + (CASE WHEN j.razao_tempo_lt_2s >= 0.8 THEN 100 ELSE 0 END) + (CASE WHEN j.razao_alta_res >= 0.8 THEN 100 ELSE 0 END)) / 3.0
        ),
        'web', jsonb_build_object(
            'total_testes', j.total_testes_web,
            'razao_carga_lt_5s', j.razao_carga_lt_5s,
            'threshold', 0.8,
            'pilar', CASE WHEN j.razao_carga_lt_5s >= 0.8 THEN 100 ELSE 0 END
        ),
        'pesos_consolidacao', jsonb_build_object('speed', 0.5, 'video', 0.25, 'web', 0.25),
        'score_conectividade',
            (0.5  * COALESCE( ((COALESCE(j.s_dl_p10,0)+COALESCE(j.s_dl_p50,0)+COALESCE(j.s_dl_p90,0)) + (COALESCE(j.s_ul_p10,0)+COALESCE(j.s_ul_p50,0)+COALESCE(j.s_ul_p90,0)) + (COALESCE(j.s_ld_p10,0)+COALESCE(j.s_ld_p50,0)+COALESCE(j.s_ld_p90,0)+COALESCE(j.s_lu_p10,0)+COALESCE(j.s_lu_p50,0)+COALESCE(j.s_lu_p90,0))) / 3.0, 0)
           + 0.25 * COALESCE( ((CASE WHEN j.razao_sem_rebuffering >= 0.8 THEN 100 ELSE 0 END) + (CASE WHEN j.razao_tempo_lt_2s >= 0.8 THEN 100 ELSE 0 END) + (CASE WHEN j.razao_alta_res >= 0.8 THEN 100 ELSE 0 END)) / 3.0, 0)
           + 0.25 * COALESCE(  CASE WHEN j.razao_carga_lt_5s >= 0.8 THEN 100 ELSE 0 END, 0))
    ) AS calc_trace
FROM joined j
WITH NO DATA;--> statement-breakpoint

CREATE UNIQUE INDEX mv_score_ookla_fibra_pk
    ON mv_score_ookla_fibra (geohash_id, precision, period_month, operator);--> statement-breakpoint

CREATE INDEX mv_score_ookla_fibra_period_idx
    ON mv_score_ookla_fibra (precision, period_month);--> statement-breakpoint

COMMENT ON MATERIALIZED VIEW mv_score_ookla_fibra IS
    'Snapshot diário do método Ookla logístico (fixed/fibra). v3: calc_trace enriquecido. WITH NO DATA — popular via REFRESH.';--> statement-breakpoint


-- ---------------------------------------------------------------------------
-- 3. Recriar views comparativas (CASCADE drop derruba)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW vw_score_comparativo_mobile AS
SELECT
    v.geohash_id, v.precision, v.period_month, v.operator,
    v.composite_score          AS vivo_composite_score,
    v.score_latencia_pilar     AS vivo_score_latencia,
    v.score_video_pilar        AS vivo_score_video,
    v.score_web_pilar          AS vivo_score_web,
    v.score_throughput_pilar   AS vivo_score_throughput,
    v.throughput_disponivel    AS vivo_throughput_disponivel,
    v.sample_size              AS vivo_sample_size,
    v.calc_trace               AS vivo_calc_trace,
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
FROM mv_score_mobile v
LEFT JOIN mv_score_ookla_mobile o
    ON o.geohash_id   = v.geohash_id
   AND o.precision    = v.precision
   AND o.period_month = v.period_month
   AND o.operator     = v.operator
WHERE v.precision = 7;--> statement-breakpoint

CREATE OR REPLACE VIEW vw_score_comparativo_fibra AS
SELECT
    v.geohash_id, v.precision, v.period_month, v.operator,
    v.composite_score          AS vivo_composite_score,
    v.score_latencia_pilar     AS vivo_score_responsividade,
    v.score_video_pilar        AS vivo_score_video,
    v.score_web_pilar          AS vivo_score_web,
    v.score_throughput_pilar   AS vivo_score_throughput,
    v.throughput_disponivel    AS vivo_throughput_disponivel,
    v.sample_size              AS vivo_sample_size,
    v.calc_trace               AS vivo_calc_trace,
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
FROM mv_score_fibra v
LEFT JOIN mv_score_ookla_fibra o
    ON o.geohash_id   = v.geohash_id
   AND o.precision    = v.precision
   AND o.period_month = v.period_month
   AND o.operator     = v.operator
WHERE v.precision = 7;
