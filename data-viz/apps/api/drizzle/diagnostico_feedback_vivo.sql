-- =============================================================================
-- Queries diagnósticas — Feedback Vivo (pontos 2, 3, 5, 6, 10)
-- Executar diretamente no banco para investigar os problemas reportados.
-- Este arquivo NÃO é uma migration — é referência para debug.
-- =============================================================================

-- ─── PONTO 2: Delta share zerado em todos ──────────────────────────────────
-- Verificar quantos períodos distintos existem na base de share
SELECT COUNT(DISTINCT anomes) AS total_periodos,
       MIN(anomes) AS primeiro_periodo,
       MAX(anomes) AS ultimo_periodo
FROM vw_share_real;

-- Verificar se o LATERAL JOIN de sh_prev retorna dados
SELECT gs.geohash_id, gs.trend_delta, gs.trend_direction
FROM vw_geohash_summary gs
WHERE gs.trend_delta != 0
LIMIT 20;

-- Se vazio: confirma que todos estão zerados
SELECT trend_direction, COUNT(*) AS qtd
FROM vw_geohash_summary
GROUP BY trend_direction;


-- ─── PONTO 3: CRM Vivo ausente ─────────────────────────────────────────────
-- Verificar se geohash_crm tem dados
SELECT COUNT(*) AS total_registros,
       COUNT(DISTINCT geohash_id) AS geohashes_distintos,
       COUNT(DISTINCT period) AS periodos
FROM geohash_crm;

-- Se vazia: precisa de carga de dados (@nelson)
-- Se populada: verificar amostra
SELECT geohash_id, avg_arpu, arpu_fibra, arpu_movel,
       dominant_plan_type, device_tier
FROM geohash_crm
LIMIT 10;


-- ─── PONTO 5: Share 100% com população zerada ──────────────────────────────
-- Encontrar geohashes com share alto e população zero
SELECT geohash_id, precision, share_pct, populacao_residente,
       vivo_score, neighborhood, city
FROM vw_geohash_summary
WHERE share_pct >= 95
  AND (populacao_residente IS NULL OR populacao_residente = 0)
ORDER BY share_pct DESC
LIMIT 30;

-- Verificar se esses geohashes existem em geo_por_latlong
SELECT gs.geohash_id,
       gs.share_pct,
       gs.populacao_residente AS pop_na_view,
       gpl.populacao_total_media AS pop_na_tabela
FROM vw_geohash_summary gs
LEFT JOIN geo_por_latlong gpl ON gpl.geohash7 = gs.geohash_id
WHERE gs.share_pct >= 95
  AND (gs.populacao_residente IS NULL OR gs.populacao_residente = 0)
LIMIT 20;

-- Verificar sample_size dos geohashes com 100% share (distorção estatística?)
SELECT gs.geohash_id, gs.share_pct, gs.vivo_sample_size
FROM vw_geohash_summary gs
WHERE gs.share_pct = 100
ORDER BY gs.vivo_sample_size ASC
LIMIT 20;


-- ─── PONTO 6: Fibra/Móvel não altera share nem satisfação ──────────────────
-- Verificar se share_fibra e share_movel têm valores distintos
SELECT
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE share_fibra_pct > 0) AS com_share_fibra,
    COUNT(*) FILTER (WHERE share_movel_pct > 0) AS com_share_movel,
    COUNT(*) FILTER (WHERE share_fibra_pct != share_movel_pct) AS share_diferente
FROM vw_geohash_summary;

-- Verificar se diagnostico_growth tem scores por tech
SELECT
    COUNT(*) AS total,
    COUNT(score_ookla_fibra) AS com_score_fibra,
    COUNT(score_ookla_movel) AS com_score_movel,
    COUNT(*) FILTER (WHERE score_ookla_fibra != score_ookla_movel) AS scores_diferentes
FROM diagnostico_growth;

-- Amostra de dados por tech
SELECT geohash_id, share_fibra_pct, share_movel_pct, tech_category
FROM vw_geohash_summary
WHERE tech_category = 'AMBOS'
LIMIT 10;


-- ─── PONTO 10: Áreas sem geohash (vazias) ──────────────────────────────────
-- Total de geohashes na célula vs na view
SELECT
    (SELECT COUNT(*) FROM geohash_cell WHERE precision = 7) AS celulas_p7,
    (SELECT COUNT(DISTINCT geohash_id) FROM vw_geohash_summary WHERE precision = 7) AS na_view_p7,
    (SELECT COUNT(*) FROM geohash_cell WHERE precision = 6) AS celulas_p6,
    (SELECT COUNT(DISTINCT geohash_id) FROM vw_geohash_summary WHERE precision = 6) AS na_view_p6;

-- Geohashes que existem na célula mas não na view (filtrados por falta de dados)
SELECT gc.geohash_id, gc.precision, gc.city, gc.neighborhood
FROM geohash_cell gc
LEFT JOIN vw_geohash_summary gs ON gc.geohash_id = gs.geohash_id
WHERE gs.geohash_id IS NULL
  AND gc.precision = 7
LIMIT 30;
