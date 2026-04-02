# Modelo Lógico — Zoox x Vivo GeoIntelligence

**Versão**: 3.0 | **Data**: 2026-04-01

## 1. Domínios e Tipos Enumerados

| Domínio | Tipo Base | Valores | RN Origem |
|---------|-----------|---------|-----------|
| `quadrant_type` | ENUM | **GROWTH, UPSELL, RETENCAO, GROWTH_RETENCAO** | RN001-01 |
| `tech_category` | ENUM | FIBRA, MOVEL, AMBOS | RN003-03 |
| `operator_name` | ENUM | VIVO, TIM, CLARO, OI, OUTROS | Score table |
| `trend_direction` | ENUM | UP, DOWN, STABLE | Levantamento sec.2 |
| `fibra_class` | ENUM | AUMENTO_CAPACIDADE, EXPANSAO_NOVA_AREA, SAUDAVEL, **SEM_FIBRA** | RN004-04 |
| `movel_class` | ENUM | **MELHORA_QUALIDADE_5G, MELHORA_QUALIDADE_4G, EXPANSAO_COBERTURA_5G, EXPANSAO_COBERTURA_4G, SAUDAVEL** | RN004-05 |
| `priority_label` | ENUM | P1_CRITICA, P2_ALTA, P3_MEDIA, P4_BAIXA | Levantamento sec.score |
| `quality_label` | ENUM | EXCELENTE, BOM, REGULAR, RUIM | RN004-02 |
| `benchmark_scope` | ENUM | NACIONAL, ESTADO, CIDADE | RN001-06 |
| `competitive_position` | ENUM | **LIDER, COMPETITIVO, EMPATADO, ABAIXO, CRITICO** | Levantamento sec.4 |
| `share_level` | ENUM | MUITO_ALTA, ALTA, MEDIA, BAIXA | Levantamento sec.1 |
| `score_label` | ENUM | **BAIXO, MEDIO, ALTO, CRITICO** | Camada 2 |
| `tech_recommendation` | ENUM | **5G_PREMIUM, 4G_MASS** | Camada 2 Móvel |
| `recomendacao_type` | ENUM | ATIVAR, AGUARDAR, BLOQUEADO | RN009-06 |
| `sinal_type` | ENUM | OK, ALERTA, CRITICO | RN009-08 |

### Mudanças v1 → v2

| Item | v1 | v2 | v3 (atual) | Motivo |
|------|----|----|------------|--------|
| Quadrantes | OPORTUNIDADE, FORTALEZA, RISCO, EXPANSAO | (mesmos nomes) | **GROWTH, UPSELL, RETENCAO, GROWTH_RETENCAO** | Alinhamento com nomenclatura estratégica do backend |
| Competitive position | — | EMPAREDADA, ISOLADA | **EMPATADO, CRITICO** | Renomeado para clareza |
| Movel class | EXPANSAO_5G, EXPANSAO_4G | EXPANSAO_COBERTURA | **MELHORA_QUALIDADE_5G, MELHORA_QUALIDADE_4G, EXPANSAO_COBERTURA_5G, EXPANSAO_COBERTURA_4G, SAUDAVEL** | Separação 5G/4G por trilha |
| Fibra class | AUMENTO_CAPACIDADE, EXPANSAO_NOVA_AREA, SAUDAVEL | (mesmos) | **+SEM_FIBRA** | Geohashes sem cobertura fibra |
| Prioridade | CRITICO/ALTO/MEDIO/BAIXO (percentil) | P1-P4 (score absoluto 0-10) | (mesmos) | Levantamento |
| Share thresholds | 35% único limiar | < 30% (baixa), 30-39% (média), >= 40% (alta) | (mesmos) | Levantamento sec.1 |
| Satisfação thresholds | 6.8 único limiar | < 6.0 (baixa), 6.0-7.4 (média), >= 7.5 (alta) | (mesmos) | Levantamento sec.3 |

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

### 2.8 network_performance_fixed (AIE — Speedtest Ookla Fixo)

