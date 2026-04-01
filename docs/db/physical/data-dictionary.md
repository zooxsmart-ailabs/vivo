# Dicionário de Dados — Zoox x Vivo GeoIntelligence

**Versão**: 3.0 | **Data**: 2026-04-01

## Tabelas Gerenciadas (ALI)

### geohash_cell
Sem alteração. Ver v1 (9 colunas, PK geohash_id).

### benchmark_config
Sem alteração estrutural. Dados seed atualizados com thresholds do Levantamento v1203.

### user_session
Sem alteração. Ver v1.

---

## Tabelas Operacionais Vivo (AIE — NOVAS)

### vivo_ftth_coverage (D11)

| # | Coluna | Tipo | Nulável | Default | Restrição | Descrição | Fonte |
|---|--------|------|---------|---------|-----------|-----------|-------|
| 1 | cod_geo | VARCHAR(20) | NO | — | PK | Código da instalação FTTH | CSV col 1 |
| 2 | anomes | INTEGER | NO | — | PK, CHECK >= 202501 | Ano-mês YYYYMM | CSV col 8 |
| 3 | produto | VARCHAR(20) | NO | BANDA LARGA | — | Tipo de produto | CSV col 2 |
| 4 | tp_produto | VARCHAR(10) | NO | FTTH | — | Tecnologia | CSV col 3 |
| 5 | uf | VARCHAR(2) | NO | — | — | Estado | CSV col 4 |
| 6 | flg_loc | SMALLINT | NO | — | CHECK IN (1,2) | Flag localização | CSV col 5 |
| 7 | x | DOUBLE PRECISION | NO | — | — | Longitude | CSV col 6 |
| 8 | y | DOUBLE PRECISION | NO | — | — | Latitude | CSV col 7 |
| 9 | geom | GEOMETRY(POINT,4326) | — | GENERATED | GIST index | PostGIS point | Derivado |
| 10 | geohash7 | TEXT | — | GENERATED | BTREE index | ST_GeoHash(geom,7) | Derivado |
| 11 | geohash6 | TEXT | — | GENERATED | BTREE index | ST_GeoHash(geom,6) | Derivado |

**Volume**: ~110.000 rows/mês | **Uso**: Share FIBRA = COUNT(no geohash) / total_domicílios
**Fonte CSV**: `Ookla_visao_ftth_3M_YYYYMM.csv`, delimitador `;`, decimal `.`

### vivo_mobile_erb (D12)

| # | Coluna | Tipo | Nulável | Default | Restrição | Descrição | Fonte |
|---|--------|------|---------|---------|-----------|-----------|-------|
| 1 | erb_casa | VARCHAR(20) | NO | — | PK | ID da ERB (ex: GOFMQ) | CSV col 1 |
| 2 | anomes | INTEGER | NO | — | PK, CHECK >= 202501 | Ano-mês YYYYMM | CSV col 7 |
| 3 | qtde_lnha_pos | INTEGER | NO | 0 | CHECK >= 0 | Linhas pós-pago | CSV col 2 |
| 4 | qtde_lnha_ctrl | INTEGER | NO | 0 | CHECK >= 0 | Linhas controle | CSV col 3 |
| 5 | qtde_lnha_pre | INTEGER | NO | 0 | CHECK >= 0 | Linhas pré-pago | CSV col 4 |
| 6 | x | DOUBLE PRECISION | NO | — | — | Longitude | CSV col 5 |
| 7 | y | DOUBLE PRECISION | NO | — | — | Latitude | CSV col 6 |
| 8 | geom | GEOMETRY(POINT,4326) | — | GENERATED | GIST index | PostGIS point | Derivado |
| 9 | geohash7 | TEXT | — | GENERATED | BTREE index | ST_GeoHash(geom,7) | Derivado |
| 10 | geohash6 | TEXT | — | GENERATED | BTREE index | ST_GeoHash(geom,6) | Derivado |

**Volume**: ~1.000 rows/mês | **Uso**: Share MÓVEL = SUM(linhas no geohash) / população
**Fonte CSV**: `Ookla_visao_movel_3M_erb_casa_YYYYMM.csv`, delimitador `;`, decimal `,` (normalizar!)

---

### diagnostico_growth (D16 — NOVO)

Diagnóstico pré-calculado dos 4 pilares para geohashes GROWTH. RN009-05/06/07.

