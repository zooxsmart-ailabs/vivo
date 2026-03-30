# UC001 — Regras de Negocio

[<- Voltar ao fluxo principal](./UC001-main-flow.md)

**Versao**: 3.0 | **Data**: 2026-03-30 | **Fonte**: ZooxMap_Indicadores_Unificado_v2.pdf (Fev 2026)

## RN001-01 — Classificacao de Quadrante Estrategico

| Campo | Valor |
|-------|-------|
| **ID** | RN001-01 |
| **Tipo** | Derivacao |
| **Passos** | Passo 8 |

**Descricao:**
O quadrante de cada geohash e derivado do cruzamento de duas variaveis:
- **Eixo X**: Share de Mercado Vivo (calculado com dados reais FTTH + ERB — RN001-07)
- **Eixo Y**: Satisfacao do usuario Vivo (Score QoE SpeedTest 0-10)

**Quadrantes (Levantamento v2 — ZooxMap_Indicadores_Unificado_v2.pdf sec.5):**

| Condicao | Quadrante | Cor | Significado | Acao Primaria |
|----------|-----------|-----|-------------|---------------|
| share >= 35% AND qoe >= 7.01 | **UPSELL** | #7C3AED (roxo) | Base consolidada e satisfeita | Maximizar receita com upgrades |
| share < 35% AND qoe >= 7.01 | **GROWTH** | #158030 (verde) | Janela de ataque tecnico | Geracao de leads e captacao |
| share >= 35% AND qoe < 5.0 | **RETENCAO** | #DC2626 (vermelho) | Risco iminente de churn | Blindagem e atendimento proativo |
| Todos os demais casos | **GROWTH_RETENCAO** | #D97706 (ambar) | Perfil misto — crescimento + risco | Acoes combinadas de captacao e retencao |

**Logica da zona intermediaria (QoE 5.0-7.01):**
Geohashes com satisfacao media (QoE entre 5.0 e 7.01), independente do share, sao classificados
como GROWTH_RETENCAO. Idem para share baixo (<35%) + QoE baixa (<5.0).

**Thresholds (configuraveis via `benchmark_config`):**

| Chave | Valor | Descricao |
|-------|-------|-----------|
| shareThresholdQuadrante | 35% | Corte unico de share: >= 35% = alto |
| qoeThresholdAlto | 7.01 | Score QoE (0-10): >= 7.01 = satisfacao alta |
| qoeThresholdBaixo | 5.0 | Score QoE (0-10): < 5.0 = satisfacao baixa |

> Nota tecnica: Score QoE 0-10 derivado de `vl_cntv_scre / 10` (tabela score).
> Equivalencia SpeedTest 0-1000: 7.01 = 701 | 5.0 = 500.

---

## RN001-02 — Cores dos Poligonos

| Campo | Valor |
|-------|-------|
| **ID** | RN001-02 |
| **Tipo** | Derivacao |
| **Passos** | Passo 8 |

**Descricao:**
Poligonos sao SEMPRE coloridos pelo quadrante estrategico, independente do filtro de tecnologia ativo.

| Quadrante | Cor Fill | Cor Label |
|-----------|----------|-----------|
| UPSELL | #7C3AED (Roxo) | Roxo |
| GROWTH | #158030 (Verde) | Verde |
| RETENCAO | #DC2626 (Vermelho) | Vermelho |
| GROWTH_RETENCAO | #D97706 (Ambar) | Ambar |

| Propriedade | Valor Default | Hover | Pinned |
|-------------|---------------|-------|--------|
| fillOpacity | 0.4 | 0.72 | 0.8 |
| strokeWeight | 1.5 | 2.5 | 3.0 |
| strokeColor | quadrant+CC | #ffffff | #ffffff |
| zIndex | 1 | 10 | 20 |

---

## RN001-03 — Precisao do Geohash por Nivel de Zoom

| Campo | Valor |
|-------|-------|
| **ID** | RN001-03 |
| **Tipo** | Derivacao |
| **Passos** | Passo 3, 4 |

**Descricao:**
Precisoes suportadas (com continuous aggregates e dados operacionais):

| Zoom Google Maps | Precisao | Tamanho Celula | Fonte Share | Fonte QoE |
|---|---|---|---|---|
| 11-13 | 6 | ~1.2km x 0.6km | FTTH/ERB agrupados por geohash6 | cagg_*_gh6 |
| 14-15 | 7 | ~153m x 153m | FTTH/ERB agrupados por geohash7 | cagg_*_gh7 |

Zoom fora dessas faixas: clamp para 6 (zoom <= 13) ou 7 (zoom >= 14).

---

