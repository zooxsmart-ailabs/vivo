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
| 4 | score_ookla | NUMERIC(4,1) | NO | — | CHECK 0-10 | Score QoE Vivo consolidado (0-10) | score / fallback |
| 5 | score_ookla_movel | NUMERIC(4,1) | YES | — | CHECK 0-10 | Score QoE Vivo Móvel (0-10) | **v5**: vw_score_mobile |
| 6 | score_ookla_fibra | NUMERIC(4,1) | YES | — | CHECK 0-10 | Score QoE Vivo Fibra (0-10) | **v5**: vw_score_fibra |
| 7 | score_hac | NUMERIC(4,1) | YES | — | CHECK 0-10 | Score HAC qualidade fibra (0-10) | **v5**: a definir |
| 8 | taxa_chamados | NUMERIC(5,2) | NO | 0 | CHECK ≥ 0 | (RAC+SAC 30d) / Base Ativa (%) | **A definir** |
| 9 | share_penetracao | NUMERIC(5,2) | NO | — | CHECK 0-100 | Base Vivo / Total Domicílios (%) | vw_share_real |
| 10 | delta_vs_lider | NUMERIC(4,1) | NO | — | — | Score Vivo - Score líder geral (Ookla) | score |
| 11 | delta_vs_lider_fibra | NUMERIC(4,1) | YES | — | — | **v5**: Score Vivo Fibra - Score líder Fibra | vw_score_fibra |
| 12 | delta_vs_lider_movel | NUMERIC(4,1) | YES | — | — | **v5**: Score Vivo Móvel - Score líder Móvel | vw_score_mobile |
| 8 | fibra_class | fibra_class | NO | SAUDAVEL | — | Classificação Camada 2 Fibra | camada2_fibra |
| 9 | movel_class | movel_class | NO | SAUDAVEL | — | Classificação Camada 2 Móvel | camada2_movel |
| 10 | arpu_relativo | NUMERIC(4,2) | NO | 1.0 | — | ARPU geohash / ARPU médio cidade | geohash_crm |
| 11 | canal_dominante | VARCHAR(30) | NO | Digital | — | Canal de venda dominante | **A definir** |
| 12 | canal_pct | NUMERIC(5,2) | NO | 50.0 | CHECK 0-100 | % de vendas pelo canal dominante | **A definir** |
| 13 | sinal_percepcao | sinal_type | NO | OK | — | Sinal agregado pilar Percepção | Calculado (RN009-08) |
| 14 | sinal_concorrencia | sinal_type | NO | OK | — | Sinal agregado pilar Concorrência | Calculado (RN009-08) |
| 15 | sinal_infraestrutura | sinal_type | NO | OK | — | Sinal agregado pilar Infraestrutura | Calculado (RN009-08) |
| 16 | sinal_comportamento | sinal_type | NO | OK | — | Sinal agregado pilar Comportamento | Calculado (RN009-08) |
| 17 | recomendacao | recomendacao_type | NO | ATACAR | — | Decisão IA: ATACAR/AGUARDAR/BLOQUEADO | Calculado (RN009-06) |
| 18 | decisao_movel | decisao_tech_type | YES | — | — | **v5**: Decisão per-tech móvel (ATACAR/AGUARDAR) | Calculado |
| 19 | decisao_fibra | decisao_tech_type | YES | — | — | **v5**: Decisão per-tech fibra (ATACAR/AGUARDAR) | Calculado |
| 20 | prio_movel | prioridade_growth | YES | — | — | **v5**: Prioridade móvel (ALTA/MEDIA/BAIXA) | calcPrio(scoreOoklaMovel) |
| 21 | prio_fibra | prioridade_growth | YES | — | — | **v5**: Prioridade fibra (ALTA/MEDIA/BAIXA) | calcPrio(scoreOoklaFibra) |
| 22 | recomendacao_razao | TEXT | YES | — | — | Justificativa textual composta | Calculado (gerarRec) |
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
| `fibra_class` | AUMENTO_CAPACIDADE, EXPANSAO_NOVA_AREA, SAUDAVEL, SEM_FIBRA, **MELHORA_QUALIDADE** | Classificação fibra (+MELHORA_QUALIDADE v5) | RN004-04 |
| `score_label` | **BAIXO, MEDIO, ALTO, CRITICO** | Label do score Camada 2 (NOVO v3) | Camada 2 |
| `tech_recommendation` | **5G_PREMIUM, 4G_MASS** | Recomendação tecnológica (NOVO v3) | Camada 2 Móvel |
| `recomendacao_type` | **ATACAR**, AGUARDAR, BLOQUEADO | Decisão IA do diagnóstico Growth (v5: ATIVAR→ATACAR) | RN009-06 |
| **`decisao_tech_type`** | **ATACAR, AGUARDAR** | **Decisão per-tech Fibra/Móvel (NOVO v5)** | RN009-06 |
| **`prioridade_growth`** | **ALTA, MEDIA, BAIXA** | **Prioridade per-tech score Ookla (NOVO v5)** | RN009-06 |
| `sinal_type` | OK, ALERTA, CRITICO | Sinal ternário dos pilares | RN009-08 |
| `score_type` | MOBILE, FIBRA, CONSOLIDADO | Discriminador de tecnologia para scores QoE (v4) | scores.pdf |

