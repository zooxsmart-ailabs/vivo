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

## Enums (NOVOS/ATUALIZADOS v3)

| Tipo | Valores | Descrição | RN |
|------|---------|-----------|-----|
| `quadrant_type` | **GROWTH, UPSELL, RETENCAO, GROWTH_RETENCAO** | Quadrante estratégico (renomeados v3) | RN001-01 |
| `competitive_position` | LIDER, COMPETITIVO, **EMPATADO**, ABAIXO, **CRITICO** | Posição competitiva (renomeados v3) | Levantamento sec.4 |
| `movel_class` | **MELHORA_QUALIDADE_5G, MELHORA_QUALIDADE_4G, EXPANSAO_COBERTURA_5G, EXPANSAO_COBERTURA_4G, SAUDAVEL** | Classificação móvel (separado 5G/4G v3) | RN004-05 |
| `fibra_class` | AUMENTO_CAPACIDADE, EXPANSAO_NOVA_AREA, SAUDAVEL, **SEM_FIBRA** | Classificação fibra (+SEM_FIBRA v3) | RN004-04 |
| `score_label` | **BAIXO, MEDIO, ALTO, CRITICO** | Label do score Camada 2 (NOVO v3) | Camada 2 |
| `tech_recommendation` | **5G_PREMIUM, 4G_MASS** | Recomendação tecnológica (NOVO v3) | Camada 2 Móvel |
| `recomendacao_type` | ATIVAR, AGUARDAR, BLOQUEADO | Decisão IA do diagnóstico Growth | RN009-06 |
| `sinal_type` | OK, ALERTA, CRITICO | Sinal ternário dos pilares | RN009-08 |

---

## Tabelas CRM + Camada 2 (ALI — NOVAS)

### geohash_crm (D13 — NOVO)

Dados CRM agregados por geohash e período mensal.

| # | Coluna | Tipo | Nulável | Default | Restrição | Descrição | Fonte |
|---|--------|------|---------|---------|-----------|-----------|-------|
| 1 | geohash_id | VARCHAR(12) | NO | — | PK, FK→geohash_cell | ID do geohash | geohash_cell |
| 2 | period | VARCHAR(7) | NO | — | PK | Período YYYY-MM | — |
| 3 | avg_arpu | NUMERIC(10,2) | YES | — | — | ARPU médio | CRM Vivo |
| 4 | dominant_plan_type | VARCHAR(100) | YES | — | — | Plano predominante | CRM Vivo |
| 5 | device_tier | VARCHAR(20) | YES | — | — | Tier: Premium/Mid/Basic | CRM Vivo |
| 6 | avg_income | NUMERIC(12,2) | YES | — | — | Renda média | CRM Vivo |
| 7 | population_density | NUMERIC(10,2) | YES | — | — | Densidade populacional | CRM Vivo |
| 8 | income_label | VARCHAR(50) | YES | — | — | Classificação de renda | Derivado |
| 9 | captured_at | TIMESTAMPTZ | NO | — | — | Timestamp de captura | Sistema |

**Volume**: ~5k rows/mês | **PK**: (geohash_id, period)
**Uso**: ARPU relativo para diagnóstico Growth (pilar Comportamento)

### camada2_fibra (D14 — NOVO)

Score e classificação da infraestrutura de fibra por geohash.

| # | Coluna | Tipo | Nulável | Default | Restrição | Descrição | Fonte |
|---|--------|------|---------|---------|-----------|-----------|-------|
| 1 | geohash_id | VARCHAR(12) | NO | — | PK, FK→geohash_cell | ID do geohash | geohash_cell |
| 2 | period | VARCHAR(7) | NO | — | PK | Período YYYY-MM | — |
| 3 | classification | fibra_class | NO | — | — | Classificação da fibra | Calculado |
| 4 | score | SMALLINT | NO | — | CHECK 0-100 | Score composto | Calculado |
| 5 | score_label | score_label | NO | — | — | BAIXO/MEDIO/ALTO/CRITICO | Derivado |
| 6 | taxa_ocupacao | NUMERIC(5,2) | YES | — | — | Instalações/capacidade ×100 | vivo_ftth |
| 7 | portas_disponiveis | NUMERIC(5,2) | YES | — | — | % de portas livres | vivo_ftth |
| 8 | potencial_mercado | NUMERIC(5,2) | YES | — | — | (renda × densidade) normalizado | geo_por_latlong |
| 9 | sinergia_movel | NUMERIC(5,2) | YES | — | — | Penetração móvel Vivo | vw_share_real |
| 10 | captured_at | TIMESTAMPTZ | NO | — | — | Timestamp de captura | Sistema |