## RN001-04 — Contadores de Resumo

| Campo | Valor |
|-------|-------|
| **ID** | RN001-04 |
| **Tipo** | Calculo |
| **Passos** | Passo 10 |

**Descricao:**
- **Visiveis**: geohashes que passam nos filtros (quadrante + tecnologia)
- **Total**: geohashes no viewport/periodo
- **Em risco**: geohashes no quadrante **RETENCAO** (badge vermelho pulsante)
- **Top 10**: geohashes marcados como prioridade maxima dentro do quadrante (flag `is_top10`)

---

## RN001-05 — Estilo do Mapa Base

| Campo | Valor |
|-------|-------|
| **ID** | RN001-05 |
| **Tipo** | Validacao |
| **Passos** | Passo 7 |

**Descricao:**
Estilo analitico minimalista: geometria cinza claro, estradas brancas, POIs ocultos.

---

## RN001-06 — Benchmarks de Referencia

| Campo | Valor |
|-------|-------|
| **ID** | RN001-06 |
| **Tipo** | Derivacao |
| **Passos** | Passo 5 |

**Descricao:**
Benchmarks carregados de `benchmark_config` (Levantamento v2):

| Benchmark | Valor | Uso |
|-----------|-------|-----|
| shareThresholdQuadrante | 35% | Corte principal de quadrante (alto vs baixo) |
| shareThresholdBaixo | 30% | Label: Baixa Penetracao |
| shareThresholdAlto | 40% | Label: Alta Penetracao |
| shareThresholdMuitoAlto | 50% | Label: Muito Alta Penetracao |
| qoeThresholdAlto | 7.01 | Quadrante UPSELL/GROWTH (satisfacao alta) |
| qoeThresholdBaixo | 5.0 | Quadrante RETENCAO (satisfacao baixa) |
| trendThresholdUp | +1.0 pp | Delta > +1.0 = UP |
| trendThresholdDown | -1.0 pp | Delta < -1.0 = DOWN |
| qoeMedia NACIONAL | 6.5 | Comparacao insights automaticos |
| shareMedia NACIONAL | 32% | Comparacao insights automaticos |
| rendaAlta | R$10.000 | Referencia demografica |
| rendaBaixa | R$3.500 | Referencia demografica |
| densidadeAlta | 15.000 hab/km2 | Referencia demografica |
| densidadeBaixa | 5.000 hab/km2 | Referencia demografica |

---

## RN001-07 — Calculo de Share Real

| Campo | Valor |
|-------|-------|
| **ID** | RN001-07 |
| **Tipo** | Calculo |
| **Passos** | Passo 5 |

**Descricao:**
Share calculado com dados operacionais reais da Vivo (Levantamento v2 sec.1):

**FIBRA**: `Domicilios com Vivo Fibra Ativa / Total de Domicilios no Geohash x 100`
- Numerador: COUNT de `vivo_ftth_coverage` por geohash
- Denominador: SUM de `geo_por_latlong.total_de_domicilios_media` no geohash

**MOVEL**: `Clientes Vivo com ERB Casa / Total de Pessoas Residentes (IBGE) x 100`
- Numerador: SUM de `vivo_mobile_erb.(qtde_lnha_pos + qtde_lnha_ctrl + qtde_lnha_pre)` por geohash
- Denominador: SUM de `geo_por_latlong.populacao_total_media` no geohash

**Share combinado**: GREATEST(share_fibra, share_movel)

**Niveis de share (Levantamento v2 sec.1 — 4 niveis com cores):**

| Nivel | Threshold | Cor Plataforma | Descricao |
|-------|-----------|----------------|-----------|
| Muito Alta | > 50% | Roxo Escuro | Lideranca absoluta, operadora dominante |
| Alta | 40-50% | Roxo | Forte presenca, base consolidada |
| Media | 30-39% | Cinza/Roxo claro | Presenca competitiva, espaco para crescer |
| Baixa | < 30% | Verde | Presenca fraca, mercado aberto |

---

## RN001-08 — Tecnologia Derivada

| Campo | Valor |
|-------|-------|
| **ID** | RN001-08 |
| **Tipo** | Derivacao |
| **Passos** | Passo 8 |

**Descricao:**
A tecnologia do geohash e derivada da presenca de dados operacionais Vivo:

| Condicao | Tecnologia | Cor |
|----------|-----------|-----|
| Geohash tem instalacoes FTTH E ERBs | AMBOS | #8B85F6 (violeta) |
| Geohash tem apenas instalacoes FTTH | FIBRA | #0EA5E9 (azul) |
| Geohash tem apenas ERBs | MOVEL | #F97316 (laranja) |