| # | Coluna | Tipo | Nulável | Default | Restrição | Descrição | Fonte |
|---|--------|------|---------|---------|-----------|-----------|-------|
| 1 | geohash_id | VARCHAR(12) | NO | — | PK, FK→geohash_cell | ID do geohash | geohash_cell |
| 2 | precision | SMALLINT | NO | 6 | PK, CHECK 1-12 | Nível de precisão | — |
| 3 | anomes | INTEGER | NO | — | PK, CHECK ≥ 202501 | Ano-mês YYYYMM | — |
| 4 | score_ookla | NUMERIC(4,1) | NO | — | CHECK 0-10 | Score SpeedTest Vivo (0-10) | score.vl_cntv_scre |
| 5 | taxa_chamados | NUMERIC(5,2) | NO | 0 | CHECK ≥ 0 | (RAC+SAC 30d) / Base Ativa (%) | **A definir** |
| 6 | share_penetracao | NUMERIC(5,2) | NO | — | CHECK 0-100 | Base Vivo / Total Domicílios (%) | vw_share_real |
| 7 | delta_vs_lider | NUMERIC(4,1) | NO | — | — | Score Vivo - Score líder (Ookla) | score |
| 8 | fibra_class | fibra_class | NO | SAUDAVEL | — | Classificação Camada 2 Fibra | camada2_fibra |
| 9 | movel_class | movel_class | NO | SAUDAVEL | — | Classificação Camada 2 Móvel | camada2_movel |
| 10 | arpu_relativo | NUMERIC(4,2) | NO | 1.0 | — | ARPU geohash / ARPU médio cidade | geohash_crm |
| 11 | canal_dominante | VARCHAR(30) | NO | Digital | — | Canal de venda dominante | **A definir** |
| 12 | canal_pct | NUMERIC(5,2) | NO | 50.0 | CHECK 0-100 | % de vendas pelo canal dominante | **A definir** |
| 13 | sinal_percepcao | sinal_type | NO | OK | — | Sinal agregado pilar Percepção | Calculado (RN009-08) |
| 14 | sinal_concorrencia | sinal_type | NO | OK | — | Sinal agregado pilar Concorrência | Calculado (RN009-08) |
| 15 | sinal_infraestrutura | sinal_type | NO | OK | — | Sinal agregado pilar Infraestrutura | Calculado (RN009-08) |
| 16 | sinal_comportamento | sinal_type | NO | OK | — | Sinal agregado pilar Comportamento | Calculado (RN009-08) |
| 17 | recomendacao | recomendacao_type | NO | ATIVAR | — | Decisão IA: ATIVAR/AGUARDAR/BLOQUEADO | Calculado (RN009-06) |
| 18 | recomendacao_razao | TEXT | YES | — | — | Justificativa textual composta | Calculado (gerarRec) |
| 19 | created_at | TIMESTAMPTZ | NO | NOW() | — | Timestamp de criação | Sistema |

**Volume**: ~35 rows/mês (1 por geohash GROWTH × anomes) | **PK**: (geohash_id, precision, anomes)
**Índices**: (geohash_id, anomes), (recomendacao, anomes)

**Campos com fonte pendente (stubs):**
- `taxa_chamados`: Depende de integração com sistema RAC/SAC Vivo (volume de chamados)
- `arpu_relativo`: Requer cálculo de ARPU médio por cidade como referência
- `canal_dominante` / `canal_pct`: Depende de integração com dados de canal de vendas CRM

---

## Enums (NOVOS v3)

| Tipo | Valores | Descrição | RN |
|------|---------|-----------|-----|
| `recomendacao_type` | ATIVAR, AGUARDAR, BLOQUEADO | Decisão IA do diagnóstico Growth | RN009-06 |
| `sinal_type` | OK, ALERTA, CRITICO | Sinal ternário dos pilares | RN009-08 |

---

## Tabelas Raw QoE (AIE) — Referência

### file_transfer, video, web_browsing, score, geo_por_latlong
Sem alteração estrutural. `geo_por_latlong` atualizado para v3 (+60% pontos).
Ver v1 para detalhes de colunas.

---

## Views

### vw_share_real (NOVA)

Calcula share de mercado real Vivo usando dados operacionais (não proxy de testes).

| # | Coluna | Tipo | Derivação | Descrição |
|---|--------|------|-----------|-----------|
| 1 | geohash_id | VARCHAR | JOIN | Geohash 6 ou 7 |
| 2 | precision | SMALLINT | 6 ou 7 | Nível de precisão |
| 3 | anomes | INTEGER | FTTH/ERB | Ano-mes |
| 4 | total_ftth_vivo | INTEGER | COUNT(ftth) | Instalações FTTH no geohash |
| 5 | share_fibra_pct | NUMERIC(5,2) | ftth/domicílios×100 | Share FIBRA (%) |
| 6 | total_linhas_vivo | INTEGER | SUM(linhas) | Linhas móvel no geohash |
| 7 | share_movel_pct | NUMERIC(5,2) | linhas/pop×100 | Share MÓVEL (%) |
| 8 | technology | tech_category | Presença FTTH/ERB | FIBRA, MÓVEL ou AMBOS |
| 9 | share_pct | NUMERIC(5,2) | GREATEST(fibra,movel) | Share combinado |
| 10 | share_level | share_level | Faixas do Levantamento | MUITO_ALTA/ALTA/MEDIA/BAIXA |

### vw_geohash_summary (ATUALIZADA v2)

Colunas novas vs v1:

| # | Coluna | Tipo | Derivação | Novidade |
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

| Tipo | Valores v2 | Mudança vs v1 |
|------|-----------|---------------|
| quadrant_type | OPORTUNIDADE, FORTALEZA, EXPANSAO, RISCO | Renomeados |
| priority_label | P1_CRITICA, P2_ALTA, P3_MEDIA, P4_BAIXA | Score absoluto, não percentil |
| movel_class | MELHORA_QUALIDADE, SAUDAVEL, EXPANSAO_COBERTURA | Unificou 5G/4G em trilha interna |
| **competitive_position** | LIDER, COMPETITIVO, EMPAREDADA, ABAIXO, ISOLADA | **NOVO** |
| **share_level** | MUITO_ALTA, ALTA, MEDIA, BAIXA | **NOVO** |

---

## Continuous Aggregates
Sem alteração. 6 CAAGs (3 métricas × 2 precisões). Ver v1.

---

## Funções
Sem alteração. `fn_available_periods()`, `fn_normalize_operator()`.
