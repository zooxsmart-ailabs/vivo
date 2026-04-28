-- =============================================================================
-- Migration 0018: vw_geohash_summary lê de vw_score_mobile/fibra
--
-- Substitui a fonte de score da `vw_geohash_summary` (que hoje usa a tabela
-- `score` com escopo limitado a 2 meses / 3 operadoras) pelas views
-- recalculadas `vw_score_mobile/fibra` (22 meses, 5 operadoras, metodologia
-- v7 alinhada ao notebook Ookla).
--
-- Estrutura:
--   1. mv_score_mobile / mv_score_fibra — snapshots diários das views Vivo
--      (refresh muito mais rápido que recalcular de file_transfer/video/web
--      a cada hour)
--   2. vw_geohash_summary v4:
--      - LEGACY columns mantidas (vivo_score, tim_score, claro_score, quadrant,
--        competitive_position, priority_score) — calculadas via technology da
--        célula (FIBRA→fibra, MOVEL→mobile, AMBOS→max)
--      - NEW columns separadas por tecnologia:
--          *_movel  → score_pivot_mobile + share_movel_pct
--          *_fibra  → score_pivot_fibra  + share_fibra_pct
--      - Aplicado em quadrant, competitive_position, priority_score
--   3. vw_bairro_summary v2: espelha colunas novas (avg/dominant por tech)
--   4. Jobs:
--      - fn_refresh_score_mvs (diário): refresh mv_score_mobile e mv_score_fibra
--      - fn_refresh_geohash_summary (hourly, já existia): inalterado
--
-- Decisões fechadas com o usuário:
--   - Quadrant duplicado (movel/fibra) + legacy via technology
--   - vw_bairro_summary atualizada também
--   - MVs intermediárias com refresh diário
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. MV mv_score_mobile (snapshot diário de vw_score_mobile)
-- ---------------------------------------------------------------------------

DROP MATERIALIZED VIEW IF EXISTS mv_score_mobile CASCADE;--> statement-breakpoint

CREATE MATERIALIZED VIEW mv_score_mobile AS
SELECT
    geohash_id, precision, period_month, operator,
    composite_score, sample_size, network_type,
    score_latencia_pilar, score_video_pilar, score_web_pilar, score_throughput_pilar,
    throughput_disponivel, calc_trace
FROM vw_score_mobile
WITH DATA;--> statement-breakpoint

CREATE UNIQUE INDEX mv_score_mobile_pk
    ON mv_score_mobile (geohash_id, precision, period_month, operator);--> statement-breakpoint

CREATE INDEX mv_score_mobile_period_idx
    ON mv_score_mobile (precision, period_month);--> statement-breakpoint

CREATE INDEX mv_score_mobile_op_idx
    ON mv_score_mobile (operator, period_month DESC);--> statement-breakpoint

COMMENT ON MATERIALIZED VIEW mv_score_mobile IS
    'Snapshot diário de vw_score_mobile (recalculada de file_transfer/video/web_browsing). Usado por vw_geohash_summary para evitar recálculo on-the-fly. Refresh: REFRESH MATERIALIZED VIEW CONCURRENTLY mv_score_mobile (job fn_refresh_score_mvs, diário).';--> statement-breakpoint


-- ---------------------------------------------------------------------------
-- 2. MV mv_score_fibra
-- ---------------------------------------------------------------------------

DROP MATERIALIZED VIEW IF EXISTS mv_score_fibra CASCADE;--> statement-breakpoint

CREATE MATERIALIZED VIEW mv_score_fibra AS
SELECT
    geohash_id, precision, period_month, operator,
    composite_score, sample_size, network_type,
    score_latencia_pilar, score_video_pilar, score_web_pilar, score_throughput_pilar,
    throughput_disponivel, calc_trace
FROM vw_score_fibra
WITH DATA;--> statement-breakpoint

CREATE UNIQUE INDEX mv_score_fibra_pk
    ON mv_score_fibra (geohash_id, precision, period_month, operator);--> statement-breakpoint

CREATE INDEX mv_score_fibra_period_idx
    ON mv_score_fibra (precision, period_month);--> statement-breakpoint

CREATE INDEX mv_score_fibra_op_idx
    ON mv_score_fibra (operator, period_month DESC);--> statement-breakpoint

