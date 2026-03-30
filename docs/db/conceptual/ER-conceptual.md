# Modelo Conceitual — Zoox x Vivo GeoIntelligence

**Versão**: 2.0 | **Data**: 2026-03-29
**Fonte**: docs/levantamento/Zoox_+_Vivo_Estrategia_v1203.pdf + CSVs operacionais

## Diagrama ER

```mermaid
erDiagram
    %% ===== CAMADA RAW (AIE — dados externos Ookla/SpeedTest) =====
    FILE_TRANSFER {
        timestamptz ts_result PK
        varchar attr_geohash6
        varchar attr_geohash7
        varchar attr_sim_operator_common_name
        double val_dl_throughput
        double val_ul_throughput
        integer val_latency_avg
        varchar attr_connection_generation_name
    }

    VIDEO {
        timestamptz ts_result PK
        varchar attr_geohash7
        varchar attr_sim_operator_common_name
        integer val_video_time_to_start
        integer attr_video_rebuffering_count
        boolean is_video_fails_to_start
    }

    WEB_BROWSING {
        timestamptz ts_result PK
        varchar attr_geohash7
        varchar attr_sim_operator_common_name
        integer val_web_page_load_time
        integer val_web_page_first_byte_time
        boolean is_web_page_fails_to_load
    }

    SCORE {
        integer nu_ano_mes_rfrn PK
        varchar nm_oprd PK
        varchar cd_geo_hsh7 PK
        double vl_vdeo_scre
        double vl_web_scre
        double vl_nota_sped_scre
        double vl_cntv_scre
    }

    %% ===== CAMADA RAW (AIE — dados operacionais Vivo) =====
    VIVO_FTTH_COVERAGE {
        varchar cod_geo PK
        integer anomes PK
        varchar produto
        varchar tp_produto
        integer flg_loc
        double x
        double y
    }

    VIVO_MOBILE_ERB {
        varchar erb_casa PK
        integer anomes PK
        integer qtde_lnha_pos
        integer qtde_lnha_ctrl
        integer qtde_lnha_pre
        double x
        double y
    }

    GEO_POR_LATLONG {
        float8 latitude
        float8 longitude
        text geohash7
        float8 renda_per_capita_media
        float8 populacao_total_media
        float8 total_de_domicilios_media
        geometry geom
    }

    %% ===== CAMADA ANALITICA (ALI — mantidas pelo sistema) =====
    GEOHASH_CELL {
        varchar geohash_id PK
        smallint precision
        double center_lat
        double center_lng
        geometry geom
        varchar neighborhood
        varchar city
        varchar state
    }

    BENCHMARK_CONFIG {
        serial id PK
        varchar key
        varchar scope
        numeric value
        date period_date
    }

    USER_SESSION {
        varchar user_id PK
        jsonb state
        timestamptz updated_at
    }

    %% ===== VIEWS (Camada Analitica) =====
    VW_GEOHASH_SUMMARY {
        varchar geohash_id PK
        date period_month
        smallint precision
        numeric share_pct
        numeric vivo_score
        varchar quadrant
        varchar technology
        varchar competitive_position
        numeric priority_score
    }

    VW_BAIRRO_SUMMARY {
        varchar neighborhood PK
        date period_month
        integer total_clients
        numeric avg_share
        numeric avg_vivo_score
        jsonb quadrant_counts
    }

    %% ===== RELACIONAMENTOS =====

    %% Raw QoE → Geohash
    FILE_TRANSFER }o--|| GEOHASH_CELL : "attr_geohash7 -> geohash_id"
    VIDEO }o--|| GEOHASH_CELL : "attr_geohash7 -> geohash_id"
    WEB_BROWSING }o--|| GEOHASH_CELL : "attr_geohash7 -> geohash_id"
    SCORE }o--|| GEOHASH_CELL : "cd_geo_hsh7 -> geohash_id"
    GEO_POR_LATLONG }o--|| GEOHASH_CELL : "geohash7 -> geohash_id"

    %% Dados operacionais Vivo → Geohash (via coordenadas → geohash)
    VIVO_FTTH_COVERAGE }o--|| GEOHASH_CELL : "ST_GeoHash(x,y) -> geohash_id"
    VIVO_MOBILE_ERB }o--|| GEOHASH_CELL : "ST_GeoHash(x,y) -> geohash_id"

    %% Views consomem dados
    VW_GEOHASH_SUMMARY ||--o{ SCORE : "scores por operadora"
    VW_GEOHASH_SUMMARY ||--o{ VIVO_FTTH_COVERAGE : "share fibra real"
    VW_GEOHASH_SUMMARY ||--o{ VIVO_MOBILE_ERB : "share movel real"
    VW_GEOHASH_SUMMARY ||--o{ GEO_POR_LATLONG : "demografia"
    VW_GEOHASH_SUMMARY ||--o{ FILE_TRANSFER : "QoE métricas"
    VW_GEOHASH_SUMMARY }o--|| GEOHASH_CELL : "referência espacial"
    VW_GEOHASH_SUMMARY }o--|| BENCHMARK_CONFIG : "limiares de quadrante"

    VW_BAIRRO_SUMMARY ||--o{ VW_GEOHASH_SUMMARY : "agrega por bairro"
```

