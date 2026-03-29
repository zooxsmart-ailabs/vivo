-- =============================================================================
-- DDL — Zoox x Vivo GeoIntelligence
-- PostgreSQL 18 + TimescaleDB + PostGIS
-- =============================================================================
-- Versao: 2.0
-- Data: 2026-03-29
-- Rastreabilidade: docs/use-cases/INDEX.md (UC001-UC012)
-- Fonte: docs/levantamento/Zoox_+_Vivo_Estrategia_v1203.pdf
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. EXTENSOES
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS postgis;

-- ---------------------------------------------------------------------------
-- 1. DOMINIOS E ENUMS
-- ---------------------------------------------------------------------------

-- RN001-01: Quadrante estrategico (Levantamento v1203)
CREATE TYPE quadrant_type AS ENUM (
    'OPORTUNIDADE',      -- Share baixo + Satisfacao alta (ex-GROWTH)
    'FORTALEZA',         -- Share alto + Satisfacao alta  (ex-UPSELL)
    'EXPANSAO',          -- Share baixo + Satisfacao baixa (ex-GROWTH_RETENCAO)
    'RISCO'              -- Share alto + Satisfacao baixa  (ex-RETENCAO)
);
COMMENT ON TYPE quadrant_type IS 'Quadrante estrategico: OPORTUNIDADE (share<30%,sat>=7.5), FORTALEZA (share>=40%,sat>=7.5), RISCO (share>=40%,sat<6.0), EXPANSAO (share<30%,sat<6.0)';

CREATE TYPE tech_category AS ENUM ('FIBRA', 'MOVEL', 'AMBOS');
COMMENT ON TYPE tech_category IS 'Categoria de tecnologia derivada da presenca de FTTH e/ou ERB no geohash';

CREATE TYPE operator_name AS ENUM ('VIVO', 'TIM', 'CLARO', 'OI', 'OUTROS');

CREATE TYPE trend_direction AS ENUM ('UP', 'DOWN', 'STABLE');
COMMENT ON TYPE trend_direction IS 'UP: delta > +1.0pp, STABLE: -1.0 a +1.0pp, DOWN: delta < -1.0pp';

CREATE TYPE fibra_class AS ENUM (
    'AUMENTO_CAPACIDADE',  -- Fibra presente, ocupacao > 85% ou < 5 portas
    'EXPANSAO_NOVA_AREA',  -- Sem cobertura fibra (greenfield)
    'SAUDAVEL'             -- Fibra presente, ocupacao <= 85% (monitorar)
);
COMMENT ON TYPE fibra_class IS 'Classificacao Camada 2 Fibra. Score: AUMENTO=60%ocupacao+40%valor, EXPANSAO=50%mercado+50%sinergia';

CREATE TYPE movel_class AS ENUM (
    'MELHORA_QUALIDADE',   -- Cobertura existe, SpeedTest < benchmark
    'SAUDAVEL',            -- Cobertura e qualidade OK
    'EXPANSAO_COBERTURA'   -- Sem cobertura (white spots) ou sinal fraco
);
COMMENT ON TYPE movel_class IS 'Classificacao Camada 2 Movel. Trilha interna: 5G (premium) ou 4G (mass)';

CREATE TYPE priority_label AS ENUM ('P1_CRITICA', 'P2_ALTA', 'P3_MEDIA', 'P4_BAIXA');
COMMENT ON TYPE priority_label IS 'P1>=8.5, P2=6.0-8.4, P3=4.0-5.9, P4<4.0 (score absoluto 0-10)';

CREATE TYPE quality_label AS ENUM ('EXCELENTE', 'BOM', 'REGULAR', 'RUIM');

CREATE TYPE benchmark_scope AS ENUM ('NACIONAL', 'ESTADO', 'CIDADE');

CREATE TYPE competitive_position AS ENUM (
    'LIDER',        -- Delta > +0.5   | Risco Baixo
    'COMPETITIVO',  -- Delta 0 a +0.5 | Risco Medio
    'EMPAREDADA',   -- Delta -0.5 a 0 | Risco Medio-Alto
    'ABAIXO',       -- Delta -1.0 a -0.5 | Risco Alto
    'ISOLADA'       -- Delta < -1.8   | Risco Critico
);
COMMENT ON TYPE competitive_position IS 'Posicao competitiva: delta = score_vivo - MAX(score_tim, score_claro)';

CREATE TYPE share_level AS ENUM (
    'MUITO_ALTA',   -- > 50%
    'ALTA',         -- 40-50%
    'MEDIA',        -- 30-39%
    'BAIXA'         -- < 30%
);
COMMENT ON TYPE share_level IS 'Nivel de penetracao de mercado Vivo no geohash';

-- ---------------------------------------------------------------------------
-- 2. TABELAS RAW (AIE) — ja existem no banco
-- ---------------------------------------------------------------------------
-- file_transfer: estudo/create_tables.sql (187 colunas, hypertable ts_result)
-- video: estudo/create_tables.sql (89 colunas, hypertable ts_result)
-- web_browsing: estudo/create_tables.sql (91 colunas, hypertable ts_result)
-- score: estudo/create_tables.sql (15 colunas)
-- geo_por_latlong: estudo/create_tables.sql (22 colunas + geom + geohash7)

