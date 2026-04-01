# Modelo Lógico — Zoox x Vivo GeoIntelligence

**Versão**: 3.0 | **Data**: 2026-04-01

## 1. Domínios e Tipos Enumerados

| Domínio | Tipo Base | Valores | RN Origem |
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
| `recomendacao_type` | ENUM | **ATIVAR, AGUARDAR, BLOQUEADO** | RN009-06 |
| `sinal_type` | ENUM | **OK, ALERTA, CRITICO** | RN009-08 |

### Mudanças v1 → v2

| Item | v1 | v2 | Motivo |
|------|----|----|--------|
| Quadrantes | GROWTH, UPSELL, RETENCAO, GROWTH_RETENCAO | OPORTUNIDADE, FORTALEZA, RISCO, EXPANSAO | PDF oficial v1203 |
| Prioridade | CRITICO/ALTO/MEDIO/BAIXO (percentil) | P1-P4 (score absoluto 0-10) | Levantamento |
| Movel class | EXPANSAO_5G, EXPANSAO_4G | EXPANSAO_COBERTURA (trilha 5G/4G e interna) | PDF Camada 2 |
| Share thresholds | 35% único limiar | < 30% (baixa), 30-39% (média), >= 40% (alta) | Levantamento sec.1 |
| Satisfação thresholds | 6.8 único limiar | < 6.0 (baixa), 6.0-7.4 (média), >= 7.5 (alta) | Levantamento sec.3 |

## 2. Camada Raw (AIE) — Tabelas Existentes

### 2.1-2.3 file_transfer, video, web_browsing (Hypertables)
Sem alteração. Ver v1.

### 2.4 score
Sem alteração. Ver v1.

### 2.5 geo_por_latlong (v3)
- **Atualização**: v2 (3.092 rows) → v3 (4.958 rows), +60% cobertura
- Schema idêntico, mesmo pipeline de importação
- Geohash7 e geom gerados via PostGIS

### 2.6 vivo_ftth_coverage (NOVO — AIE D11)

| Coluna | Tipo | Restrição | Descrição |
|--------|------|-----------|-----------|
| cod_geo | VARCHAR(20) | NOT NULL | Código geográfico da instalação FTTH |
| anomes | INTEGER | NOT NULL | Ano-mês referência (YYYYMM) |
| produto | VARCHAR(20) | NOT NULL | Sempre "BANDA LARGA" |
| tp_produto | VARCHAR(10) | NOT NULL | Sempre "FTTH" |
| uf | VARCHAR(2) | NOT NULL | Estado |
| flg_loc | SMALLINT | NOT NULL | Flag de localização (1 ou 2) |
| x | DOUBLE PRECISION | NOT NULL | Longitude |
| y | DOUBLE PRECISION | NOT NULL | Latitude |
| geom | GEOMETRY(POINT, 4326) | GENERATED | Gerado de x,y |
| geohash7 | TEXT | GENERATED | Gerado via ST_GeoHash |
| geohash6 | TEXT | GENERATED | LEFT(geohash7, 6) |

**PK**: (cod_geo, anomes)
**Volume**: ~110.000 registros/mês (apenas GO)
**Uso**: Cálculo de share FIBRA — `COUNT(instalações no geohash) / total_domicílios × 100`
**Fonte CSV**: `Ookla_visao_ftth_3M_YYYYMM.csv` (delimitador `;`)

### 2.7 vivo_mobile_erb (NOVO — AIE D12)

| Coluna | Tipo | Restrição | Descrição |
|--------|------|-----------|-----------|
| erb_casa | VARCHAR(20) | NOT NULL | ID da ERB (estação rádio base) |
| anomes | INTEGER | NOT NULL | Ano-mês referência (YYYYMM) |
| qtde_lnha_pos | INTEGER | NOT NULL DEFAULT 0 | Linhas pós-pago |
| qtde_lnha_ctrl | INTEGER | NOT NULL DEFAULT 0 | Linhas controle |
| qtde_lnha_pre | INTEGER | NOT NULL DEFAULT 0 | Linhas pré-pago |
| x | DOUBLE PRECISION | NOT NULL | Longitude |
| y | DOUBLE PRECISION | NOT NULL | Latitude |
| geom | GEOMETRY(POINT, 4326) | GENERATED | Gerado de x,y |
| geohash7 | TEXT | GENERATED | Gerado via ST_GeoHash |
| geohash6 | TEXT | GENERATED | LEFT(geohash7, 6) |

