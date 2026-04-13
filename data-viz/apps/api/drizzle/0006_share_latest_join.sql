-- =============================================================================
-- Migration 0006: Fix share JOIN — use latest available share per geohash
--
-- Problem: share data (vw_share_real) only has period 202512, while score data
--   spans 2025-12 to 2026-03. The exact period JOIN causes share_pct = 0 for
--   all months except 2025-12, making everything GROWTH_RETENCAO.
--
-- Fix: Use LATERAL join to pick the most recent share <= score period.
--   If no share exists for that period, use the latest available.
-- =============================================================================

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
share_raw AS (
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
    LEFT JOIN LATERAL (
        SELECT share_pct, share_fibra_pct, share_movel_pct,
               share_level, technology, total_ftth_vivo, total_linhas_vivo,
               period_month
        FROM share_raw sr
        WHERE sr.geohash_id = gc.geohash_id
          AND sr.precision = gc.precision
          AND sr.period_month <= COALESCE(sp.period_month, '9999-12-31'::date)
        ORDER BY sr.period_month DESC
        LIMIT 1
    ) sh ON TRUE
    LEFT JOIN qoe_vivo qv ON gc.geohash_id = qv.geohash_id AND gc.precision = qv.precision
                          AND qv.period_month = COALESCE(sp.period_month, sh.period_month)
    LEFT JOIN demo d  ON gc.geohash_id = d.geohash_id  AND gc.precision = d.precision
    WHERE sp.geohash_id IS NOT NULL OR sh.share_pct IS NOT NULL
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_mvw_gh_summary_pk
  ON vw_geohash_summary (geohash_id, precision, period);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_mvw_gh_summary_precision_period
  ON vw_geohash_summary (precision, period);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_mvw_gh_summary_quadrant
  ON vw_geohash_summary (quadrant_type, priority_score DESC);--> statement-breakpoint

-- Recreate vw_bairro_summary (dropped by CASCADE)
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
