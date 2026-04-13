# Modelo de Dados — Zoox x Vivo GeoIntelligence

**Stack**: PostgreSQL 18 + TimescaleDB + PostGIS
**ORM**: Drizzle (app) + SQL nativo (views/aggregates)
**Versão**: 4.0 | **Data**: 2026-04-09
**Fonte**: Levantamento v1203 + CSVs operacionais Vivo

## Visão Geral

Arquitetura de duas camadas com dados operacionais Vivo adicionados:

```
                    ┌─────────────────────────────┐
                    │        Frontend (Nuxt)      │
                    │    tRPC WS subscriptions    │
                    └─────────────┬───────────────┘
                                  │
                    ┌─────────────▼───────────────┐
                    │      NestJS Backend         │
                    │    Drizzle + SQL nativo     │
                    └─────────────┬───────────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
   ┌──────────▼──────────┐  ┌────▼─────┐  ┌─────────▼──────────┐
   │   Views (Analitica) │  │  Redis   │  │  Tabelas (ALI)     │
   │  vw_share_real      │  │  Cache + │  │  geohash_cell      │
   │  vw_geohash_summary │  │  Session │  │  benchmark_config  │
   │  vw_score_mobile ◄──NEW  ──────┘  │  user_session      │
   │  vw_score_fibra  ◄──NEW           │                    │
   │  vw_bairro_summary  │                └────────────────────┘
   └──────────┬──────────┘
              │
   ┌──────────▼──────────────────────────┐
   │   Continuous Aggregates(TimescaleDB)│
   │  cagg_ft_monthly_gh7 / _gh6         │
   │  cagg_video_monthly_gh7 / _gh6      │
   │  cagg_web_monthly_gh7 / _gh6        │
   └──────────┬──────────────────────────┘
              │
   ┌──────────▼──────────────────────────┐
   │   Tabelas Raw (AIE — ETL externo)   │
   │  file_transfer  (hypertable, 187col)│
   │  video          (hypertable, 89col) │
   │  web_browsing   (hypertable, 91col) │
   │  score          (mensal, 15col)     │
   │  geo_por_latlong (PostGIS, 22col)   │
   │  vivo_ftth_coverage (NOVO, 11col)   │
   │  vivo_mobile_erb    (NOVO, 10col)   │
   │  networkPerformanceFixed (~100col)  │
   │  networkPerformanceMobile (~160col) │
   └─────────────────────────────────────┘
              │
   ┌──────────▼──────────────────────────┐
   │   CRM + Camada 2 (ALI — derivados)  │
   │  geohash_crm (9col)                │
   │  camada2_fibra (10col)             │
   │  camada2_movel (10col)             │
   │  diagnostico_growth (19col)        │
   └─────────────────────────────────────┘
```

## Changelog v4 → v5

| Mudança | Impacto |
|---------|---------|
| ATIVAR → ATACAR em recomendacao_type | Enum, diagnostico_growth, UC009 RN009-06 |
| +MELHORA_QUALIDADE em fibra_class (5 valores) | Enum, camada2_fibra, UC004 RN004-04 |
| Novos enums: decisao_tech_type, prioridade_growth | DDL, diagnostico_growth |
| diagnostico_growth: +score_ookla_movel/fibra, +score_hac, +delta_fibra/movel, +decisao_movel/fibra, +prio_movel/fibra | DDL, schema lógico, dicionário |
| geohash_crm: +arpu_movel, +arpu_fibra, +plan_type_movel | DDL, schema lógico, dicionário |
| UC004 RN004-01: Fórmulas simplificadas + prioridade por percentil | Business rules |
| UC009 RN009-05: Pilar Percepção com 4 métricas, Concorrência com delta per-tech | Business rules |
| UC009 RN009-06: Recomendação com decisão per-tech e prioridade per-tech | Business rules |
| +RN004-09: Classificação classe social ABEP/IBGE | Business rules |
| **vw_score_mobile / vw_score_fibra v5** (notebook validado 2026-04-11): filtros (wifi, location_type, latency NOT NULL), FULL OUTER JOIN, falha vídeo/web 4-tier (mobile) / 3-tier (fibra), degradação graciosa nos pilares fibra, score_resolucao com soma manual, fronteiras `<` (sem ambiguidade), classificação por percentil dinâmico (BOM/MEDIO/RUIM, threshold_medio, threshold_bom) | DDL, data-dictionary, UC004 RN004-02 |

## Changelog v3 → v4

| Mudança | Impacto |
|---------|---------|
| 2 novas views: vw_score_mobile, vw_score_fibra (scores.pdf) | DDL, vw_geohash_summary, diagnostico_growth |
| Score QoE separado por tecnologia (MOBILE vs FIBRA) | Quadrantes por tecnologia no vw_geohash_summary |
| Novas colunas em vw_geohash_summary: satisfacao_fibra, satisfacao_movel, quadrante_fibra, quadrante_movel | Frontend, UC004, UC009 |
| diagnostico_growth.score_ookla usa score da tech dominante | RN009-05, cálculo mensal |
| Variáveis exclusivas Fibra: val_tcp_connect_time, val_web_page_first_byte_time, attr_video_resolution | Views, mapeamento raw tables |
| Variáveis de falha Mobile: is_video_fails_to_start, is_web_page_fails_to_load | Views, taxa de falha por geohash |

## Changelog v1 → v2

