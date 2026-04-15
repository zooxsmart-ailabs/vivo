-- =============================================================================
-- Migration 0011: Camada 2 — Materialized views for infrastructure
-- classification (fibra + móvel).
--
-- Computes classifications from existing data:
--   - vivo_ftth_coverage / vivo_mobile_erb  → presence detection
--   - vw_score_fibra / vw_score_mobile      → QoE scores (0-10)
--   - vw_share_real                         → share data (sinergia_movel)
--   - geo_por_latlong                       → demographics (renda, densidade)
--   - geohash_crm                           → CRM data (device_tier, income)
--
-- Classifications that require unavailable operational data
-- (taxa_ocupacao, portas_disponiveis) are excluded for now.
--
-- Rastreabilidade: RN004-04 (Fibra), RN004-05 (Móvel)
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 0. Ensure geohash_crm table exists (schema defined in Drizzle but
--    never created by a previous migration).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS geohash_crm (
    geohash_id          VARCHAR(12)     NOT NULL REFERENCES geohash_cell(geohash_id),
    period              VARCHAR(7)      NOT NULL,
    avg_arpu            NUMERIC(10,2),
    arpu_movel          NUMERIC(10,2),
    arpu_fibra          NUMERIC(10,2),
    dominant_plan_type  VARCHAR(100),
    plan_type_movel     VARCHAR(100),
    device_tier         VARCHAR(20),
    avg_income          NUMERIC(12,2),
    population_density  NUMERIC(10,2),
    income_label        VARCHAR(50),
    captured_at         TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_geohash_crm PRIMARY KEY (geohash_id, period)
);--> statement-breakpoint