COMMENT ON MATERIALIZED VIEW mv_score_fibra IS
    'Snapshot diário de vw_score_fibra (recalculada de file_transfer/video/web_browsing com WiFi=true). Usado por vw_geohash_summary. Refresh: fn_refresh_score_mvs (diário).';--> statement-breakpoint


-- ---------------------------------------------------------------------------
-- 3. DROP vw_geohash_summary (CASCADE derruba vw_bairro_summary também)
-- ---------------------------------------------------------------------------

DROP MATERIALIZED VIEW IF EXISTS vw_geohash_summary CASCADE;--> statement-breakpoint


-- ---------------------------------------------------------------------------
-- 4. CREATE vw_geohash_summary v4 (lendo das MVs novas)
-- ---------------------------------------------------------------------------

CREATE MATERIALIZED VIEW vw_geohash_summary AS
WITH
score_pivot_movel AS (
    SELECT geohash_id, precision, period_month,
        MAX(CASE WHEN operator = 'VIVO'  THEN composite_score END) AS vivo_score,
        MAX(CASE WHEN operator = 'TIM'   THEN composite_score END) AS tim_score,
        MAX(CASE WHEN operator = 'CLARO' THEN composite_score END) AS claro_score,
        MAX(CASE WHEN operator = 'VIVO'  THEN sample_size END)::BIGINT AS vivo_sample_size
    FROM mv_score_mobile
    GROUP BY geohash_id, precision, period_month
),
score_pivot_fibra AS (
    SELECT geohash_id, precision, period_month,
        MAX(CASE WHEN operator = 'VIVO'  THEN composite_score END) AS vivo_score,
        MAX(CASE WHEN operator = 'TIM'   THEN composite_score END) AS tim_score,
        MAX(CASE WHEN operator = 'CLARO' THEN composite_score END) AS claro_score,
        MAX(CASE WHEN operator = 'VIVO'  THEN sample_size END)::BIGINT AS vivo_sample_size
    FROM mv_score_fibra
    GROUP BY geohash_id, precision, period_month
),
score_pivot_combined AS (
    -- FULL OUTER JOIN preserva geohashes com dados em apenas uma tecnologia
    SELECT
        COALESCE(m.geohash_id,   f.geohash_id)   AS geohash_id,
        COALESCE(m.precision,    f.precision)    AS precision,
        COALESCE(m.period_month, f.period_month) AS period_month,
        m.vivo_score        AS vivo_score_movel,
        f.vivo_score        AS vivo_score_fibra,
        m.tim_score         AS tim_score_movel,
        f.tim_score         AS tim_score_fibra,
        m.claro_score       AS claro_score_movel,
        f.claro_score       AS claro_score_fibra,
        m.vivo_sample_size  AS vivo_sample_size_movel,
        f.vivo_sample_size  AS vivo_sample_size_fibra
    FROM score_pivot_movel m
    FULL OUTER JOIN score_pivot_fibra f
        ON m.geohash_id   = f.geohash_id
       AND m.precision    = f.precision
       AND m.period_month = f.period_month
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
        COALESCE(spc.period_month, sh.period_month) AS period_month,
        -- ─── Scores separados por tecnologia (NOVO) ────────────────────────
        spc.vivo_score_movel,  spc.vivo_score_fibra,
        spc.tim_score_movel,   spc.tim_score_fibra,
        spc.claro_score_movel, spc.claro_score_fibra,
        spc.vivo_sample_size_movel, spc.vivo_sample_size_fibra,
        -- ─── Scores legacy (combinados via technology) ─────────────────────
        CASE
            WHEN sh.technology = 'FIBRA'::tech_category THEN COALESCE(spc.vivo_score_fibra, 0)
            WHEN sh.technology = 'MOVEL'::tech_category THEN COALESCE(spc.vivo_score_movel, 0)
            ELSE GREATEST(COALESCE(spc.vivo_score_movel, 0), COALESCE(spc.vivo_score_fibra, 0))
        END AS vivo_score,
        CASE
            WHEN sh.technology = 'FIBRA'::tech_category THEN COALESCE(spc.tim_score_fibra, 0)
            WHEN sh.technology = 'MOVEL'::tech_category THEN COALESCE(spc.tim_score_movel, 0)
            ELSE GREATEST(COALESCE(spc.tim_score_movel, 0), COALESCE(spc.tim_score_fibra, 0))
        END AS tim_score,
        CASE
            WHEN sh.technology = 'FIBRA'::tech_category THEN COALESCE(spc.claro_score_fibra, 0)
            WHEN sh.technology = 'MOVEL'::tech_category THEN COALESCE(spc.claro_score_movel, 0)
            ELSE GREATEST(COALESCE(spc.claro_score_movel, 0), COALESCE(spc.claro_score_fibra, 0))
        END AS claro_score,
        CASE
            WHEN sh.technology = 'FIBRA'::tech_category THEN COALESCE(spc.vivo_sample_size_fibra, 0)
            WHEN sh.technology = 'MOVEL'::tech_category THEN COALESCE(spc.vivo_sample_size_movel, 0)
            ELSE COALESCE(spc.vivo_sample_size_movel, 0) + COALESCE(spc.vivo_sample_size_fibra, 0)
        END AS vivo_sample_size,
        -- ─── Share (existing) ───────────────────────────────────────────────
        COALESCE(sh.share_pct, 0)        AS share_pct,
        COALESCE(sh.share_fibra_pct, 0)  AS share_fibra_pct,
        COALESCE(sh.share_movel_pct, 0)  AS share_movel_pct,
        sh.share_level,
        COALESCE(sh.total_ftth_vivo, 0)   AS total_ftth_vivo,
        COALESCE(sh.total_linhas_vivo, 0) AS total_linhas_vivo,
        COALESCE(d.total_population, 0)::INTEGER  AS total_population,
        COALESCE(d.total_domicilios, 0)::INTEGER  AS total_domicilios,
        COALESCE(sh.technology, 'MOVEL'::tech_category) AS technology,
        -- ─── QoE ────────────────────────────────────────────────────────────
        COALESCE(qv.avg_dl_throughput, 0) AS avg_dl_throughput,
        COALESCE(qv.avg_latency, 0)       AS avg_latency,
        CASE
            WHEN qv.avg_dl_throughput >= 100 AND qv.avg_latency <= 20 THEN 'EXCELENTE'::quality_label
            WHEN qv.avg_dl_throughput >= 50  AND qv.avg_latency <= 40 THEN 'BOM'::quality_label
            WHEN qv.avg_dl_throughput >= 20  OR  qv.avg_latency <= 60 THEN 'REGULAR'::quality_label
            ELSE 'RUIM'::quality_label
        END AS quality_label,
        COALESCE(d.avg_income, 0) AS avg_income
    FROM geohash_cell gc
    LEFT JOIN score_pivot_combined spc ON gc.geohash_id = spc.geohash_id AND gc.precision = spc.precision
    LEFT JOIN share sh ON gc.geohash_id = sh.geohash_id AND gc.precision = sh.precision
                       AND (spc.period_month IS NULL OR sh.period_month = spc.period_month)
    LEFT JOIN qoe_vivo qv ON gc.geohash_id = qv.geohash_id AND gc.precision = qv.precision
                          AND qv.period_month = COALESCE(spc.period_month, sh.period_month)
    LEFT JOIN demo d ON gc.geohash_id = d.geohash_id AND gc.precision = d.precision
    WHERE spc.geohash_id IS NOT NULL OR sh.geohash_id IS NOT NULL
),
quadrants AS (
    SELECT
        b.*,
        -- ─── quadrant legacy (igual hoje, baseado em vivo_score combinado e share_pct) ───
        CASE
            WHEN COALESCE(b.share_pct,0) >= 35 AND COALESCE(b.vivo_score,0) >= 7.01 THEN 'UPSELL'::quadrant_type
            WHEN COALESCE(b.share_pct,0) <  35 AND COALESCE(b.vivo_score,0) >= 7.01 THEN 'GROWTH'::quadrant_type
            WHEN COALESCE(b.share_pct,0) >= 35 AND COALESCE(b.vivo_score,0) <  5.0  THEN 'RETENCAO'::quadrant_type
            ELSE 'GROWTH_RETENCAO'::quadrant_type
        END AS quadrant,
        -- ─── quadrant_movel ───
        CASE
            WHEN COALESCE(b.share_movel_pct,0) >= 35 AND COALESCE(b.vivo_score_movel,0) >= 7.01 THEN 'UPSELL'::quadrant_type
            WHEN COALESCE(b.share_movel_pct,0) <  35 AND COALESCE(b.vivo_score_movel,0) >= 7.01 THEN 'GROWTH'::quadrant_type
            WHEN COALESCE(b.share_movel_pct,0) >= 35 AND COALESCE(b.vivo_score_movel,0) <  5.0  THEN 'RETENCAO'::quadrant_type
            ELSE 'GROWTH_RETENCAO'::quadrant_type
        END AS quadrant_movel,
        -- ─── quadrant_fibra ───
        CASE
            WHEN COALESCE(b.share_fibra_pct,0) >= 35 AND COALESCE(b.vivo_score_fibra,0) >= 7.01 THEN 'UPSELL'::quadrant_type
            WHEN COALESCE(b.share_fibra_pct,0) <  35 AND COALESCE(b.vivo_score_fibra,0) >= 7.01 THEN 'GROWTH'::quadrant_type
            WHEN COALESCE(b.share_fibra_pct,0) >= 35 AND COALESCE(b.vivo_score_fibra,0) <  5.0  THEN 'RETENCAO'::quadrant_type
            ELSE 'GROWTH_RETENCAO'::quadrant_type
        END AS quadrant_fibra,
        -- ─── competitive_position legacy ───
        CASE
            WHEN COALESCE(b.vivo_score,0) - GREATEST(COALESCE(b.tim_score,0), COALESCE(b.claro_score,0)) >  0.5 THEN 'LIDER'::competitive_position
            WHEN COALESCE(b.vivo_score,0) - GREATEST(COALESCE(b.tim_score,0), COALESCE(b.claro_score,0)) >= 0.0 THEN 'COMPETITIVO'::competitive_position
            WHEN COALESCE(b.vivo_score,0) - GREATEST(COALESCE(b.tim_score,0), COALESCE(b.claro_score,0)) >= -0.5 THEN 'EMPATADO'::competitive_position
            WHEN COALESCE(b.vivo_score,0) - GREATEST(COALESCE(b.tim_score,0), COALESCE(b.claro_score,0)) >= -1.0 THEN 'ABAIXO'::competitive_position
            ELSE 'CRITICO'::competitive_position
        END AS competitive_position,
        -- ─── competitive_position_movel ───
        CASE
            WHEN COALESCE(b.vivo_score_movel,0) - GREATEST(COALESCE(b.tim_score_movel,0), COALESCE(b.claro_score_movel,0)) >  0.5 THEN 'LIDER'::competitive_position
            WHEN COALESCE(b.vivo_score_movel,0) - GREATEST(COALESCE(b.tim_score_movel,0), COALESCE(b.claro_score_movel,0)) >= 0.0 THEN 'COMPETITIVO'::competitive_position
            WHEN COALESCE(b.vivo_score_movel,0) - GREATEST(COALESCE(b.tim_score_movel,0), COALESCE(b.claro_score_movel,0)) >= -0.5 THEN 'EMPATADO'::competitive_position
            WHEN COALESCE(b.vivo_score_movel,0) - GREATEST(COALESCE(b.tim_score_movel,0), COALESCE(b.claro_score_movel,0)) >= -1.0 THEN 'ABAIXO'::competitive_position
            ELSE 'CRITICO'::competitive_position
        END AS competitive_position_movel,
        -- ─── competitive_position_fibra ───
        CASE
            WHEN COALESCE(b.vivo_score_fibra,0) - GREATEST(COALESCE(b.tim_score_fibra,0), COALESCE(b.claro_score_fibra,0)) >  0.5 THEN 'LIDER'::competitive_position
            WHEN COALESCE(b.vivo_score_fibra,0) - GREATEST(COALESCE(b.tim_score_fibra,0), COALESCE(b.claro_score_fibra,0)) >= 0.0 THEN 'COMPETITIVO'::competitive_position
            WHEN COALESCE(b.vivo_score_fibra,0) - GREATEST(COALESCE(b.tim_score_fibra,0), COALESCE(b.claro_score_fibra,0)) >= -0.5 THEN 'EMPATADO'::competitive_position
            WHEN COALESCE(b.vivo_score_fibra,0) - GREATEST(COALESCE(b.tim_score_fibra,0), COALESCE(b.claro_score_fibra,0)) >= -1.0 THEN 'ABAIXO'::competitive_position
            ELSE 'CRITICO'::competitive_position
        END AS competitive_position_fibra
    FROM base b
),
priorities AS (
    SELECT
        q.*,
        -- ─── priority_score legacy (mesma fórmula da v3, baseada em vivo_score+share_pct) ───
        CASE
            WHEN COALESCE(q.share_pct,0) >= 35 AND COALESCE(q.vivo_score,0) < 5.0 THEN
                LEAST(10.0,
                    (10.0 - COALESCE(q.vivo_score,0)) * 0.30
                    + LEAST(COALESCE(q.share_pct,0) / 10.0, 10.0) * 0.25
                    + (10.0 - 5.0) * 0.25
                    + LEAST(COALESCE(q.total_population,0) / 20000.0, 10.0) * 0.10
                    + 5.0 * 0.10)
            WHEN COALESCE(q.share_pct,0) >= 35 AND COALESCE(q.vivo_score,0) >= 7.01 THEN
                LEAST(10.0,
                    LEAST(COALESCE(q.share_pct,0) / 10.0, 10.0) * 0.30
                    + COALESCE(q.vivo_score,0) * 0.25
                    + LEAST(COALESCE(q.avg_income,0) / 2000.0, 10.0) * 0.25
                    + 5.0 * 0.10
                    + LEAST(COALESCE(q.total_population,0) / 20000.0, 10.0) * 0.10)
            WHEN COALESCE(q.share_pct,0) <  35 AND COALESCE(q.vivo_score,0) >= 7.01 THEN
                LEAST(10.0,
                    (10.0 - LEAST(COALESCE(q.share_pct,0) / 10.0, 10.0)) * 0.25
                    + COALESCE(q.vivo_score,0) * 0.20
                    + LEAST(COALESCE(q.avg_income,0) / 2000.0, 10.0) * 0.20
                    + 5.0 * 0.20
                    + 5.0 * 0.15)
            ELSE
                LEAST(10.0,
                    5.0 * 0.30
                    + 5.0 * 0.25
                    + LEAST(COALESCE(q.avg_income,0) / 2000.0, 10.0) * 0.20
                    + COALESCE(q.vivo_score,0) * 0.15
                    + LEAST(COALESCE(q.share_pct,0) / 10.0, 10.0) * 0.10)
        END AS priority_score,
        -- ─── priority_score_movel (mesma fórmula, mas com vivo_score_movel + share_movel_pct) ───
        CASE
            WHEN COALESCE(q.share_movel_pct,0) >= 35 AND COALESCE(q.vivo_score_movel,0) < 5.0 THEN
                LEAST(10.0,
                    (10.0 - COALESCE(q.vivo_score_movel,0)) * 0.30
                    + LEAST(COALESCE(q.share_movel_pct,0) / 10.0, 10.0) * 0.25
                    + (10.0 - 5.0) * 0.25
                    + LEAST(COALESCE(q.total_population,0) / 20000.0, 10.0) * 0.10
                    + 5.0 * 0.10)
            WHEN COALESCE(q.share_movel_pct,0) >= 35 AND COALESCE(q.vivo_score_movel,0) >= 7.01 THEN
                LEAST(10.0,
                    LEAST(COALESCE(q.share_movel_pct,0) / 10.0, 10.0) * 0.30
                    + COALESCE(q.vivo_score_movel,0) * 0.25
                    + LEAST(COALESCE(q.avg_income,0) / 2000.0, 10.0) * 0.25
                    + 5.0 * 0.10
                    + LEAST(COALESCE(q.total_population,0) / 20000.0, 10.0) * 0.10)
            WHEN COALESCE(q.share_movel_pct,0) <  35 AND COALESCE(q.vivo_score_movel,0) >= 7.01 THEN
                LEAST(10.0,
                    (10.0 - LEAST(COALESCE(q.share_movel_pct,0) / 10.0, 10.0)) * 0.25
                    + COALESCE(q.vivo_score_movel,0) * 0.20
                    + LEAST(COALESCE(q.avg_income,0) / 2000.0, 10.0) * 0.20
                    + 5.0 * 0.20
                    + 5.0 * 0.15)
            ELSE
                LEAST(10.0,
                    5.0 * 0.30
                    + 5.0 * 0.25
                    + LEAST(COALESCE(q.avg_income,0) / 2000.0, 10.0) * 0.20
                    + COALESCE(q.vivo_score_movel,0) * 0.15
                    + LEAST(COALESCE(q.share_movel_pct,0) / 10.0, 10.0) * 0.10)
        END AS priority_score_movel,
        -- ─── priority_score_fibra (idem com vivo_score_fibra + share_fibra_pct) ───
        CASE
            WHEN COALESCE(q.share_fibra_pct,0) >= 35 AND COALESCE(q.vivo_score_fibra,0) < 5.0 THEN
                LEAST(10.0,
                    (10.0 - COALESCE(q.vivo_score_fibra,0)) * 0.30
                    + LEAST(COALESCE(q.share_fibra_pct,0) / 10.0, 10.0) * 0.25
                    + (10.0 - 5.0) * 0.25
                    + LEAST(COALESCE(q.total_population,0) / 20000.0, 10.0) * 0.10
                    + 5.0 * 0.10)
            WHEN COALESCE(q.share_fibra_pct,0) >= 35 AND COALESCE(q.vivo_score_fibra,0) >= 7.01 THEN
                LEAST(10.0,
                    LEAST(COALESCE(q.share_fibra_pct,0) / 10.0, 10.0) * 0.30
                    + COALESCE(q.vivo_score_fibra,0) * 0.25
                    + LEAST(COALESCE(q.avg_income,0) / 2000.0, 10.0) * 0.25
                    + 5.0 * 0.10
                    + LEAST(COALESCE(q.total_population,0) / 20000.0, 10.0) * 0.10)
            WHEN COALESCE(q.share_fibra_pct,0) <  35 AND COALESCE(q.vivo_score_fibra,0) >= 7.01 THEN
                LEAST(10.0,
                    (10.0 - LEAST(COALESCE(q.share_fibra_pct,0) / 10.0, 10.0)) * 0.25
                    + COALESCE(q.vivo_score_fibra,0) * 0.20
                    + LEAST(COALESCE(q.avg_income,0) / 2000.0, 10.0) * 0.20
                    + 5.0 * 0.20
                    + 5.0 * 0.15)
            ELSE
                LEAST(10.0,
                    5.0 * 0.30
                    + 5.0 * 0.25
                    + LEAST(COALESCE(q.avg_income,0) / 2000.0, 10.0) * 0.20
                    + COALESCE(q.vivo_score_fibra,0) * 0.15
                    + LEAST(COALESCE(q.share_movel_pct,0) / 10.0, 10.0) * 0.10)
        END AS priority_score_fibra
    FROM quadrants q
)
SELECT
    -- ─── Canonical / legacy columns ────────────────────────────────────────
    geohash_id, precision, center_lat, center_lng,
    neighborhood, city, state, period_month,
    vivo_score, tim_score, claro_score, vivo_sample_size,
    share_pct, share_fibra_pct, share_movel_pct, share_level,
    total_ftth_vivo, total_linhas_vivo,
    total_population, total_domicilios,
    technology, quadrant, competitive_position,
    avg_dl_throughput, avg_latency, quality_label,
    avg_income, priority_score,
    -- Priority label (legacy)
    CASE
        WHEN priority_score >  7.5 THEN 'P1_CRITICA'::priority_label
        WHEN priority_score >= 6.0 THEN 'P2_ALTA'::priority_label
        WHEN priority_score >= 4.5 THEN 'P3_MEDIA'::priority_label
        ELSE                            'P4_BAIXA'::priority_label
    END AS priority_label,
    -- API-compatible aliases (legacy)
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
    0.0::NUMERIC              AS trend_delta,
    -- ─── NOVO: scores e indicadores separados por tecnologia ───────────────
    vivo_score_movel,  vivo_score_fibra,
    tim_score_movel,   tim_score_fibra,
    claro_score_movel, claro_score_fibra,
    vivo_sample_size_movel, vivo_sample_size_fibra,
    quadrant_movel, quadrant_fibra,
    competitive_position_movel, competitive_position_fibra,
    priority_score_movel, priority_score_fibra,
    CASE
        WHEN priority_score_movel >  7.5 THEN 'P1_CRITICA'::priority_label
        WHEN priority_score_movel >= 6.0 THEN 'P2_ALTA'::priority_label
        WHEN priority_score_movel >= 4.5 THEN 'P3_MEDIA'::priority_label
        ELSE                                  'P4_BAIXA'::priority_label
    END AS priority_label_movel,
    CASE
        WHEN priority_score_fibra >  7.5 THEN 'P1_CRITICA'::priority_label
        WHEN priority_score_fibra >= 6.0 THEN 'P2_ALTA'::priority_label
        WHEN priority_score_fibra >= 4.5 THEN 'P3_MEDIA'::priority_label
        ELSE                                  'P4_BAIXA'::priority_label
    END AS priority_label_fibra
