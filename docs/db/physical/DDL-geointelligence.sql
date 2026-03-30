-- =============================================================================
-- DDL — Zoox x Vivo GeoIntelligence
-- PostgreSQL 18 + TimescaleDB + PostGIS
-- =============================================================================
-- Versao: 3.0
-- Data: 2026-03-30
-- Rastreabilidade: docs/use-cases/INDEX.md (UC001-UC012)
-- Fonte: docs/levantamento/ZooxMap_Indicadores_Unificado_v2.pdf (Fev 2026)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. EXTENSOES
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS postgis;

-- ---------------------------------------------------------------------------
-- 1. DOMINIOS E ENUMS
-- ---------------------------------------------------------------------------

-- RN001-01: Quadrante estrategico (Levantamento v2 — Fev 2026)
-- Score QoE: escala 0-10 (vl_cntv_scre / 10). Thresholds: >= 7.01 = Alta, < 5.0 = Baixa
CREATE TYPE quadrant_type AS ENUM (
    'GROWTH',           -- Share < 35% + QoE >= 7.01 — Janela de ataque (novos clientes)
    'UPSELL',           -- Share >= 35% + QoE >= 7.01 — Base consolidada (maximizar receita)
    'RETENCAO',         -- Share >= 35% + QoE < 5.0  — Risco iminente de churn
    'GROWTH_RETENCAO'   -- Zona intermediaria (QoE 5.0-7.01) — Perfil misto
);
COMMENT ON TYPE quadrant_type IS
    'Quadrante v2: GROWTH(share<35%,qoe>=7.01), UPSELL(share>=35%,qoe>=7.01), '
    'RETENCAO(share>=35%,qoe<5.0), GROWTH_RETENCAO(zona intermediaria qoe 5-7.01). '
    'Cores: GROWTH=#158030, UPSELL=#7C3AED, RETENCAO=#DC2626, GROWTH_RETENCAO=#D97706';

CREATE TYPE tech_category AS ENUM ('FIBRA', 'MOVEL', 'AMBOS');
COMMENT ON TYPE tech_category IS 'Categoria de tecnologia derivada da presenca de FTTH e/ou ERB no geohash';

CREATE TYPE operator_name AS ENUM ('VIVO', 'TIM', 'CLARO', 'OI', 'OUTROS');

CREATE TYPE trend_direction AS ENUM ('UP', 'DOWN', 'STABLE');
COMMENT ON TYPE trend_direction IS 'UP: delta > +1.0pp, STABLE: -1.0 a +1.0pp, DOWN: delta < -1.0pp';

-- RN004-04: Classificacao Fibra Camada 2 (Levantamento v2)
CREATE TYPE fibra_class AS ENUM (
    'AUMENTO_CAPACIDADE',  -- Fibra presente, ocupacao > 85% ou < 5 portas disponiveis
    'EXPANSAO_NOVA_AREA',  -- Sem cobertura fibra (greenfield) — mas area tem fibra Vivo na regiao
    'SAUDAVEL',            -- Fibra presente, ocupacao <= 85%, sem problemas
    'SEM_FIBRA'            -- Area sem qualquer infraestrutura de fibra optica Vivo
);
COMMENT ON TYPE fibra_class IS
    'Classificacao Camada 2 Fibra. Arvore de decisao: '
    'Tem fibra? NAO -> SEM_FIBRA | SIM -> ocupacao>85% ou <5 portas? SIM -> AUMENTO_CAPACIDADE | NAO -> SAUDAVEL. '
    'Score: AUMENTO=60%ocupacao+40%valor_area; EXPANSAO=50%potencial_mercado+50%sinergia_movel.';

-- RN004-05: Classificacao Movel Camada 2 (Levantamento v2 — separacao 4G/5G)
CREATE TYPE movel_class AS ENUM (
    'MELHORA_QUALIDADE_5G',    -- Cobertura 5G existe, qualidade ruim (Perfil Premium)
    'MELHORA_QUALIDADE_4G',    -- Cobertura 4G existe, qualidade ruim (Perfil Massivo)
    'EXPANSAO_COBERTURA_5G',   -- Sem cobertura 5G em area premium (White Spot Premium)
    'EXPANSAO_COBERTURA_4G',   -- Sem cobertura 4G em area massiva (White Spot Massivo)
    'SAUDAVEL'                 -- Cobertura e qualidade adequadas — sem intervencao prioritaria
);
COMMENT ON TYPE movel_class IS
    'Classificacao Camada 2 Movel. Separacao 4G/5G via: Renda (Zoox/IBGE) + Device Tier (CRM) + Consumo Dados. '
    'SG_PREMIUM: renda alta + Premium/Mid device + alto consumo. '
    '4G_MASS: renda media/baixa + Basic device + consumo padrao.';

-- Score de intervencao Camada 2 (0-100)
CREATE TYPE score_label AS ENUM (
    'BAIXO',   -- 0-39:  Intervencao nao prioritaria — rede em condicoes adequadas
    'MEDIO',   -- 40-59: Monitoramento recomendado — atencao a tendencias
    'ALTO',    -- 60-79: Intervencao recomendada em curto prazo (30-60 dias)
    'CRITICO'  -- 80-100: Intervencao urgente — risco de degradacao severa
);
COMMENT ON TYPE score_label IS 'Faixa do score de intervencao Camada 2 (0-100). Cores: BAIXO=#16A34A, MEDIO=#2563EB, ALTO=#D97706, CRITICO=#DC2626.';

-- Tecnologia recomendada para investimento no geohash
CREATE TYPE tech_recommendation AS ENUM (
    'SG_PREMIUM',  -- 5G Premium: renda alta + device Premium/Mid + consumo dados alto
    '4G_MASS'      -- 4G Mass Market: renda media/baixa + device Basic + consumo padrao
);
COMMENT ON TYPE tech_recommendation IS 'Recomendacao de tecnologia para CAPEX. Criterios de corte: Renda Media (Zoox) + Device Tier (CRM) + Consumo de Dados (GB/mes).';

