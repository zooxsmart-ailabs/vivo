-- =============================================================================
-- Migration 0016: Score Ookla — funções logísticas + views comparativas
--
-- Implementa o método de scoring Ookla extraído de tools/projeto-ookla/src/
-- como funções SQL (substituindo os notebooks Python). Visão comparativa:
-- vw_score_comparativo_mobile/fibra mostra Vivo categórico (vw_score_mobile/
-- fibra existentes) lado a lado com Ookla logístico (novas funções).
--
-- Conteúdo:
--   1. fn_ookla_logistic_score          — fórmula base ln + logística + ajuste
--   2. fn_score_ookla_speed             — pilar Speed (12 parciais + 3 dim + pilar)
--   3. fn_score_ookla_video             — pilar Vídeo (3 componentes + pilar)
--   4. fn_score_ookla_web               — pilar Web (1 componente)
--   5. fn_score_ookla_consolidado       — FULL OUTER JOIN dos 3 pilares + final
--   6. CREATE OR REPLACE vw_score_mobile  — adiciona componentes + calc_trace
--   7. CREATE OR REPLACE vw_score_fibra   — adiciona componentes + calc_trace
--   8. CREATE OR REPLACE vw_score_comparativo_mobile
--   9. CREATE OR REPLACE vw_score_comparativo_fibra
--
-- Decisões:
-- - Funções recebem p_precision (6|7) — alinha com vw_score_mobile/fibra que
--   já trabalham nas duas precisões via UNION.
-- - Pilar Speed: composição EXATA do notebook (pilar_speed_ookla.py:43-49):
--     download = score_dl_p10 + p50 + p90  (soma de 3)
--     upload   = score_ul_p10 + p50 + p90  (soma de 3)
--     latencia = soma dos 6 termos lat_down + lat_upl
--     score_speed_pilar = (download + upload + latencia) / 3
-- - Score consolidado: 0.5×speed + 0.25×video + 0.25×web (com fillna(0)).
-- - calc_trace JSONB em todas as funções: explicabilidade do score.
-- - vw_score_mobile/fibra ganham colunas extras (componentes + calc_trace) no
--   final do SELECT. Queries existentes que listam colunas explicitamente
--   continuam funcionando; nenhum SELECT * downstream foi encontrado.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. fn_ookla_logistic_score — fórmula base
-- ---------------------------------------------------------------------------
-- Aplica a transformação log-logística calibrada (notebook job_ookla_speed.py
-- linhas 120-167):
--   norm = (ln(value) - min_log) / std_dev
--   range 'a' (down/upl):  logistic = 1 / (1 + exp(norm))
--   range 'b' (latência):  logistic = 1 - 1 / (1 + exp(norm))
--   score = logistic × adjust × 100
-- IMMUTABLE + PARALLEL SAFE — planner pode inlinear.

CREATE OR REPLACE FUNCTION fn_ookla_logistic_score(
    p_value      DOUBLE PRECISION,
    p_min_log    DOUBLE PRECISION,
    p_std_dev    DOUBLE PRECISION,
    p_adjust     DOUBLE PRECISION,
    p_range_type TEXT
) RETURNS NUMERIC
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
    SELECT CASE
        WHEN p_value IS NULL OR p_value <= 0 OR p_std_dev IS NULL OR p_std_dev = 0
            THEN NULL
        WHEN p_range_type = 'a' THEN
            ((1.0 / (1.0 + EXP((LN(p_value) - p_min_log) / p_std_dev))) * p_adjust * 100)::NUMERIC
        ELSE -- 'b' = latência
            ((1.0 - 1.0 / (1.0 + EXP((LN(p_value) - p_min_log) / p_std_dev))) * p_adjust * 100)::NUMERIC
    END;
$$;--> statement-breakpoint

COMMENT ON FUNCTION fn_ookla_logistic_score IS
    'Transformação log-logística calibrada do método Ookla. Aplica (ln(x)-μ)/σ + função logística + fator de ajuste, escalando para 0-100. range_type=a (vazão), b (latência). Retorna NULL se valor inválido (<=0 ou σ=0).';--> statement-breakpoint