**Volume**: ~5k rows/mês | **PK**: (geohash_id, period)
**Uso**: Classificação fibra para diagnóstico Growth (pilar Infraestrutura)

### camada2_movel (D15 — NOVO)

Score e classificação da infraestrutura móvel por geohash.

| # | Coluna | Tipo | Nulável | Default | Restrição | Descrição | Fonte |
|---|--------|------|---------|---------|-----------|-----------|-------|
| 1 | geohash_id | VARCHAR(12) | NO | — | PK, FK→geohash_cell | ID do geohash | geohash_cell |
| 2 | period | VARCHAR(7) | NO | — | PK | Período YYYY-MM | — |
| 3 | classification | movel_class | NO | — | — | Classificação da rede móvel | Calculado |
| 4 | score | SMALLINT | NO | — | CHECK 0-100 | Score composto | Calculado |
| 5 | score_label | score_label | NO | — | — | BAIXO/MEDIO/ALTO/CRITICO | Derivado |
| 6 | tech_recommendation | tech_recommendation | YES | — | — | 5G_PREMIUM ou 4G_MASS | Calculado |
| 7 | speedtest_score | NUMERIC(5,2) | YES | — | — | Score de velocidade normalizado | Speedtest |
| 8 | concentracao_renda | NUMERIC(5,2) | YES | — | — | Concentração de renda | geo_por_latlong |
| 9 | vulnerabilidade_concorrencia | NUMERIC(5,2) | YES | — | — | Vulnerabilidade competitiva | score |
| 10 | captured_at | TIMESTAMPTZ | NO | — | — | Timestamp de captura | Sistema |

**Volume**: ~5k rows/mês | **PK**: (geohash_id, period)
**Uso**: Classificação móvel para diagnóstico Growth, recomendação 5G/4G

---

## Tabelas Network Performance (AIE — NOVAS)

### network_performance_fixed (D09 — NOVO)

Resultados de testes Speedtest Ookla para redes fixas (banda larga/WiFi). ~100 colunas organizadas por categoria.

| Categoria | Colunas | Exemplos |
|-----------|---------|----------|
| Identificação | 7 | idResult (PK), tsResult (PK), guidResult, idPlatform, idDevice |
| Device | 15 | attrDeviceModel, Manufacturer, Chipset, OsVersion, RamMb, StorageMb |
| Provider/SIM | 8 | attrProviderName, attrSimOperatorCommonName, MCC/MNC |
| Conexão | 4 | idConnectionType, attrConnectionTypeString, LinkSpeed |
| Teste | 4 | attrTestMethod, attrTestIpVersion, attrResultTestSource |
| Localização | 7+3 | Latitude/Longitude/Altitude/Accuracy + Place (Name, Region, PostalCode) |
| WiFi | 20 | Frequency, ChannelWidth, RSSI, RxLinkSpeed, TxLinkSpeed, Standard, 5/6GHz |
| Velocidade | 4 | valDownloadMbps, valUploadMbps, Threads |
| Latência | 12 | Min/IQM/Max (idle, download, upload), Jitter, Multiserver |
| Packet Loss | 3 | Sent, Received, Percent |
| Traceroute | 7 | Hops, IP/Latency/MTU (hop 0, hop 1) |
| Rede | 4 | IPv4/IPv6, ASN, isVpn |
| Servidor | 10 | Name, Sponsor, Lat/Lng, Distance, CountryCode, isAutoSelected |
| Sinal/Célula | 5 | CellType, FrequencyChannel, LAC, NrPci |

**PK**: (idResult, tsResult) | **Hypertable**: chunks 7 dias
**Fonte**: Ookla Speedtest Intelligence (rede fixa/banda larga)