---

## Tabelas CRM + Camada 2 (ALI — NOVAS)

### geohash_crm (D13 — NOVO)

Dados CRM agregados por geohash e período mensal.

| # | Coluna | Tipo | Nulável | Default | Restrição | Descrição | Fonte |
|---|--------|------|---------|---------|-----------|-----------|-------|
| 1 | geohash_id | VARCHAR(12) | NO | — | PK, FK→geohash_cell | ID do geohash | geohash_cell |
| 2 | period | VARCHAR(7) | NO | — | PK | Período YYYY-MM | — |
| 3 | avg_arpu | NUMERIC(10,2) | YES | — | — | ARPU médio consolidado | CRM Vivo |
| 4 | arpu_movel | NUMERIC(10,2) | YES | — | — | **v5**: ARPU médio móvel (R$) | CRM Vivo |
| 5 | arpu_fibra | NUMERIC(10,2) | YES | — | — | **v5**: ARPU médio fibra (R$) | CRM Vivo |
| 6 | dominant_plan_type | VARCHAR(100) | YES | — | — | Plano predominante | CRM Vivo |
| 7 | plan_type_movel | VARCHAR(100) | YES | — | — | **v5**: Tipo plano móvel (Pré/Pós/Controle) | CRM Vivo |
| 8 | device_tier | VARCHAR(20) | YES | — | — | Tier: Premium/Mid/Basic | CRM Vivo |
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

## Views de Score QoE (v5 — notebook validado 2026-04-11)

> **Fonte**: `docs/levantamento/scores.pdf` (pag 2) + `estudo/query_score_v2.ipynb` (validado pelo time de analistas).
>
> **v5 (2026-04-11)**: Refinamentos do notebook de analistas aplicados:
> - Filtros nas raw tables: `is_wifi_connected` (NOT TRUE para mobile, TRUE para fibra), `id_location_type = 1`, `val_latency_avg IS NOT NULL`, `attr_geohash7 IS NOT NULL`.
> - **FULL OUTER JOIN** entre `file_transfer`, `video` e `web_browsing` (preserva geohashes com dados parciais).
> - Score taxa de falha vídeo/web em **4-tier (mobile)** ou **3-tier (fibra)**, alinhado com PDF pag 2.
> - **Degradação graciosa** nos pilares Responsividade e Vídeo (fibra): divide por N componentes disponíveis.
> - `score_resolucao` (fibra): denominador = soma manual de todas as resoluções (não usa `val_video_quality_time_total`); `NULLIF(..., 0)` evita divisão por zero.
> - Fronteiras de buckets com `<` (não `BETWEEN` inclusivo) para eliminar ambiguidade.
> - **Classificação por percentil dinâmico** (p25/p75) → BOM / MEDIO / RUIM.

### vw_score_mobile (Score Percepção — Rede Móvel)

**Filtros**: `is_wifi_connected IS NOT TRUE`, `id_location_type = 1`, `val_latency_avg IS NOT NULL`.

| # | Coluna | Tipo | Derivação |
|---|--------|------|-----------|
| 1 | geohash_id | VARCHAR(12) | attr_geohash7 (raw tables) |
| 2 | operator | operator_name | `fn_normalize_operator(attr_sim_operator_common_name)` |
| 3 | anomes | INTEGER | Ano-mês referência (YYYYMM) |
| 4 | score_latencia | NUMERIC(5,2) | val_latency_avg normalizado: <65→100, <220→75, <350→50, else→25 |
| 5 | score_video | NUMERIC(5,2) | (rebuffering + tempo_inicio + falha 4-tier) / 3 |
| 6 | score_web | NUMERIC(5,2) | (carregamento + falha 4-tier) / 2 |
| 7 | score_throughput | NUMERIC(5,2) | DL×0.70 + UL×0.20 + Lat×0.10 (DL/UL com `FILTER WHERE has_dl_test_status`) |
| 8 | score_sinal | NUMERIC(5,2) | *A definir* (placeholder NULL) |
| 9 | throughput_disponivel | BOOLEAN | `qtd_dl_ok / total > 0.1` |
| 10 | score_final | NUMERIC(5,2) | Lat×0.30 + Vid×0.30 + Web×0.30 + Thr×0.10 (com redistribuição dinâmica) |
| 11 | total_testes | INTEGER | Contagem de testes (file + video + web) |
| 12 | classificacao | TEXT | BOM / MEDIO / RUIM (percentil dinâmico p25/p75) |
| 13 | threshold_medio | NUMERIC(5,2) | Percentil 25 do score_final (corte RUIM/MEDIO) |
| 14 | threshold_bom | NUMERIC(5,2) | Percentil 75 do score_final (corte MEDIO/BOM) |

**Pesos (redistribuição dinâmica quando throughput indisponível):**

| Pilar | Com throughput | Sem throughput |
|-------|---------------:|---------------:|
| Latência | 0.30 | **0.35** |
| Vídeo    | 0.30 | 0.30 |
| Web      | 0.30 | **0.35** |
| Throughput | 0.10 | 0.00 |