-- ---------------------------------------------------------------------------
-- 1. MATERIALIZED VIEW: camada2_fibra
--    Classifica infraestrutura de fibra por geohash.
--    Árvore de decisão (RN004-04):
--      Sem FTTH no geohash → SEM_FIBRA
--      Com FTTH + QoE < 4.0 → MELHORA_QUALIDADE
--      Com FTTH + QoE >= 4.0 → SAUDAVEL
--    AUMENTO_CAPACIDADE excluído (depende de taxa_ocupacao — dado indisponível).
-- ---------------------------------------------------------------------------
CREATE MATERIALIZED VIEW camada2_fibra AS
WITH
-- Presence: does this geohash have any FTTH installation?
ftth_presence AS (
    SELECT geohash7 AS geohash_id, 7::SMALLINT AS precision, anomes,
           COUNT(*) AS ftth_count, TRUE AS tem_fibra
    FROM vivo_ftth_coverage
    WHERE geohash7 IS NOT NULL
    GROUP BY geohash7, anomes
    UNION ALL
    SELECT geohash6, 6::SMALLINT, anomes,
           COUNT(*), TRUE
    FROM vivo_ftth_coverage
    WHERE geohash6 IS NOT NULL
    GROUP BY geohash6, anomes
),
-- QoE score for VIVO fiber (0-10 scale)
score_fibra_vivo AS (
    SELECT geohash_id, precision, period_month, composite_score
    FROM vw_score_fibra
    WHERE operator = 'VIVO'
),
-- Share data (sinergia_movel = share_movel_pct from vw_share_real)
share AS (
    SELECT geohash_id, precision, anomes, share_movel_pct
    FROM vw_share_real
),
-- Demographics
demo AS (
    SELECT geohash7 AS geohash_id, 7::SMALLINT AS precision,
           AVG(renda_per_capita_media) AS renda_media,
           SUM(populacao_total_media) AS populacao,
           SUM(total_de_domicilios_media) AS domicilios
    FROM geo_por_latlong WHERE geohash7 IS NOT NULL GROUP BY geohash7
    UNION ALL
    SELECT LEFT(geohash7, 6), 6::SMALLINT,
           AVG(renda_per_capita_media), SUM(populacao_total_media), SUM(total_de_domicilios_media)
    FROM geo_por_latlong WHERE geohash7 IS NOT NULL GROUP BY LEFT(geohash7, 6)
),
-- Base: all geohash_cell entries joined with data sources
base AS (
    SELECT
        gc.geohash_id,
        gc.precision,
        -- Period: prefer FTTH anomes, fall back to score period, then latest ERB period
        COALESCE(
            TO_CHAR(TO_DATE(fp.anomes::TEXT, 'YYYYMM'), 'YYYY-MM'),
            TO_CHAR(sf.period_month, 'YYYY-MM'),
            (SELECT TO_CHAR(TO_DATE(MAX(anomes)::TEXT, 'YYYYMM'), 'YYYY-MM')
             FROM vivo_mobile_erb)
        ) AS period,
        COALESCE(fp.tem_fibra, FALSE) AS tem_fibra,
        sf.composite_score AS score_qoe,  -- 0-10
        d.renda_media,
        d.populacao,
        d.domicilios,
        sh.share_movel_pct
    FROM geohash_cell gc
    LEFT JOIN LATERAL (
        SELECT fp2.anomes, fp2.tem_fibra
        FROM ftth_presence fp2
        WHERE fp2.geohash_id = gc.geohash_id AND fp2.precision = gc.precision
        ORDER BY fp2.anomes DESC LIMIT 1
    ) fp ON TRUE
    LEFT JOIN LATERAL (
        SELECT sf2.period_month, sf2.composite_score
        FROM score_fibra_vivo sf2
        WHERE sf2.geohash_id = gc.geohash_id AND sf2.precision = gc.precision
        ORDER BY sf2.period_month DESC LIMIT 1
    ) sf ON TRUE
    LEFT JOIN demo d ON d.geohash_id = gc.geohash_id AND d.precision = gc.precision
    LEFT JOIN LATERAL (
        SELECT sh2.share_movel_pct
        FROM share sh2
        WHERE sh2.geohash_id = gc.geohash_id AND sh2.precision = gc.precision
        ORDER BY sh2.anomes DESC LIMIT 1
    ) sh ON TRUE
    -- Include geohashes with FTTH, score, or ERB data (for SEM_FIBRA classification)
    WHERE fp.tem_fibra IS NOT NULL
       OR sf.composite_score IS NOT NULL
       OR gc.geohash_id IN (
            SELECT DISTINCT geohash7 FROM vivo_mobile_erb WHERE geohash7 IS NOT NULL
            UNION
            SELECT DISTINCT geohash6 FROM vivo_mobile_erb WHERE geohash6 IS NOT NULL
          )
)
SELECT
    geohash_id,
    period,
    -- Classification (RN004-04 decision tree)
    CASE
        WHEN NOT tem_fibra THEN 'SEM_FIBRA'::fibra_class
        WHEN score_qoe IS NOT NULL AND score_qoe < 4.0 THEN 'MELHORA_QUALIDADE'::fibra_class
        ELSE 'SAUDAVEL'::fibra_class
    END AS classification,
    -- Score de intervenção (0-100): QoE invertido normalizado
    -- Quanto pior a qualidade, maior o score de urgência
    CASE
        WHEN NOT tem_fibra THEN
            -- Para SEM_FIBRA: score baseado em potencial de mercado
            LEAST(ROUND(
                COALESCE(renda_media / NULLIF((SELECT MAX(renda_media) FROM base), 0) * 50, 0)
                + COALESCE(populacao / NULLIF((SELECT MAX(populacao) FROM base), 0) * 50, 0)
            ), 100)::SMALLINT
        WHEN score_qoe IS NOT NULL THEN
            -- Para MELHORA_QUALIDADE/SAUDAVEL: inversão do QoE
            LEAST(ROUND((10.0 - score_qoe) * 10), 100)::SMALLINT
        ELSE 50::SMALLINT  -- default
    END AS score,
    -- Score label
    CASE
        WHEN NOT tem_fibra THEN
            CASE
                WHEN COALESCE(renda_media / NULLIF((SELECT MAX(renda_media) FROM base), 0) * 50, 0)
                     + COALESCE(populacao / NULLIF((SELECT MAX(populacao) FROM base), 0) * 50, 0) >= 80 THEN 'CRITICO'::score_label
                WHEN COALESCE(renda_media / NULLIF((SELECT MAX(renda_media) FROM base), 0) * 50, 0)
                     + COALESCE(populacao / NULLIF((SELECT MAX(populacao) FROM base), 0) * 50, 0) >= 60 THEN 'ALTO'::score_label
                WHEN COALESCE(renda_media / NULLIF((SELECT MAX(renda_media) FROM base), 0) * 50, 0)
                     + COALESCE(populacao / NULLIF((SELECT MAX(populacao) FROM base), 0) * 50, 0) >= 40 THEN 'MEDIO'::score_label
                ELSE 'BAIXO'::score_label
            END
        WHEN score_qoe IS NOT NULL THEN
            CASE
                WHEN (10.0 - score_qoe) * 10 >= 80 THEN 'CRITICO'::score_label
                WHEN (10.0 - score_qoe) * 10 >= 60 THEN 'ALTO'::score_label
                WHEN (10.0 - score_qoe) * 10 >= 40 THEN 'MEDIO'::score_label
                ELSE 'BAIXO'::score_label
            END
        ELSE 'MEDIO'::score_label
    END AS score_label,
    -- taxa_ocupacao: indisponível (dado operacional Vivo)
    NULL::NUMERIC(5,2) AS taxa_ocupacao,
    -- portas_disponiveis: indisponível (dado operacional Vivo)
    NULL::NUMERIC(5,2) AS portas_disponiveis,
    -- potencial_mercado: renda × densidade normalizado 0-100
    CASE
        WHEN renda_media IS NOT NULL AND populacao IS NOT NULL THEN
            LEAST(ROUND(
                COALESCE(renda_media / NULLIF((SELECT MAX(renda_media) FROM base), 0) * 50, 0)
                + COALESCE(populacao / NULLIF((SELECT MAX(populacao) FROM base), 0) * 50, 0)
            ), 100)::NUMERIC(5,2)
        ELSE NULL
    END AS potencial_mercado,
    -- sinergia_movel: share móvel Vivo no geohash
    ROUND(COALESCE(share_movel_pct, 0)::NUMERIC, 2)::NUMERIC(5,2) AS sinergia_movel