-- Labels de prioridade comercial (score 0-10 por quadrante)
CREATE TYPE priority_label AS ENUM ('P1_CRITICA', 'P2_ALTA', 'P3_MEDIA', 'P4_BAIXA');
COMMENT ON TYPE priority_label IS 'P1 > 7.5 (acao imediata), P2 >= 6.0 (curto prazo), P3 >= 4.5 (medio prazo), P4 < 4.5 (monitorar). Score normalizado 0-10 por quadrante.';

CREATE TYPE quality_label AS ENUM ('EXCELENTE', 'BOM', 'REGULAR', 'RUIM');

CREATE TYPE benchmark_scope AS ENUM ('NACIONAL', 'ESTADO', 'CIDADE');

-- RN004-07: Posicao competitiva (Levantamento v2 sec.4)
-- Delta = Score Vivo - MAX(Score TIM, Score Claro)
CREATE TYPE competitive_position AS ENUM (
    'LIDER',        -- Delta > +0.5   | Churn baixo — sem motivo para trocar
    'COMPETITIVO',  -- Delta 0 a +0.5 | Medio — qualquer queda pode inverter
    'EMPATADO',     -- Delta -0.5 a 0 | Medio-Alto — decisao de compra por preco/promocao
    'ABAIXO',       -- Delta -1.0 a -0.5 | Alto — clientes expostos a argumentos de venda
    'CRITICO'       -- Delta < -1.0   | Muito Alto — churn acelerado e perda de share iminente
);
COMMENT ON TYPE competitive_position IS
    'Posicao competitiva v2: delta = score_vivo - MAX(score_tim, score_claro). '
    'Cores: LIDER=Verde Escuro, COMPETITIVO=Verde, EMPATADO=Amarelo, ABAIXO=Laranja, CRITICO=Vermelho.';

CREATE TYPE share_level AS ENUM (
    'MUITO_ALTA',   -- > 50%  | Lideranca absoluta
    'ALTA',         -- 40-50% | Forte presenca
    'MEDIA',        -- 30-39% | Presenca competitiva com espaco para crescimento
    'BAIXA'         -- < 30%  | Presenca fraca — mercado dominado por concorrentes
);
COMMENT ON TYPE share_level IS 'Nivel de penetracao de mercado Vivo no geohash. Cores plataforma: MUITO_ALTA=Roxo Escuro, ALTA=Roxo, MEDIA=Cinza/Roxo claro, BAIXA=Verde.';

-- ---------------------------------------------------------------------------
-- 2. TABELAS RAW (AIE) — ja existem no banco
-- ---------------------------------------------------------------------------
-- file_transfer: estudo/create_tables.sql (187 colunas, hypertable ts_result)
-- video: estudo/create_tables.sql (89 colunas, hypertable ts_result)
-- web_browsing: estudo/create_tables.sql (91 colunas, hypertable ts_result)
-- score: estudo/create_tables.sql (15 colunas, vl_cntv_scre 0-100)
-- geo_por_latlong: estudo/create_tables.sql (22 colunas + geom + geohash7)

-- ---------------------------------------------------------------------------
-- 3. TABELA: vivo_ftth_coverage (AIE D11)
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

COMMENT ON TABLE vivo_ftth_coverage IS 'Instalacoes FTTH Vivo por ponto geografico. Share FIBRA = COUNT(por geohash) / total_domicilios * 100. AIE D11.';
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
-- 4. TABELA: vivo_mobile_erb (AIE D12)
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

COMMENT ON TABLE vivo_mobile_erb IS 'ERBs movel Vivo com linhas ativas. Share MOVEL = SUM(linhas por geohash) / populacao * 100. AIE D12.';
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
    geohash_id      VARCHAR(12)      NOT NULL,
    precision       SMALLINT         NOT NULL,
    center_lat      DOUBLE PRECISION NOT NULL,
    center_lng      DOUBLE PRECISION NOT NULL,
    geom            GEOMETRY(POLYGON, 4326) NOT NULL,
    neighborhood    VARCHAR(100),
    city            VARCHAR(100)     NOT NULL,
    state           VARCHAR(2)       NOT NULL,
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),

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
-- 6. TABELA: benchmark_config — thresholds v3 (Levantamento v2)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS benchmark_config (
    id              SERIAL           NOT NULL,
    key             VARCHAR(50)      NOT NULL,
    scope           benchmark_scope  NOT NULL,
    region          VARCHAR(100),
    value           NUMERIC(8,3)     NOT NULL,
    period_date     DATE,
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_benchmark_config PRIMARY KEY (id),
    CONSTRAINT ck_benchmark_value_positive CHECK (value >= 0),
    CONSTRAINT uq_benchmark_key_scope UNIQUE (key, scope, region, period_date)
);

COMMENT ON TABLE benchmark_config IS 'Benchmarks e thresholds configuraveis. Fonte: ZooxMap_Indicadores_Unificado_v2.pdf (Fev 2026). ALI D10.';