-- ---------------------------------------------------------------------------
-- 2. fn_score_ookla_speed — pilar Speed (Ookla logístico)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_score_ookla_speed(
    p_mode      TEXT,
    p_geohash   TEXT     DEFAULT NULL,
    p_anomes    INT      DEFAULT NULL,
    p_precision SMALLINT DEFAULT 7
) RETURNS TABLE (
    geohash_id          TEXT,
    "precision"           SMALLINT,
    period_month        DATE,
    operator            TEXT,
    -- 12 scores parciais (4 métricas × 3 percentis)
    score_download_p10  NUMERIC, score_download_p50  NUMERIC, score_download_p90  NUMERIC,
    score_upload_p10    NUMERIC, score_upload_p50    NUMERIC, score_upload_p90    NUMERIC,
    score_lat_down_p10  NUMERIC, score_lat_down_p50  NUMERIC, score_lat_down_p90  NUMERIC,
    score_lat_upl_p10   NUMERIC, score_lat_upl_p50   NUMERIC, score_lat_upl_p90   NUMERIC,
    -- 3 agregados por dimensão (somas dos percentis)
    score_download      NUMERIC,
    score_upload        NUMERIC,
    score_latencia      NUMERIC,
    -- pilar consolidado
    score_speed_pilar   NUMERIC,
    total_testes        INTEGER,
    calc_trace          JSONB
) LANGUAGE sql STABLE AS $$
WITH
base AS (
    SELECT
        CASE WHEN p_precision = 6 THEN q.attr_geohash6 ELSE q.attr_geohash7 END AS gh,
        CASE
            WHEN UPPER(TRIM(q.attr_sim_operator_common_name)) LIKE '%CLARO%' THEN 'CLARO'
            WHEN UPPER(TRIM(q.attr_sim_operator_common_name)) LIKE '%TIM%'   THEN 'TIM'
            WHEN UPPER(TRIM(q.attr_sim_operator_common_name)) LIKE '%VIVO%'  THEN 'VIVO'
            WHEN UPPER(TRIM(q.attr_sim_operator_common_name)) LIKE '%OI%'    THEN 'OI'
            ELSE 'OUTROS'
        END AS op,
        DATE_TRUNC('month', q.ts_result)::DATE AS pm,
        q.val_dl_throughput,
        q.val_ul_throughput,
        q.val_dl_latency_iqm,
        q.val_ul_latency_iqm
    FROM vw_qoe_unified q
    WHERE q.data_source IN ('speedtest_mobile', 'speedtest_fixed')
      AND q.id_location_type = 1
      AND q.network_type = p_mode
      AND (CASE WHEN p_precision = 6 THEN q.attr_geohash6 ELSE q.attr_geohash7 END) IS NOT NULL
      AND (p_geohash IS NULL OR (CASE WHEN p_precision = 6 THEN q.attr_geohash6 ELSE q.attr_geohash7 END) = p_geohash)
      AND (p_anomes  IS NULL OR EXTRACT(YEAR FROM q.ts_result)::INT * 100 + EXTRACT(MONTH FROM q.ts_result)::INT = p_anomes)
),
percentis AS (
    SELECT
        b.gh, b.op, b.pm,
        COUNT(*)::INTEGER AS total_testes,
        PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY b.val_dl_throughput)   AS dl_p10,
        PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY b.val_dl_throughput)   AS dl_p50,
        PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY b.val_dl_throughput)   AS dl_p90,
        PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY b.val_ul_throughput)   AS ul_p10,
        PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY b.val_ul_throughput)   AS ul_p50,
        PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY b.val_ul_throughput)   AS ul_p90,
        PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY b.val_dl_latency_iqm)  AS lat_d_p10,
        PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY b.val_dl_latency_iqm)  AS lat_d_p50,
        PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY b.val_dl_latency_iqm)  AS lat_d_p90,
        PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY b.val_ul_latency_iqm)  AS lat_u_p10,
        PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY b.val_ul_latency_iqm)  AS lat_u_p50,
        PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY b.val_ul_latency_iqm)  AS lat_u_p90
    FROM base b
    GROUP BY b.gh, b.op, b.pm
),
params AS (
    -- Pivot dos 24 parâmetros vigentes para 12 trios (min_log, std_dev, adjust)
    SELECT
        MAX(CASE WHEN sp.metric='down'     AND sp.percentile='p10' THEN sp.min_log END) AS dl_p10_ml,
        MAX(CASE WHEN sp.metric='down'     AND sp.percentile='p10' THEN sp.std_dev END) AS dl_p10_sd,
        MAX(CASE WHEN sp.metric='down'     AND sp.percentile='p10' THEN sp.adjust  END) AS dl_p10_aj,
        MAX(CASE WHEN sp.metric='down'     AND sp.percentile='p50' THEN sp.min_log END) AS dl_p50_ml,
        MAX(CASE WHEN sp.metric='down'     AND sp.percentile='p50' THEN sp.std_dev END) AS dl_p50_sd,
        MAX(CASE WHEN sp.metric='down'     AND sp.percentile='p50' THEN sp.adjust  END) AS dl_p50_aj,
        MAX(CASE WHEN sp.metric='down'     AND sp.percentile='p90' THEN sp.min_log END) AS dl_p90_ml,
        MAX(CASE WHEN sp.metric='down'     AND sp.percentile='p90' THEN sp.std_dev END) AS dl_p90_sd,
        MAX(CASE WHEN sp.metric='down'     AND sp.percentile='p90' THEN sp.adjust  END) AS dl_p90_aj,
        MAX(CASE WHEN sp.metric='upl'      AND sp.percentile='p10' THEN sp.min_log END) AS ul_p10_ml,
        MAX(CASE WHEN sp.metric='upl'      AND sp.percentile='p10' THEN sp.std_dev END) AS ul_p10_sd,
        MAX(CASE WHEN sp.metric='upl'      AND sp.percentile='p10' THEN sp.adjust  END) AS ul_p10_aj,
        MAX(CASE WHEN sp.metric='upl'      AND sp.percentile='p50' THEN sp.min_log END) AS ul_p50_ml,
        MAX(CASE WHEN sp.metric='upl'      AND sp.percentile='p50' THEN sp.std_dev END) AS ul_p50_sd,
        MAX(CASE WHEN sp.metric='upl'      AND sp.percentile='p50' THEN sp.adjust  END) AS ul_p50_aj,
        MAX(CASE WHEN sp.metric='upl'      AND sp.percentile='p90' THEN sp.min_log END) AS ul_p90_ml,
        MAX(CASE WHEN sp.metric='upl'      AND sp.percentile='p90' THEN sp.std_dev END) AS ul_p90_sd,
        MAX(CASE WHEN sp.metric='upl'      AND sp.percentile='p90' THEN sp.adjust  END) AS ul_p90_aj,
        MAX(CASE WHEN sp.metric='lat_down' AND sp.percentile='p10' THEN sp.min_log END) AS ld_p10_ml,
        MAX(CASE WHEN sp.metric='lat_down' AND sp.percentile='p10' THEN sp.std_dev END) AS ld_p10_sd,
        MAX(CASE WHEN sp.metric='lat_down' AND sp.percentile='p10' THEN sp.adjust  END) AS ld_p10_aj,
        MAX(CASE WHEN sp.metric='lat_down' AND sp.percentile='p50' THEN sp.min_log END) AS ld_p50_ml,
        MAX(CASE WHEN sp.metric='lat_down' AND sp.percentile='p50' THEN sp.std_dev END) AS ld_p50_sd,
        MAX(CASE WHEN sp.metric='lat_down' AND sp.percentile='p50' THEN sp.adjust  END) AS ld_p50_aj,
        MAX(CASE WHEN sp.metric='lat_down' AND sp.percentile='p90' THEN sp.min_log END) AS ld_p90_ml,
        MAX(CASE WHEN sp.metric='lat_down' AND sp.percentile='p90' THEN sp.std_dev END) AS ld_p90_sd,
        MAX(CASE WHEN sp.metric='lat_down' AND sp.percentile='p90' THEN sp.adjust  END) AS ld_p90_aj,
        MAX(CASE WHEN sp.metric='lat_upl'  AND sp.percentile='p10' THEN sp.min_log END) AS lu_p10_ml,
        MAX(CASE WHEN sp.metric='lat_upl'  AND sp.percentile='p10' THEN sp.std_dev END) AS lu_p10_sd,
        MAX(CASE WHEN sp.metric='lat_upl'  AND sp.percentile='p10' THEN sp.adjust  END) AS lu_p10_aj,
        MAX(CASE WHEN sp.metric='lat_upl'  AND sp.percentile='p50' THEN sp.min_log END) AS lu_p50_ml,
        MAX(CASE WHEN sp.metric='lat_upl'  AND sp.percentile='p50' THEN sp.std_dev END) AS lu_p50_sd,
        MAX(CASE WHEN sp.metric='lat_upl'  AND sp.percentile='p50' THEN sp.adjust  END) AS lu_p50_aj,
        MAX(CASE WHEN sp.metric='lat_upl'  AND sp.percentile='p90' THEN sp.min_log END) AS lu_p90_ml,
        MAX(CASE WHEN sp.metric='lat_upl'  AND sp.percentile='p90' THEN sp.std_dev END) AS lu_p90_sd,
        MAX(CASE WHEN sp.metric='lat_upl'  AND sp.percentile='p90' THEN sp.adjust  END) AS lu_p90_aj
    FROM score_param sp
    WHERE sp.mode = p_mode AND sp.valid_to IS NULL
),
scores AS (
    SELECT
        pc.gh, pc.op, pc.pm, pc.total_testes,
        pc.dl_p10, pc.dl_p50, pc.dl_p90,
        pc.ul_p10, pc.ul_p50, pc.ul_p90,
        pc.lat_d_p10, pc.lat_d_p50, pc.lat_d_p90,
        pc.lat_u_p10, pc.lat_u_p50, pc.lat_u_p90,
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
        fn_ookla_logistic_score(pc.lat_u_p90, pa.lu_p90_ml, pa.lu_p90_sd, pa.lu_p90_aj, 'b') AS s_lu_p90,
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
        pa.lu_p90_ml, pa.lu_p90_sd, pa.lu_p90_aj
    FROM percentis pc CROSS JOIN params pa
)
SELECT
    s.gh, p_precision, s.pm, s.op,
    s.s_dl_p10, s.s_dl_p50, s.s_dl_p90,
    s.s_ul_p10, s.s_ul_p50, s.s_ul_p90,
    s.s_ld_p10, s.s_ld_p50, s.s_ld_p90,
    s.s_lu_p10, s.s_lu_p50, s.s_lu_p90,
    -- Agregados (replica notebook pilar_speed_ookla.py:43-49)
    (COALESCE(s.s_dl_p10,0) + COALESCE(s.s_dl_p50,0) + COALESCE(s.s_dl_p90,0))::NUMERIC AS score_download,
    (COALESCE(s.s_ul_p10,0) + COALESCE(s.s_ul_p50,0) + COALESCE(s.s_ul_p90,0))::NUMERIC AS score_upload,
    (COALESCE(s.s_ld_p10,0) + COALESCE(s.s_ld_p50,0) + COALESCE(s.s_ld_p90,0)
     + COALESCE(s.s_lu_p10,0) + COALESCE(s.s_lu_p50,0) + COALESCE(s.s_lu_p90,0))::NUMERIC AS score_latencia,
    -- Pilar = (download + upload + latencia) / 3
    ((COALESCE(s.s_dl_p10,0) + COALESCE(s.s_dl_p50,0) + COALESCE(s.s_dl_p90,0))
     + (COALESCE(s.s_ul_p10,0) + COALESCE(s.s_ul_p50,0) + COALESCE(s.s_ul_p90,0))
     + (COALESCE(s.s_ld_p10,0) + COALESCE(s.s_ld_p50,0) + COALESCE(s.s_ld_p90,0)
        + COALESCE(s.s_lu_p10,0) + COALESCE(s.s_lu_p50,0) + COALESCE(s.s_lu_p90,0))
    ) / 3.0 AS score_speed_pilar,
    s.total_testes,
    jsonb_build_object(
        'metodo', 'ookla_logistic_v1',
        'modo', p_mode,
        'precision', p_precision,
        'raw_percentis', jsonb_build_object(
            'download_mbps',  jsonb_build_object('p10', s.dl_p10,    'p50', s.dl_p50,    'p90', s.dl_p90),
            'upload_mbps',    jsonb_build_object('p10', s.ul_p10,    'p50', s.ul_p50,    'p90', s.ul_p90),
            'lat_down_ms',    jsonb_build_object('p10', s.lat_d_p10, 'p50', s.lat_d_p50, 'p90', s.lat_d_p90),
            'lat_upl_ms',     jsonb_build_object('p10', s.lat_u_p10, 'p50', s.lat_u_p50, 'p90', s.lat_u_p90)
        ),
        'params_aplicados', jsonb_build_object(
            'download', jsonb_build_object(
                'p10', jsonb_build_object('min_log', s.dl_p10_ml, 'std_dev', s.dl_p10_sd, 'adjust', s.dl_p10_aj),
                'p50', jsonb_build_object('min_log', s.dl_p50_ml, 'std_dev', s.dl_p50_sd, 'adjust', s.dl_p50_aj),
                'p90', jsonb_build_object('min_log', s.dl_p90_ml, 'std_dev', s.dl_p90_sd, 'adjust', s.dl_p90_aj)
            ),
            'upload', jsonb_build_object(
                'p10', jsonb_build_object('min_log', s.ul_p10_ml, 'std_dev', s.ul_p10_sd, 'adjust', s.ul_p10_aj),
                'p50', jsonb_build_object('min_log', s.ul_p50_ml, 'std_dev', s.ul_p50_sd, 'adjust', s.ul_p50_aj),
                'p90', jsonb_build_object('min_log', s.ul_p90_ml, 'std_dev', s.ul_p90_sd, 'adjust', s.ul_p90_aj)
            ),
            'lat_down', jsonb_build_object(
                'p10', jsonb_build_object('min_log', s.ld_p10_ml, 'std_dev', s.ld_p10_sd, 'adjust', s.ld_p10_aj),
                'p50', jsonb_build_object('min_log', s.ld_p50_ml, 'std_dev', s.ld_p50_sd, 'adjust', s.ld_p50_aj),
                'p90', jsonb_build_object('min_log', s.ld_p90_ml, 'std_dev', s.ld_p90_sd, 'adjust', s.ld_p90_aj)
            ),
            'lat_upl', jsonb_build_object(
                'p10', jsonb_build_object('min_log', s.lu_p10_ml, 'std_dev', s.lu_p10_sd, 'adjust', s.lu_p10_aj),
                'p50', jsonb_build_object('min_log', s.lu_p50_ml, 'std_dev', s.lu_p50_sd, 'adjust', s.lu_p50_aj),
                'p90', jsonb_build_object('min_log', s.lu_p90_ml, 'std_dev', s.lu_p90_sd, 'adjust', s.lu_p90_aj)
            )
        ),
        'scores_parciais', jsonb_build_object(
            'download', jsonb_build_object('p10', s.s_dl_p10, 'p50', s.s_dl_p50, 'p90', s.s_dl_p90),
            'upload',   jsonb_build_object('p10', s.s_ul_p10, 'p50', s.s_ul_p50, 'p90', s.s_ul_p90),
            'lat_down', jsonb_build_object('p10', s.s_ld_p10, 'p50', s.s_ld_p50, 'p90', s.s_ld_p90),
            'lat_upl',  jsonb_build_object('p10', s.s_lu_p10, 'p50', s.s_lu_p50, 'p90', s.s_lu_p90)
        ),
        'agregados', jsonb_build_object(
            'download', (COALESCE(s.s_dl_p10,0) + COALESCE(s.s_dl_p50,0) + COALESCE(s.s_dl_p90,0)),
            'upload',   (COALESCE(s.s_ul_p10,0) + COALESCE(s.s_ul_p50,0) + COALESCE(s.s_ul_p90,0)),
            'latencia', (COALESCE(s.s_ld_p10,0) + COALESCE(s.s_ld_p50,0) + COALESCE(s.s_ld_p90,0)
                       + COALESCE(s.s_lu_p10,0) + COALESCE(s.s_lu_p50,0) + COALESCE(s.s_lu_p90,0))
        ),
        'total_testes', s.total_testes
    ) AS calc_trace