FROM priorities
WITH DATA;--> statement-breakpoint

-- Indices (incluindo os legacy)
CREATE UNIQUE INDEX idx_mvw_gh_summary_pk
    ON vw_geohash_summary (geohash_id, precision, period);--> statement-breakpoint
CREATE INDEX idx_mvw_gh_summary_precision_period
    ON vw_geohash_summary (precision, period);--> statement-breakpoint
CREATE INDEX idx_mvw_gh_summary_quadrant
    ON vw_geohash_summary (quadrant_type, priority_score DESC);--> statement-breakpoint
-- Novos índices úteis para drill-down por tecnologia
CREATE INDEX idx_mvw_gh_summary_quadrant_movel
    ON vw_geohash_summary (quadrant_movel, priority_score_movel DESC);--> statement-breakpoint
CREATE INDEX idx_mvw_gh_summary_quadrant_fibra
    ON vw_geohash_summary (quadrant_fibra, priority_score_fibra DESC);--> statement-breakpoint

COMMENT ON MATERIALIZED VIEW vw_geohash_summary IS
    'v4 — fonte de score migrada de tabela `score` (parcial, 2 meses) para mv_score_mobile/fibra (recalculadas via vw_score_mobile/fibra v7). Adiciona colunas separadas por tecnologia: *_movel e *_fibra para vivo/tim/claro_score, quadrant, competitive_position, priority_score, priority_label. Colunas legacy (sem sufixo) usam combinação via technology da célula. Refresh hourly via fn_refresh_geohash_summary; MVs intermediárias refrescadas diariamente via fn_refresh_score_mvs.';--> statement-breakpoint