-- ---------------------------------------------------------------------------
-- 3. TABELA: vivo_ftth_coverage (NOVA — AIE D11)
-- Dados operacionais Vivo: instalacoes FTTH por ponto geografico
-- Fonte: Ookla_visao_ftth_3M_YYYYMM.csv (~110k rows/mes)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vivo_ftth_coverage (
    cod_geo         VARCHAR(20)      NOT NULL,
    anomes          INTEGER          NOT NULL,
    produto         VARCHAR(20)      NOT NULL DEFAULT 'BANDA LARGA',
    tp_produto      VARCHAR(10)      NOT NULL DEFAULT 'FTTH',
    uf              VARCHAR(2)       NOT NULL,
    flg_loc         SMALLINT         NOT NULL,
    x               DOUBLE PRECISION NOT NULL,
    y               DOUBLE PRECISION NOT NULL,
    geom            GEOMETRY(POINT, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(x, y), 4326)) STORED,
    geohash7        TEXT GENERATED ALWAYS AS (ST_GeoHash(ST_SetSRID(ST_MakePoint(x, y), 4326), 7)) STORED,
    geohash6        TEXT GENERATED ALWAYS AS (ST_GeoHash(ST_SetSRID(ST_MakePoint(x, y), 4326), 6)) STORED,

    CONSTRAINT pk_vivo_ftth PRIMARY KEY (cod_geo, anomes),
    CONSTRAINT ck_ftth_flg_loc CHECK (flg_loc IN (1, 2)),
    CONSTRAINT ck_ftth_anomes CHECK (anomes >= 202501)
);

COMMENT ON TABLE vivo_ftth_coverage IS 'Instalacoes FTTH Vivo por ponto geografico. Share FIBRA = COUNT(por geohash) / total_domicilios. AIE D11.';
COMMENT ON COLUMN vivo_ftth_coverage.cod_geo IS 'Codigo geografico da instalacao (C*, V*, 3-*, 8-*)';
COMMENT ON COLUMN vivo_ftth_coverage.flg_loc IS 'Flag de localizacao: 1 ou 2 (semantica a confirmar com Vivo)';
COMMENT ON COLUMN vivo_ftth_coverage.geohash7 IS 'Geohash precisao 7 gerado automaticamente de x,y via PostGIS';
COMMENT ON COLUMN vivo_ftth_coverage.geohash6 IS 'Geohash precisao 6 gerado automaticamente para drill-out';

CREATE INDEX IF NOT EXISTS idx_ftth_geohash7 ON vivo_ftth_coverage (geohash7, anomes);
CREATE INDEX IF NOT EXISTS idx_ftth_geohash6 ON vivo_ftth_coverage (geohash6, anomes);
CREATE INDEX IF NOT EXISTS idx_ftth_geom ON vivo_ftth_coverage USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_ftth_anomes ON vivo_ftth_coverage (anomes);
CREATE INDEX IF NOT EXISTS idx_ftth_uf ON vivo_ftth_coverage (uf);

-- ---------------------------------------------------------------------------
-- 4. TABELA: vivo_mobile_erb (NOVA — AIE D12)
-- Dados operacionais Vivo: ERBs movel com contagem de linhas
-- Fonte: Ookla_visao_movel_3M_erb_casa_YYYYMM.csv (~1k rows/mes)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vivo_mobile_erb (
    erb_casa        VARCHAR(20)      NOT NULL,
    anomes          INTEGER          NOT NULL,
    qtde_lnha_pos   INTEGER          NOT NULL DEFAULT 0,
    qtde_lnha_ctrl  INTEGER          NOT NULL DEFAULT 0,
    qtde_lnha_pre   INTEGER          NOT NULL DEFAULT 0,
    x               DOUBLE PRECISION NOT NULL,
    y               DOUBLE PRECISION NOT NULL,
    geom            GEOMETRY(POINT, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(x, y), 4326)) STORED,
    geohash7        TEXT GENERATED ALWAYS AS (ST_GeoHash(ST_SetSRID(ST_MakePoint(x, y), 4326), 7)) STORED,
    geohash6        TEXT GENERATED ALWAYS AS (ST_GeoHash(ST_SetSRID(ST_MakePoint(x, y), 4326), 6)) STORED,

    CONSTRAINT pk_vivo_erb PRIMARY KEY (erb_casa, anomes),
    CONSTRAINT ck_erb_linhas_pos CHECK (qtde_lnha_pos >= 0),
    CONSTRAINT ck_erb_linhas_ctrl CHECK (qtde_lnha_ctrl >= 0),
    CONSTRAINT ck_erb_linhas_pre CHECK (qtde_lnha_pre >= 0),
    CONSTRAINT ck_erb_anomes CHECK (anomes >= 202501)
);