FROM scores s;
$$;--> statement-breakpoint

COMMENT ON FUNCTION fn_score_ookla_speed IS
    'Pilar Speed Ookla logístico — 12 scores parciais (4 métricas × 3 percentis), 3 agregados (download/upload/latencia somando os percentis), score_speed_pilar = (download + upload + latencia)/3. Notebook fonte: tools/projeto-ookla/app/pilar_speed_ookla.py.';--> statement-breakpoint


-- ---------------------------------------------------------------------------
-- 3. fn_score_ookla_video — pilar Vídeo
-- ---------------------------------------------------------------------------
-- Replica tools/projeto-ookla/src/score_ookla/job_ookla_video.py:108-127
-- 3 componentes binários (100/0) com regra "razão ≥ 0.8", pilar = média.

CREATE OR REPLACE FUNCTION fn_score_ookla_video(
    p_geohash   TEXT     DEFAULT NULL,
    p_anomes    INT      DEFAULT NULL,
    p_precision SMALLINT DEFAULT 7
) RETURNS TABLE (
    geohash_id          TEXT,
    "precision"           SMALLINT,
    period_month        DATE,
    operator            TEXT,
    score_rebuffering   NUMERIC,
    score_tempo_inicio  NUMERIC,
    score_resolucao     NUMERIC,
    score_video_pilar   NUMERIC,
    total_testes        INTEGER,
    calc_trace          JSONB
) LANGUAGE sql STABLE AS $$
WITH
base AS (
    SELECT
        CASE WHEN p_precision = 6 THEN v.attr_geohash6 ELSE v.attr_geohash7 END AS gh,
        CASE
            WHEN UPPER(TRIM(v.attr_sim_operator_common_name)) LIKE '%CLARO%' THEN 'CLARO'
            WHEN UPPER(TRIM(v.attr_sim_operator_common_name)) LIKE '%TIM%'   THEN 'TIM'
            WHEN UPPER(TRIM(v.attr_sim_operator_common_name)) LIKE '%VIVO%'  THEN 'VIVO'
            WHEN UPPER(TRIM(v.attr_sim_operator_common_name)) LIKE '%OI%'    THEN 'OI'
            ELSE 'OUTROS'
        END AS op,
        DATE_TRUNC('month', v.ts_result)::DATE AS pm,
        v.attr_video_rebuffering_count,
        v.val_video_time_to_start,
        -- razão alta resolução por linha — replica job_ookla_video.py:46-80
        CASE
            WHEN NULLIF(
                COALESCE(v.val_video_quality_time_144p,0)  + COALESCE(v.val_video_quality_time_240p,0)
              + COALESCE(v.val_video_quality_time_360p,0)  + COALESCE(v.val_video_quality_time_480p,0)
              + COALESCE(v.val_video_quality_time_720p,0)  + COALESCE(v.val_video_quality_time_1080p,0)
              + COALESCE(v.val_video_quality_time_1440p,0) + COALESCE(v.val_video_quality_time_2160p,0),
                0
            ) IS NULL THEN NULL
            ELSE (
                COALESCE(v.val_video_quality_time_1080p,0)
              + COALESCE(v.val_video_quality_time_1440p,0)
              + COALESCE(v.val_video_quality_time_2160p,0)
            )::NUMERIC / NULLIF(
                COALESCE(v.val_video_quality_time_144p,0)  + COALESCE(v.val_video_quality_time_240p,0)
              + COALESCE(v.val_video_quality_time_360p,0)  + COALESCE(v.val_video_quality_time_480p,0)
              + COALESCE(v.val_video_quality_time_720p,0)  + COALESCE(v.val_video_quality_time_1080p,0)
              + COALESCE(v.val_video_quality_time_1440p,0) + COALESCE(v.val_video_quality_time_2160p,0),
                0
            )
        END AS razao_alta_resolucao
    FROM video v
    WHERE v.id_location_type = 1
      AND (CASE WHEN p_precision = 6 THEN v.attr_geohash6 ELSE v.attr_geohash7 END) IS NOT NULL
      AND (p_geohash IS NULL OR (CASE WHEN p_precision = 6 THEN v.attr_geohash6 ELSE v.attr_geohash7 END) = p_geohash)
      AND (p_anomes  IS NULL OR EXTRACT(YEAR FROM v.ts_result)::INT * 100 + EXTRACT(MONTH FROM v.ts_result)::INT = p_anomes)
),
agregado AS (
    SELECT
        b.gh, b.op, b.pm,
        COUNT(*)::INTEGER AS total_testes,
        AVG((b.attr_video_rebuffering_count = 0)::INT::NUMERIC)            AS razao_sem_rebuffering,
        AVG((b.val_video_time_to_start < 2000)::INT::NUMERIC)              AS razao_tempo_lt_2s,
        AVG((b.razao_alta_resolucao >= 0.8)::INT::NUMERIC)                 AS razao_alta_res
    FROM base b
    GROUP BY b.gh, b.op, b.pm
),
scores AS (
    SELECT
        a.*,
        CASE WHEN a.razao_sem_rebuffering >= 0.8 THEN 100 ELSE 0 END AS s_reb,
        CASE WHEN a.razao_tempo_lt_2s     >= 0.8 THEN 100 ELSE 0 END AS s_tmp,
        CASE WHEN a.razao_alta_res        >= 0.8 THEN 100 ELSE 0 END AS s_res
    FROM agregado a
)
SELECT
    s.gh, p_precision, s.pm, s.op,
    s.s_reb::NUMERIC,
    s.s_tmp::NUMERIC,
    s.s_res::NUMERIC,
    ((s.s_reb + s.s_tmp + s.s_res) / 3.0)::NUMERIC AS score_video_pilar,
    s.total_testes,
    jsonb_build_object(
        'metodo', 'ookla_categorical_video_v1',
        'precision', p_precision,
        'razoes', jsonb_build_object(
            'sem_rebuffering', s.razao_sem_rebuffering,
            'tempo_lt_2s',     s.razao_tempo_lt_2s,
            'alta_resolucao',  s.razao_alta_res
        ),
        'thresholds_aplicados', jsonb_build_object(
            'sem_rebuffering', 0.8, 'tempo_lt_2s', 0.8, 'alta_resolucao', 0.8
        ),
        'scores', jsonb_build_object(
            'rebuffering', s.s_reb, 'tempo_inicio', s.s_tmp, 'resolucao', s.s_res
        ),
        'pilar', ((s.s_reb + s.s_tmp + s.s_res) / 3.0),
        'total_testes', s.total_testes
    ) AS calc_trace
