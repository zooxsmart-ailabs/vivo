# Modelo Logico — Zoox x Vivo GeoIntelligence

**Versao**: 2.0 | **Data**: 2026-03-29

## 1. Dominios e Tipos Enumerados

| Dominio | Tipo Base | Valores | RN Origem |
|---------|-----------|---------|-----------|
| `quadrant_type` | ENUM | **OPORTUNIDADE, FORTALEZA, EXPANSAO, RISCO** | RN001-01 |
| `tech_category` | ENUM | FIBRA, MOVEL, AMBOS | RN003-03 |
| `operator_name` | ENUM | VIVO, TIM, CLARO, OI, OUTROS | Score table |
| `trend_direction` | ENUM | UP, DOWN, STABLE | Levantamento sec.2 |
| `fibra_class` | ENUM | AUMENTO_CAPACIDADE, EXPANSAO_NOVA_AREA, SAUDAVEL | RN004-04 |
| `movel_class` | ENUM | MELHORA_QUALIDADE, SAUDAVEL, EXPANSAO_COBERTURA | RN004-05 |
| `priority_label` | ENUM | **P1_CRITICA, P2_ALTA, P3_MEDIA, P4_BAIXA** | Levantamento sec.score |
| `quality_label` | ENUM | EXCELENTE, BOM, REGULAR, RUIM | RN004-02 |
| `benchmark_scope` | ENUM | NACIONAL, ESTADO, CIDADE | RN001-06 |
| `competitive_position` | ENUM | **LIDER, COMPETITIVO, EMPAREDADA, ABAIXO, ISOLADA** | Levantamento sec.4 |
| `share_level` | ENUM | **MUITO_ALTA, ALTA, MEDIA, BAIXA** | Levantamento sec.1 |

### Mudancas v1 → v2

| Item | v1 | v2 | Motivo |
|------|----|----|--------|
| Quadrantes | GROWTH, UPSELL, RETENCAO, GROWTH_RETENCAO | OPORTUNIDADE, FORTALEZA, RISCO, EXPANSAO | PDF oficial v1203 |
| Prioridade | CRITICO/ALTO/MEDIO/BAIXO (percentil) | P1-P4 (score absoluto 0-10) | Levantamento |
| Movel class | EXPANSAO_5G, EXPANSAO_4G | EXPANSAO_COBERTURA (trilha 5G/4G e interna) | PDF Camada 2 |
| Share thresholds | 35% unico limiar | < 30% (baixa), 30-39% (media), >= 40% (alta) | Levantamento sec.1 |
| Satisfacao thresholds | 6.8 unico limiar | < 6.0 (baixa), 6.0-7.4 (media), >= 7.5 (alta) | Levantamento sec.3 |

## 2. Camada Raw (AIE) — Tabelas Existentes

### 2.1-2.3 file_transfer, video, web_browsing (Hypertables)
Sem alteracao. Ver v1.

### 2.4 score
Sem alteracao. Ver v1.

### 2.5 geo_por_latlong (v3)
- **Atualizacao**: v2 (3.092 rows) → v3 (4.958 rows), +60% cobertura
- Schema identico, mesmo pipeline de importacao
- Geohash7 e geom gerados via PostGIS

### 2.6 vivo_ftth_coverage (NOVO — AIE D11)

| Coluna | Tipo | Restricao | Descricao |
|--------|------|-----------|-----------|
| cod_geo | VARCHAR(20) | NOT NULL | Codigo geografico da instalacao FTTH |
| anomes | INTEGER | NOT NULL | Ano-mes referencia (YYYYMM) |
| produto | VARCHAR(20) | NOT NULL | Sempre "BANDA LARGA" |
| tp_produto | VARCHAR(10) | NOT NULL | Sempre "FTTH" |
| uf | VARCHAR(2) | NOT NULL | Estado |
| flg_loc | SMALLINT | NOT NULL | Flag de localizacao (1 ou 2) |
| x | DOUBLE PRECISION | NOT NULL | Longitude |
| y | DOUBLE PRECISION | NOT NULL | Latitude |
| geom | GEOMETRY(POINT, 4326) | GENERATED | Gerado de x,y |
| geohash7 | TEXT | GENERATED | Gerado via ST_GeoHash |
| geohash6 | TEXT | GENERATED | LEFT(geohash7, 6) |

**PK**: (cod_geo, anomes)
**Volume**: ~110.000 registros/mes (apenas GO)
**Uso**: Calculo de share FIBRA — `COUNT(instalacoes no geohash) / total_domicilios × 100`
**Fonte CSV**: `Ookla_visao_ftth_3M_YYYYMM.csv` (delimitador `;`)