-- Seed: thresholds oficiais do levantamento v2
INSERT INTO benchmark_config (key, scope, region, value) VALUES
    -- Quadrante: corte unico de share em 35% (Levantamento v2 sec.5)
    ('shareThresholdQuadrante',  'ESTADO', 'GO', 35.0),
    -- Labels de share (4 niveis — para exibicao na plataforma)
    ('shareThresholdBaixo',      'ESTADO', 'GO', 30.0),
    ('shareThresholdAlto',       'ESTADO', 'GO', 40.0),
    ('shareThresholdMuitoAlto',  'ESTADO', 'GO', 50.0),
    -- QoE score 0-10 (vl_cntv_scre/10). Equivalente: 7.01=701/1000; 5.0=500/1000
    ('qoeThresholdAlto',         'ESTADO', 'GO', 7.01),
    ('qoeThresholdBaixo',        'ESTADO', 'GO', 5.0),
    -- Tendencia de share (pp percentuais — variacao mensal)
    ('trendThresholdUp',         'ESTADO', 'GO', 1.0),
    ('trendThresholdDown',       'ESTADO', 'GO', 1.0),
    -- Benchmarks nacionais de referencia
    ('qoeMedia',                 'NACIONAL', NULL, 6.5),
    ('shareMedia',               'NACIONAL', NULL, 32.0),
    -- Renda e densidade (Levantamento v2 sec.1 referencias demograficas)
    ('rendaAlta',                'ESTADO', 'GO', 10000),
    ('rendaBaixa',               'ESTADO', 'GO', 3500),
    ('densidadeAlta',            'ESTADO', 'GO', 15000),
    ('densidadeBaixa',           'ESTADO', 'GO', 5000),
    -- Camada 2 Fibra: gatilhos de classificacao
    ('fibraOcupacaoCritica',     'ESTADO', 'GO', 85.0),
    ('fibraPortasMinimas',       'ESTADO', 'GO', 5.0),
    -- Camada 2 Movel: benchmark SpeedTest para qualidade (score 0-10)
    ('movelBenchmarkScore',      'ESTADO', 'GO', 4.0)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 7. TABELA: user_session — sem alteracao
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_session (
    user_id         VARCHAR(255)     NOT NULL,
    state           JSONB            NOT NULL DEFAULT '{}',
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_user_session PRIMARY KEY (user_id)
);

COMMENT ON TABLE user_session IS 'Estado da sessao do usuario (backup do Redis). Schema JSONB: RN011-01.';
CREATE INDEX IF NOT EXISTS idx_user_session_updated ON user_session (updated_at DESC);

-- ---------------------------------------------------------------------------
-- 8. TABELA: geohash_crm (ALI novo — D13)
-- Dados CRM Vivo agregados por geohash/mes
-- Alimenta: Camada 1 (ARPU, plano, device tier) e Camada 2 (separacao 4G/5G)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS geohash_crm (
    geohash_id          VARCHAR(12)      NOT NULL,
    precision           SMALLINT         NOT NULL DEFAULT 7,
    anomes              INTEGER          NOT NULL,
    arpu                NUMERIC(10,2),               -- R$/mes medio — proxy valor do cliente
    plan_type           VARCHAR(100),                -- Plano predominante na area
    device_tier         VARCHAR(20)      CHECK (device_tier IN ('BASIC', 'MID', 'PREMIUM')),
    active_clients      INTEGER          NOT NULL DEFAULT 0,
    consumo_dados_gb    NUMERIC(10,3),               -- GB/mes medio — proxy demanda capacidade 5G
    created_at          TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ      NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_geohash_crm PRIMARY KEY (geohash_id, anomes),
    CONSTRAINT fk_crm_geohash FOREIGN KEY (geohash_id) REFERENCES geohash_cell (geohash_id),
    CONSTRAINT ck_crm_arpu CHECK (arpu >= 0),
    CONSTRAINT ck_crm_active_clients CHECK (active_clients >= 0),
    CONSTRAINT ck_crm_anomes CHECK (anomes >= 202501)
);

COMMENT ON TABLE geohash_crm IS 'Dados CRM Vivo por geohash/mes. Fonte: CRM Vivo. ALI D13 (novo v3).';
COMMENT ON COLUMN geohash_crm.arpu IS 'ARPU medio R$/mes. Fonte: CRM Vivo. Usado em scores UPSELL e Camada 2 Fibra (valor_area).';
COMMENT ON COLUMN geohash_crm.device_tier IS 'Nivel predominante de dispositivos: BASIC/MID/PREMIUM. Criterio primario de separacao 4G vs 5G (Camada 2).';
COMMENT ON COLUMN geohash_crm.consumo_dados_gb IS 'Volume medio GB/cliente/mes. Proxy de demanda para decisao de capacidade 5G.';

CREATE INDEX IF NOT EXISTS idx_crm_geohash ON geohash_crm (geohash_id, anomes);
CREATE INDEX IF NOT EXISTS idx_crm_anomes ON geohash_crm (anomes);

-- ---------------------------------------------------------------------------
-- 9. TABELA: camada2_fibra (ALI novo — D14)
-- Scores de infraestrutura de fibra por geohash/mes
-- Rastreabilidade: RN004-04, Levantamento v2 Camada 2
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS camada2_fibra (
    geohash_id                  VARCHAR(12)      NOT NULL,
    precision                   SMALLINT         NOT NULL,
    anomes                      INTEGER          NOT NULL,

    -- Estado da rede e classificacao
    classification              fibra_class      NOT NULL,
    taxa_ocupacao               NUMERIC(5,2),
    portas_disponiveis          INTEGER,

    -- Score AUMENTO_CAPACIDADE (0-100)
    -- Formula: (Taxa_Ocupacao, n=0.60) + (Valor_Area, n=0.40)
    score_aumento_capacidade    NUMERIC(5,2),
    taxa_ocupacao_norm          NUMERIC(5,2),    -- taxa normalizada 0-100 (>= 85% = max urgencia)
    valor_area                  NUMERIC(5,2),    -- Renda Media (Zoox) + ARPU (CRM) norm 0-100

    -- Score EXPANSAO_NOVA_AREA (0-100)
    -- Formula: (Potencial_Mercado, n=0.50) + (Sinergia_Movel, n=0.50)
    score_expansao_nova_area    NUMERIC(5,2),
    potencial_mercado           NUMERIC(5,2),    -- Renda x Densidade normalizado 0-100
    sinergia_movel              NUMERIC(5,2),    -- % share movel Vivo normalizado 0-100

    -- Ranking dentro da classificacao (ordenacao descendente por score)
    ranking_classification      INTEGER,

    -- Alerta automatico: ocupacao > 85% OU score_label movel = CRITICO
    alerta_saturacao            BOOLEAN          NOT NULL DEFAULT FALSE,

    created_at                  TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ      NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_camada2_fibra PRIMARY KEY (geohash_id, precision, anomes),
    CONSTRAINT fk_c2f_geohash FOREIGN KEY (geohash_id) REFERENCES geohash_cell (geohash_id),
    CONSTRAINT ck_c2f_taxa CHECK (taxa_ocupacao BETWEEN 0 AND 100),
    CONSTRAINT ck_c2f_score_aum CHECK (score_aumento_capacidade BETWEEN 0 AND 100),
    CONSTRAINT ck_c2f_score_exp CHECK (score_expansao_nova_area BETWEEN 0 AND 100),
    CONSTRAINT ck_c2f_portas CHECK (portas_disponiveis >= 0),
    CONSTRAINT ck_c2f_anomes CHECK (anomes >= 202501)
);