| Mudança | Impacto |
|---------|---------|
| Quadrantes renomeados v3: GROWTH, UPSELL, RETENCAO, GROWTH_RETENCAO | Enum, views, UCs |
| Thresholds: share 30/40%, satisfação 6.0/7.5 (com zona intermediária) | benchmark_config, views |
| 2 novas tabelas: vivo_ftth_coverage (D11), vivo_mobile_erb (D12) | DDL, views de share |
| Share real (FTTH/ERB), não mais proxy de testes | vw_share_real (NOVA), vw_geohash_summary |
| Posição competitiva (5 níveis) | Novo enum + coluna na view |
| Prioridade por score absoluto P1-P4 | Novo enum + fórmula ponderada |
| movel_class v3: MELHORA_QUALIDADE_5G/4G, EXPANSAO_COBERTURA_5G/4G, SAUDAVEL | Separado por trilha 5G/4G |
| fibra_class v3: +SEM_FIBRA | Geohashes sem cobertura |
| competitive_position v3: EMPATADO (ant. EMPAREDADA), CRITICO (ant. ISOLADA) | Renomeados |
| Novos enums: score_label, tech_recommendation | Camada 2 |
| geo_por_latlong v3 (+60% pontos) | Importação |

## Rastreabilidade UC → Tabelas/Views

| UC | Tabelas Lidas | Tabelas Escritas | Views Consumidas |
|----|---------------|------------------|------------------|
| UC001 | geohash_cell, benchmark_config | — | vw_geohash_summary |
| UC002 | — | — | (filtro local) |
| UC003 | — | — | (filtro local) |
| UC004 | score, geo_por_latlong, **vivo_ftth**, **vivo_erb** | — | vw_geohash_summary, **vw_score_mobile**, **vw_score_fibra** |
| UC005 | geohash_cell | — | vw_geohash_summary (precisão 6 ou 7) |
| UC006 | file_transfer (fn_available_periods) | — | Todas |
| UC007 | — | — | vw_geohash_summary (2 períodos) |
| UC008 | geohash_cell | — | Todas |
| UC009 | score, geohash_crm, camada2_fibra, camada2_movel | diagnostico_growth | vw_geohash_summary, vw_share_real, **vw_score_mobile**, **vw_score_fibra** |
| UC010 | — | — | vw_bairro_summary |
| UC011 | user_session | user_session | — |
| UC012 | — | user_session | — |

## Artefatos

| Arquivo | Conteúdo |
|---------|----------|
| [conceptual/ER-conceptual.md](conceptual/ER-conceptual.md) | Diagrama ER Mermaid + narrativa |
| [logical/schema-logical.md](logical/schema-logical.md) | Normalização, domínios, restrições |
| [physical/DDL-geointelligence.sql](physical/DDL-geointelligence.sql) | DDL executável completo |
| [physical/data-dictionary.md](physical/data-dictionary.md) | Dicionário de dados por tabela/view |

## Políticas TimescaleDB

| Tabela | Chunks | Compressão | Retenção | Refresh (CAGG) |
|--------|--------|-----------|----------|----------------|
| file_transfer | 3 meses | Após 6 meses | 36 meses | — |
| video | 3 meses | Após 6 meses | 36 meses | — |
| web_browsing | 3 meses | Após 6 meses | 36 meses | — |
| networkPerformanceFixed | 7 dias | — | — | — |
| networkPerformanceMobile | 7 dias | — | — | — |
| cagg_*_monthly_gh7 (×3) | Herdado | — | — | Horário, 3 meses lookback |
| cagg_*_monthly_gh6 (×3) | Herdado | — | — | Horário, 3 meses lookback |

## Drill-down Geoespacial (UC005)

```
Zoom out (11-13)                    Zoom in (14-15)
┌─────────────────┐                ┌────┬────┬────┐
│                 │                │ 7a │ 7b │ 7c │
│   geohash6      │    ──────►     ├────┼────┼────┤
│   ~1.2km        │    zoom in     │ 7d │ 7e │ 7f │
│                 │                ├────┼────┼────┤
└─────────────────┘                │ 7g │ 7h │ 7i │
 cagg_*_gh6                        └────┴────┴────┘
 share: FTTH+ERB por gh6           cagg_*_gh7
 score: AVG dos filhos              share: FTTH+ERB por gh7
                                    score: direto
```

## Stack de Índices

| Tipo | Tabela | Colunas | Uso |
|------|--------|---------|-----|
| GIST | geohash_cell | geom | Viewport (ST_Intersects) |
| GIST | geo_por_latlong | geom | Join espacial |
| GIST | **vivo_ftth_coverage** | geom | Join espacial FTTH |
| GIST | **vivo_mobile_erb** | geom | Join espacial ERB |
| BTREE | geohash_cell | LEFT(geohash_id, 5/6) | Drill-down (UC005) |
| BTREE | geohash_cell | (state, city, neighborhood) | Localização (UC008) |
| BTREE | **vivo_ftth_coverage** | (geohash7, anomes), (geohash6, anomes) | Share FIBRA |
| BTREE | **vivo_mobile_erb** | (geohash7, anomes), (geohash6, anomes) | Share MÓVEL |
| BTREE | score | (cd_geo_hsh7), (nm_oprd, nu_ano_mes_rfrn) | Join scores |
| BTREE | file_transfer | (attr_geohash7, ts_result DESC) | Temporal |
| GIST | **networkPerformanceFixed** | geom | Join espacial testes fixos |
| GIST | **networkPerformanceMobile** | geom | Join espacial testes móveis |
| BTREE | **networkPerformanceFixed** | (attrProviderName, tsResult) | Filtro por operadora |
| BTREE | **networkPerformanceMobile** | (attrSimOperatorCommonName, tsResult) | Filtro por operadora |
| BTREE | **geohash_crm** | (geohash_id, period) | PK |
| BTREE | **camada2_fibra** | (geohash_id, period) | PK |
| BTREE | **camada2_movel** | (geohash_id, period) | PK |
| BTREE | **diagnostico_growth** | (geohash_id, anomes), (recomendacao, anomes) | Diagnóstico |
| BTREE | user_session | (updated_at DESC) | Cleanup |