FROM scores s;
$$;--> statement-breakpoint

COMMENT ON FUNCTION fn_score_ookla_video IS
    'Pilar Vídeo Ookla — 3 componentes (rebuffering, tempo de início, alta resolução), cada um 100 ou 0 conforme razão ≥ 0.8. Pilar = média dos 3. Notebook fonte: tools/projeto-ookla/src/score_ookla/job_ookla_video.py.';--> statement-breakpoint


-- ---------------------------------------------------------------------------
-- 4. fn_score_ookla_web — pilar Web
-- ---------------------------------------------------------------------------
-- Replica tools/projeto-ookla/src/score_ookla/job_ookla_web.py:14-41

CREATE OR REPLACE FUNCTION fn_score_ookla_web(
    p_geohash   TEXT     DEFAULT NULL,
    p_anomes    INT      DEFAULT NULL,
    p_precision SMALLINT DEFAULT 7
) RETURNS TABLE (
    geohash_id          TEXT,
    "precision"           SMALLINT,
    period_month        DATE,
    operator            TEXT,
    score_web_pilar     NUMERIC,
    total_testes        INTEGER,
    calc_trace          JSONB
) LANGUAGE sql STABLE AS $$
WITH
base AS (
    SELECT
        CASE WHEN p_precision = 6 THEN w.attr_geohash6 ELSE w.attr_geohash7 END AS gh,
        CASE
            WHEN UPPER(TRIM(w.attr_sim_operator_common_name)) LIKE '%CLARO%' THEN 'CLARO'
            WHEN UPPER(TRIM(w.attr_sim_operator_common_name)) LIKE '%TIM%'   THEN 'TIM'
            WHEN UPPER(TRIM(w.attr_sim_operator_common_name)) LIKE '%VIVO%'  THEN 'VIVO'
            WHEN UPPER(TRIM(w.attr_sim_operator_common_name)) LIKE '%OI%'    THEN 'OI'
            ELSE 'OUTROS'
        END AS op,
        DATE_TRUNC('month', w.ts_result)::DATE AS pm,
        w.val_web_page_load_time
    FROM web_browsing w
    WHERE w.id_location_type = 1
      AND (CASE WHEN p_precision = 6 THEN w.attr_geohash6 ELSE w.attr_geohash7 END) IS NOT NULL
      AND (p_geohash IS NULL OR (CASE WHEN p_precision = 6 THEN w.attr_geohash6 ELSE w.attr_geohash7 END) = p_geohash)
      AND (p_anomes  IS NULL OR EXTRACT(YEAR FROM w.ts_result)::INT * 100 + EXTRACT(MONTH FROM w.ts_result)::INT = p_anomes)
),
agregado AS (
    SELECT
        b.gh, b.op, b.pm,
        COUNT(*)::INTEGER AS total_testes,
        AVG((b.val_web_page_load_time < 5000)::INT::NUMERIC) AS razao_carga_lt_5s
    FROM base b
    GROUP BY b.gh, b.op, b.pm
)
SELECT
    a.gh, p_precision, a.pm, a.op,
    (CASE WHEN a.razao_carga_lt_5s >= 0.8 THEN 100 ELSE 0 END)::NUMERIC AS score_web_pilar,
    a.total_testes,
    jsonb_build_object(
        'metodo', 'ookla_categorical_web_v1',
        'precision', p_precision,
        'razao_carga_lt_5s', a.razao_carga_lt_5s,
        'threshold_aplicado', 0.8,
        'pilar', (CASE WHEN a.razao_carga_lt_5s >= 0.8 THEN 100 ELSE 0 END),
        'total_testes', a.total_testes
    ) AS calc_trace