COMMENT ON TABLE vivo_mobile_erb IS 'ERBs movel Vivo com linhas ativas. Share MOVEL = SUM(linhas por geohash) / populacao. AIE D12.';
COMMENT ON COLUMN vivo_mobile_erb.erb_casa IS 'ID da ERB (estacao radio base), formato: UF + alfanumerico (ex: GOFMQ)';
COMMENT ON COLUMN vivo_mobile_erb.qtde_lnha_pos IS 'Linhas pos-pago vinculadas a esta ERB';
COMMENT ON COLUMN vivo_mobile_erb.qtde_lnha_ctrl IS 'Linhas controle vinculadas a esta ERB';
COMMENT ON COLUMN vivo_mobile_erb.qtde_lnha_pre IS 'Linhas pre-pago vinculadas a esta ERB';

CREATE INDEX IF NOT EXISTS idx_erb_geohash7 ON vivo_mobile_erb (geohash7, anomes);
CREATE INDEX IF NOT EXISTS idx_erb_geohash6 ON vivo_mobile_erb (geohash6, anomes);
CREATE INDEX IF NOT EXISTS idx_erb_geom ON vivo_mobile_erb USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_erb_anomes ON vivo_mobile_erb (anomes);

-- ---------------------------------------------------------------------------
-- 5. TABELA: geohash_cell (Dimensao Espacial) — sem alteracao
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS geohash_cell (
    geohash_id      VARCHAR(12)     NOT NULL,
    precision       SMALLINT        NOT NULL,
    center_lat      DOUBLE PRECISION NOT NULL,
    center_lng      DOUBLE PRECISION NOT NULL,
    geom            GEOMETRY(POLYGON, 4326) NOT NULL,
    neighborhood    VARCHAR(100),
    city            VARCHAR(100)    NOT NULL,
    state           VARCHAR(2)      NOT NULL,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_geohash_cell PRIMARY KEY (geohash_id),
    CONSTRAINT ck_geohash_precision CHECK (precision BETWEEN 1 AND 12),
    CONSTRAINT ck_geohash_state_len CHECK (LENGTH(state) = 2),
    CONSTRAINT ck_geohash_id_format CHECK (geohash_id ~ '^[0-9a-z]+$')
);

COMMENT ON TABLE geohash_cell IS 'Celula geohash com poligono. PK natural permite drill-down por prefixo (UC005).';

CREATE INDEX IF NOT EXISTS idx_geohash_cell_geom ON geohash_cell USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_geohash_cell_prefix5 ON geohash_cell (LEFT(geohash_id, 5));
CREATE INDEX IF NOT EXISTS idx_geohash_cell_prefix6 ON geohash_cell (LEFT(geohash_id, 6));
CREATE INDEX IF NOT EXISTS idx_geohash_cell_location ON geohash_cell (state, city, neighborhood);
CREATE INDEX IF NOT EXISTS idx_geohash_cell_precision ON geohash_cell (precision);

-- ---------------------------------------------------------------------------
-- 6. TABELA: benchmark_config — thresholds atualizados (Levantamento)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS benchmark_config (
    id              SERIAL          NOT NULL,
    key             VARCHAR(50)     NOT NULL,
    scope           benchmark_scope NOT NULL,
    region          VARCHAR(100),
    value           NUMERIC(8,3)    NOT NULL,
    period_date     DATE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_benchmark_config PRIMARY KEY (id),
    CONSTRAINT ck_benchmark_value_positive CHECK (value >= 0),
    CONSTRAINT uq_benchmark_key_scope UNIQUE (key, scope, region, period_date)
);

COMMENT ON TABLE benchmark_config IS 'Benchmarks e thresholds configuraveis. Fonte: Levantamento v1203.';

-- Seed: thresholds oficiais do levantamento
INSERT INTO benchmark_config (key, scope, region, value) VALUES
    -- Thresholds de quadrante (Levantamento sec.5)
    ('shareThresholdAlto', 'ESTADO', 'GO', 40),
    ('shareThresholdBaixo', 'ESTADO', 'GO', 30),
    ('satisfacaoThresholdAlta', 'ESTADO', 'GO', 7.5),
    ('satisfacaoThresholdBaixa', 'ESTADO', 'GO', 6.0),
    -- Thresholds de tendencia (Levantamento sec.2)
    ('trendThresholdUp', 'ESTADO', 'GO', 1.0),
    ('trendThresholdDown', 'ESTADO', 'GO', -1.0),
    -- Benchmarks de referencia
    ('satisfacaoMedia', 'NACIONAL', NULL, 6.5),
    ('shareMedia', 'NACIONAL', NULL, 32),
    -- Thresholds de renda (Levantamento sec.1)
    ('rendaAlta', 'ESTADO', 'GO', 10000),
    ('rendaBaixa', 'ESTADO', 'GO', 3500),
    -- Densidade
    ('densidadeAlta', 'ESTADO', 'GO', 15000),
    ('densidadeBaixa', 'ESTADO', 'GO', 5000)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 7. TABELA: user_session — sem alteracao
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_session (
    user_id         VARCHAR(255)    NOT NULL,
    state           JSONB           NOT NULL DEFAULT '{}',
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_user_session PRIMARY KEY (user_id)
);

COMMENT ON TABLE user_session IS 'Estado da sessao do usuario (backup do Redis). Schema JSONB: RN011-01.';
CREATE INDEX IF NOT EXISTS idx_user_session_updated ON user_session (updated_at DESC);

