-- =============================================================================
-- Migration 0015: score_param — calibração do método Ookla logístico
--
-- Tabela versionada que armazena os 24 parâmetros de calibração do método
-- Ookla logístico extraídos de:
--   tools/projeto-ookla/src/configs/config.yaml (seções `mobile:` e `fixed:`)
--
-- Combinação: (mode × percentile × metric) = 2 × 3 × 4 = 24 linhas.
--   mode       : mobile | fixed
--   percentile : p10 | p50 | p90
--   metric     : down | upl | lat_down | lat_upl
--   range_type : 'a' (down/upl) | 'b' (latência — fórmula 1 - logística)
--
-- Cada linha guarda (min_log, std_dev, adjust): coeficientes da curva Ookla
-- usados em fn_ookla_logistic_score. Versionamento via valid_from/valid_to
-- permite recalibrar sem migration: UPDATE valid_to=CURRENT_DATE no antigo,
-- INSERT no novo.
-- =============================================================================


CREATE TABLE IF NOT EXISTS score_param (
    id              BIGSERIAL PRIMARY KEY,
    mode            VARCHAR(10) NOT NULL,
    percentile      VARCHAR(3)  NOT NULL,
    metric          VARCHAR(20) NOT NULL,
    range_type      CHAR(1)     NOT NULL,
    min_log         NUMERIC(10,5) NOT NULL,
    std_dev         NUMERIC(10,5) NOT NULL,
    adjust          NUMERIC(10,5) NOT NULL,
    valid_from      DATE        NOT NULL DEFAULT CURRENT_DATE,
    valid_to        DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT score_param_mode_chk       CHECK (mode IN ('mobile','fixed')),
    CONSTRAINT score_param_percentile_chk CHECK (percentile IN ('p10','p50','p90')),
    CONSTRAINT score_param_metric_chk     CHECK (metric IN ('down','upl','lat_down','lat_upl')),
    CONSTRAINT score_param_range_chk      CHECK (range_type IN ('a','b')),
    CONSTRAINT score_param_validity_chk   CHECK (valid_to IS NULL OR valid_to >= valid_from)
);--> statement-breakpoint

-- Índice parcial para a versão vigente (NULL valid_to) — usado pelas funções
CREATE UNIQUE INDEX IF NOT EXISTS score_param_active_uq
    ON score_param (mode, percentile, metric)
    WHERE valid_to IS NULL;--> statement-breakpoint

COMMENT ON TABLE score_param IS
    'Calibração do método Ookla logístico: 24 linhas vigentes (mode × percentile × metric). Versionada via valid_from/valid_to. Lida por fn_score_ookla_speed via JOIN único + pivot.';--> statement-breakpoint


-- ---------------------------------------------------------------------------
-- Seed: valores literais de tools/projeto-ookla/src/configs/config.yaml
-- ---------------------------------------------------------------------------

INSERT INTO score_param (mode, percentile, metric, range_type, min_log, std_dev, adjust) VALUES
  -- ── mobile / p10 ──
  ('mobile', 'p10', 'down',     'a', 1.97500, 1.32000, 0.07000),
  ('mobile', 'p10', 'upl',      'a', 0.56900, 1.14700, 0.02000),
  ('mobile', 'p10', 'lat_down', 'b', 5.61500, 0.80700, 0.00780),
  ('mobile', 'p10', 'lat_upl',  'b', 5.20600, 0.82200, 0.00220),
  -- ── mobile / p50 ──
  ('mobile', 'p50', 'down',     'a', 3.93200, 1.09000, 0.56000),
  ('mobile', 'p50', 'upl',      'a', 2.47500, 0.79700, 0.16000),
  ('mobile', 'p50', 'lat_down', 'b', 6.58000, 0.59700, 0.06240),
  ('mobile', 'p50', 'lat_upl',  'b', 6.36300, 0.64900, 0.01760),
  -- ── mobile / p90 ──
  ('mobile', 'p90', 'down',     'a', 5.07400, 1.32000, 0.07000),
  ('mobile', 'p90', 'upl',      'a', 3.52700, 0.91700, 0.02000),
  ('mobile', 'p90', 'lat_down', 'b', 7.48600, 0.66000, 0.00780),
  ('mobile', 'p90', 'lat_upl',  'b', 7.56200, 0.68200, 0.00220),
  -- ── fixed / p10 ──
  ('fixed',  'p10', 'down',     'a', 2.99300, 1.31000, 0.07000),
  ('fixed',  'p10', 'upl',      'a', 2.54800, 1.49500, 0.02000),
  ('fixed',  'p10', 'lat_down', 'b', 3.08500, 1.50400, 0.00780),
  ('fixed',  'p10', 'lat_upl',  'b', 2.95800, 1.57100, 0.00220),
  -- ── fixed / p50 ──
  ('fixed',  'p50', 'down',     'a', 4.37900, 1.18500, 0.56000),
  ('fixed',  'p50', 'upl',      'a', 3.97400, 1.34400, 0.16000),
  ('fixed',  'p50', 'lat_down', 'b', 4.49700, 1.09100, 0.06240),
  ('fixed',  'p50', 'lat_upl',  'b', 4.51000, 1.22500, 0.01760),
  -- ── fixed / p90 ──
  ('fixed',  'p90', 'down',     'a', 5.24300, 1.30400, 0.07000),
  ('fixed',  'p90', 'upl',      'a', 4.84600, 1.46500, 0.02000),
  ('fixed',  'p90', 'lat_down', 'b', 5.64600, 1.11200, 0.00780),
  ('fixed',  'p90', 'lat_upl',  'b', 5.98100, 1.30300, 0.00220);