FROM agregado a;
$$;--> statement-breakpoint

COMMENT ON FUNCTION fn_score_ookla_web IS
    'Pilar Web Ookla — score = 100 se razão de páginas com tempo < 5s for ≥ 0.8, senão 0. Notebook fonte: tools/projeto-ookla/src/score_ookla/job_ookla_web.py.';--> statement-breakpoint


-- ---------------------------------------------------------------------------
-- 5. fn_score_ookla_consolidado — junta os 3 pilares + score conectividade
-- ---------------------------------------------------------------------------
-- Replica tools/projeto-ookla/app/calcular_conectividade_ookla.py:46-49
-- score_conectividade = 0.5×speed + 0.25×video + 0.25×web (com fillna(0))

CREATE OR REPLACE FUNCTION fn_score_ookla_consolidado(
    p_mode      TEXT,
    p_geohash   TEXT     DEFAULT NULL,
    p_anomes    INT      DEFAULT NULL,
    p_precision SMALLINT DEFAULT 7
) RETURNS TABLE (
    geohash_id          TEXT,
    "precision"           SMALLINT,
    period_month        DATE,
    operator            TEXT,
    -- Pilar speed (12 + 3 + 1)
    score_download_p10  NUMERIC, score_download_p50  NUMERIC, score_download_p90  NUMERIC,
    score_upload_p10    NUMERIC, score_upload_p50    NUMERIC, score_upload_p90    NUMERIC,
    score_lat_down_p10  NUMERIC, score_lat_down_p50  NUMERIC, score_lat_down_p90  NUMERIC,
    score_lat_upl_p10   NUMERIC, score_lat_upl_p50   NUMERIC, score_lat_upl_p90   NUMERIC,
    score_download      NUMERIC, score_upload        NUMERIC, score_latencia      NUMERIC,
    score_speed_pilar   NUMERIC,
    -- Pilar video (3 + 1)
    score_rebuffering   NUMERIC, score_tempo_inicio  NUMERIC, score_resolucao     NUMERIC,
    score_video_pilar   NUMERIC,
    -- Pilar web
    score_web_pilar     NUMERIC,
    -- Conectividade final
    score_conectividade NUMERIC,
    calc_trace          JSONB
) LANGUAGE sql STABLE AS $$
WITH
sp AS (SELECT * FROM fn_score_ookla_speed(p_mode, p_geohash, p_anomes, p_precision)),
vd AS (SELECT * FROM fn_score_ookla_video(p_geohash, p_anomes, p_precision)),
wb AS (SELECT * FROM fn_score_ookla_web  (p_geohash, p_anomes, p_precision)),
joined AS (
    SELECT
        COALESCE(sp.geohash_id, vd.geohash_id, wb.geohash_id)         AS gh,
        COALESCE(sp.precision,  vd.precision,  wb.precision)          AS prec,
        COALESCE(sp.period_month, vd.period_month, wb.period_month)   AS pm,
        COALESCE(sp.operator,   vd.operator,   wb.operator)           AS op,
        sp.score_download_p10, sp.score_download_p50, sp.score_download_p90,
        sp.score_upload_p10,   sp.score_upload_p50,   sp.score_upload_p90,
        sp.score_lat_down_p10, sp.score_lat_down_p50, sp.score_lat_down_p90,
        sp.score_lat_upl_p10,  sp.score_lat_upl_p50,  sp.score_lat_upl_p90,
        sp.score_download, sp.score_upload, sp.score_latencia,
        sp.score_speed_pilar,
        vd.score_rebuffering, vd.score_tempo_inicio, vd.score_resolucao,
        vd.score_video_pilar,
        wb.score_web_pilar,
        sp.calc_trace AS trace_speed,
        vd.calc_trace AS trace_video,
        wb.calc_trace AS trace_web
    FROM sp
    FULL OUTER JOIN vd ON sp.geohash_id = vd.geohash_id
                       AND sp.precision = vd.precision
                       AND sp.period_month = vd.period_month
                       AND sp.operator = vd.operator
    FULL OUTER JOIN wb ON COALESCE(sp.geohash_id, vd.geohash_id) = wb.geohash_id
                       AND COALESCE(sp.precision, vd.precision) = wb.precision
                       AND COALESCE(sp.period_month, vd.period_month) = wb.period_month
                       AND COALESCE(sp.operator, vd.operator) = wb.operator
)
SELECT
    j.gh, j.prec, j.pm, j.op,
    j.score_download_p10, j.score_download_p50, j.score_download_p90,
    j.score_upload_p10,   j.score_upload_p50,   j.score_upload_p90,
    j.score_lat_down_p10, j.score_lat_down_p50, j.score_lat_down_p90,
    j.score_lat_upl_p10,  j.score_lat_upl_p50,  j.score_lat_upl_p90,
    j.score_download, j.score_upload, j.score_latencia,
    j.score_speed_pilar,
    j.score_rebuffering, j.score_tempo_inicio, j.score_resolucao,
    j.score_video_pilar,
    j.score_web_pilar,
    -- Score conectividade: replica fillna(0) do notebook
    (0.5  * COALESCE(j.score_speed_pilar, 0)
   + 0.25 * COALESCE(j.score_video_pilar, 0)
   + 0.25 * COALESCE(j.score_web_pilar,   0))::NUMERIC AS score_conectividade,
    jsonb_build_object(
        'metodo', 'ookla_consolidado_v1',
        'pesos', jsonb_build_object('speed', 0.5, 'video', 0.25, 'web', 0.25),
        'trace_speed', j.trace_speed,
        'trace_video', j.trace_video,
        'trace_web',   j.trace_web,
        'score_conectividade',
            (0.5  * COALESCE(j.score_speed_pilar, 0)
           + 0.25 * COALESCE(j.score_video_pilar, 0)
           + 0.25 * COALESCE(j.score_web_pilar,   0))
    ) AS calc_trace