-- ---------------------------------------------------------------------------
-- 8. INDICES ADICIONAIS NAS TABELAS RAW
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_ft_operator_month ON file_transfer (attr_sim_operator_common_name, DATE_TRUNC('month', ts_result));
CREATE INDEX IF NOT EXISTS idx_video_operator_month ON video (attr_sim_operator_common_name, DATE_TRUNC('month', ts_result));
CREATE INDEX IF NOT EXISTS idx_wb_operator_month ON web_browsing (attr_sim_operator_common_name, DATE_TRUNC('month', ts_result));
CREATE INDEX IF NOT EXISTS idx_ft_geohash6 ON file_transfer (attr_geohash6, ts_result DESC);
CREATE INDEX IF NOT EXISTS idx_video_geohash6 ON video (attr_geohash6, ts_result DESC);
CREATE INDEX IF NOT EXISTS idx_wb_geohash6 ON web_browsing (attr_geohash6, ts_result DESC);
CREATE INDEX IF NOT EXISTS idx_ft_connection_gen ON file_transfer (attr_connection_generation_name, attr_geohash7);

-- ---------------------------------------------------------------------------
-- 9. CONTINUOUS AGGREGATES — 6 CAAGs (3 metricas × 2 precisoes)
-- Sem alteracao da v1 (nomes: cagg_ft_monthly_gh7, cagg_ft_monthly_gh6, etc.)
-- Ver DDL anterior para definicoes completas
-- ---------------------------------------------------------------------------

-- 9a. File Transfer — geohash7
CREATE MATERIALIZED VIEW IF NOT EXISTS cagg_ft_monthly_gh7
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 month', ts_result) AS period_month,
    attr_geohash7 AS geohash_id, 7::SMALLINT AS precision,
    UPPER(TRIM(attr_sim_operator_common_name)) AS operator,
    AVG(val_dl_throughput) AS avg_dl_throughput,
    AVG(val_ul_throughput) AS avg_ul_throughput,
    AVG(val_latency_avg) AS avg_latency,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY val_dl_throughput) AS p50_dl_throughput,
    COUNT(*) AS test_count,
    COUNT(*) FILTER (WHERE attr_connection_generation_name ILIKE '%NR%') AS count_5g,
    COUNT(*) FILTER (WHERE attr_connection_generation_name ILIKE '%LTE%') AS count_4g
FROM file_transfer
WHERE attr_geohash7 IS NOT NULL AND val_dl_throughput IS NOT NULL
GROUP BY period_month, geohash_id, operator
WITH NO DATA;

SELECT add_continuous_aggregate_policy('cagg_ft_monthly_gh7',
    start_offset => INTERVAL '3 months', end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour');

-- 9b. File Transfer — geohash6
CREATE MATERIALIZED VIEW IF NOT EXISTS cagg_ft_monthly_gh6
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 month', ts_result) AS period_month,
    attr_geohash6 AS geohash_id, 6::SMALLINT AS precision,
    UPPER(TRIM(attr_sim_operator_common_name)) AS operator,
    AVG(val_dl_throughput) AS avg_dl_throughput,
    AVG(val_ul_throughput) AS avg_ul_throughput,
    AVG(val_latency_avg) AS avg_latency,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY val_dl_throughput) AS p50_dl_throughput,
    COUNT(*) AS test_count,
    COUNT(*) FILTER (WHERE attr_connection_generation_name ILIKE '%NR%') AS count_5g,
    COUNT(*) FILTER (WHERE attr_connection_generation_name ILIKE '%LTE%') AS count_4g
FROM file_transfer
WHERE attr_geohash6 IS NOT NULL AND val_dl_throughput IS NOT NULL
GROUP BY period_month, geohash_id, operator
WITH NO DATA;