| Coluna (resumo) | Tipo | Descrição |
|------------------|------|-----------|
| idResult | BIGINT | PK — ID do teste |
| tsResult | TIMESTAMPTZ | PK — Timestamp do teste |
| attrDeviceModel/Manufacturer | TEXT | Dados do dispositivo (~15 cols) |
| attrProviderName/attrSimOperator* | TEXT/INT | Operadora e SIM (~8 cols) |
| idConnectionType/attrConnectionTypeString | SMALLINT/TEXT | Tipo de conexão (~4 cols) |
| attrLocationLatitude/Longitude | DOUBLE | Localização + geom/geohash (PostGIS) |
| attrWifi* | TEXT/INT/BOOL | Dados WiFi (~20 cols) |
| valDownloadMbps / valUploadMbps | DOUBLE | Velocidade medida |
| valLatency*Ms | INT/DOUBLE | Latência (min/iqm/max, download/upload) (~12 cols) |
| metricPacketLossPercent | DOUBLE | Perda de pacotes |
| numTracerouteHops / attrTraceroute* | SMALLINT/TEXT/INT | Traceroute (~7 cols) |
| attrServer* | TEXT/DOUBLE/INT | Servidor de teste (~10 cols) |
| attrSignal*/attrCell* | SMALLINT/INT/TEXT | Sinal e célula (~5 cols) |

**PK**: (idResult, tsResult) | **Hypertable**: chunks 7 dias
**Total**: ~100 colunas | **Fonte**: Ookla Speedtest Intelligence (rede fixa/banda larga)

### 2.9 network_performance_mobile (AIE — Speedtest Ookla Móvel)

| Coluna (resumo) | Tipo | Descrição |
|------------------|------|-----------|
| idResult | BIGINT | PK — ID do teste |
| tsResult | TIMESTAMPTZ | PK — Timestamp do teste |
| attrDevice* | TEXT/INT/BOOL | Dados do dispositivo + mobile-específico (thermal, modem, roaming, eSIM) (~30 cols) |
| attrSimOperator*/attrAltsim* | TEXT/INT | SIM primário e secundário (~7 cols) |
| attrNetworkOperator*/attrIsp* | TEXT/INT | Operadora de rede (~7 cols) |
| idConnectionType*/attrConnection* | SMALLINT/INT/TEXT/BOOL | Conexão incl. carrier aggregation, NR state, APN (~14 cols) |
| attrLocationLatitude/Longitude + Start* | DOUBLE | Localização início/fim + geom/geohash (PostGIS) (~12 cols) |
| valDownloadKbps / valUploadKbps | INT | Velocidade medida (Kbps) |
| valLatency*Ms | INT/DOUBLE | Latência (min/iqm/max, download/upload) (~12 cols) |
| metricPacketLossPercent | DOUBLE | Perda de pacotes |
| valSignal* (RSRP, RSRQ, RSSNR, CSI, SS) | SMALLINT/INT | Métricas de sinal (~15 cols) |
| attrCell* (NR, LTE, bands, PCI, TAC) | SMALLINT/INT/BIGINT/TEXT | Dados de célula (~17 cols) |
| attrServer* | TEXT/DOUBLE/INT | Servidor de teste (~10 cols) |
| isNetworkRoaming / isDevice5gCapable | BOOL | Roaming e capacidade 5G |

**PK**: (idResult, tsResult) | **Hypertable**: chunks 7 dias
**Total**: ~160 colunas | **Fonte**: Ookla Speedtest Intelligence (rede móvel)

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

### 3.4 geohash_crm (NOVO — ALI D13)

Dados CRM agregados por geohash e período mensal.

| Coluna | Tipo | Restrição | Descrição |
|--------|------|-----------|-----------|
| geohash_id | VARCHAR(12) | PK, FK→geohash_cell | ID do geohash |
| period | VARCHAR(7) | PK | Período YYYY-MM |
| avg_arpu | NUMERIC(10,2) | — | ARPU médio no geohash |
| dominant_plan_type | VARCHAR(100) | — | Plano predominante (ex: Controle, Pós) |
| device_tier | VARCHAR(20) | — | Tier de device predominante (Premium/Mid/Basic) |
| avg_income | NUMERIC(12,2) | — | Renda média |
| population_density | NUMERIC(10,2) | — | Densidade populacional |
| income_label | VARCHAR(50) | — | Classificação de renda |
| captured_at | TIMESTAMPTZ | NOT NULL | Timestamp de captura |

**PK**: (geohash_id, period)
**Uso**: ARPU relativo para diagnóstico Growth (pilar Comportamento), segmentação por renda/device

### 3.5 camada2_fibra (NOVO — ALI D14)

Score e classificação da infraestrutura de fibra por geohash.

