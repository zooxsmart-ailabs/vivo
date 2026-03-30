# Modelo de Dados — Zoox x Vivo GeoIntelligence

**Stack**: PostgreSQL 18 + TimescaleDB + PostGIS
**ORM**: Drizzle (app) + SQL nativo (views/aggregates)
**Versão**: 2.0 | **Data**: 2026-03-29
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
   │  vw_bairro_summary  │  └──────────┘  │  user_session      │
   └──────────┬──────────┘                └────────────────────┘
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
   └─────────────────────────────────────┘
```

## Changelog v1 → v2

| Mudança | Impacto |
|---------|---------|
| Quadrantes renomeados: OPORTUNIDADE, FORTALEZA, RISCO, EXPANSAO | Enum, views, UCs |
| Thresholds: share 30/40%, satisfação 6.0/7.5 (com zona intermediaria) | benchmark_config, views |
| 2 novas tabelas: vivo_ftth_coverage (D11), vivo_mobile_erb (D12) | DDL, views de share |
| Share real (FTTH/ERB), nao mais proxy de testes | vw_share_real (NOVA), vw_geohash_summary |
| Posição competitiva (5 niveis) | Novo enum + coluna na view |
| Prioridade por score absoluto P1-P4 | Novo enum + formula ponderada |
| movel_class: EXPANSAO_5G/4G → EXPANSAO_COBERTURA | Enum simplificado |
| geo_por_latlong v3 (+60% pontos) | Importação |

## Rastreabilidade UC → Tabelas/Views

| UC | Tabelas Lidas | Tabelas Escritas | Views Consumidas |
|----|---------------|------------------|------------------|
| UC001 | geohash_cell, benchmark_config | — | vw_geohash_summary |
| UC002 | — | — | (filtro local) |
| UC003 | — | — | (filtro local) |
| UC004 | score, geo_por_latlong, **vivo_ftth**, **vivo_erb** | — | vw_geohash_summary |
| UC005 | geohash_cell | — | vw_geohash_summary (precisao 6 ou 7) |
| UC006 | file_transfer (fn_available_periods) | — | Todas |
| UC007 | — | — | vw_geohash_summary (2 períodos) |
| UC008 | geohash_cell | — | Todas |
| UC009 | — | — | vw_geohash_summary |
| UC010 | — | — | vw_bairro_summary |
| UC011 | user_session | user_session | — |
| UC012 | — | user_session | — |

## Artefatos

| Arquivo | Conteudo |
|---------|----------|
| [conceptual/ER-conceptual.md](conceptual/ER-conceptual.md) | Diagrama ER Mermaid + narrativa |
| [logical/schema-logical.md](logical/schema-logical.md) | Normalizacao, domínios, restrições |
| [physical/DDL-geointelligence.sql](physical/DDL-geointelligence.sql) | DDL executavel completo |
| [physical/data-dictionary.md](physical/data-dictionary.md) | Dicionario de dados por tabela/view |

## Politicas TimescaleDB

| Tabela | Chunks | Compressao | Retenção | Refresh (CAGG) |
|--------|--------|-----------|----------|----------------|
| file_transfer | 3 meses | Apos 6 meses | 36 meses | — |
| video | 3 meses | Apos 6 meses | 36 meses | — |
| web_browsing | 3 meses | Apos 6 meses | 36 meses | — |
| cagg_*_monthly_gh7 (×3) | Herdado | — | — | Horario, 3 meses lookback |
| cagg_*_monthly_gh6 (×3) | Herdado | — | — | Horario, 3 meses lookback |

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
| BTREE | **vivo_mobile_erb** | (geohash7, anomes), (geohash6, anomes) | Share MOVEL |
| BTREE | score | (cd_geo_hsh7), (nm_oprd, nu_ano_mes_rfrn) | Join scores |
| BTREE | file_transfer | (attr_geohash7, ts_result DESC) | Temporal |
| BTREE | user_session | (updated_at DESC) | Cleanup |