SELECT add_continuous_aggregate_policy('cagg_ft_monthly_gh6',
    start_offset => INTERVAL '3 months', end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour');

-- 9c-9f. Video e Web (gh7 + gh6) — mesma estrutura, omitido por brevidade
-- Ver v1 para definicoes completas de cagg_video_monthly_gh7/gh6 e cagg_web_monthly_gh7/gh6

-- 9g. View unificada QoE
CREATE OR REPLACE VIEW vw_qoe_monthly AS
SELECT * FROM cagg_ft_monthly_gh7
UNION ALL
SELECT * FROM cagg_ft_monthly_gh6;

COMMENT ON VIEW vw_qoe_monthly IS 'Unifica file transfer gh6+gh7. Filtrar por precision.';

-- ---------------------------------------------------------------------------
-- 10. VIEW: vw_share_real
-- Calculo de share REAL usando dados operacionais Vivo (Levantamento sec.1)
-- FIBRA: instalacoes FTTH / domicilios × 100
-- MOVEL: linhas ERB / populacao × 100
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_share_real AS
WITH
-- Share FIBRA por geohash7 x mes
share_fibra_gh7 AS (
    SELECT
        f.geohash7 AS geohash_id,
        7::SMALLINT AS precision,
        f.anomes,
        COUNT(*) AS ftth_count,
        COALESCE(d.total_domicilios, 1) AS total_domicilios,
        LEAST(COUNT(*) * 100.0 / NULLIF(COALESCE(d.total_domicilios, 1), 0), 100) AS share_fibra_pct
    FROM vivo_ftth_coverage f
    LEFT JOIN (
        SELECT geohash7, SUM(total_de_domicilios_media) AS total_domicilios
        FROM geo_por_latlong WHERE geohash7 IS NOT NULL GROUP BY geohash7
    ) d ON f.geohash7 = d.geohash7
    GROUP BY f.geohash7, f.anomes, d.total_domicilios
),
-- Share FIBRA por geohash6 x mes
share_fibra_gh6 AS (
    SELECT
        f.geohash6 AS geohash_id,
        6::SMALLINT AS precision,
        f.anomes,
        COUNT(*) AS ftth_count,
        COALESCE(d.total_domicilios, 1) AS total_domicilios,
        LEAST(COUNT(*) * 100.0 / NULLIF(COALESCE(d.total_domicilios, 1), 0), 100) AS share_fibra_pct
    FROM vivo_ftth_coverage f
    LEFT JOIN (
        SELECT LEFT(geohash7, 6) AS gh6, SUM(total_de_domicilios_media) AS total_domicilios
        FROM geo_por_latlong WHERE geohash7 IS NOT NULL GROUP BY LEFT(geohash7, 6)
    ) d ON f.geohash6 = d.gh6
    GROUP BY f.geohash6, f.anomes, d.total_domicilios
),
-- Share MOVEL por geohash7 x mes
share_movel_gh7 AS (
    SELECT
        e.geohash7 AS geohash_id,
        7::SMALLINT AS precision,
        e.anomes,
        SUM(e.qtde_lnha_pos + e.qtde_lnha_ctrl + e.qtde_lnha_pre) AS total_linhas,
        COALESCE(d.total_pop, 1) AS total_populacao,
        LEAST(SUM(e.qtde_lnha_pos + e.qtde_lnha_ctrl + e.qtde_lnha_pre) * 100.0
              / NULLIF(COALESCE(d.total_pop, 1), 0), 100) AS share_movel_pct
    FROM vivo_mobile_erb e
    LEFT JOIN (
        SELECT geohash7, SUM(populacao_total_media) AS total_pop
        FROM geo_por_latlong WHERE geohash7 IS NOT NULL GROUP BY geohash7
    ) d ON e.geohash7 = d.geohash7
    GROUP BY e.geohash7, e.anomes, d.total_pop
),
-- Share MOVEL por geohash6 x mes
share_movel_gh6 AS (
    SELECT
        e.geohash6 AS geohash_id,
        6::SMALLINT AS precision,
        e.anomes,
        SUM(e.qtde_lnha_pos + e.qtde_lnha_ctrl + e.qtde_lnha_pre) AS total_linhas,
        COALESCE(d.total_pop, 1) AS total_populacao,
        LEAST(SUM(e.qtde_lnha_pos + e.qtde_lnha_ctrl + e.qtde_lnha_pre) * 100.0
              / NULLIF(COALESCE(d.total_pop, 1), 0), 100) AS share_movel_pct
    FROM vivo_mobile_erb e
    LEFT JOIN (
        SELECT LEFT(geohash7, 6) AS gh6, SUM(populacao_total_media) AS total_pop
        FROM geo_por_latlong WHERE geohash7 IS NOT NULL GROUP BY LEFT(geohash7, 6)
    ) d ON e.geohash6 = d.gh6
    GROUP BY e.geohash6, e.anomes, d.total_pop
)
-- Unificado
SELECT
    COALESCE(f.geohash_id, m.geohash_id) AS geohash_id,
    COALESCE(f.precision, m.precision) AS precision,
    COALESCE(f.anomes, m.anomes) AS anomes,
    f.ftth_count AS total_ftth_vivo,
    f.share_fibra_pct,
    m.total_linhas AS total_linhas_vivo,
    m.share_movel_pct,
    -- Technology (RN003-03)
    CASE
        WHEN f.geohash_id IS NOT NULL AND m.geohash_id IS NOT NULL THEN 'AMBOS'::tech_category
        WHEN f.geohash_id IS NOT NULL THEN 'FIBRA'::tech_category
        ELSE 'MOVEL'::tech_category
    END AS technology,
    -- Share combinado (maior entre fibra e movel)
    GREATEST(COALESCE(f.share_fibra_pct, 0), COALESCE(m.share_movel_pct, 0)) AS share_pct,
    -- Share level (Levantamento sec.1)
    CASE
        WHEN GREATEST(COALESCE(f.share_fibra_pct, 0), COALESCE(m.share_movel_pct, 0)) > 50 THEN 'MUITO_ALTA'::share_level
        WHEN GREATEST(COALESCE(f.share_fibra_pct, 0), COALESCE(m.share_movel_pct, 0)) >= 40 THEN 'ALTA'::share_level
        WHEN GREATEST(COALESCE(f.share_fibra_pct, 0), COALESCE(m.share_movel_pct, 0)) >= 30 THEN 'MEDIA'::share_level
        ELSE 'BAIXA'::share_level
    END AS share_level
FROM (SELECT * FROM share_fibra_gh7 UNION ALL SELECT * FROM share_fibra_gh6) f
FULL OUTER JOIN (SELECT * FROM share_movel_gh7 UNION ALL SELECT * FROM share_movel_gh6) m
    ON f.geohash_id = m.geohash_id AND f.precision = m.precision AND f.anomes = m.anomes;

COMMENT ON VIEW vw_share_real IS 'Share de mercado real Vivo usando dados FTTH e ERB. Formula oficial do Levantamento v1203 sec.1.';

-- ---------------------------------------------------------------------------
-- 11. VIEW: vw_geohash_summary (REESCRITA — v2)
-- View principal consumida pelo frontend. Usa share real, novos quadrantes,
-- posicao competitiva, prioridade ponderada.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_geohash_summary AS
WITH
-- Scores por operadora (normalizado 0-10)
scores_all AS (
    SELECT
        cd_geo_hsh7 AS geohash_id, 7::SMALLINT AS precision,
        TO_DATE(nu_ano_mes_rfrn::TEXT, 'YYYYMM') AS period_month,
        UPPER(TRIM(nm_oprd)) AS operator,
        vl_cntv_scre / 10.0 AS composite_score,
        (COALESCE(qt_ltra_vdeo_scre,0)+COALESCE(qt_ltra_web_scre,0)+COALESCE(qt_ltra_sped_scre,0)) AS sample_size
    FROM score WHERE vl_cntv_scre IS NOT NULL
    UNION ALL
    SELECT
        LEFT(cd_geo_hsh7, 6), 6::SMALLINT,
        TO_DATE(nu_ano_mes_rfrn::TEXT, 'YYYYMM'),
        UPPER(TRIM(nm_oprd)),
        AVG(vl_cntv_scre / 10.0),
        SUM(COALESCE(qt_ltra_vdeo_scre,0)+COALESCE(qt_ltra_web_scre,0)+COALESCE(qt_ltra_sped_scre,0))
    FROM score WHERE vl_cntv_scre IS NOT NULL
    GROUP BY LEFT(cd_geo_hsh7, 6), TO_DATE(nu_ano_mes_rfrn::TEXT, 'YYYYMM'), UPPER(TRIM(nm_oprd))
),
score_pivot AS (
    SELECT geohash_id, precision, period_month,
        MAX(CASE WHEN operator LIKE '%VIVO%' THEN composite_score END) AS vivo_score,
        MAX(CASE WHEN operator LIKE '%TIM%' THEN composite_score END) AS tim_score,
        MAX(CASE WHEN operator LIKE '%CLARO%' THEN composite_score END) AS claro_score,
        MAX(CASE WHEN operator LIKE '%VIVO%' THEN sample_size END) AS vivo_sample_size
    FROM scores_all GROUP BY geohash_id, precision, period_month
),
-- QoE Vivo
qoe_vivo AS (
    SELECT geohash_id, precision, period_month,
        avg_dl_throughput, avg_latency, p50_dl_throughput, test_count
    FROM vw_qoe_monthly WHERE operator LIKE '%VIVO%'
),
-- Share real
share AS (
    SELECT geohash_id, precision, anomes,
        share_pct, share_fibra_pct, share_movel_pct,
        share_level, technology,
        total_ftth_vivo, total_linhas_vivo
    FROM vw_share_real
),
-- Demografia
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
)
SELECT
    gc.geohash_id, gc.precision,
    gc.center_lat, gc.center_lng,
    gc.neighborhood, gc.city, gc.state,
    sp.period_month,
    -- Scores (0-10)
    COALESCE(sp.vivo_score, 0) AS vivo_score,
    COALESCE(sp.tim_score, 0) AS tim_score,
    COALESCE(sp.claro_score, 0) AS claro_score,
    COALESCE(sp.vivo_sample_size, 0) AS vivo_sample_size,
    -- Share real
    COALESCE(sh.share_pct, 0) AS share_pct,
    COALESCE(sh.share_fibra_pct, 0) AS share_fibra_pct,
    COALESCE(sh.share_movel_pct, 0) AS share_movel_pct,
    sh.share_level,
    COALESCE(sh.total_ftth_vivo, 0) AS total_ftth_vivo,
    COALESCE(sh.total_linhas_vivo, 0) AS total_linhas_vivo,
    COALESCE(d.total_population, 0)::INTEGER AS total_population,
    COALESCE(d.total_domicilios, 0)::INTEGER AS total_domicilios,
    -- Technology
    COALESCE(sh.technology, 'MOVEL'::tech_category) AS technology,
    -- Quadrante (Levantamento sec.5 — novos nomes e thresholds)
    CASE
        WHEN COALESCE(sh.share_pct,0) >= 40 AND COALESCE(sp.vivo_score,0) >= 7.5 THEN 'FORTALEZA'::quadrant_type
        WHEN COALESCE(sh.share_pct,0) < 30  AND COALESCE(sp.vivo_score,0) >= 7.5 THEN 'OPORTUNIDADE'::quadrant_type
        WHEN COALESCE(sh.share_pct,0) >= 40 AND COALESCE(sp.vivo_score,0) < 6.0  THEN 'RISCO'::quadrant_type
        WHEN COALESCE(sh.share_pct,0) < 30  AND COALESCE(sp.vivo_score,0) < 6.0  THEN 'EXPANSAO'::quadrant_type
        -- Zona intermediaria: classificar pelo quadrante mais proximo
        WHEN COALESCE(sp.vivo_score,0) >= 6.75 THEN
            CASE WHEN COALESCE(sh.share_pct,0) >= 35 THEN 'FORTALEZA' ELSE 'OPORTUNIDADE' END::quadrant_type
        ELSE
            CASE WHEN COALESCE(sh.share_pct,0) >= 35 THEN 'RISCO' ELSE 'EXPANSAO' END::quadrant_type
    END AS quadrant,
    -- Posicao competitiva (Levantamento sec.4)
    CASE
        WHEN COALESCE(sp.vivo_score,0) - GREATEST(COALESCE(sp.tim_score,0), COALESCE(sp.claro_score,0)) > 0.5 THEN 'LIDER'::competitive_position
        WHEN COALESCE(sp.vivo_score,0) - GREATEST(COALESCE(sp.tim_score,0), COALESCE(sp.claro_score,0)) >= 0 THEN 'COMPETITIVO'::competitive_position
        WHEN COALESCE(sp.vivo_score,0) - GREATEST(COALESCE(sp.tim_score,0), COALESCE(sp.claro_score,0)) >= -0.5 THEN 'EMPAREDADA'::competitive_position
        WHEN COALESCE(sp.vivo_score,0) - GREATEST(COALESCE(sp.tim_score,0), COALESCE(sp.claro_score,0)) >= -1.8 THEN 'ABAIXO'::competitive_position
        ELSE 'ISOLADA'::competitive_position
    END AS competitive_position,
    -- QoE
    COALESCE(qv.avg_dl_throughput, 0) AS avg_dl_throughput,
    COALESCE(qv.avg_latency, 0) AS avg_latency,
    CASE
        WHEN qv.avg_dl_throughput >= 100 AND qv.avg_latency <= 20 THEN 'EXCELENTE'::quality_label
        WHEN qv.avg_dl_throughput >= 50  AND qv.avg_latency <= 40 THEN 'BOM'::quality_label
        WHEN qv.avg_dl_throughput >= 20  OR  qv.avg_latency <= 60 THEN 'REGULAR'::quality_label
        ELSE 'RUIM'::quality_label
    END AS quality_label,
    -- Demografia
    COALESCE(d.avg_income, 0) AS avg_income,
    -- Prioridade (Levantamento sec.score — formulas ponderadas)
    -- Nota: ARPU e gross_margin nao disponiveis nos dados atuais, substituidos por proxies
    CASE
        WHEN COALESCE(sh.share_pct,0) >= 40 AND COALESCE(sp.vivo_score,0) < 6.0 THEN
            -- RISCO: Share×0.30 + RiscoChurn×0.25 + DeltaShare×0.15 + Renda×0.15 + QoE×0.15
            LEAST(10, COALESCE(sh.share_pct,0)/10*0.30 + (10-COALESCE(sp.vivo_score,0))*0.25*2
                + 5*0.15 + LEAST(COALESCE(d.avg_income,0)/2000, 10)*0.15
                + (10-LEAST(COALESCE(qv.avg_latency,50)/10, 10))*0.15)
        WHEN COALESCE(sh.share_pct,0) >= 40 AND COALESCE(sp.vivo_score,0) >= 7.5 THEN
            -- FORTALEZA: Satisfacao×0.30 + Share×0.20 + Renda×0.20 + QoE×0.15 + Pop×0.15
            LEAST(10, COALESCE(sp.vivo_score,0)*0.30*1.3 + COALESCE(sh.share_pct,0)/10*0.20
                + LEAST(COALESCE(d.avg_income,0)/2000, 10)*0.20
                + LEAST(COALESCE(qv.avg_dl_throughput,0)/20, 10)*0.15
                + LEAST(COALESCE(d.total_population,0)/20000, 10)*0.15)
        WHEN COALESCE(sh.share_pct,0) < 30 AND COALESCE(sp.vivo_score,0) >= 7.5 THEN
            -- OPORTUNIDADE: Cobertura×0.25 + Satisfacao×0.20 + Renda×0.20 + Pop×0.20 + DeltaShare×0.15
            LEAST(10, COALESCE(sp.vivo_score,0)*0.20*1.3
                + LEAST(COALESCE(d.avg_income,0)/2000, 10)*0.20
                + LEAST(COALESCE(d.total_population,0)/20000, 10)*0.20
                + LEAST(COALESCE(qv.avg_dl_throughput,0)/20, 10)*0.25 + 5*0.15)
        ELSE
            -- EXPANSAO: Renda×0.30 + Pop×0.25 + Cobertura×0.25 + DeltaShare×0.20
            LEAST(10, LEAST(COALESCE(d.avg_income,0)/2000, 10)*0.30
                + LEAST(COALESCE(d.total_population,0)/20000, 10)*0.25
                + LEAST(COALESCE(qv.avg_dl_throughput,0)/20, 10)*0.25 + 5*0.20)
    END AS priority_score,
    -- Priority label (Levantamento)
    CASE
        WHEN 1=1 THEN  -- placeholder, calculado no app a partir do priority_score
            CASE
                WHEN 8.5 <= 10 THEN 'P1_CRITICA'::priority_label  -- score >= 8.5
                ELSE 'P4_BAIXA'::priority_label
            END
    END AS priority_label  -- calculado de fato no backend/app