COMMENT ON TABLE camada2_fibra IS 'Scores CAPEX fibra por geohash/mes. RN004-04. Levantamento v2 Camada 2. ALI D14.';
COMMENT ON COLUMN camada2_fibra.classification IS 'AUMENTO_CAPACIDADE: ocupacao>85% ou <5 portas. EXPANSAO_NOVA_AREA: greenfield. SAUDAVEL: ok. SEM_FIBRA: sem infra.';
COMMENT ON COLUMN camada2_fibra.score_aumento_capacidade IS '0-100: 60% taxa_ocupacao_norm + 40% valor_area. Quanto maior, maior urgencia de expansao de capacidade.';
COMMENT ON COLUMN camada2_fibra.score_expansao_nova_area IS '0-100: 50% potencial_mercado + 50% sinergia_movel. Greenfield — ROI estimado de nova implantacao.';
COMMENT ON COLUMN camada2_fibra.alerta_saturacao IS 'TRUE: taxa_ocupacao > 85% OU score_label movel = CRITICO. Gera alerta no dashboard ZooxMap (RN004-04).';

CREATE INDEX IF NOT EXISTS idx_c2f_geohash ON camada2_fibra (geohash_id, anomes);
CREATE INDEX IF NOT EXISTS idx_c2f_classification ON camada2_fibra (classification, anomes);
CREATE INDEX IF NOT EXISTS idx_c2f_alerta ON camada2_fibra (alerta_saturacao) WHERE alerta_saturacao = TRUE;

-- ---------------------------------------------------------------------------
-- 10. TABELA: camada2_movel (ALI novo — D15)
-- Scores de infraestrutura movel por geohash/mes
-- Rastreabilidade: RN004-05, Levantamento v2 Camada 2
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS camada2_movel (
    geohash_id                      VARCHAR(12)      NOT NULL,
    precision                       SMALLINT         NOT NULL,
    anomes                          INTEGER          NOT NULL,

    -- Classificacao e estado (arvore de decisao + separacao 4G/5G)
    classification                  movel_class      NOT NULL,
    speed_test_score                NUMERIC(5,2),    -- Score QoE SpeedTest 0-10 (replica qoe.mobile.score)
    score_label                     score_label,     -- Faixa: BAIXO(0-39)/MEDIO(40-59)/ALTO(60-79)/CRITICO(80-100)
    tecnologia_recomendada          tech_recommendation,

    -- Variaveis de separacao 4G/5G
    renda_media                     NUMERIC(10,2),   -- R$ (fonte: Zoox/IBGE)
    device_tier                     VARCHAR(20)      CHECK (device_tier IN ('BASIC', 'MID', 'PREMIUM')),
    consumo_dados_gb                NUMERIC(10,3),   -- GB/mes medio (fonte: CRM Vivo)

    -- -----------------------------------------------------------------------
    -- Trilha 5G — MELHORA_QUALIDADE_5G (Perfil Premium, cobertura existe, qualidade ruim)
    -- Score = (Score_SpeedTest_inv, n=0.40) + (ARPU, n=0.30) + (Consumo_Dados, n=0.30)
    -- -----------------------------------------------------------------------
    score_melhora_qualidade_5g      NUMERIC(5,2),    -- 0-100
    score_speedtest_5g              NUMERIC(5,2),    -- Score QoE invertido (100 - qoe_norm) — gap de performance 0-100
    arpu_5g                         NUMERIC(10,2),   -- ARPU medio R$/mes (proxy valor em risco)

    -- -----------------------------------------------------------------------
    -- Trilha 5G — EXPANSAO_COBERTURA_5G (White Spot Premium, sem cobertura 5G)
    -- Score = (Concentracao_Renda, n=0.60) + (Vulnerabilidade_Concorrencia, n=0.40)
    -- -----------------------------------------------------------------------
    score_expansao_cobertura_5g     NUMERIC(5,2),    -- 0-100
    concentracao_renda_5g           NUMERIC(5,2),    -- Renda media domiciliar normalizada 0-100
    vulnerabilidade_concorrencia_5g NUMERIC(5,2),    -- Score QoE concorrente invertido (janela de ataque) 0-100

    -- -----------------------------------------------------------------------
    -- Trilha 4G — MELHORA_QUALIDADE_4G (Perfil Massivo, cobertura existe, qualidade ruim)
    -- Score = (Gap_Performance, n=0.60) + (Volume_Usuarios, n=0.40)
    -- -----------------------------------------------------------------------
    score_melhora_qualidade_4g      NUMERIC(5,2),    -- 0-100
    gap_performance_4g              NUMERIC(5,2),    -- Diferenca SpeedTest vs benchmark minimo 4G (0-100)
    volume_usuarios_4g              NUMERIC(5,2),    -- Densidade populacional normalizada (0-100)

    -- -----------------------------------------------------------------------
    -- Trilha 4G — EXPANSAO_COBERTURA_4G (White Spot Massivo, sem cobertura 4G)
    -- Score = (Densidade_Demografica, n=0.60) + (Vulnerabilidade_Concorrencia, n=0.40)
    -- -----------------------------------------------------------------------
    score_expansao_cobertura_4g     NUMERIC(5,2),    -- 0-100
    densidade_demografica_4g        NUMERIC(5,2),    -- hab/km2 normalizado 0-100
    vulnerabilidade_concorrencia_4g NUMERIC(5,2),    -- Score QoE concorrente invertido 0-100

    -- -----------------------------------------------------------------------
    -- Decisao integrada (fibra + movel consolidados)
    -- -----------------------------------------------------------------------
    decisao_integrada               TEXT,            -- Texto descritivo gerado pelo motor de decisao
    score_capex_consolidado         NUMERIC(5,2),    -- max(score_fibra, score_movel) + ajuste dupla rede
    alerta_saturacao                BOOLEAN          NOT NULL DEFAULT FALSE,

    -- Ranking dentro da classificacao
    ranking_classification          INTEGER,

    created_at                      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_camada2_movel PRIMARY KEY (geohash_id, precision, anomes),
    CONSTRAINT fk_c2m_geohash FOREIGN KEY (geohash_id) REFERENCES geohash_cell (geohash_id),
    CONSTRAINT ck_c2m_speed_test CHECK (speed_test_score BETWEEN 0 AND 100),
    CONSTRAINT ck_c2m_score_5g_mq CHECK (score_melhora_qualidade_5g BETWEEN 0 AND 100),
    CONSTRAINT ck_c2m_score_5g_ec CHECK (score_expansao_cobertura_5g BETWEEN 0 AND 100),
    CONSTRAINT ck_c2m_score_4g_mq CHECK (score_melhora_qualidade_4g BETWEEN 0 AND 100),
    CONSTRAINT ck_c2m_score_4g_ec CHECK (score_expansao_cobertura_4g BETWEEN 0 AND 100),
    CONSTRAINT ck_c2m_capex CHECK (score_capex_consolidado BETWEEN 0 AND 100),
    CONSTRAINT ck_c2m_anomes CHECK (anomes >= 202501)
);

