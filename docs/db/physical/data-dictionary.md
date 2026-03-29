# Dicionario de Dados — Zoox x Vivo GeoIntelligence

**Versao**: 2.0 | **Data**: 2026-03-29

## Tabelas Gerenciadas (ALI)

### geohash_cell
Sem alteracao. Ver v1 (9 colunas, PK geohash_id).

### benchmark_config
Sem alteracao estrutural. Dados seed atualizados com thresholds do Levantamento v1203.

### user_session
Sem alteracao. Ver v1.

---

## Tabelas Operacionais Vivo (AIE — NOVAS)

### vivo_ftth_coverage (D11)

| # | Coluna | Tipo | Nulavel | Default | Restricao | Descricao | Fonte |
|---|--------|------|---------|---------|-----------|-----------|-------|
| 1 | cod_geo | VARCHAR(20) | NO | — | PK | Codigo da instalacao FTTH | CSV col 1 |
| 2 | anomes | INTEGER | NO | — | PK, CHECK >= 202501 | Ano-mes YYYYMM | CSV col 8 |
| 3 | produto | VARCHAR(20) | NO | BANDA LARGA | — | Tipo de produto | CSV col 2 |
| 4 | tp_produto | VARCHAR(10) | NO | FTTH | — | Tecnologia | CSV col 3 |
| 5 | uf | VARCHAR(2) | NO | — | — | Estado | CSV col 4 |
| 6 | flg_loc | SMALLINT | NO | — | CHECK IN (1,2) | Flag localizacao | CSV col 5 |
| 7 | x | DOUBLE PRECISION | NO | — | — | Longitude | CSV col 6 |
| 8 | y | DOUBLE PRECISION | NO | — | — | Latitude | CSV col 7 |
| 9 | geom | GEOMETRY(POINT,4326) | — | GENERATED | GIST index | PostGIS point | Derivado |
| 10 | geohash7 | TEXT | — | GENERATED | BTREE index | ST_GeoHash(geom,7) | Derivado |
| 11 | geohash6 | TEXT | — | GENERATED | BTREE index | ST_GeoHash(geom,6) | Derivado |

**Volume**: ~110.000 rows/mes | **Uso**: Share FIBRA = COUNT(no geohash) / total_domicilios
**Fonte CSV**: `Ookla_visao_ftth_3M_YYYYMM.csv`, delimitador `;`, decimal `.`

### vivo_mobile_erb (D12)

| # | Coluna | Tipo | Nulavel | Default | Restricao | Descricao | Fonte |
|---|--------|------|---------|---------|-----------|-----------|-------|
| 1 | erb_casa | VARCHAR(20) | NO | — | PK | ID da ERB (ex: GOFMQ) | CSV col 1 |
| 2 | anomes | INTEGER | NO | — | PK, CHECK >= 202501 | Ano-mes YYYYMM | CSV col 7 |
| 3 | qtde_lnha_pos | INTEGER | NO | 0 | CHECK >= 0 | Linhas pos-pago | CSV col 2 |
| 4 | qtde_lnha_ctrl | INTEGER | NO | 0 | CHECK >= 0 | Linhas controle | CSV col 3 |
| 5 | qtde_lnha_pre | INTEGER | NO | 0 | CHECK >= 0 | Linhas pre-pago | CSV col 4 |
| 6 | x | DOUBLE PRECISION | NO | — | — | Longitude | CSV col 5 |
| 7 | y | DOUBLE PRECISION | NO | — | — | Latitude | CSV col 6 |
| 8 | geom | GEOMETRY(POINT,4326) | — | GENERATED | GIST index | PostGIS point | Derivado |
| 9 | geohash7 | TEXT | — | GENERATED | BTREE index | ST_GeoHash(geom,7) | Derivado |
| 10 | geohash6 | TEXT | — | GENERATED | BTREE index | ST_GeoHash(geom,6) | Derivado |