FROM joined j;
$$;--> statement-breakpoint

COMMENT ON FUNCTION fn_score_ookla_consolidado IS
    'Score conectividade Ookla consolidado — FULL OUTER JOIN dos 3 pilares (speed/video/web). score_conectividade = 0.5×speed + 0.25×video + 0.25×web, com pilares ausentes contando 0 (fillna(0) do notebook). calc_trace agrega traces dos 3 pilares.';--> statement-breakpoint


-- ---------------------------------------------------------------------------
-- 6. CREATE OR REPLACE vw_score_mobile — adiciona componentes + calc_trace
-- ---------------------------------------------------------------------------
-- Mantém colunas existentes (geohash_id, precision, period_month, operator,
-- composite_score, sample_size, network_type) na MESMA ORDEM e MESMOS TIPOS
-- — exigência do CREATE OR REPLACE VIEW. Adiciona no final:
--   score_latencia_pilar, score_video_pilar, score_web_pilar, score_throughput_pilar,
--   throughput_disponivel, calc_trace
-- A lógica de cálculo é idêntica à 0013 — nenhuma mudança numérica.

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
        'metodo', 'vivo_categorical_v5',
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
    'Score QoE Mobile v6 — composite_score (0-10) idêntico à v5 (0013), com colunas adicionais para visão comparativa: pilares individuais (latencia/video/web/throughput), throughput_disponivel e calc_trace JSONB.';--> statement-breakpoint


-- ---------------------------------------------------------------------------
-- 7. CREATE OR REPLACE vw_score_fibra — adiciona componentes + calc_trace
-- ---------------------------------------------------------------------------

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
        'metodo', 'vivo_categorical_v5_fibra',
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
    'Score QoE Fibra v6 — composite_score (0-10) idêntico à v5 (0013), com colunas adicionais para visão comparativa: pilares individuais (latencia/video/web/throughput), throughput_disponivel e calc_trace JSONB.';--> statement-breakpoint


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