## Narrativa de Relacionamentos

| Origem | Destino | Cardinalidade | Descrição | UC |
|--------|---------|---------------|-----------|-----|
| FILE_TRANSFER | GEOHASH_CELL | N:1 | Testes SpeedTest por geohash | UC001, UC005 |
| VIDEO | GEOHASH_CELL | N:1 | Testes de video por geohash | UC001 |
| WEB_BROWSING | GEOHASH_CELL | N:1 | Testes de web por geohash | UC001 |
| SCORE | GEOHASH_CELL | N:1 | Score mensal por geohash7 x operadora | UC004, UC009 |
| VIVO_FTTH_COVERAGE | GEOHASH_CELL | N:1 | Instalações FTTH Vivo por geohash (via coordenadas) | UC001, UC004 |
| VIVO_MOBILE_ERB | GEOHASH_CELL | N:1 | ERBs movel Vivo com linhas ativas por geohash | UC001, UC004 |
| GEO_POR_LATLONG | GEOHASH_CELL | N:1 | Dados socioeconomicos por geohash | UC004, UC010 |
| VW_GEOHASH_SUMMARY | BENCHMARK_CONFIG | N:1 | Limiares definem quadrante | RN001-01 |
| VW_GEOHASH_SUMMARY | VIVO_FTTH_COVERAGE | 1:N | Share FIBRA = instalações / domicilios | RN001-01 |
| VW_GEOHASH_SUMMARY | VIVO_MOBILE_ERB | 1:N | Share MOVEL = linhas / população | RN001-01 |
| VW_BAIRRO_SUMMARY | VW_GEOHASH_SUMMARY | 1:N | Bairro agrega N geohashes | UC010 |
| USER_SESSION | — | standalone | Estado da sessão por usuário | UC011, UC012 |

## Rastreabilidade: Entidade → ALI/AIE

| Entidade | Tipo | ALI/AIE ID | UC Principal |
|----------|------|------------|--------------|
| FILE_TRANSFER | AIE | D01 | UC001, UC004, UC005 |
| VIDEO | AIE | D02 | UC001, UC004 |
| WEB_BROWSING | AIE | D03 | UC001, UC004 |
| SCORE | AIE | D04 | UC004, UC009 |
| GEO_POR_LATLONG | AIE | D05 | UC004, UC010 |
| **VIVO_FTTH_COVERAGE** | AIE | **D11** | UC001, UC004 (share fibra) |
| **VIVO_MOBILE_ERB** | AIE | **D12** | UC001, UC004 (share movel) |
| USER_SESSION | ALI | D06 | UC011, UC012 |
| VW_GEOHASH_SUMMARY | ALI | D07 | UC001-UC010 |
| VW_BAIRRO_SUMMARY | ALI | D08 | UC010 |
| BENCHMARK_CONFIG | ALI | D10 | UC001, UC004, UC007 |
| GEOHASH_CELL | ALI | — | UC001, UC005, UC008 |