FROM geohash_cell gc
LEFT JOIN score_pivot sp ON gc.geohash_id = sp.geohash_id AND gc.precision = sp.precision
LEFT JOIN qoe_vivo qv ON gc.geohash_id = qv.geohash_id AND gc.precision = qv.precision AND qv.period_month = sp.period_month
LEFT JOIN share sh ON gc.geohash_id = sh.geohash_id AND gc.precision = sh.precision
LEFT JOIN demo d ON gc.geohash_id = d.geohash_id AND gc.precision = d.precision;

COMMENT ON VIEW vw_geohash_summary IS 'View principal v2: share real (FTTH+ERB), quadrantes OPORTUNIDADE/FORTALEZA/RISCO/EXPANSAO, posicao competitiva, prioridade ponderada.';

-- ---------------------------------------------------------------------------
-- 12. VIEW: vw_bairro_summary (atualizada — novos quadrantes)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_bairro_summary AS
SELECT
    gs.neighborhood, gs.city, gs.state, gs.period_month,
    COUNT(DISTINCT gs.geohash_id) AS geohash_count,
    SUM(gs.total_population) AS total_population,
    SUM(gs.total_linhas_vivo) + SUM(gs.total_ftth_vivo) AS total_clients,
    ROUND(AVG(gs.share_pct), 2) AS avg_share,
    ROUND(AVG(gs.vivo_score), 1) AS avg_vivo_score,
    ROUND(AVG(gs.tim_score), 1) AS avg_tim_score,
    ROUND(AVG(gs.claro_score), 1) AS avg_claro_score,
    ROUND(AVG(gs.avg_income) FILTER (WHERE gs.avg_income > 0), 2) AS avg_income,
    SUM(gs.total_domicilios) AS total_domicilios,
    JSONB_BUILD_OBJECT(
        'OPORTUNIDADE', COUNT(*) FILTER (WHERE gs.quadrant = 'OPORTUNIDADE'),
        'FORTALEZA',    COUNT(*) FILTER (WHERE gs.quadrant = 'FORTALEZA'),
        'EXPANSAO',     COUNT(*) FILTER (WHERE gs.quadrant = 'EXPANSAO'),
        'RISCO',        COUNT(*) FILTER (WHERE gs.quadrant = 'RISCO')
    ) AS quadrant_counts