-- ---------------------------------------------------------------------------
-- 5. Recriar vw_bairro_summary v2 com colunas espelhadas
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW vw_bairro_summary AS
SELECT
    gs.neighborhood, gs.city, gs.state, gs.period_month,
    gs.period_month                                         AS period,
    COUNT(DISTINCT gs.geohash_id)::int                      AS geohash_count,
    COUNT(DISTINCT gs.geohash_id)::int                      AS total_geohashes,
    SUM(gs.total_population)                                AS total_population,
    SUM(gs.total_linhas_vivo) + SUM(gs.total_ftth_vivo)     AS total_clients,
    ROUND(AVG(gs.share_pct)::numeric, 2)                    AS avg_share,
    ROUND(AVG(gs.vivo_score)::numeric, 1)                   AS avg_satisfaction,
    -- Legacy averages
    ROUND(AVG(gs.vivo_score)::numeric, 1)                   AS avg_vivo_score,
    ROUND(AVG(gs.tim_score)::numeric, 1)                    AS avg_tim_score,
    ROUND(AVG(gs.claro_score)::numeric, 1)                  AS avg_claro_score,
    ROUND(AVG(gs.priority_score)::numeric, 2)               AS avg_priority_score,
    MODE() WITHIN GROUP (ORDER BY gs.quadrant)              AS dominant_quadrant,
    ROUND((AVG(gs.avg_income) FILTER (WHERE gs.avg_income > 0))::numeric, 2) AS avg_income,
    SUM(gs.total_domicilios)                                AS total_domicilios,
    COUNT(*) FILTER (WHERE gs.quadrant = 'GROWTH')::int           AS geohash_count_growth,
    COUNT(*) FILTER (WHERE gs.quadrant = 'UPSELL')::int           AS geohash_count_upsell,
    COUNT(*) FILTER (WHERE gs.quadrant = 'RETENCAO')::int         AS geohash_count_retencao,
    COUNT(*) FILTER (WHERE gs.quadrant = 'GROWTH_RETENCAO')::int  AS geohash_count_growth_retencao,
    -- ─── NOVO: averages e contagens por tecnologia ──────────────────────────
    ROUND(AVG(gs.vivo_score_movel)::numeric, 1)             AS avg_vivo_score_movel,
    ROUND(AVG(gs.vivo_score_fibra)::numeric, 1)             AS avg_vivo_score_fibra,
    ROUND(AVG(gs.tim_score_movel)::numeric, 1)              AS avg_tim_score_movel,
    ROUND(AVG(gs.tim_score_fibra)::numeric, 1)              AS avg_tim_score_fibra,
    ROUND(AVG(gs.claro_score_movel)::numeric, 1)            AS avg_claro_score_movel,
    ROUND(AVG(gs.claro_score_fibra)::numeric, 1)            AS avg_claro_score_fibra,
    ROUND(AVG(gs.priority_score_movel)::numeric, 2)         AS avg_priority_score_movel,
    ROUND(AVG(gs.priority_score_fibra)::numeric, 2)         AS avg_priority_score_fibra,
    MODE() WITHIN GROUP (ORDER BY gs.quadrant_movel)        AS dominant_quadrant_movel,
    MODE() WITHIN GROUP (ORDER BY gs.quadrant_fibra)        AS dominant_quadrant_fibra,
    -- Contagens por quadrant (mobile)
    COUNT(*) FILTER (WHERE gs.quadrant_movel = 'GROWTH')::int           AS geohash_count_growth_movel,
    COUNT(*) FILTER (WHERE gs.quadrant_movel = 'UPSELL')::int           AS geohash_count_upsell_movel,
    COUNT(*) FILTER (WHERE gs.quadrant_movel = 'RETENCAO')::int         AS geohash_count_retencao_movel,
    COUNT(*) FILTER (WHERE gs.quadrant_movel = 'GROWTH_RETENCAO')::int  AS geohash_count_growth_retencao_movel,
    -- Contagens por quadrant (fibra)
    COUNT(*) FILTER (WHERE gs.quadrant_fibra = 'GROWTH')::int           AS geohash_count_growth_fibra,
    COUNT(*) FILTER (WHERE gs.quadrant_fibra = 'UPSELL')::int           AS geohash_count_upsell_fibra,
    COUNT(*) FILTER (WHERE gs.quadrant_fibra = 'RETENCAO')::int         AS geohash_count_retencao_fibra,
    COUNT(*) FILTER (WHERE gs.quadrant_fibra = 'GROWTH_RETENCAO')::int  AS geohash_count_growth_retencao_fibra