COMMENT ON TABLE camada2_movel IS 'Scores CAPEX rede movel por geohash/mes. RN004-05. Levantamento v2 Camada 2. ALI D15.';
COMMENT ON COLUMN camada2_movel.classification IS 'MELHORA_QUALIDADE_5G/4G: cobertura existe, qualidade ruim. EXPANSAO_COBERTURA_5G/4G: white spot. SAUDAVEL: ok.';
COMMENT ON COLUMN camada2_movel.tecnologia_recomendada IS 'SG_PREMIUM: alta renda + Premium/Mid device + alto consumo. 4G_MASS: renda media/baixa + Basic device.';
COMMENT ON COLUMN camada2_movel.decisao_integrada IS 'Ex: "Fibra: AUMENTO_CAPACIDADE (Score 87) | Movel: MELHORA_QUALIDADE_5G (Score 74) — upgrade ERB + expansao capacidade OLT".';
COMMENT ON COLUMN camada2_movel.score_capex_consolidado IS 'Score unico CAPEX 0-100: max(score_fibra, score_movel) com peso adicional se ambas as redes precisam de intervencao.';

CREATE INDEX IF NOT EXISTS idx_c2m_geohash ON camada2_movel (geohash_id, anomes);
CREATE INDEX IF NOT EXISTS idx_c2m_classification ON camada2_movel (classification, anomes);
CREATE INDEX IF NOT EXISTS idx_c2m_alerta ON camada2_movel (alerta_saturacao) WHERE alerta_saturacao = TRUE;
CREATE INDEX IF NOT EXISTS idx_c2m_capex ON camada2_movel (score_capex_consolidado DESC);

-- ---------------------------------------------------------------------------
-- 11. INDICES ADICIONAIS NAS TABELAS RAW
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_ft_operator_month ON file_transfer (attr_sim_operator_common_name, DATE_TRUNC('month', ts_result));
CREATE INDEX IF NOT EXISTS idx_video_operator_month ON video (attr_sim_operator_common_name, DATE_TRUNC('month', ts_result));
CREATE INDEX IF NOT EXISTS idx_wb_operator_month ON web_browsing (attr_sim_operator_common_name, DATE_TRUNC('month', ts_result));
CREATE INDEX IF NOT EXISTS idx_ft_geohash6 ON file_transfer (attr_geohash6, ts_result DESC);
CREATE INDEX IF NOT EXISTS idx_video_geohash6 ON video (attr_geohash6, ts_result DESC);
CREATE INDEX IF NOT EXISTS idx_wb_geohash6 ON web_browsing (attr_geohash6, ts_result DESC);
CREATE INDEX IF NOT EXISTS idx_ft_connection_gen ON file_transfer (attr_connection_generation_name, attr_geohash7);

-- ---------------------------------------------------------------------------
-- 12. CONTINUOUS AGGREGATES — 6 CAAGs (3 metricas x 2 precisoes)
-- ---------------------------------------------------------------------------

-- 12a. File Transfer — geohash7
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

-- 12b. File Transfer — geohash6
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