| Coluna | Tipo | Restrição | Descrição |
|--------|------|-----------|-----------|
| geohash_id | VARCHAR(12) | PK, FK→geohash_cell | ID do geohash |
| period | VARCHAR(7) | PK | Período YYYY-MM |
| classification | fibra_class | NOT NULL | AUMENTO_CAPACIDADE / EXPANSAO_NOVA_AREA / SAUDAVEL / SEM_FIBRA |
| score | SMALLINT | NOT NULL, 0-100 | Score composto da infraestrutura |
| score_label | score_label | NOT NULL | BAIXO / MEDIO / ALTO / CRITICO |
| taxa_ocupacao | NUMERIC(5,2) | — | Instalações ativas / capacidade total × 100 |
| portas_disponiveis | NUMERIC(5,2) | — | % de portas livres |
| potencial_mercado | NUMERIC(5,2) | — | Normalizado (renda × densidade) × 100 |
| sinergia_movel | NUMERIC(5,2) | — | Penetração móvel Vivo no geohash |
| captured_at | TIMESTAMPTZ | NOT NULL | Timestamp de captura |

**PK**: (geohash_id, period)
**Uso**: Classificação fibra para diagnóstico Growth (pilar Infraestrutura), score Camada 2

### 3.6 camada2_movel (NOVO — ALI D15)

Score e classificação da infraestrutura móvel por geohash.

| Coluna | Tipo | Restrição | Descrição |
|--------|------|-----------|-----------|
| geohash_id | VARCHAR(12) | PK, FK→geohash_cell | ID do geohash |
| period | VARCHAR(7) | PK | Período YYYY-MM |
| classification | movel_class | NOT NULL | MELHORA_QUALIDADE_5G/4G / EXPANSAO_COBERTURA_5G/4G / SAUDAVEL |
| score | SMALLINT | NOT NULL, 0-100 | Score composto da infraestrutura |
| score_label | score_label | NOT NULL | BAIXO / MEDIO / ALTO / CRITICO |
| tech_recommendation | tech_recommendation | — | 5G_PREMIUM ou 4G_MASS |
| speedtest_score | NUMERIC(5,2) | — | Score de velocidade normalizado |
| concentracao_renda | NUMERIC(5,2) | — | Concentração de renda no geohash |
| vulnerabilidade_concorrencia | NUMERIC(5,2) | — | Vulnerabilidade competitiva |
| captured_at | TIMESTAMPTZ | NOT NULL | Timestamp de captura |

**PK**: (geohash_id, period)
**Uso**: Classificação móvel para diagnóstico Growth (pilar Infraestrutura), recomendação 5G/4G

## 4. Views — Alterações Significativas

### 4.1 vw_geohash_summary (View Principal) — ALTERAÇÕES

**Share real** (não mais proporção de testes):
- **FIBRA**: `COUNT(vivo_ftth_coverage no geohash) / SUM(geo_por_latlong.total_domicílios) × 100`
- **MÓVEL**: `SUM(vivo_mobile_erb.linhas_total no geohash) / SUM(geo_por_latlong.populacao_total) × 100`

**Technology** (não mais placeholder):
- FIBRA: geohash tem instalações FTTH
- MÓVEL: geohash tem ERBs
- AMBOS: geohash tem ambos

**Quadrante** (nomes v3):
```
share >= 40% AND satisfação >= 7.5 → UPSELL       (antigo FORTALEZA)
share < 30%  AND satisfação >= 7.5 → GROWTH        (antigo OPORTUNIDADE)
share >= 40% AND satisfação < 6.0  → RETENCAO      (antigo RISCO)
share < 30%  AND satisfação < 6.0  → GROWTH_RETENCAO (antigo EXPANSAO)

Zona intermediaria (share 30-39% ou sat 6.0-7.4):
  Classificar pelo quadrante mais proximo (distancia euclidiana normalizada aos centroides)
```

**Posição competitiva** (nomes v3):
```
delta = vivo_score - MAX(tim_score, claro_score)
LIDER:       delta > +0.5
COMPETITIVO: delta 0 a +0.5
EMPATADO:    delta -0.5 a 0    (antigo EMPAREDADA)
ABAIXO:      delta -1.0 a -0.5
CRITICO:     delta < -1.8      (antigo ISOLADA)
```

**Prioridade** (fórmulas ponderadas novas):
```
RETENCAO:        Share×0.30 + RiscoChurn×0.25 + DeltaShare×0.15 + ARPU×0.15 + Pontuacao×0.15
UPSELL:          GrossMargin×0.30 + Satisfacao×0.25 + Share×0.20 + Renda×0.10 + Potencial×0.10 + 0.05
GROWTH:          ShareAlvo×0.25 + Cobertura×0.25 + Satisfacao×0.20 + CrescPop×0.20 + DeltaShare×0.10
GROWTH_RETENCAO: (Renda/1000)×3 + CrescPop×5 + Densidade/100
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
P1 + RETENCAO: < 7 dias
P1 + outros:   < 30 dias
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
- Renomear quadrantes nos JSONB keys: GROWTH, UPSELL, RETENCAO, GROWTH_RETENCAO
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