FROM base
WHERE period IS NOT NULL
WITH DATA;--> statement-breakpoint

CREATE UNIQUE INDEX idx_c2f_mv_pk ON camada2_fibra (geohash_id, period);--> statement-breakpoint
CREATE INDEX idx_c2f_mv_class ON camada2_fibra (classification);--> statement-breakpoint


-- ---------------------------------------------------------------------------
-- 2. MATERIALIZED VIEW: camada2_movel
--    Classifica infraestrutura móvel por geohash.
--    Árvore de decisão (RN004-05):
--      Sem ERB no geohash → EXPANSAO_COBERTURA_5G ou _4G
--      Com ERB + QoE < 4.0 → MELHORA_QUALIDADE_5G ou _4G
--      Com ERB + QoE >= 4.0 → SAUDAVEL
--    Separação 4G/5G: renda >= 5000 AND device_tier IN ('Premium','Mid') → 5G
-- ---------------------------------------------------------------------------
CREATE MATERIALIZED VIEW camada2_movel AS
WITH
-- Presence: does this geohash have any ERB?
erb_presence AS (
    SELECT geohash7 AS geohash_id, 7::SMALLINT AS precision, anomes,
           SUM(qtde_lnha_pos + qtde_lnha_ctrl + qtde_lnha_pre) AS total_linhas,
           TRUE AS tem_erb
    FROM vivo_mobile_erb
    WHERE geohash7 IS NOT NULL
    GROUP BY geohash7, anomes
    UNION ALL
    SELECT geohash6, 6::SMALLINT, anomes,
           SUM(qtde_lnha_pos + qtde_lnha_ctrl + qtde_lnha_pre),
           TRUE
    FROM vivo_mobile_erb
    WHERE geohash6 IS NOT NULL
    GROUP BY geohash6, anomes
),
-- QoE score for VIVO mobile (0-10 scale)
score_movel_vivo AS (
    SELECT geohash_id, precision, period_month, composite_score
    FROM vw_score_mobile
    WHERE operator = 'VIVO'
),
-- Best competitor score (for vulnerabilidade_concorrencia)
score_concorrente AS (
    SELECT geohash_id, precision, period_month,
           MAX(composite_score) AS best_competitor_score
    FROM vw_score_mobile
    WHERE operator != 'VIVO' AND operator != 'OUTROS'
    GROUP BY geohash_id, precision, period_month
),
-- Demographics
demo AS (
    SELECT geohash7 AS geohash_id, 7::SMALLINT AS precision,
           AVG(renda_per_capita_media) AS renda_media,
           SUM(populacao_total_media) AS populacao
    FROM geo_por_latlong WHERE geohash7 IS NOT NULL GROUP BY geohash7
    UNION ALL
    SELECT LEFT(geohash7, 6), 6::SMALLINT,
           AVG(renda_per_capita_media), SUM(populacao_total_media)
    FROM geo_por_latlong WHERE geohash7 IS NOT NULL GROUP BY LEFT(geohash7, 6)
),
-- CRM data (device_tier, income)
crm AS (
    SELECT geohash_id, device_tier, avg_income
    FROM geohash_crm c
    WHERE period = (SELECT MAX(period) FROM geohash_crm WHERE geohash_id = c.geohash_id)
),
-- Base
base AS (
    SELECT
        gc.geohash_id,
        gc.precision,
        COALESCE(
            TO_CHAR(TO_DATE(ep.anomes::TEXT, 'YYYYMM'), 'YYYY-MM'),
            TO_CHAR(sm.period_month, 'YYYY-MM'),
            (SELECT TO_CHAR(TO_DATE(MAX(anomes)::TEXT, 'YYYYMM'), 'YYYY-MM')
             FROM vivo_ftth_coverage)
        ) AS period,
        COALESCE(ep.tem_erb, FALSE) AS tem_erb,
        sm.composite_score AS score_qoe,  -- 0-10
        sc.best_competitor_score,          -- 0-10
        d.renda_media,
        d.populacao,
        crm.device_tier,
        COALESCE(crm.avg_income::NUMERIC, d.renda_media) AS income,
        -- Separação 4G/5G: renda alta + device premium/mid → 5G
        CASE
            WHEN COALESCE(crm.avg_income::NUMERIC, d.renda_media, 0) >= 5000
                 AND COALESCE(crm.device_tier, '') IN ('Premium', 'Mid')
            THEN TRUE
            ELSE FALSE
        END AS is_5g_profile
    FROM geohash_cell gc
    LEFT JOIN LATERAL (
        SELECT ep2.anomes, ep2.tem_erb
        FROM erb_presence ep2
        WHERE ep2.geohash_id = gc.geohash_id AND ep2.precision = gc.precision
        ORDER BY ep2.anomes DESC LIMIT 1
    ) ep ON TRUE
    LEFT JOIN LATERAL (
        SELECT sm2.period_month, sm2.composite_score
        FROM score_movel_vivo sm2
        WHERE sm2.geohash_id = gc.geohash_id AND sm2.precision = gc.precision
        ORDER BY sm2.period_month DESC LIMIT 1
    ) sm ON TRUE
    LEFT JOIN LATERAL (
        SELECT sc2.best_competitor_score
        FROM score_concorrente sc2
        WHERE sc2.geohash_id = gc.geohash_id AND sc2.precision = gc.precision
        ORDER BY sc2.period_month DESC LIMIT 1
    ) sc ON TRUE
    LEFT JOIN demo d ON d.geohash_id = gc.geohash_id AND d.precision = gc.precision
    LEFT JOIN crm ON crm.geohash_id = gc.geohash_id
    -- Include geohashes with ERB, score, or FTTH data (for EXPANSAO classification)
    WHERE ep.tem_erb IS NOT NULL
       OR sm.composite_score IS NOT NULL
       OR gc.geohash_id IN (
            SELECT DISTINCT geohash7 FROM vivo_ftth_coverage WHERE geohash7 IS NOT NULL
            UNION
            SELECT DISTINCT geohash6 FROM vivo_ftth_coverage WHERE geohash6 IS NOT NULL
          )
),
-- Max values for normalization
norms AS (
    SELECT
        MAX(renda_media) AS max_renda,
        MAX(populacao) AS max_populacao
    FROM base
)
SELECT
    b.geohash_id,
    b.period,
    -- Classification (RN004-05 decision tree)
    CASE
        WHEN NOT b.tem_erb AND b.is_5g_profile THEN 'EXPANSAO_COBERTURA_5G'::movel_class
        WHEN NOT b.tem_erb THEN 'EXPANSAO_COBERTURA_4G'::movel_class
        WHEN b.score_qoe IS NOT NULL AND b.score_qoe < 4.0 AND b.is_5g_profile THEN 'MELHORA_QUALIDADE_5G'::movel_class
        WHEN b.score_qoe IS NOT NULL AND b.score_qoe < 4.0 THEN 'MELHORA_QUALIDADE_4G'::movel_class
        ELSE 'SAUDAVEL'::movel_class
    END AS classification,
    -- Score de intervenção (0-100)
    CASE
        WHEN NOT b.tem_erb THEN
            -- Para expansão: baseado em densidade demográfica + vulnerabilidade concorrência
            LEAST(ROUND(
                COALESCE(b.populacao / NULLIF(n.max_populacao, 0) * 60, 0)
                + COALESCE((10.0 - COALESCE(b.best_competitor_score, 5.0)) * 4, 0)
            ), 100)::SMALLINT
        WHEN b.score_qoe IS NOT NULL THEN
            -- Para melhora qualidade: inversão do QoE
            LEAST(ROUND((10.0 - b.score_qoe) * 10), 100)::SMALLINT
        ELSE 50::SMALLINT
    END AS score,
    -- Score label
    CASE
        WHEN NOT b.tem_erb THEN
            CASE
                WHEN COALESCE(b.populacao / NULLIF(n.max_populacao, 0) * 60, 0)
                     + COALESCE((10.0 - COALESCE(b.best_competitor_score, 5.0)) * 4, 0) >= 80 THEN 'CRITICO'::score_label
                WHEN COALESCE(b.populacao / NULLIF(n.max_populacao, 0) * 60, 0)
                     + COALESCE((10.0 - COALESCE(b.best_competitor_score, 5.0)) * 4, 0) >= 60 THEN 'ALTO'::score_label
                WHEN COALESCE(b.populacao / NULLIF(n.max_populacao, 0) * 60, 0)
                     + COALESCE((10.0 - COALESCE(b.best_competitor_score, 5.0)) * 4, 0) >= 40 THEN 'MEDIO'::score_label
                ELSE 'BAIXO'::score_label
            END
        WHEN b.score_qoe IS NOT NULL THEN
            CASE
                WHEN (10.0 - b.score_qoe) * 10 >= 80 THEN 'CRITICO'::score_label
                WHEN (10.0 - b.score_qoe) * 10 >= 60 THEN 'ALTO'::score_label
                WHEN (10.0 - b.score_qoe) * 10 >= 40 THEN 'MEDIO'::score_label
                ELSE 'BAIXO'::score_label
            END
        ELSE 'MEDIO'::score_label
    END AS score_label,
    -- tech_recommendation
    CASE
        WHEN b.is_5g_profile THEN 'SG_PREMIUM'::tech_recommendation
        ELSE '4G_MASS'::tech_recommendation
    END AS tech_recommendation,
    -- speedtest_score: QoE normalizado 0-100
    CASE
        WHEN b.score_qoe IS NOT NULL THEN ROUND((b.score_qoe * 10)::NUMERIC, 2)::NUMERIC(5,2)
        ELSE NULL
    END AS speedtest_score,
    -- concentracao_renda: renda normalizada 0-100
    CASE
        WHEN b.renda_media IS NOT NULL AND n.max_renda > 0 THEN
            LEAST(ROUND((b.renda_media / n.max_renda * 100)::NUMERIC, 2), 100)::NUMERIC(5,2)
        ELSE NULL
    END AS concentracao_renda,
    -- vulnerabilidade_concorrencia: 100 - score concorrente normalizado
    -- Quanto pior o concorrente, maior a janela de ataque
    CASE
        WHEN b.best_competitor_score IS NOT NULL THEN
            ROUND(((10.0 - b.best_competitor_score) * 10)::NUMERIC, 2)::NUMERIC(5,2)
        ELSE NULL
    END AS vulnerabilidade_concorrencia
FROM base b
CROSS JOIN norms n
WHERE b.period IS NOT NULL
WITH DATA;--> statement-breakpoint

CREATE UNIQUE INDEX idx_c2m_mv_pk ON camada2_movel (geohash_id, period);--> statement-breakpoint
CREATE INDEX idx_c2m_mv_class ON camada2_movel (classification);