### 2.7 vivo_mobile_erb (NOVO — AIE D12)

| Coluna | Tipo | Restricao | Descricao |
|--------|------|-----------|-----------|
| erb_casa | VARCHAR(20) | NOT NULL | ID da ERB (estacao radio base) |
| anomes | INTEGER | NOT NULL | Ano-mes referencia (YYYYMM) |
| qtde_lnha_pos | INTEGER | NOT NULL DEFAULT 0 | Linhas pos-pago |
| qtde_lnha_ctrl | INTEGER | NOT NULL DEFAULT 0 | Linhas controle |
| qtde_lnha_pre | INTEGER | NOT NULL DEFAULT 0 | Linhas pre-pago |
| x | DOUBLE PRECISION | NOT NULL | Longitude |
| y | DOUBLE PRECISION | NOT NULL | Latitude |
| geom | GEOMETRY(POINT, 4326) | GENERATED | Gerado de x,y |
| geohash7 | TEXT | GENERATED | Gerado via ST_GeoHash |
| geohash6 | TEXT | GENERATED | LEFT(geohash7, 6) |

**PK**: (erb_casa, anomes)
**Volume**: ~1.000 registros/mes (apenas GO)
**Uso**: Calculo de share MOVEL — `SUM(linhas no geohash) / populacao_residente × 100`
**Fonte CSV**: `Ookla_visao_movel_3M_erb_casa_YYYYMM.csv` (delimitador `;`, decimal `,`)

## 3. Camada Analitica (ALI) — Tabelas Gerenciadas

### 3.1 geohash_cell
Sem alteracao. Ver v1.

### 3.2 benchmark_config
**Dados default atualizados (Levantamento sec.5)**:

| key | scope | region | value | Descricao |
|-----|-------|--------|-------|-----------|
| shareThresholdAlto | ESTADO | SP | 40 | Share >= 40% = quadrante alto |
| shareThresholdBaixo | ESTADO | SP | 30 | Share < 30% = quadrante baixo |
| satisfacaoThresholdAlta | ESTADO | SP | 7.5 | Satisfacao >= 7.5 = alta |
| satisfacaoThresholdBaixa | ESTADO | SP | 6.0 | Satisfacao < 6.0 = baixa |
| satisfacaoMedia | NACIONAL | NULL | 6.5 | Referencia nacional |
| shareMedia | NACIONAL | NULL | 32 | Referencia nacional |
| trendThresholdUp | ESTADO | SP | 1.0 | Delta > +1.0 pp = UP |
| trendThresholdDown | ESTADO | SP | -1.0 | Delta < -1.0 pp = DOWN |
| rendaMediaAlta | ESTADO | SP | 10000 | Renda >= R$10k = Alta |
| rendaMediaBaixa | ESTADO | SP | 3500 | Renda < R$3.5k = Baixa |

### 3.3 user_session
Sem alteracao. Ver v1.

## 4. Views — Alteracoes Significativas

### 4.1 vw_geohash_summary (View Principal) — ALTERACOES

**Share real** (nao mais proporcao de testes):
- **FIBRA**: `COUNT(vivo_ftth_coverage no geohash) / SUM(geo_por_latlong.total_domicilios) × 100`
- **MOVEL**: `SUM(vivo_mobile_erb.linhas_total no geohash) / SUM(geo_por_latlong.populacao_total) × 100`

**Technology** (nao mais placeholder):
- FIBRA: geohash tem instalacoes FTTH
- MOVEL: geohash tem ERBs
- AMBOS: geohash tem ambos

**Quadrante** (novos nomes e thresholds):
```
share >= 40% AND satisfacao >= 7.5 → FORTALEZA
share < 30%  AND satisfacao >= 7.5 → OPORTUNIDADE
share >= 40% AND satisfacao < 6.0  → RISCO
share < 30%  AND satisfacao < 6.0  → EXPANSAO

Zona intermediaria (share 30-39% ou sat 6.0-7.4):
  Classificar pelo quadrante mais proximo (distancia euclidiana normalizada aos centroides)
```

**Posicao competitiva** (NOVA coluna):
```
delta = vivo_score - MAX(tim_score, claro_score)
LIDER:       delta > +0.5
COMPETITIVO: delta 0 a +0.5
EMPAREDADA:  delta -0.5 a 0
ABAIXO:      delta -1.0 a -0.5
ISOLADA:     delta < -1.8
```