**PK**: (erb_casa, anomes)
**Volume**: ~1.000 registros/mês (apenas GO)
**Uso**: Cálculo de share MÓVEL — `SUM(linhas no geohash) / populacao_residente × 100`
**Fonte CSV**: `Ookla_visao_movel_3M_erb_casa_YYYYMM.csv` (delimitador `;`, decimal `,`)

## 3. Camada Analítica (ALI) — Tabelas Gerenciadas

### 3.1 geohash_cell
Sem alteração. Ver v1.

### 3.2 benchmark_config
**Dados default atualizados (Levantamento sec.5)**:

| key | scope | region | value | Descrição |
|-----|-------|--------|-------|-----------|
| shareThresholdAlto | ESTADO | SP | 40 | Share >= 40% = quadrante alto |
| shareThresholdBaixo | ESTADO | SP | 30 | Share < 30% = quadrante baixo |
| satisfacaoThresholdAlta | ESTADO | SP | 7.5 | Satisfação >= 7.5 = alta |
| satisfacaoThresholdBaixa | ESTADO | SP | 6.0 | Satisfação < 6.0 = baixa |
| satisfacaoMedia | NACIONAL | NULL | 6.5 | Referência nacional |
| shareMedia | NACIONAL | NULL | 32 | Referência nacional |
| trendThresholdUp | ESTADO | SP | 1.0 | Delta > +1.0 pp = UP |
| trendThresholdDown | ESTADO | SP | -1.0 | Delta < -1.0 pp = DOWN |
| rendaMediaAlta | ESTADO | SP | 10000 | Renda >= R$10k = Alta |
| rendaMediaBaixa | ESTADO | SP | 3500 | Renda < R$3.5k = Baixa |

### 3.3 user_session
Sem alteração. Ver v1.

## 4. Views — Alterações Significativas

### 4.1 vw_geohash_summary (View Principal) — ALTERAÇÕES

**Share real** (não mais proporção de testes):
- **FIBRA**: `COUNT(vivo_ftth_coverage no geohash) / SUM(geo_por_latlong.total_domicílios) × 100`
- **MÓVEL**: `SUM(vivo_mobile_erb.linhas_total no geohash) / SUM(geo_por_latlong.populacao_total) × 100`

**Technology** (não mais placeholder):
- FIBRA: geohash tem instalações FTTH
- MÓVEL: geohash tem ERBs
- AMBOS: geohash tem ambos

**Quadrante** (novos nomes e thresholds):
```
share >= 40% AND satisfação >= 7.5 → FORTALEZA
share < 30%  AND satisfação >= 7.5 → OPORTUNIDADE
share >= 40% AND satisfação < 6.0  → RISCO
share < 30%  AND satisfação < 6.0  → EXPANSAO

Zona intermediaria (share 30-39% ou sat 6.0-7.4):
  Classificar pelo quadrante mais proximo (distancia euclidiana normalizada aos centroides)
```

**Posição competitiva** (NOVA coluna):
```
delta = vivo_score - MAX(tim_score, claro_score)
LIDER:       delta > +0.5
COMPETITIVO: delta 0 a +0.5
EMPAREDADA:  delta -0.5 a 0
ABAIXO:      delta -1.0 a -0.5
ISOLADA:     delta < -1.8
```

**Prioridade** (fórmulas ponderadas novas):
```
RISCO:        Share×0.30 + RiscoChurn×0.25 + DeltaShare×0.15 + ARPU×0.15 + Pontuacao×0.15
FORTALEZA:    GrossMargin×0.30 + Satisfacao×0.25 + Share×0.20 + Renda×0.10 + Potencial×0.10 + 0.05
OPORTUNIDADE: ShareAlvo×0.25 + Cobertura×0.25 + Satisfacao×0.20 + CrescPop×0.20 + DeltaShare×0.10
EXPANSAO:     (Renda/1000)×3 + CrescPop×5 + Densidade/100
```

**Priority label** (score absoluto, não percentil):
```
P1_CRITICA: score >= 8.5
P2_ALTA:    score 6.0-8.4
P3_MEDIA:   score 4.0-5.9
P4_BAIXA:   score < 4.0
```

**Prazo de ação** (NOVA coluna):
```
P1 + RISCO:  < 7 dias
P1 + outros: < 30 dias
P2:          < 30 dias
P3:          30-60 dias
P4:          90 dias
```

**Novas colunas adicionadas**:

| Coluna | Tipo | Derivação |
|--------|------|-----------|
| competitive_position | competitive_position | Delta Vivo vs melhor concorrente |
| share_level | share_level | Classificação do share |
| priority_label | priority_label | P1-P4 por score absoluto |
| action_deadline_days | INTEGER | Prazo em dias por prioridade+quadrante |
| share_fibra_pct | NUMERIC(5,2) | Share FTTH específico |
| share_movel_pct | NUMERIC(5,2) | Share móvel específico |
| total_linhas_vivo | INTEGER | SUM linhas ERB no geohash |
| total_ftth_vivo | INTEGER | COUNT instalações FTTH no geohash |

### 4.2 Camada 2 — Score compositions (FORMALIZADO)

**Fibra Aumento Capacidade** (score 0-100):
```
score = taxa_ocupação × 0.60 + valor_area × 0.40

taxa_ocupação = instalacoes_ativas / capacidade_total × 100
valor_area = normalizar(renda_media, ARPU) × 100
```

**Fibra Expansão Nova Área** (score 0-100):
```
score = potencial_mercado × 0.50 + sinergia_movel × 0.50

potencial_mercado = normalizar(renda_media × densidade_pop) × 100
sinergia_movel = share_movel_pct  (penetração movel Vivo no geohash)
```

### 4.3 Diagnóstico Growth — Composição dos 4 Pilares (NOVO)

Tabela `diagnostico_growth` (ALI D16): armazena o resultado pré-calculado do diagnóstico
dos 4 pilares estratégicos para geohashes GROWTH. Calculado mensalmente (anomes).

**Fonte de dados por pilar:**

| Pilar | Métricas | Fonte | Status |
|-------|----------|-------|--------|
| Percepção | score_ookla | score.vl_cntv_scre | Disponível |
| Percepção | taxa_chamados | RAC/SAC Vivo | **A definir** (stub = 0) |
| Concorrência | share_penetracao | vw_share_real | Disponível |
| Concorrência | delta_vs_lider | score (Vivo - MAX(TIM,Claro)) | Disponível |
| Infraestrutura | fibra_class | camada2_fibra.classification | Disponível |
| Infraestrutura | movel_class | camada2_movel.classification | Disponível |
| Comportamento | arpu_relativo | geohash_crm.arpu / AVG(arpu cidade) | **Parcial** (stub = 1.0) |
| Comportamento | canal_dominante, canal_pct | CRM canal de vendas | **A definir** (stub = Digital/50%) |

**Cálculo dos sinais (RN009-08 — worst-signal):**

```
sinal_percepcao      = worst(sig(score_ookla), sig(taxa_chamados))
sinal_concorrencia   = worst(sig(share_penetracao), sig(delta_vs_lider))
sinal_infraestrutura = worst(sig(fibra_class), sig(movel_class))
sinal_comportamento  = worst(sig(arpu_relativo), sig(canal_pct))
```

Thresholds de cada `sig()`: ver RN009-05.

**Cálculo da recomendação (RN009-06):**

```
fibraBloqueada   = fibra_class == EXPANSAO_NOVA_AREA
percCritica      = score_ookla < 6.0 OR taxa_chamados > 5%
concCritica      = delta_vs_lider < -1.0
infraControle    = fibra_class == AUMENTO_CAPACIDADE OR movel_class == MELHORA_QUALIDADE

BLOQUEADO  = fibraBloqueada OR (percCritica AND concCritica)
AGUARDAR   = infraControle OR percCritica OR concCritica
ATIVAR     = else
```

### 4.4 vw_bairro_summary
- Renomear quadrantes nos JSONB keys: OPORTUNIDADE, FORTALEZA, RISCO, EXPANSAO
- Adicionar contagem de competitive_position por bairro

## 5. Decisões de Desnormalização (atualizadas)

| Decisão | Justificativa | Impacto |
|---------|---------------|---------|
| Colunas geom/geohash7/geohash6 geradas nas tabelas Vivo | Evita JOIN com geohash_cell para cada query de share | INSERT trigger ou GENERATED ALWAYS |
| Share calculado com dados Vivo reais | PDF define fórmulas explícitas com FTTH e ERB | Elimina proxy de testes |
| Zona intermediária por distância euclidiana | PDF não define regra explícita para share 30-39% ou sat 6.0-7.4 | Classificação determinística |
| Prioridade por score absoluto (não percentil) | Levantamento define P1-P4 por faixas fixas de score | Independe da distribuição |

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
| trend threshold: UP > +1.0pp, DOWN < -1.0pp | DERIVAÇÃO | vw_geohash_summary | Levantamento sec.2 |