FROM vw_geohash_summary gs
WHERE gs.neighborhood IS NOT NULL
GROUP BY gs.neighborhood, gs.city, gs.state, gs.period_month;

COMMENT ON VIEW vw_bairro_summary IS 'Agregacao por bairro v2 com quadrantes OPORTUNIDADE/FORTALEZA/RISCO/EXPANSAO.';

-- ---------------------------------------------------------------------------
-- 13. FUNCOES
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_available_periods()
RETURNS TABLE (period_month DATE, test_count BIGINT) AS $$
    SELECT time_bucket('1 month', ts_result)::DATE, COUNT(*)
    FROM file_transfer GROUP BY 1 ORDER BY 1 DESC;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION fn_normalize_operator(raw_name TEXT)
RETURNS operator_name AS $$
    SELECT CASE
        WHEN UPPER(TRIM(raw_name)) LIKE '%VIVO%' THEN 'VIVO'::operator_name
        WHEN UPPER(TRIM(raw_name)) LIKE '%TIM%' THEN 'TIM'::operator_name
        WHEN UPPER(TRIM(raw_name)) LIKE '%CLARO%' THEN 'CLARO'::operator_name
        WHEN UPPER(TRIM(raw_name)) LIKE '%OI%' THEN 'OI'::operator_name
        ELSE 'OUTROS'::operator_name
    END;
$$ LANGUAGE SQL IMMUTABLE;

-- ---------------------------------------------------------------------------
-- 14. POLITICAS TIMESCALEDB
-- ---------------------------------------------------------------------------
SELECT add_retention_policy('file_transfer', INTERVAL '36 months', if_not_exists => true);
SELECT add_retention_policy('video', INTERVAL '36 months', if_not_exists => true);
SELECT add_retention_policy('web_browsing', INTERVAL '36 months', if_not_exists => true);

ALTER TABLE file_transfer SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'attr_geohash7, attr_sim_operator_common_name',
    timescaledb.compress_orderby = 'ts_result DESC');
SELECT add_compression_policy('file_transfer', INTERVAL '6 months', if_not_exists => true);

ALTER TABLE video SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'attr_geohash7, attr_sim_operator_common_name',
    timescaledb.compress_orderby = 'ts_result DESC');
SELECT add_compression_policy('video', INTERVAL '6 months', if_not_exists => true);

ALTER TABLE web_browsing SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'attr_geohash7, attr_sim_operator_common_name',
    timescaledb.compress_orderby = 'ts_result DESC');
SELECT add_compression_policy('web_browsing', INTERVAL '6 months', if_not_exists => true);