-- 12c-12f. Video (gh7+gh6) e Web (gh7+gh6) — mesma estrutura que file_transfer
-- Ver arquivos de migracao para definicoes de cagg_video_monthly_gh7/gh6 e cagg_web_monthly_gh7/gh6

-- 12g. View unificada QoE (file_transfer como base de performance de rede)
CREATE OR REPLACE VIEW vw_qoe_monthly AS
SELECT * FROM cagg_ft_monthly_gh7
UNION ALL
SELECT * FROM cagg_ft_monthly_gh6;

COMMENT ON VIEW vw_qoe_monthly IS 'Unifica metricas QoE file_transfer gh6+gh7. Filtrar por precision para obter a granularidade correta.';

-- ---------------------------------------------------------------------------
-- 13. VIEW: vw_share_real
-- Share de mercado REAL usando dados operacionais Vivo (Levantamento v2 sec.1)
-- FIBRA: COUNT(instalacoes FTTH por geohash) / total_domicilios * 100
-- MOVEL: SUM(linhas ERB por geohash) / populacao_residente * 100
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_share_real AS
WITH
share_fibra_gh7 AS (
    SELECT
        f.geohash7 AS geohash_id, 7::SMALLINT AS precision, f.anomes,
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
share_fibra_gh6 AS (
    SELECT
        f.geohash6 AS geohash_id, 6::SMALLINT AS precision, f.anomes,
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
share_movel_gh7 AS (
    SELECT
        e.geohash7 AS geohash_id, 7::SMALLINT AS precision, e.anomes,
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
share_movel_gh6 AS (
    SELECT
        e.geohash6 AS geohash_id, 6::SMALLINT AS precision, e.anomes,
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
SELECT
    COALESCE(f.geohash_id, m.geohash_id) AS geohash_id,
    COALESCE(f.precision, m.precision) AS precision,
    COALESCE(f.anomes, m.anomes) AS anomes,
    f.ftth_count AS total_ftth_vivo,
    f.share_fibra_pct,
    m.total_linhas AS total_linhas_vivo,
    m.share_movel_pct,
    -- Tecnologia derivada (RN001-08)
    CASE
        WHEN f.geohash_id IS NOT NULL AND m.geohash_id IS NOT NULL THEN 'AMBOS'::tech_category
        WHEN f.geohash_id IS NOT NULL THEN 'FIBRA'::tech_category
        ELSE 'MOVEL'::tech_category
    END AS technology,
    GREATEST(COALESCE(f.share_fibra_pct, 0), COALESCE(m.share_movel_pct, 0)) AS share_pct,
    -- Label de share (Levantamento v2 sec.1 — 4 niveis)
    CASE
        WHEN GREATEST(COALESCE(f.share_fibra_pct, 0), COALESCE(m.share_movel_pct, 0)) > 50 THEN 'MUITO_ALTA'::share_level
        WHEN GREATEST(COALESCE(f.share_fibra_pct, 0), COALESCE(m.share_movel_pct, 0)) >= 40 THEN 'ALTA'::share_level
        WHEN GREATEST(COALESCE(f.share_fibra_pct, 0), COALESCE(m.share_movel_pct, 0)) >= 30 THEN 'MEDIA'::share_level
        ELSE 'BAIXA'::share_level
    END AS share_level
FROM (SELECT * FROM share_fibra_gh7 UNION ALL SELECT * FROM share_fibra_gh6) f
FULL OUTER JOIN (SELECT * FROM share_movel_gh7 UNION ALL SELECT * FROM share_movel_gh6) m
    ON f.geohash_id = m.geohash_id AND f.precision = m.precision AND f.anomes = m.anomes;

COMMENT ON VIEW vw_share_real IS 'Share de mercado real Vivo (FTTH + ERB). Formula oficial Levantamento v2 sec.1. Sem alteracao de logica em relacao a v2.';

-- ---------------------------------------------------------------------------
-- 14. VIEW: vw_geohash_summary (REESCRITA — v3)
-- View principal. Quadrantes GROWTH/UPSELL/RETENCAO/GROWTH_RETENCAO,
-- posicao competitiva EMPATADO/CRITICO, prioridade ponderada por quadrante.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_geohash_summary AS
WITH
scores_all AS (
    SELECT
        cd_geo_hsh7 AS geohash_id, 7::SMALLINT AS precision,
        TO_DATE(nu_ano_mes_rfrn::TEXT, 'YYYYMM') AS period_month,
        UPPER(TRIM(nm_oprd)) AS operator,
        vl_cntv_scre / 10.0 AS composite_score,  -- 0-10 scale
        (COALESCE(qt_ltra_vdeo_scre,0) + COALESCE(qt_ltra_web_scre,0) + COALESCE(qt_ltra_sped_scre,0)) AS sample_size
    FROM score WHERE vl_cntv_scre IS NOT NULL
    UNION ALL
    SELECT
        LEFT(cd_geo_hsh7, 6), 6::SMALLINT,
        TO_DATE(nu_ano_mes_rfrn::TEXT, 'YYYYMM'),
        UPPER(TRIM(nm_oprd)),
        AVG(vl_cntv_scre / 10.0),
        SUM(COALESCE(qt_ltra_vdeo_scre,0) + COALESCE(qt_ltra_web_scre,0) + COALESCE(qt_ltra_sped_scre,0))
    FROM score WHERE vl_cntv_scre IS NOT NULL
    GROUP BY LEFT(cd_geo_hsh7, 6), TO_DATE(nu_ano_mes_rfrn::TEXT, 'YYYYMM'), UPPER(TRIM(nm_oprd))
),
score_pivot AS (
    SELECT geohash_id, precision, period_month,
        MAX(CASE WHEN operator LIKE '%VIVO%' THEN composite_score END) AS vivo_score,
        MAX(CASE WHEN operator LIKE '%TIM%'  THEN composite_score END) AS tim_score,
        MAX(CASE WHEN operator LIKE '%CLARO%' THEN composite_score END) AS claro_score,
        MAX(CASE WHEN operator LIKE '%VIVO%' THEN sample_size END) AS vivo_sample_size
    FROM scores_all GROUP BY geohash_id, precision, period_month
),
qoe_vivo AS (
    SELECT geohash_id, precision, period_month,
        avg_dl_throughput, avg_latency, p50_dl_throughput, test_count
    FROM vw_qoe_monthly WHERE operator LIKE '%VIVO%'
),
share AS (
    SELECT geohash_id, precision, anomes,
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
-- CTE intermediaria: computa todos os campos + priority_score (para priority_label sem repeticao)
base AS (
    SELECT
        gc.geohash_id, gc.precision,
        gc.center_lat, gc.center_lng,
        gc.neighborhood, gc.city, gc.state,
        sp.period_month,
        -- Scores QoE (0-10)
        COALESCE(sp.vivo_score, 0)       AS vivo_score,
        COALESCE(sp.tim_score, 0)        AS tim_score,
        COALESCE(sp.claro_score, 0)      AS claro_score,
        COALESCE(sp.vivo_sample_size, 0) AS vivo_sample_size,
        -- Share real
        COALESCE(sh.share_pct, 0)        AS share_pct,
        COALESCE(sh.share_fibra_pct, 0)  AS share_fibra_pct,
        COALESCE(sh.share_movel_pct, 0)  AS share_movel_pct,
        sh.share_level,
        COALESCE(sh.total_ftth_vivo, 0)  AS total_ftth_vivo,
        COALESCE(sh.total_linhas_vivo, 0) AS total_linhas_vivo,
        COALESCE(d.total_population, 0)::INTEGER AS total_population,
        COALESCE(d.total_domicilios, 0)::INTEGER  AS total_domicilios,
        COALESCE(sh.technology, 'MOVEL'::tech_category) AS technology,
        -- -------------------------------------------------------------------
        -- Quadrante (RN001-01 v3 — Levantamento v2)
        -- Share >= 35% = Alto | QoE >= 7.01 = Alta | QoE 5.0-7.01 = Media
        -- -------------------------------------------------------------------
        CASE
            WHEN COALESCE(sh.share_pct,0) >= 35 AND COALESCE(sp.vivo_score,0) >= 7.01 THEN 'UPSELL'::quadrant_type
            WHEN COALESCE(sh.share_pct,0) <  35 AND COALESCE(sp.vivo_score,0) >= 7.01 THEN 'GROWTH'::quadrant_type
            WHEN COALESCE(sh.share_pct,0) >= 35 AND COALESCE(sp.vivo_score,0) <  5.0  THEN 'RETENCAO'::quadrant_type
            -- Zona intermediaria (QoE 5.0-7.01) ou share baixo + qoe baixa -> GROWTH_RETENCAO
            ELSE 'GROWTH_RETENCAO'::quadrant_type
        END AS quadrant,
        -- -------------------------------------------------------------------
        -- Posicao competitiva (RN004-07 v3 — EMPATADO/CRITICO)
        -- Delta = Score Vivo - MAX(Score TIM, Score Claro)
        -- -------------------------------------------------------------------
        CASE
            WHEN COALESCE(sp.vivo_score,0) - GREATEST(COALESCE(sp.tim_score,0), COALESCE(sp.claro_score,0)) >   0.5  THEN 'LIDER'::competitive_position
            WHEN COALESCE(sp.vivo_score,0) - GREATEST(COALESCE(sp.tim_score,0), COALESCE(sp.claro_score,0)) >=  0.0  THEN 'COMPETITIVO'::competitive_position
            WHEN COALESCE(sp.vivo_score,0) - GREATEST(COALESCE(sp.tim_score,0), COALESCE(sp.claro_score,0)) >= -0.5  THEN 'EMPATADO'::competitive_position
            WHEN COALESCE(sp.vivo_score,0) - GREATEST(COALESCE(sp.tim_score,0), COALESCE(sp.claro_score,0)) >= -1.0  THEN 'ABAIXO'::competitive_position
            ELSE 'CRITICO'::competitive_position
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
        COALESCE(d.avg_income, 0) AS avg_income,
        -- -------------------------------------------------------------------
        -- Score de prioridade (Levantamento v2 sec. Score de Priorizacao)
        -- Formulas distintas por quadrante. Variaveis normalizadas 0-10.
        -- Variaveis sem historico (Delta, Cresc) usam proxy neutro = 5.0
        -- Renda normalizada: avg_income / 2000 -> 0-10 (R$20.000 = max)
        -- Pop normalizada: total_population / 20000 -> 0-10 (200k = max)
        -- -------------------------------------------------------------------
        CASE
            -- RETENCAO: (10-Sat)x0.30 + Sharex0.25 + (10-Delta)x0.25 + Popx0.10 + Crescx0.10
            WHEN COALESCE(sh.share_pct,0) >= 35 AND COALESCE(sp.vivo_score,0) < 5.0 THEN
                LEAST(10.0,
                    (10.0 - COALESCE(sp.vivo_score,0)) * 0.30
                    + LEAST(COALESCE(sh.share_pct,0) / 10.0, 10.0) * 0.25
                    + (10.0 - 5.0) * 0.25   -- Delta proxy neutro
                    + LEAST(COALESCE(d.total_population,0) / 20000.0, 10.0) * 0.10
                    + 5.0 * 0.10)            -- Cresc proxy neutro
            -- UPSELL: Sharex0.30 + Satx0.25 + Rendax0.25 + Deltax0.10 + Popx0.10
            WHEN COALESCE(sh.share_pct,0) >= 35 AND COALESCE(sp.vivo_score,0) >= 7.01 THEN
                LEAST(10.0,
                    LEAST(COALESCE(sh.share_pct,0) / 10.0, 10.0) * 0.30
                    + COALESCE(sp.vivo_score,0) * 0.25
                    + LEAST(COALESCE(d.avg_income,0) / 2000.0, 10.0) * 0.25
                    + 5.0 * 0.10             -- Delta proxy neutro
                    + LEAST(COALESCE(d.total_population,0) / 20000.0, 10.0) * 0.10)
            -- GROWTH: (10-Share)x0.25 + Satx0.20 + Rendax0.20 + Crescx0.20 + Deltax0.15
            WHEN COALESCE(sh.share_pct,0) < 35 AND COALESCE(sp.vivo_score,0) >= 7.01 THEN
                LEAST(10.0,
                    (10.0 - LEAST(COALESCE(sh.share_pct,0) / 10.0, 10.0)) * 0.25
                    + COALESCE(sp.vivo_score,0) * 0.20
                    + LEAST(COALESCE(d.avg_income,0) / 2000.0, 10.0) * 0.20
                    + 5.0 * 0.20             -- Cresc proxy neutro
                    + 5.0 * 0.15)            -- Delta proxy neutro
            -- GROWTH_RETENCAO: Deltax0.30 + Crescx0.25 + Rendax0.20 + Satx0.15 + Sharex0.10
            ELSE
                LEAST(10.0,
                    5.0 * 0.30               -- Delta proxy neutro
                    + 5.0 * 0.25             -- Cresc proxy neutro
                    + LEAST(COALESCE(d.avg_income,0) / 2000.0, 10.0) * 0.20
                    + COALESCE(sp.vivo_score,0) * 0.15
                    + LEAST(COALESCE(sh.share_pct,0) / 10.0, 10.0) * 0.10)
        END AS priority_score
    FROM geohash_cell gc
    LEFT JOIN score_pivot sp ON gc.geohash_id = sp.geohash_id AND gc.precision = sp.precision
    LEFT JOIN qoe_vivo qv ON gc.geohash_id = qv.geohash_id AND gc.precision = qv.precision
                          AND qv.period_month = sp.period_month
    LEFT JOIN share sh ON gc.geohash_id = sh.geohash_id AND gc.precision = sh.precision
    LEFT JOIN demo d  ON gc.geohash_id = d.geohash_id  AND gc.precision = d.precision
)
SELECT *,
    -- Priority label derivada do score (computado uma unica vez na CTE base)
    CASE
        WHEN priority_score >  7.5 THEN 'P1_CRITICA'::priority_label
        WHEN priority_score >= 6.0 THEN 'P2_ALTA'::priority_label
        WHEN priority_score >= 4.5 THEN 'P3_MEDIA'::priority_label
        ELSE                            'P4_BAIXA'::priority_label
    END AS priority_label
FROM base;

COMMENT ON VIEW vw_geohash_summary IS
    'View principal v3: share real (FTTH+ERB), quadrantes GROWTH/UPSELL/RETENCAO/GROWTH_RETENCAO '
    '(Levantamento v2, share>=35%, qoe>=7.01/5.0), posicao competitiva EMPATADO/CRITICO, '
    'prioridade ponderada P1>7.5/P2>=6.0/P3>=4.5/P4<4.5.';

-- ---------------------------------------------------------------------------
-- 15. VIEW: vw_bairro_summary (atualizada — quadrantes v3)
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
        'GROWTH',          COUNT(*) FILTER (WHERE gs.quadrant = 'GROWTH'),
        'UPSELL',          COUNT(*) FILTER (WHERE gs.quadrant = 'UPSELL'),
        'RETENCAO',        COUNT(*) FILTER (WHERE gs.quadrant = 'RETENCAO'),
        'GROWTH_RETENCAO', COUNT(*) FILTER (WHERE gs.quadrant = 'GROWTH_RETENCAO')
    ) AS quadrant_counts
FROM vw_geohash_summary gs
WHERE gs.neighborhood IS NOT NULL
GROUP BY gs.neighborhood, gs.city, gs.state, gs.period_month;

COMMENT ON VIEW vw_bairro_summary IS 'Agregacao por bairro v3: quadrantes GROWTH/UPSELL/RETENCAO/GROWTH_RETENCAO (Levantamento v2).';

-- ---------------------------------------------------------------------------
-- 16. FUNCOES
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_available_periods()
RETURNS TABLE (period_month DATE, test_count BIGINT) AS $$
    SELECT time_bucket('1 month', ts_result)::DATE, COUNT(*)
    FROM file_transfer GROUP BY 1 ORDER BY 1 DESC;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION fn_normalize_operator(raw_name TEXT)
RETURNS operator_name AS $$
    SELECT CASE
        WHEN UPPER(TRIM(raw_name)) LIKE '%VIVO%'  THEN 'VIVO'::operator_name
        WHEN UPPER(TRIM(raw_name)) LIKE '%TIM%'   THEN 'TIM'::operator_name
        WHEN UPPER(TRIM(raw_name)) LIKE '%CLARO%' THEN 'CLARO'::operator_name
        WHEN UPPER(TRIM(raw_name)) LIKE '%OI%'    THEN 'OI'::operator_name
        ELSE 'OUTROS'::operator_name
    END;
$$ LANGUAGE SQL IMMUTABLE;

-- ---------------------------------------------------------------------------
-- 17. POLITICAS TIMESCALEDB
-- ---------------------------------------------------------------------------
SELECT add_retention_policy('file_transfer', INTERVAL '36 months', if_not_exists => true);
SELECT add_retention_policy('video',         INTERVAL '36 months', if_not_exists => true);
SELECT add_retention_policy('web_browsing',  INTERVAL '36 months', if_not_exists => true);

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