**Score taxa de falha vídeo (4-tier — PDF pag 2):**
- 0% → 100 | ≤18.5% → 75 | >18.5% → 25

**Score taxa de falha web (4-tier — PDF pag 2):**
- <3.4% → 100 | <13.8% → 75 | <26.8% → 50 | else → 25

**Mapeamento variáveis PDF → colunas raw:**

| Variável PDF | Coluna Raw | Tabela | Uso |
|-------------|------------|--------|-----|
| val_latency_avg | val_latency_avg | file_transfer | Pilar Latência |
| val_dl_throughput | val_dl_throughput | file_transfer | Pilar Throughput (DL) — `FILTER (has_dl_test_status)` |
| val_ul_throughput | val_ul_throughput | file_transfer | Pilar Throughput (UL) — `FILTER (has_dl_test_status)` |
| has_dl_test_status | has_dl_test_status | file_transfer | Disponibilidade + filtro de validade |
| attr_video_rebuffering_count | attr_video_rebuffering_count | video | Score Vídeo — rebuffering binário |
| val_video_time_to_start | val_video_time_to_start | video | Score Vídeo — tempo início (<2s binário) |
| is_video_fails_to_start | is_video_fails_to_start | video | Score Vídeo — taxa de falha (4-tier) |
| val_web_page_load_time | val_web_page_load_time | web_browsing | Score Web — carregamento (<5s binário) |
| is_web_page_fails_to_load | is_web_page_fails_to_load | web_browsing | Score Web — taxa de falha (4-tier) |

### vw_score_fibra (Score Percepção — Rede Fixa)

**Filtros**: `is_wifi_connected = TRUE`, `id_location_type = 1`, `val_latency_avg IS NOT NULL`.

| # | Coluna | Tipo | Derivação |
|---|--------|------|-----------|
| 1 | geohash_id | VARCHAR(12) | attr_geohash7 (raw tables) |
| 2 | operator | operator_name | `fn_normalize_operator(attr_sim_operator_common_name)` |
| 3 | anomes | INTEGER | Ano-mês referência (YYYYMM) |
| 4 | score_responsividade | NUMERIC(5,2) | (latência + TCP connect) / 2 — **degradação graciosa** se TCP NULL |
| 5 | score_video | NUMERIC(5,2) | **Degradação graciosa** (4/3/2/1 componentes): rebuffering + resolução + tempo_inicio + falha 3-tier |
| 6 | score_web | NUMERIC(5,2) | (first_byte + carregamento) / 2 |
| 7 | score_throughput | NUMERIC(5,2) | (DL + UL) / 2 |
| 8 | throughput_disponivel | BOOLEAN | `qtd_dl_ok / total > 0.1` |
| 9 | score_final | NUMERIC(5,2) | Resp×0.40 + Vid×0.30 + Web×0.20 + Thr×0.10 (com redistribuição dinâmica) |
| 10 | total_testes | INTEGER | Contagem de testes (file + video + web) |
| 11 | classificacao | TEXT | BOM / MEDIO / RUIM (percentil dinâmico p25/p75) |
| 12 | threshold_medio | NUMERIC(5,2) | Percentil 25 do score_final |
| 13 | threshold_bom | NUMERIC(5,2) | Percentil 75 do score_final |

**Pesos (redistribuição dinâmica quando throughput indisponível):**

| Pilar | Com throughput | Sem throughput |
|-------|---------------:|---------------:|
| Responsividade | 0.40 | **0.45** |
| Vídeo          | 0.30 | 0.30 |
| Web            | 0.20 | **0.25** |
| Throughput     | 0.10 | 0.00 |

**Score taxa de falha vídeo (3-tier — limiares fibra, PDF pag 2):**
- 0% → 100 | ≤33.3% → 75 | >33.3% → 25

**Score resolução (denominador = soma manual de todas as resoluções):**
- Numerador: tempo em ≥1080p (1080p + 1440p + 2160p)
- Denominador: tempo total classificado (144p + 240p + 360p + 480p + 720p + 1080p + 1440p + 2160p)
- Se razão ≥0.8 → score 1, else → 0; multiplicado por 100
- Não usa `val_video_quality_time_total` (evita inconsistência com soma das partes)

**Variáveis exclusivas Fibra (ausentes no Mobile):**

| Variável PDF | Coluna Raw | Tabela | Uso |
|-------------|------------|--------|-----|
| val_tcp_connect_time | val_tcp_connect_time | file_transfer | Pilar Responsividade — TCP connect (<24/35/61) |
| val_video_quality_time_xxxxp | val_video_quality_time_144p..2160p | video | Score Vídeo — proporção de tempo em ≥1080p |
| val_web_page_first_byte_time | val_web_page_first_byte_time | web_browsing | Score Web — First Byte Time (<523/753/1305) |

---

## Continuous Aggregates
Sem alteração. 6 CAAGs (3 métricas × 2 precisões). Ver v1.

---

## Funções
Sem alteração. `fn_available_periods()`, `fn_normalize_operator()`.