FROM vw_geohash_summary gs
WHERE gs.neighborhood IS NOT NULL
GROUP BY gs.neighborhood, gs.city, gs.state, gs.period_month;--> statement-breakpoint

COMMENT ON VIEW vw_bairro_summary IS
    'v2 — agregação por bairro a partir de vw_geohash_summary v4. Adiciona colunas separadas por tecnologia (avg_*_movel, avg_*_fibra, dominant_quadrant_movel/fibra, geohash_count_*_movel/fibra) espelhando a estrutura nova.';--> statement-breakpoint


-- ---------------------------------------------------------------------------
-- 6. Job diário para refresh das MVs intermediárias
-- ---------------------------------------------------------------------------

CREATE OR REPLACE PROCEDURE fn_refresh_score_mvs(job_id INT, config JSONB)
LANGUAGE plpgsql AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_score_mobile;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_score_fibra;
END;
$$;--> statement-breakpoint

-- Remove qualquer job pré-existente com o mesmo nome (idempotência) e agenda novo
DO $$
DECLARE
  v_job_id INTEGER;
BEGIN
  FOR v_job_id IN
    SELECT job_id FROM timescaledb_information.jobs
    WHERE proc_name = 'fn_refresh_score_mvs'
  LOOP
    PERFORM delete_job(v_job_id);
  END LOOP;
END $$;--> statement-breakpoint

SELECT add_job(
    'fn_refresh_score_mvs',
    schedule_interval => INTERVAL '1 day',
    initial_start => NOW() + INTERVAL '1 hour'
);