**Prioridade** (formulas ponderadas novas):
```
RISCO:        Share×0.30 + RiscoChurn×0.25 + DeltaShare×0.15 + ARPU×0.15 + Pontuacao×0.15
FORTALEZA:    GrossMargin×0.30 + Satisfacao×0.25 + Share×0.20 + Renda×0.10 + Potencial×0.10 + 0.05
OPORTUNIDADE: ShareAlvo×0.25 + Cobertura×0.25 + Satisfacao×0.20 + CrescPop×0.20 + DeltaShare×0.10
EXPANSAO:     (Renda/1000)×3 + CrescPop×5 + Densidade/100
```

**Priority label** (score absoluto, nao percentil):
```
P1_CRITICA: score >= 8.5
P2_ALTA:    score 6.0-8.4
P3_MEDIA:   score 4.0-5.9
P4_BAIXA:   score < 4.0
```

**Prazo de acao** (NOVA coluna):
```
P1 + RISCO:  < 7 dias
P1 + outros: < 30 dias
P2:          < 30 dias
P3:          30-60 dias
P4:          90 dias
```

**Novas colunas adicionadas**:

| Coluna | Tipo | Derivacao |
|--------|------|-----------|
| competitive_position | competitive_position | Delta Vivo vs melhor concorrente |
| share_level | share_level | Classificacao do share |
| priority_label | priority_label | P1-P4 por score absoluto |
| action_deadline_days | INTEGER | Prazo em dias por prioridade+quadrante |
| share_fibra_pct | NUMERIC(5,2) | Share FTTH especifico |
| share_movel_pct | NUMERIC(5,2) | Share movel especifico |
| total_linhas_vivo | INTEGER | SUM linhas ERB no geohash |
| total_ftth_vivo | INTEGER | COUNT instalacoes FTTH no geohash |

### 4.2 Camada 2 — Score compositions (FORMALIZADO)

**Fibra Aumento Capacidade** (score 0-100):
```
score = taxa_ocupacao × 0.60 + valor_area × 0.40

taxa_ocupacao = instalacoes_ativas / capacidade_total × 100
valor_area = normalizar(renda_media, ARPU) × 100
```

**Fibra Expansao Nova Area** (score 0-100):
```
score = potencial_mercado × 0.50 + sinergia_movel × 0.50

potencial_mercado = normalizar(renda_media × densidade_pop) × 100
sinergia_movel = share_movel_pct  (penetracao movel Vivo no geohash)
```

### 4.3 vw_bairro_summary
- Renomear quadrantes nos JSONB keys: OPORTUNIDADE, FORTALEZA, RISCO, EXPANSAO
- Adicionar contagem de competitive_position por bairro

## 5. Decisoes de Desnormalizacao (atualizadas)

| Decisao | Justificativa | Impacto |
|---------|---------------|---------|
| Colunas geom/geohash7/geohash6 geradas nas tabelas Vivo | Evita JOIN com geohash_cell para cada query de share | INSERT trigger ou GENERATED ALWAYS |
| Share calculado com dados Vivo reais | PDF define formulas explicitas com FTTH e ERB | Elimina proxy de testes |
| Zona intermediaria por distancia euclidiana | PDF nao define regra explicita para share 30-39% ou sat 6.0-7.4 | Classificacao deterministica |
| Prioridade por score absoluto (nao percentil) | Levantamento define P1-P4 por faixas fixas de score | Independe da distribuicao |

## 6. Regras de Integridade (atualizadas)

| Regra | Tipo | Tabela | Fonte |
|-------|------|--------|-------|
| share_pct BETWEEN 0 AND 100 | CHECK | vw_geohash_summary | RN001-01 |
| vivo_score BETWEEN 0 AND 10 | CHECK | vw_geohash_summary | Levantamento sec.3 |
| priority_score BETWEEN 0 AND 10 | CHECK | vw_geohash_summary | Levantamento |
| qtde_lnha_* >= 0 | CHECK | vivo_mobile_erb | — |
| flg_loc IN (1, 2) | CHECK | vivo_ftth_coverage | CSV |
| anomes >= 202501 AND anomes <= 209912 | CHECK | vivo_ftth/erb | — |
| precision BETWEEN 1 AND 12 | CHECK | geohash_cell | RN001-03 |
| benchmark value >= 0 | CHECK | benchmark_config | RN001-06 |
| trend threshold: UP > +1.0pp, DOWN < -1.0pp | DERIVACAO | vw_geohash_summary | Levantamento sec.2 |