### network_performance_mobile (D10 — NOVO)

Resultados de testes Speedtest Ookla para redes móveis. ~160 colunas com dados mobile-específicos.

| Categoria | Colunas | Exemplos |
|-----------|---------|----------|
| Identificação | 7 | idResult (PK), tsResult (PK), guidResult, idPlatform, idDevice |
| Device (mobile) | 30 | Model, Manufacturer, Chipset, isRooted, MultiSim, ThermalStatus, eSIM |
| Permissões | 5 | PhoneState, FineLocation, CoarseLocation, BackgroundLocation, WifiState |
| SIM Operator | 7 | CommonName, MCC/MNC (primário + alt SIM) |
| Network Operator | 7 | MCC/MNC, CommonName, ISP, TypeAllocationCode |
| Conexão (mobile) | 14 | TypeStart/End, CarrierAggregation, NrState, APN, Bandwidth Up/Down |
| Localização | 12 | Lat/Lng (final + start), Accuracy, Altitude, Speed |
| Velocidade | 9 | DownloadKbps, UploadKbps, TestKb, Threads, Duration, isStopped |
| Latência | 12 | Min/IQM/Max (idle, download, upload), Jitter, Multiserver |
| Packet Loss | 3 | Sent, Received, Percent |
| Traceroute | 7 | Hops, IP/Latency/MTU (hop 0, hop 1) |
| Rede (mobile) | 7 | IPv4/IPv6, ASN, isRoaming, isInternationalRoaming, isVpn, isDevice5gCapable |
| Servidor | 11 | Name, Sponsor, Lat/Lng, Distance, Country, isAutoSelected, ASN |
| Sinal (mobile) | 15 | RSRP, RSRQ, RSSNR (LTE + CSI + SS/NR), RSSI, CQI, TimingAdvance |
| Célula (mobile) | 17 | NrFrequencyRange, Bandwidth, PCI/NrPci, TAC/LAC, ARFCN, LTE/NR bands |

**PK**: (idResult, tsResult) | **Hypertable**: chunks 7 dias
**Fonte**: Ookla Speedtest Intelligence (rede móvel)

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
| — | quadrant | quadrant_type | GROWTH/UPSELL/RETENCAO/GROWTH_RETENCAO | RENOMEADO |
| — | priority_label | priority_label | P1-P4 por score absoluto | FORMULA NOVA |

### vw_bairro_summary (ATUALIZADA v2)

JSONB keys renomeadas: GROWTH, UPSELL, RETENCAO, GROWTH_RETENCAO.

---

## Enums (ATUALIZADOS)

| Tipo | Valores v2 | Mudança vs v1 |
|------|-----------|---------------|
| quadrant_type | **GROWTH, UPSELL, RETENCAO, GROWTH_RETENCAO** | Renomeados v3 |
| priority_label | P1_CRITICA, P2_ALTA, P3_MEDIA, P4_BAIXA | Score absoluto, não percentil |
| fibra_class | AUMENTO_CAPACIDADE, EXPANSAO_NOVA_AREA, SAUDAVEL, **SEM_FIBRA** | +SEM_FIBRA v3 |
| movel_class | **MELHORA_QUALIDADE_5G, MELHORA_QUALIDADE_4G, EXPANSAO_COBERTURA_5G, EXPANSAO_COBERTURA_4G, SAUDAVEL** | Separado 5G/4G v3 |
| competitive_position | LIDER, COMPETITIVO, **EMPATADO**, ABAIXO, **CRITICO** | Renomeados v3 |
| share_level | MUITO_ALTA, ALTA, MEDIA, BAIXA | — |
| **score_label** | **BAIXO, MEDIO, ALTO, CRITICO** | **NOVO v3** — Camada 2 |
| **tech_recommendation** | **5G_PREMIUM, 4G_MASS** | **NOVO v3** — Camada 2 Móvel |

---

## Continuous Aggregates
Sem alteração. 6 CAAGs (3 métricas × 2 precisões). Ver v1.

---

## Funções
Sem alteração. `fn_available_periods()`, `fn_normalize_operator()`.