**Volume**: ~1.000 rows/mes | **Uso**: Share MOVEL = SUM(linhas no geohash) / populacao
**Fonte CSV**: `Ookla_visao_movel_3M_erb_casa_YYYYMM.csv`, delimitador `;`, decimal `,` (normalizar!)

---

## Tabelas Raw QoE (AIE) — Referencia

### file_transfer, video, web_browsing, score, geo_por_latlong
Sem alteracao estrutural. `geo_por_latlong` atualizado para v3 (+60% pontos).
Ver v1 para detalhes de colunas.

---

## Views

### vw_share_real (NOVA)

Calcula share de mercado real Vivo usando dados operacionais (nao proxy de testes).

| # | Coluna | Tipo | Derivacao | Descricao |
|---|--------|------|-----------|-----------|
| 1 | geohash_id | VARCHAR | JOIN | Geohash 6 ou 7 |
| 2 | precision | SMALLINT | 6 ou 7 | Nivel de precisao |
| 3 | anomes | INTEGER | FTTH/ERB | Ano-mes |
| 4 | total_ftth_vivo | INTEGER | COUNT(ftth) | Instalacoes FTTH no geohash |
| 5 | share_fibra_pct | NUMERIC(5,2) | ftth/domicilios×100 | Share FIBRA (%) |
| 6 | total_linhas_vivo | INTEGER | SUM(linhas) | Linhas movel no geohash |
| 7 | share_movel_pct | NUMERIC(5,2) | linhas/pop×100 | Share MOVEL (%) |
| 8 | technology | tech_category | Presenca FTTH/ERB | FIBRA, MOVEL ou AMBOS |
| 9 | share_pct | NUMERIC(5,2) | GREATEST(fibra,movel) | Share combinado |
| 10 | share_level | share_level | Faixas do Levantamento | MUITO_ALTA/ALTA/MEDIA/BAIXA |

### vw_geohash_summary (ATUALIZADA v2)

Colunas novas vs v1:

| # | Coluna | Tipo | Derivacao | Novidade |
|---|--------|------|-----------|----------|
| — | share_fibra_pct | NUMERIC(5,2) | vw_share_real | NOVO |
| — | share_movel_pct | NUMERIC(5,2) | vw_share_real | NOVO |
| — | share_level | share_level | Faixas Levantamento | NOVO |
| — | total_ftth_vivo | INTEGER | vw_share_real | NOVO |
| — | total_linhas_vivo | INTEGER | vw_share_real | NOVO |
| — | competitive_position | competitive_position | Delta Vivo vs concorrentes | NOVO |
| — | quadrant | quadrant_type | OPORTUNIDADE/FORTALEZA/RISCO/EXPANSAO | RENOMEADO |
| — | priority_label | priority_label | P1-P4 por score absoluto | FORMULA NOVA |

### vw_bairro_summary (ATUALIZADA v2)

JSONB keys renomeadas: OPORTUNIDADE, FORTALEZA, RISCO, EXPANSAO.

---

## Enums (ATUALIZADOS)

| Tipo | Valores v2 | Mudanca vs v1 |
|------|-----------|---------------|
| quadrant_type | OPORTUNIDADE, FORTALEZA, EXPANSAO, RISCO | Renomeados |
| priority_label | P1_CRITICA, P2_ALTA, P3_MEDIA, P4_BAIXA | Score absoluto, nao percentil |
| movel_class | MELHORA_QUALIDADE, SAUDAVEL, EXPANSAO_COBERTURA | Unificou 5G/4G em trilha interna |
| **competitive_position** | LIDER, COMPETITIVO, EMPAREDADA, ABAIXO, ISOLADA | **NOVO** |
| **share_level** | MUITO_ALTA, ALTA, MEDIA, BAIXA | **NOVO** |

---

## Continuous Aggregates
Sem alteracao. 6 CAAGs (3 metricas × 2 precisoes). Ver v1.

---

## Funcoes
Sem alteracao. `fn_available_periods()`, `fn_normalize_operator()`.
